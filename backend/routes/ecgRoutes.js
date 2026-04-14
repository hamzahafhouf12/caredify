const express = require("express");
const router = express.Router();
const ECGRecord = require("../models/Ecgrecord");
const Patient = require("../models/Patient");
const { protect, doctor } = require("../middleware/authMiddleware");

router.use(protect, doctor);

/**
 * @route GET /api/ecg/all
 * @desc  Get all ECG records managed by the logged-in doctor (latest first)
 */
router.get("/all", async (req, res, next) => {
  try {
    const records = await ECGRecord.find({ medecin: req.user._id })
      .sort({ createdAt: -1 })
      .populate("patient", "nom prenom age cin");
    res.json(records);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/ecg/record
 * @desc  Create a new ECG record (simulated or real)
 */
router.post("/record", async (req, res, next) => {
  try {
    const { patientId, signalData, frequenceEchantillonnage, source, iaInterpretations } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      const err = new Error("Patient not found");
      err.statusCode = 404;
      return next(err);
    }

    const ecg = await ECGRecord.create({
      patient: patientId,
      medecin: req.user._id,
      signalData: signalData || [],
      frequenceEchantillonnage: frequenceEchantillonnage || 250,
      source: source || "simulation",
      iaInterpretations: iaInterpretations || {},
    });

    // --- Automated Alert & Risk Logic ---
    const { scoreRisque, arythmie, fibrillationAuriculaire, resumeIA } = ecg.iaInterpretations;
    let niveauRisque = "Faible";
    
    if (scoreRisque >= 70 || fibrillationAuriculaire) {
      niveauRisque = "Élevé";
    } else if (scoreRisque >= 40 || arythmie) {
      niveauRisque = "Modéré";
    }

    // Create Alert if risk is not low
    if (niveauRisque !== "Faible") {
      const Alert = require("../models/Alert");
      const newAlert = await Alert.create({
        patient: patientId,
        medecin: req.user._id,
        type: niveauRisque === "Élevé" ? "Urgente" : "Modéré",
        priorite: niveauRisque === "Élevé" ? "Critique" : "A_surveiller",
        detail: `Alerte IA: ${resumeIA || "Détection d'anomalies cardiaques."}`,
        source: "ia",
      });

      // Emit real-time alert notification
      try {
        const { getIO } = require("../socket");
        const io = getIO();
        io.emit("new_alert", {
          ...newAlert.toObject(),
          patientNom: patient.nom,
          priorite: niveauRisque === "Élevé" ? "Critique" : "A_surveiller",
        });
      } catch (socketErr) {
        console.warn("Socket emit failed:", socketErr.message);
      }
    }


    // Update patient's risk level and status
    await Patient.findByIdAndUpdate(patientId, { 
      derniereAnalyseIA: new Date(),
      niveauRisque: niveauRisque,
      etat: niveauRisque === "Élevé" ? "Critique" : (niveauRisque === "Modéré" ? "Modéré" : "Stable")
    });

    res.status(201).json(ecg);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/ecg/patient/:patientId
 * @desc  Get all ECG records for a patient
 */
router.get("/patient/:patientId", async (req, res, next) => {
  try {
    const records = await ECGRecord.find({ patient: req.params.patientId })
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/ecg/:id
 * @desc  Get a single ECG record with full signal data
 */
router.get("/:id", async (req, res, next) => {
  try {
    const ecg = await ECGRecord.findById(req.params.id)
      .populate("patient", "nom prenom age cin");
    
    if (!ecg) {
      const err = new Error("ECG Record not found");
      err.statusCode = 404;
      return next(err);
    }

    res.json(ecg);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/ecg/:id/review
 * @desc  Cardiologist reviews and validates AI findings
 */
router.put("/:id/review", async (req, res, next) => {
  try {
    const { decisionIA, annotationMedecin } = req.body;
    
    if (!["confirmé", "rejeté", "corrigé"].includes(decisionIA)) {
       const err = new Error("Décision invalide");
       err.statusCode = 400;
       return next(err);
    }

    const ecg = await ECGRecord.findByIdAndUpdate(
      req.params.id,
      { 
        decisionIA, 
        annotationMedecin, 
        revue: true 
      },
      { new: true }
    );

    if (!ecg) {
      const err = new Error("Enregistrement ECG non trouvé");
      err.statusCode = 404;
      return next(err);
    }

    res.json(ecg);
  } catch (error) {
    next(error);
  }
});

router.put("/:id/annotation", async (req, res, next) => {
  try {
    const { annotationMedecin } = req.body;
    const ecg = await ECGRecord.findByIdAndUpdate(
      req.params.id,
      { annotationMedecin, revue: true },
      { new: true }
    );

    if (!ecg) {
      const err = new Error("ECG Record not found");
      err.statusCode = 404;
      return next(err);
    }

    res.json(ecg);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/ecg/:id/annotations_temp
 * @desc  Add a temporal annotation to a specific period of the ECG
 */
router.put("/:id/annotations_temp", async (req, res, next) => {
  try {
    const { startTime, endTime, note } = req.body;

    if (startTime === undefined || endTime === undefined || !note) {
      const err = new Error("Les données de l'annotation sont incomplètes (startTime, endTime, note).");
      err.statusCode = 400;
      return next(err);
    }

    const ecg = await ECGRecord.findById(req.params.id);
    if (!ecg) {
      const err = new Error("ECG Record not found");
      err.statusCode = 404;
      return next(err);
    }

    ecg.annotationsTemporelles.push({
      startTime,
      endTime,
      note,
      medecinId: req.user._id
    });

    const updatedEcg = await ecg.save();
    res.json(updatedEcg);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
