const router = require('express').Router();
const ctrl   = require('../../controllers/auditController');
const { protect, adminOnly } = require('../../middleware/auth');

router.use(protect, adminOnly);

router.get('/',        ctrl.getLogs);
router.get('/summary', ctrl.getSummary);
router.get('/export',  ctrl.exportLogs);

module.exports = router;
