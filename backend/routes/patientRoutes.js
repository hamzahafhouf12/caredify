const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const { protect, doctor } = require("../middleware/authMiddleware");

// All routes are protected and require at least doctor access
router.use(protect);
router.use(doctor);

/**
 * @route GET /api/patients
 * @desc Get all patients for the logged-in doctor
 */
router.get("/", async (req, res) => {
  try {
    const query = req.user.role === "admin" ? {} : { medecin: req.user._id };
    const patients = await Patient.find(query);
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des patients" });
  }
});

/**
 * @route GET /api/patients/:id
 * @desc Get a single patient
 */
router.get("/:id", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: "Patient non trouvé" });
    }

    // Verify ownership or admin
    if (patient.medecin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Non autorisé à voir ce patient" });
    }

    res.json(patient);
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Patient non trouvé (ID invalide)" });
    }
    res.status(500).json({ message: "Erreur lors de la récupération du patient" });
  }
});

/**
 * @route POST /api/patients
 * @desc Create a new patient
 */
router.post("/", async (req, res) => {
  const { cin, nom, age, adresse, etat } = req.body;

  try {
    const patientExists = await Patient.findOne({ cin });
    if (patientExists) {
      return res.status(400).json({ message: "Un patient avec ce CIN existe déjà" });
    }

    const patient = new Patient({
      cin,
      nom,
      age,
      adresse,
      etat: etat || "Stable",
      medecin: req.user._id,
    });

    const createdPatient = await patient.save();
    res.status(201).json(createdPatient);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création du patient", error: error.message });
  }
});

/**
 * @route PUT /api/patients/:id
 * @desc Update a patient
 */
router.put("/:id", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: "Patient non trouvé" });
    }

    // Verify ownership or admin
    if (patient.medecin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Non autorisé à modifier ce patient" });
    }

    patient.cin = req.body.cin || patient.cin;
    patient.nom = req.body.nom || patient.nom;
    patient.age = req.body.age || patient.age;
    patient.adresse = req.body.adresse || patient.adresse;
    patient.etat = req.body.etat || patient.etat;

    const updatedPatient = await patient.save();
    res.json(updatedPatient);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la modification du patient" });
  }
});

/**
 * @route DELETE /api/patients/:id
 * @desc Delete a patient (Admin only example, or doctor can delete their own)
 */
router.delete("/:id", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: "Patient non trouvé" });
    }

    // Check if user is admin, otherwise restrict deletion
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Seul un administrateur peut supprimer un patient" });
    }

    await patient.deleteOne();
    res.json({ message: "Patient supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression du patient" });
  }
});

module.exports = router;
