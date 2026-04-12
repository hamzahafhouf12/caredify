/**
 * PATIENT CONTROLLER — CAREDIFY (unified)
 *
 * Filtrage selon le rôle appelant :
 *  - admin       → tous les patients
 *  - cardiologist → ses propres patients (medecin: req.user._id)
 *  - clinic       → patients de sa clinique (clinicId: req.user.clinicId)
 */

const Patient  = require('../models/Patient');
const { AppError, asyncHandler } = require('../middleware/error');

// ────────────────────────────────────────────────────────────
// GET /api/patients
// ────────────────────────────────────────────────────────────
exports.getPatients = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, etat, search } = req.query;
  const filter = { deletedAt: null };

  // Filtrage par rôle
  if (req.user.role === 'cardiologist' || req.user.role === 'cardiologue' || req.user.role === 'medecin') {
    filter.medecin = req.user._id;
  } else if (req.user.role === 'clinic') {
    filter.clinicId = req.user.clinicId;
  }
  // admin → pas de filtre supplémentaire

  if (etat)   filter.etat = etat;
  if (search) filter.$or  = [
    { nom:    { $regex: search, $options: 'i' } },
    { prenom: { $regex: search, $options: 'i' } },
    { cin:    { $regex: search, $options: 'i' } },
  ];

  const [total, patients] = await Promise.all([
    Patient.countDocuments(filter),
    Patient.find(filter)
      .populate('medecin',      'firstName lastName email')
      .populate('clinicId',     'name')
      .populate('dispositifECG','serialNumber model status')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit),
  ]);

  res.json({
    success: true,
    data:    patients,
    pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) },
  });
});

// ────────────────────────────────────────────────────────────
// GET /api/patients/:id
// ────────────────────────────────────────────────────────────
exports.getPatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ _id: req.params.id, deletedAt: null })
    .populate('medecin',       'firstName lastName email')
    .populate('clinicId',      'name status')
    .populate('dispositifECG', 'serialNumber model status batteryLevel');

  if (!patient) throw new AppError('Patient non trouvé', 404);

  // Contrôle d'accès
  _checkAccess(req.user, patient);

  res.json({ success: true, data: patient });
});

// ────────────────────────────────────────────────────────────
// POST /api/patients
// ────────────────────────────────────────────────────────────
exports.createPatient = asyncHandler(async (req, res) => {
  const { cin, nom, prenom, age, adresse, etat, clinicId, dispositifECG, telephone, dateNaissance } = req.body;

  if (await Patient.findOne({ cin, deletedAt: null })) {
    throw new AppError('Un patient avec ce CIN existe déjà', 400);
  }

  // Le médecin référent est l'utilisateur connecté (sauf admin qui peut le préciser)
  const medecin = req.body.medecin || req.user._id;

  // La clinique par défaut est celle du user connecté (si rôle clinic)
  const clinic = clinicId || (req.user.role === 'clinic' ? req.user.clinicId : null);

  const patient = await Patient.create({
    cin, nom, prenom: prenom || '', age, adresse: adresse || '',
    etat: etat || 'Stable', medecin, clinicId: clinic,
    telephone:     telephone     || null,
    dateNaissance: dateNaissance || null,
    dispositifECG: dispositifECG || null,
  });

  res.status(201).json({ success: true, data: patient });
});

// ────────────────────────────────────────────────────────────
// PUT /api/patients/:id
// ────────────────────────────────────────────────────────────
exports.updatePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ _id: req.params.id, deletedAt: null });
  if (!patient) throw new AppError('Patient non trouvé', 404);

  _checkAccess(req.user, patient);

  const allowed = ['cin', 'nom', 'prenom', 'age', 'adresse', 'etat', 'telephone', 'dateNaissance', 'dispositifECG', 'clinicId', 'medecin'];
  allowed.forEach((k) => {
    if (req.body[k] !== undefined) patient[k] = req.body[k];
  });

  const updated = await patient.save();
  res.json({ success: true, data: updated });
});

// ────────────────────────────────────────────────────────────
// DELETE /api/patients/:id  (soft delete — admin uniquement)
// ────────────────────────────────────────────────────────────
exports.deletePatient = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Seul un administrateur peut supprimer un patient', 403);
  }

  const patient = await Patient.findOne({ _id: req.params.id, deletedAt: null });
  if (!patient) throw new AppError('Patient non trouvé', 404);

  await Patient.findByIdAndUpdate(patient._id, { deletedAt: new Date() });
  res.json({ success: true, message: 'Patient supprimé avec succès' });
});

// ────────────────────────────────────────────────────────────
// Helper : contrôle d'accès
// ────────────────────────────────────────────────────────────
function _checkAccess(user, patient) {
  if (user.role === 'admin') return;

  if (user.role === 'cardiologist' || user.role === 'cardiologue' || user.role === 'medecin') {
    if (patient.medecin.toString() !== user._id.toString()) {
      throw new AppError('Non autorisé à accéder à ce patient', 403);
    }
    return;
  }

  if (user.role === 'clinic') {
    if (!patient.clinicId || patient.clinicId.toString() !== user.clinicId?.toString()) {
      throw new AppError('Non autorisé à accéder à ce patient', 403);
    }
    return;
  }

  throw new AppError('Accès refusé', 403);
}
