/**
 * SHARED PATIENT ROUTES — /api/patients/*
 *
 * Accessible par : admin, cardiologist, clinic
 * Filtrage automatique selon le rôle (voir patientController).
 */
const router   = require('express').Router();
const ctrl     = require('../../controllers/patientController');
const { protect, requireRole } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { createPatientSchema, updatePatientSchema } = require('../../validators/Patient.validators');

// Tous les rôles médicaux peuvent accéder (filtrés par rôle dans le controller)
const medicalAccess = requireRole('admin', 'cardiologist', 'cardiologue', 'medecin', 'clinic');

router.use(protect);

router.get ('/',    medicalAccess,                              ctrl.getPatients);
router.post('/',    medicalAccess, validate(createPatientSchema), ctrl.createPatient);
router.get ('/:id', medicalAccess,                              ctrl.getPatient);
router.put ('/:id', medicalAccess, validate(updatePatientSchema), ctrl.updatePatient);
router.delete('/:id', requireRole('admin'),                    ctrl.deletePatient);

module.exports = router;
