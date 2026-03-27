const express = require("express");
const Patient = require("../models/Patient");
const Alert = require("../models/Alert");
const { protect, doctor } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @route GET /api/dashboard/stats
 * @desc Gets all necessary stats for the Cardiologue Dashboard
 */
router.get("/stats", protect, doctor, async (req, res) => {
  try {
    const medecinId = req.user._id;

    // Only count patients and alerts assigned to the logged in doctor
    const totalPatients = await Patient.countDocuments({ medecin: medecinId });
    const urgentesCount = await Alert.countDocuments({ medecin: medecinId, type: "Urgente", lue: false });
    
    // Fetch top 5 urgent alerts
    const urgentesList = await Alert.find({ medecin: medecinId, type: "Urgente" })
      .populate("patient", "nom prenom")
      .sort({ createdAt: -1 })
      .limit(5);

    // Fetch top 5 moderate alerts
    const moderesList = await Alert.find({ medecin: medecinId, type: "Modéré" })
      .populate("patient", "nom prenom")
      .sort({ createdAt: -1 })
      .limit(5);

    // Top 4 recent patients
    const recentPatients = await Patient.find({ medecin: medecinId })
      .sort({ createdAt: -1 })
      .limit(4);

    res.json({
      totalPatients,
      urgentesCount,
      urgentesList,
      moderesList,
      recentPatients
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des statistiques" });
  }
});

module.exports = router;
