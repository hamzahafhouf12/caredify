/**
 * SHARED ALERT ROUTES — /api/alerts/*
 *
 * Accessible par : admin, cardiologist, clinic
 */
const router = require('express').Router();
const ctrl   = require('../../controllers/alertController');
const { protect, requireRole } = require('../../middleware/auth');

const medicalAccess = requireRole('admin', 'cardiologist', 'cardiologue', 'medecin', 'clinic');

router.use(protect);

// Stats Dashboard Cardiologue (remplace l'ancien /api/dashboard/stats du repo partagé)
router.get('/stats', medicalAccess, ctrl.getStats);

router.get ('/',       medicalAccess, ctrl.getAlerts);
router.post('/',       medicalAccess, ctrl.createAlert);
router.patch('/:id/lue', medicalAccess, ctrl.markAsRead);

module.exports = router;
