const router = require('express').Router();
const ctrl   = require('../../controllers/dashboardController');
const { protect, adminOnly } = require('../../middleware/auth');

router.use(protect, adminOnly);

router.get('/overview',    ctrl.getOverview);
router.get('/trends',      ctrl.getTrends);
router.get('/security',    ctrl.getSecurityOverview);
router.get('/performance', ctrl.getPerformance);

module.exports = router;
