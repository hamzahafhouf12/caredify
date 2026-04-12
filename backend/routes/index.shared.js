/**
 * SHARED ROUTES — /api/*
 * Routes accessibles par tous les dashboards :
 *  - Auth (register, login, OTP…)
 *  - Patients
 *  - Alertes
 *  - Health check
 */
const router = require('express').Router();

router.use('/auth',     require('./shared/auth'));
router.use('/patients', require('./shared/patients'));
router.use('/alerts',   require('./shared/alerts'));

router.get('/health', (req, res) => res.json({
  success:   true,
  service:   'CAREDIFY API',
  timestamp: new Date(),
  uptime:    process.uptime(),
}));

module.exports = router;
