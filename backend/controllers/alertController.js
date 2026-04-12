/**
 * ALERT CONTROLLER — CAREDIFY
 *
 * Utilisé par :
 *  - Dashboard Cardiologue : ses propres alertes
 *  - Dashboard Clinique    : alertes de ses patients
 *  - Dashboard Admin       : stats globales (via dashboardController)
 */

const Alert   = require('../models/Alert');
const Patient = require('../models/Patient');
const { AppError, asyncHandler } = require('../middleware/error');

// ────────────────────────────────────────────────────────────
// GET /api/alerts
// ────────────────────────────────────────────────────────────
exports.getAlerts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, lue } = req.query;
  const filter = {};

  if (req.user.role === 'cardiologist' || req.user.role === 'cardiologue' || req.user.role === 'medecin') {
    filter.medecin = req.user._id;
  } else if (req.user.role === 'clinic') {
    filter.clinicId = req.user.clinicId;
  }

  if (type !== undefined) filter.type = type;
  if (lue  !== undefined) filter.lue  = lue === 'true';

  const [total, alerts] = await Promise.all([
    Alert.countDocuments(filter),
    Alert.find(filter)
      .populate('patient', 'nom prenom cin etat')
      .populate('medecin', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit),
  ]);

  res.json({
    success: true, data: alerts,
    pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) },
  });
});

// ────────────────────────────────────────────────────────────
// POST /api/alerts
// ────────────────────────────────────────────────────────────
exports.createAlert = asyncHandler(async (req, res) => {
  const { patientId, type, detail } = req.body;

  const patient = await Patient.findOne({ _id: patientId, deletedAt: null });
  if (!patient) throw new AppError('Patient non trouvé', 404);

  const alert = await Alert.create({
    patient:  patientId,
    medecin:  req.body.medecin  || req.user._id,
    clinicId: patient.clinicId  || null,
    type,
    detail,
  });

  res.status(201).json({ success: true, data: alert });
});

// ────────────────────────────────────────────────────────────
// PATCH /api/alerts/:id/lue  — marquer comme lue
// ────────────────────────────────────────────────────────────
exports.markAsRead = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) throw new AppError('Alerte non trouvée', 404);

  alert.lue = true;
  await alert.save();
  res.json({ success: true, data: alert });
});

// ────────────────────────────────────────────────────────────
// GET /api/alerts/stats  — stats pour Dashboard Cardiologue
// ────────────────────────────────────────────────────────────
exports.getStats = asyncHandler(async (req, res) => {
  const medecinId = req.user._id;

  const [totalPatients, urgentesCount, urgentesList, moderesList, recentPatients] = await Promise.all([
    Patient.countDocuments({ medecin: medecinId, deletedAt: null }),
    Alert.countDocuments({ medecin: medecinId, type: 'Urgente', lue: false }),
    Alert.find({ medecin: medecinId, type: 'Urgente' })
      .populate('patient', 'nom prenom')
      .sort({ createdAt: -1 })
      .limit(5),
    Alert.find({ medecin: medecinId, type: 'Modéré' })
      .populate('patient', 'nom prenom')
      .sort({ createdAt: -1 })
      .limit(5),
    Patient.find({ medecin: medecinId, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(4),
  ]);

  res.json({
    success: true,
    data: { totalPatients, urgentesCount, urgentesList, moderesList, recentPatients },
  });
});
