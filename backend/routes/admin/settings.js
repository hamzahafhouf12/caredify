const router = require('express').Router();
const ctrl   = require('../../controllers/settingsController');
const { protect, adminOnly } = require('../../middleware/auth');

router.use(protect, adminOnly);

router.get('/countries', ctrl.getCountries);
router.get('/',          ctrl.getSettings);
router.put('/',          ctrl.updateSettings);

module.exports = router;
