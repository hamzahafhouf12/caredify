/**
 * SEED SCRIPT — CAREDIFY
 * Crée le compte admin par défaut et les paramètres initiaux.
 *
 * Usage : node scripts/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');
const Settings = require('../models/Settings');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // ── Admin account ─────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@caredify.com';
  const existing   = await User.findOne({ email: adminEmail });

  if (!existing) {
    await User.create({
      firstName: 'Super',
      lastName:  'Admin',
      email:     adminEmail,
      password:  process.env.ADMIN_PASSWORD || 'Admin@Caredify2024!',
      role:      'admin',
      status:    'active',
      isVerified: true,
      permissions: { read_patients: true, share_data: true, access_shared: true },
    });
    console.log(`✅ Admin created: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin already exists: ${adminEmail}`);
  }

  // ── Default settings ──────────────────────────────────────
  const defaults = [
    { key: 'platform_name',       value: 'CAREDIFY',       group: 'general',    isPublic: true,  description: 'Platform display name' },
    { key: 'platform_version',    value: '2.0.0',          group: 'general',    isPublic: true },
    { key: 'default_currency',    value: 'EUR',            group: 'general',    isPublic: true },
    { key: 'default_language',    value: 'fr',             group: 'general',    isPublic: true },
    { key: 'default_timezone',    value: 'Europe/Paris',   group: 'general',    isPublic: true },
    { key: 'max_login_attempts',  value: 5,                group: 'security',   description: 'Max failed logins before lock' },
    { key: 'session_timeout_min', value: 480,              group: 'security',   description: 'Session timeout in minutes (8h)' },
    { key: 'audit_retention_days',value: 365,              group: 'compliance', description: 'RGPD/HIPAA audit log retention' },
    { key: 'rgpd_enabled',        value: true,             group: 'compliance' },
    { key: 'hipaa_enabled',       value: true,             group: 'compliance' },
    { key: 'hl7_enabled',         value: true,             group: 'integrations' },
    { key: 'fhir_enabled',        value: true,             group: 'integrations' },
    { key: 'trial_duration_days', value: 30,               group: 'billing' },
    {
      key: 'supported_countries', group: 'general', isPublic: true,
      value: [
        { code: 'FR', name: 'France',         currency: 'EUR', timezone: 'Europe/Paris',      language: 'fr' },
        { code: 'TN', name: 'Tunisie',        currency: 'TND', timezone: 'Africa/Tunis',      language: 'ar' },
        { code: 'MA', name: 'Maroc',          currency: 'MAD', timezone: 'Africa/Casablanca', language: 'fr' },
        { code: 'DZ', name: 'Algérie',        currency: 'DZD', timezone: 'Africa/Algiers',    language: 'fr' },
        { code: 'US', name: 'United States',  currency: 'USD', timezone: 'America/New_York',  language: 'en' },
        { code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London',     language: 'en' },
        { code: 'DE', name: 'Deutschland',    currency: 'EUR', timezone: 'Europe/Berlin',     language: 'de' },
      ],
    },
  ];

  for (const s of defaults) {
    await Settings.findOneAndUpdate({ key: s.key }, s, { upsert: true });
  }
  console.log(`✅ ${defaults.length} settings seeded`);

  await mongoose.disconnect();
  console.log('✅ Seeding complete!');
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
