const router = require('express').Router();
const ctrl   = require('../../controllers/deviceController');
const { protect, adminOnly } = require('../../middleware/auth');

router.use(protect, adminOnly);

router.get   ('/',                    ctrl.getDevices);
router.get   ('/stats',               ctrl.getStats);
router.post  ('/',                    ctrl.createDevice);
router.put   ('/:id',                 ctrl.updateDevice);
router.patch ('/:id/assign',          ctrl.assignDevice);
router.post  ('/:id/firmware-update', ctrl.firmwareUpdate);
router.delete('/:id',                 ctrl.deleteDevice);

module.exports = router;
