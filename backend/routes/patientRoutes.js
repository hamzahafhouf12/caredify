const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const { protect, doctor } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { createPatientSchema, updatePatientSchema } = require("../validators/Patient.validators");

router.use(protect);
router.use(doctor);

/**
 * @route GET /api/patients
 */
router.get("/", async (req, res, next) => {
  try {
    const query = req.user.role === "admin" ? {} : { medecin: req.user._id };
    const patients = await Patient.find(query);
    res.json(patients);
  } catch (error) {
    next(error);
  }
});

const Alert = require("../models/Alert");
const Vitals = require("../models/Vitals");
const ECGRecord = require("../models/Ecgrecord");

/**
 * @route GET /api/patients/:id
 */
router.get("/:id", async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      const err = new Error("Patient non trouvé");
      err.statusCode = 404;
      return next(err);
    }

    // Check if authorized
    if (patient.medecin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      const err = new Error("Non autorisé à voir ce patient");
      err.statusCode = 403;
      return next(err);
    }

    // Parallel fetch related data
    const [alerts, vitals, ecgs] = await Promise.all([
      Alert.find({ patient: patient._id }).sort({ createdAt: -1 }).limit(10),
      Vitals.find({ patient: patient._id }).sort({ createdAt: -1 }).limit(20),
      ECGRecord.find({ patient: patient._id }).sort({ createdAt: -1 }).limit(5),
    ]);

    res.json({
      ...patient._doc,
      alerts,
      vitalsHistory: vitals,
      ecgHistory: ecgs,
      lastVitals: vitals[0] || null,
      lastEcg: ecgs[0] || null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/patients/:id/full-history
 * @desc  Get more extensive history for trends (100 pts)
 */
router.get("/:id/full-history", async (req, res, next) => {
  const { id } = req.params;
  
  // Basic ID validation
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ message: "ID Patient invalide" });
  }

  try {
    const patient = await Patient.findById(id);
    if (!patient) return res.status(404).json({ message: "Patient non trouvé" });

    // Check if authorized
    const isDoctor = patient.medecin?.toString() === req.user._id?.toString();
    const isAdmin = req.user.role === "admin";
    
    if (!isDoctor && !isAdmin) {
      return res.status(403).json({ message: "Non autorisé à voir l'historique de ce patient" });
    }

    const days = parseInt(req.query.days) || 30;
    const limit = days > 60 ? 1000 : 200; // Increase limit for longer periods
    const startDate = days === -1 ? new Date(0) : new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const matchQuery = { 
      patient: id,
      createdAt: { $gte: startDate }
    };

    let vitals;
    if (days > 30 || days === -1) {
      // Aggregate by day for long term trends
      vitals = await Vitals.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            frequenceCardiaque: { $avg: "$frequenceCardiaque" },
            hrv: { $avg: "$hrv" },
            spo2: { $avg: "$spo2" },
            temperature: { $avg: "$temperature" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            createdAt: "$_id",
            frequenceCardiaque: { $round: ["$frequenceCardiaque", 0] },
            hrv: { $round: ["$hrv", 0] },
            spo2: { $round: ["$spo2", 1] },
            temperature: { $round: ["$temperature", 1] }
          }
        }
      ]);
    } else {
      vitals = await Vitals.find(matchQuery).sort({ createdAt: 1 }).limit(limit);
    }

    const [ecgs, alerts] = await Promise.all([
      ECGRecord.find(matchQuery).sort({ createdAt: 1 }).limit(limit),
      Alert.find(matchQuery).sort({ createdAt: -1 }).limit(100),
    ]);

    res.json({
      vitalsHistory: vitals,
      ecgHistory: ecgs,
      alertsHistory: alerts,
      period: days
    });
  } catch (error) {
    console.error("❌ Erreur full-history:", error);
    next(error);
  }
});


/**
 * @route POST /api/patients
 */
router.post("/", validate(createPatientSchema), async (req, res, next) => {
  try {
    const { cin, nom, age, adresse, etat } = req.body;

    const patientExists = await Patient.findOne({ cin });
    if (patientExists) {
      const err = new Error("Un patient avec ce CIN existe déjà");
      err.statusCode = 400;
      return next(err);
    }

    const patient = new Patient({
      cin, nom, age, adresse,
      etat: etat || "Stable",
      medecin: req.user._id,
    });

    const createdPatient = await patient.save();
    res.status(201).json(createdPatient);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/patients/:id
 */
router.put("/:id", validate(updatePatientSchema), async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      const err = new Error("Patient non trouvé");
      err.statusCode = 404;
      return next(err);
    }

    if (patient.medecin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      const err = new Error("Non autorisé à modifier ce patient");
      err.statusCode = 403;
      return next(err);
    }

    patient.cin = req.body.cin || patient.cin;
    patient.nom = req.body.nom || patient.nom;
    patient.age = req.body.age !== undefined ? req.body.age : patient.age;
    patient.adresse = req.body.adresse !== undefined ? req.body.adresse : patient.adresse;
    patient.etat = req.body.etat || patient.etat;
    
    // Nouveaux champs médicaux
    if (req.body.groupeSanguin !== undefined) patient.groupeSanguin = req.body.groupeSanguin;
    if (req.body.antecedents !== undefined) patient.antecedents = req.body.antecedents;
    if (req.body.traitementsEnCours !== undefined) patient.traitementsEnCours = req.body.traitementsEnCours;
    if (req.body.observations !== undefined) patient.observations = req.body.observations;

    const updatedPatient = await patient.save();
    res.json(updatedPatient);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/patients/:id
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      const err = new Error("Patient non trouvé");
      err.statusCode = 404;
      return next(err);
    }

    if (req.user.role !== "admin") {
      const err = new Error("Seul un administrateur peut supprimer un patient");
      err.statusCode = 403;
      return next(err);
    }

    await patient.deleteOne();
    res.json({ message: "Patient supprimé avec succès" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;