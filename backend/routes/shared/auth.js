/**
 * SHARED AUTH ROUTES — /api/auth/*
 *
 * Utilisé par les dashboards Cardiologue, Clinique et l'app mobile.
 * Compatible avec le repo partagé original (mêmes endpoints, mêmes corps de requête).
 */
const router   = require('express').Router();
const ctrl     = require('../../controllers/authController');
const validate = require('../../middleware/validate');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} = require('../../validators/Auth.validators');

// Inscription + vérification OTP
router.post('/register',             validate(registerSchema),             ctrl.register);
router.post('/verify-email',         validate(verifyEmailSchema),          ctrl.verifyEmail);
router.post('/resend-verification',  validate(resendVerificationSchema),   ctrl.resendVerification);

// Connexion partagée (tous rôles sauf admin qui utilise /api/admin/auth/login)
router.post('/login',                validate(loginSchema),                ctrl.login);

// Réinitialisation mot de passe
router.post('/forgot-password',      validate(forgotPasswordSchema),       ctrl.forgotPassword);
router.post('/verify-otp',           validate(verifyOtpSchema),            ctrl.verifyOtp);
router.post('/reset-password',       validate(resetPasswordSchema),        ctrl.resetPassword);

module.exports = router;
