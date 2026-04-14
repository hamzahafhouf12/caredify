const express = require("express");
const router = express.Router();
const Alert = require("../models/Alert");
const Patient = require("../models/Patient");
const { protect, doctor } = require("../middleware/authMiddleware");

/**
 * @route GET /api/alerts
 * @desc  Get all alerts for the logged in doctor, sorted by priority then date
 */
router.get("/", protect, doctor, async (req, res, next) => {
  try {
    const alerts = await Alert.find({ medecin: req.user._id })
      .populate("patient", "nom prenom cin")
      .sort({ createdAt: -1 });

    // Sort: Critique first, then A_surveiller, then Normal
    const priorityOrder = { Critique: 0, A_surveiller: 1, Normal: 2 };
    alerts.sort((a, b) => {
      const po = (priorityOrder[a.priorite] ?? 3) - (priorityOrder[b.priorite] ?? 3);
      if (po !== 0) return po;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/alerts
 * @desc  Create a manual alert + emit Socket.io notification
 */
router.post("/", protect, doctor, async (req, res, next) => {
  try {
    const { patientId, type, priorite, detail, source } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      const err = new Error("Patient non trouvé");
      err.statusCode = 404;
      return next(err);
    }

    const alert = await Alert.create({
      patient: patientId,
      medecin: req.user._id,
      type: type || "Info",
      priorite: priorite || "Normal",
      detail,
      source: source || "manuel",
    });

    const populated = await Alert.findById(alert._id).populate("patient", "nom prenom cin");

    // --- Emit real-time Socket.io notification ---
    if (priorite !== "Normal") {
      try {
        const { getIO } = require("../socket");
        const io = getIO();
        io.emit("new_alert", {
          ...populated.toObject(),
          patientNom: patient.nom,
        });
      } catch (socketErr) {
        // Socket not critical — don't fail the request
        console.warn("Socket emit failed:", socketErr.message);
      }
    }

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/alerts/:id/trait
 * @desc  Toggle the 'lue' (read/treated) status of an alert
 */
router.put("/:id/trait", protect, doctor, async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      const err = new Error("Alerte non trouvée");
      err.statusCode = 404;
      return next(err);
    }

    alert.lue = !alert.lue;
    await alert.save();

    res.json(alert);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/alerts/:id/annotation
 * @desc  Update doctor's annotation and status for an alert
 */
router.put("/:id/annotation", protect, doctor, async (req, res, next) => {
  try {
    const { annotationMedecin, statut } = req.body;

    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      {
        annotationMedecin,
        statut: statut || "validée",
        lue: true,
      },
      { new: true }
    ).populate("patient", "nom prenom cin");

    if (!alert) {
      const err = new Error("Alerte non trouvée");
      err.statusCode = 404;
      return next(err);
    }

    res.json(alert);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/alerts/:id
 * @desc  Delete an alert (admin only)
 */
router.delete("/:id", protect, doctor, async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);
    if (!alert) {
      const err = new Error("Alerte non trouvée");
      err.statusCode = 404;
      return next(err);
    }
    res.json({ message: "Alerte supprimée" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

