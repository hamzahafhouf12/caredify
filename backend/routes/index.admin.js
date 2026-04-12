/**
 * ADMIN ROUTES — /api/admin/*
 * Toutes les routes réservées au Dashboard Admin.
 */
const router = require('express').Router();

router.use('/auth',      require('./admin/auth'));
router.use('/dashboard', require('./admin/dashboard'));
router.use('/users',     require('./admin/users'));
router.use('/clinics',   require('./admin/clinics'));
router.use('/devices',   require('./admin/devices'));
router.use('/tickets',   require('./admin/tickets'));
router.use('/audit',     require('./admin/audit'));
router.use('/settings',  require('./admin/settings'));

router.get('/health', (req, res) => res.json({
  success:   true,
  service:   'CAREDIFY Admin API v2',
  timestamp: new Date(),
  uptime:    process.uptime(),
}));

module.exports = router;
