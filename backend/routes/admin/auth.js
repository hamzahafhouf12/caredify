const router = require('express').Router();
const ctrl   = require('../../controllers/authController');
const { protect, adminOnly } = require('../../middleware/auth');

// Login admin (avec refresh token + audit log)
router.post('/login',           ctrl.adminLogin);
router.post('/logout',  protect, ctrl.logout);
router.get ('/me',      protect, ctrl.me);
router.post('/refresh',          ctrl.refreshToken);
router.put ('/change-password', protect, adminOnly, ctrl.changePassword);

module.exports = router;
