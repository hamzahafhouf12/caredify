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

    if (patient.medecin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      const err = new Error("Non autorisé à voir ce patient");
      err.statusCode = 403;
      return next(err);
    }

    res.json(patient);
  } catch (error) {
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
    patient.age = req.body.age || patient.age;
    patient.adresse = req.body.adresse || patient.adresse;
    patient.etat = req.body.etat || patient.etat;

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