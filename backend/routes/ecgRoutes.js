const express = require("express");
const router = express.Router();
const ECGRecord = require("../models/Ecgrecord");
const Patient = require("../models/Patient");
const { protect, doctor } = require("../middleware/authMiddleware");
const { analyzeECG } = require("../utils/aiService");

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
 * @desc  Create a new ECG record — déclenche l'analyse IA automatique si pas d'interprétations fournies
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

    // ─── Analyse IA automatique ───────────────────────────────────────────
    // Si le frontend ne fournit pas d'interprétations IA (ou envoi partiel),
    // on appelle le micro-service Python pour analyser le signal.
    let finalIA = iaInterpretations || {};

    const needsAIAnalysis = signalData && signalData.length > 50 && (
      !iaInterpretations ||
      !iaInterpretations.resumeIA ||
      iaInterpretations.resumeIA === ""
    );

    if (needsAIAnalysis) {
      try {
        console.log(`[ECG Route] 🤖 Appel IA pour patient ${patientId} (${signalData.length} pts)`);
        finalIA = await analyzeECG(signalData, frequenceEchantillonnage || 250);
        console.log(`[ECG Route] ✅ IA: score=${finalIA.scoreRisque}, classe dominante détectée`);
      } catch (aiErr) {
        console.warn("[ECG Route] ⚠️ Analyse IA échouée, utilisation des interprétations fournies:", aiErr.message);
        finalIA = iaInterpretations || {};
      }
    }

    const ecg = await ECGRecord.create({
      patient: patientId,
      medecin: req.user._id,
      signalData: signalData || [],
      frequenceEchantillonnage: frequenceEchantillonnage || 250,
      source: source || "simulation",
      iaInterpretations: finalIA,
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
 * @route POST /api/ecg/:id/reanalyze
 * @desc  Lance/relance l'analyse IA sur un ECG existant (depuis la Boîte ECG)
 */
router.post("/:id/reanalyze", async (req, res, next) => {
  try {
    const ecg = await ECGRecord.findById(req.params.id).populate("patient", "nom prenom");
    if (!ecg) {
      const err = new Error("ECG Record not found");
      err.statusCode = 404;
      return next(err);
    }

    if (!ecg.signalData || ecg.signalData.length < 50) {
      return res.status(400).json({ message: "Signal ECG insuffisant pour l'analyse." });
    }

    console.log(`[ECG Route] 🔄 Re-analyse IA demandée pour ECG ${req.params.id}`);
    const newIA = await analyzeECG(ecg.signalData, ecg.frequenceEchantillonnage || 250);

    const updated = await ECGRecord.findByIdAndUpdate(
      req.params.id,
      { iaInterpretations: newIA, decisionIA: "en_attente" },
      { new: true }
    ).populate("patient", "nom prenom age cin");

    // Mise à jour du niveau de risque patient
    const { scoreRisque, arythmie, fibrillationAuriculaire } = newIA;
    const probas   = newIA.detailedClassification || {};
    const hasAnomaly = (probas.pvc > 0.6 || probas.sveb > 0.6 || probas.fusion > 0.6);
    let niveauRisque = "Faible";
    if (scoreRisque >= 70 || fibrillationAuriculaire || hasAnomaly) niveauRisque = "Élevé";
    else if (scoreRisque >= 40 || arythmie) niveauRisque = "Modéré";

    await require("../models/Patient").findByIdAndUpdate(ecg.patient._id || ecg.patient, {
      derniereAnalyseIA: new Date(),
      niveauRisque,
      etat: niveauRisque === "Élevé" ? "Critique" : (niveauRisque === "Modéré" ? "Modéré" : "Stable"),
    });

    console.log(`[ECG Route] ✅ Re-analyse terminée: score=${scoreRisque}, risque=${niveauRisque}`);
    res.json(updated);
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

/**
 * @route PUT /api/ecg/:id/annotation
 * @desc  Save doctor's text annotation on an ECG record
 */
router.put("/:id/annotation", async (req, res, next) => {
  try {
    const { annotationMedecin } = req.body;
    const ecg = await ECGRecord.findByIdAndUpdate(
      req.params.id,
      { annotationMedecin },
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
 * @desc  Add a temporal annotation (marker) on a specific ECG data point
 */
router.put("/:id/annotations_temp", async (req, res, next) => {
  try {
    const { index, label, color } = req.body;

    const ecg = await ECGRecord.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          annotationsTemporelles: { index, label, color: color || "#ef4444" }
        }
      },
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

module.exports = router;
