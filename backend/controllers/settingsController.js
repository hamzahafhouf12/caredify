const Settings = require('../models/Settings');
const AuditLog = require('../models/AuditLog');
const { asyncHandler } = require('../middleware/error');

// ── GET /api/admin/settings ──────────────────────────────────
exports.getSettings = asyncHandler(async (req, res) => {
  const filter   = req.query.group ? { group: req.query.group } : {};
  const settings = await Settings.find(filter).sort({ group: 1, key: 1 });

  const grouped = settings.reduce((acc, s) => {
    if (!acc[s.group]) acc[s.group] = {};
    acc[s.group][s.key] = { value: s.value, description: s.description, isPublic: s.isPublic };
    return acc;
  }, {});

  res.json({ success: true, data: grouped });
});

// ── PUT /api/admin/settings ──────────────────────────────────
exports.updateSettings = asyncHandler(async (req, res) => {
  const { settings } = req.body;
  if (!Array.isArray(settings) || !settings.length) {
    return res.status(400).json({ success: false, message: 'Settings array required.' });
  }

  const updated = await Promise.all(
    settings.map((s) =>
      Settings.findOneAndUpdate(
        { key: s.key },
        { ...s, updatedBy: req.user._id },
        { upsert: true, new: true }
      )
    )
  );

  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action: 'SETTINGS_UPDATE', resource: 'Settings',
    ipAddress: req.ip, status: 'success',
    description: `Updated: ${settings.map((s) => s.key).join(', ')}`,
  });

  res.json({ success: true, data: updated });
});

// ── GET /api/admin/settings/countries ───────────────────────
exports.getCountries = asyncHandler(async (req, res) => {
  const countries = await Settings.get('supported_countries', [
    { code: 'FR', name: 'France',         currency: 'EUR', timezone: 'Europe/Paris',      language: 'fr' },
    { code: 'TN', name: 'Tunisie',        currency: 'TND', timezone: 'Africa/Tunis',      language: 'ar' },
    { code: 'MA', name: 'Maroc',          currency: 'MAD', timezone: 'Africa/Casablanca', language: 'fr' },
    { code: 'DZ', name: 'Algérie',        currency: 'DZD', timezone: 'Africa/Algiers',    language: 'fr' },
    { code: 'US', name: 'United States',  currency: 'USD', timezone: 'America/New_York',  language: 'en' },
    { code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London',     language: 'en' },
    { code: 'DE', name: 'Deutschland',    currency: 'EUR', timezone: 'Europe/Berlin',     language: 'de' },
  ]);
  res.json({ success: true, data: countries });
});
