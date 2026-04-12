require('dotenv').config();
const express       = require('express');
const http          = require('http');
const cors          = require('cors');
const helmet        = require('helmet');
const compression   = require('compression');
const morgan        = require('morgan');
const rateLimit     = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB                  = require('./config/database');
const adminRoutes                = require('./routes/index.admin');
const sharedRoutes               = require('./routes/index.shared');
const { errorHandler, notFound } = require('./middleware/error');

const app    = express();
const server = http.createServer(app);

// ── Security ────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin:      process.env.FRONTEND_URL || '*',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ───────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests.' },
  skip: (req) => req.path.includes('/health'),
}));

// ── Parsing & utilities ─────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.set('trust proxy', 1);

// ── Routes ──────────────────────────────────────────────────
// Shared routes: auth, patients, alerts — used by ALL dashboards
app.use('/api', sharedRoutes);

// Admin-only routes: users, clinics, devices, tickets, audit, settings, dashboard-admin
app.use('/api/admin', adminRoutes);

// ── Error handlers ──────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ───────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;

const start = async () => {
  await connectDB();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CAREDIFY API running on port ${PORT}`);
    console.log(`📋 Shared API : http://localhost:${PORT}/api`);
    console.log(`🔐 Admin  API : http://localhost:${PORT}/api/admin`);
    console.log(`❤️  Health    : http://localhost:${PORT}/api/health`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT',  () => server.close(() => process.exit(0)));
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

start();
module.exports = { app, server };
