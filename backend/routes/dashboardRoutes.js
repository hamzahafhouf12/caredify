const express = require("express");
const Patient = require("../models/Patient");
const Alert = require("../models/Alert");
const Message = require("../models/Message");
const Vitals = require("../models/Vitals");
const ECGRecord = require("../models/Ecgrecord");
const { protect, doctor } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @route GET /api/dashboard/stats
 * @desc  Returns all stats needed for the Cardiologue Dashboard
 */
router.get("/stats", protect, doctor, async (req, res, next) => {
  try {
    const medecinId = req.user._id;

    const [
      totalPatients,
      urgentesCount,
      patientsRisqueEleve,
      urgentesList,
      moderesList,
      infoList,
      recentPatients,
      unreadMessagesCount,
      recentMessages,
      vitalsAvg,
      dernierECG,
      vitalsTrends,
    ] = await Promise.all([
      // Total patients
      Patient.countDocuments({ medecin: medecinId }),

      // Unread urgent alerts count
      Alert.countDocuments({ medecin: medecinId, type: "Urgente", lue: false }),

      // High risk patients (IA)
      Patient.find({ medecin: medecinId, niveauRisque: "Élevé" })
        .select("nom prenom age etat niveauRisque derniereAnalyseIA")
        .sort({ derniereAnalyseIA: -1 })
        .limit(5),

      // Top 5 urgent alerts
      Alert.find({ medecin: medecinId, type: "Urgente" })
        .populate("patient", "nom prenom")
        .sort({ createdAt: -1 })
        .limit(5),

      // Top 5 moderate alerts
      Alert.find({ medecin: medecinId, type: "Modéré" })
        .populate("patient", "nom prenom")
        .sort({ createdAt: -1 })
        .limit(5),

      // Top 5 info alerts
      Alert.find({ medecin: medecinId, type: "Info" })
        .populate("patient", "nom prenom")
        .sort({ createdAt: -1 })
        .limit(5),

      // 4 most recent patients
      Patient.find({ medecin: medecinId })
        .sort({ createdAt: -1 })
        .limit(4),

      // Unread messages count
      Message.countDocuments({ destinataire: medecinId, lue: false }),

      // Last 3 messages
      Message.find({ destinataire: medecinId })
        .populate("expediteur", "nom prenom role")
        .populate("patient", "nom prenom")
        .sort({ createdAt: -1 })
        .limit(3),

      // Average vitals last 30 days
      Vitals.aggregate([
        {
          $match: {
            medecin: medecinId,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: null,
            avgFrequenceCardiaque: { $avg: "$frequenceCardiaque" },
            avgHrv:  { $avg: "$hrv" },
            avgSpo2: { $avg: "$spo2" },
          },
        },
      ]),

      // Last ECG received for this doctor's patients
      ECGRecord.findOne({ medecin: medecinId })
        .populate("patient", "nom prenom")
        .sort({ createdAt: -1 })
        .select("patient createdAt signalData iaInterpretations annotationMedecin revue decisionIA"),

      // Trends (Daily averages last 7 days)
      Vitals.aggregate([
        {
          $match: {
            medecin: medecinId,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            avgFrequenceCardiaque: { $avg: "$frequenceCardiaque" },
            avgHrv:  { $avg: "$hrv" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const vitals = vitalsAvg[0]
      ? {
          avgFrequenceCardiaque: Math.round(vitalsAvg[0].avgFrequenceCardiaque) || null,
          avgHrv:  Math.round(vitalsAvg[0].avgHrv)  || null,
          avgSpo2: Math.round(vitalsAvg[0].avgSpo2) || null,
          trends: vitalsTrends.map(t => ({
            date: t._id,
            hr: Math.round(t.avgFrequenceCardiaque),
            hrv: Math.round(t.avgHrv)
          }))
        }
      : { avgFrequenceCardiaque: null, avgHrv: null, avgSpo2: null, trends: [] };

    res.json({
      totalPatients,
      urgentesCount,
      unreadMessagesCount,
      patientsRisqueEleve,
      dernierECG,
      alerts: {
        urgentes: urgentesList,
        moderes:  moderesList,
        info:     infoList,
      },
      recentPatients,
      recentMessages,
      vitals,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/dashboard/patients-risque
 * @desc  Get all high-risk patients for this doctor
 */
router.get("/patients-risque", protect, doctor, async (req, res, next) => {
  try {
    const { niveau = "Élevé" } = req.query;

    const patients = await Patient.find({
      medecin: req.user._id,
      niveauRisque: niveau,
    })
      .sort({ derniereAnalyseIA: -1 });

    res.json({ total: patients.length, patients });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/dashboard/alerts-summary
 * @desc  Get alert counts by type and status
 */
router.get("/alerts-summary", protect, doctor, async (req, res, next) => {
  try {
    const medecinId = req.user._id;

    const summary = await Alert.aggregate([
      { $match: { medecin: medecinId } },
      {
        $group: {
          _id: { type: "$type", statut: "$statut" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(summary);
  } catch (error) {
    next(error);
  }
});

module.exports = router;