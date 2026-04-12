const router = require('express').Router();
const ctrl   = require('../../controllers/clinicController');
const { protect, adminOnly } = require('../../middleware/auth');

router.use(protect, adminOnly);

router.get   ('/',            ctrl.getClinics);
router.post  ('/',            ctrl.createClinic);
router.get   ('/:id',         ctrl.getClinic);
router.put   ('/:id',         ctrl.updateClinic);
router.patch ('/:id/status',  ctrl.updateStatus);
router.put   ('/:id/license', ctrl.updateLicense);
router.delete('/:id',         ctrl.deleteClinic);

module.exports = router;
