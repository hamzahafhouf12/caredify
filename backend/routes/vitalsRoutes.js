const express = require("express");
const router = express.Router();
const Vitals = require("../models/Vitals");
const Patient = require("../models/Patient");
const { protect, doctor } = require("../middleware/authMiddleware");

router.use(protect);
router.use(doctor);

/**
 * @route POST /api/vitals
 * @desc  Create a new vitals record (manual entry by doctor)
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      patientId,
      frequenceCardiaque,
      hrv,
      spo2,
      tensionSystolique,
      tensionDiastolique,
      temperature,
      ecgNote,
      source,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: "patientId est requis" });
    }

    // Verify the patient belongs to this doctor
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient non trouvé" });
    }
    if (
      patient.medecin.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    const vitals = await Vitals.create({
      patient: patientId,
      medecin: req.user._id,
      frequenceCardiaque: frequenceCardiaque || null,
      hrv: hrv || null,
      spo2: spo2 || null,
      tensionSystolique: tensionSystolique || null,
      tensionDiastolique: tensionDiastolique || null,
      temperature: temperature || null,
      ecgNote: ecgNote || null,
      source: source || "manual",
    });

    res.status(201).json(vitals);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/vitals/patient/:patientId
 * @desc  Get all vitals for a patient
 */
router.get("/patient/:patientId", async (req, res, next) => {
  try {
    const vitals = await Vitals.find({ patient: req.params.patientId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(vitals);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/vitals/:id
 * @desc  Delete a vitals record
 */
router.delete("/:id", async (req, res, next) => {
  try {
    await Vitals.findByIdAndDelete(req.params.id);
    res.json({ message: "Supprimé" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
