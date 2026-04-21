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
    const { scoreRisque, arythmie, fibrillationAuriculaire, resumeIA, detailedClassification } = ecg.iaInterpretations;
    let niveauRisque = "Faible";
    
    // Predominant class from detailed model
    const probas = detailedClassification || {};
    const hasAnomaly = (probas.pvc > 0.6 || probas.sveb > 0.6 || probas.fusion > 0.6);

    if (scoreRisque >= 70 || fibrillationAuriculaire || hasAnomaly) {
      niveauRisque = "Élevé";
    } else if (scoreRisque >= 40 || arythmie || (probas.pvc > 0.3 || probas.sveb > 0.3)) {
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
    const { annotationMedecin, decisionIA, revue } = req.body;
    const ecg = await ECGRecord.findByIdAndUpdate(
      req.params.id,
      { annotationMedecin, decisionIA, revue },
      { new: true }
    );
    res.json(ecg);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
