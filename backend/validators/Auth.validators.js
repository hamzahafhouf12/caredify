const Joi = require('joi');

/**
 * AUTH VALIDATORS — CAREDIFY (unified)
 *
 * Compatible avec le repo partagé (mêmes noms de schémas exportés).
 * Accepte nom/prenom ET firstName/lastName pour la compatibilité.
 */

// ── Register ─────────────────────────────────────────────────
const registerSchema = Joi.object({
  // Accepte les deux formes de nommage
  nom:       Joi.string().min(2).max(50).messages({ 'string.min': 'Le nom doit contenir au moins 2 caractères' }),
  prenom:    Joi.string().min(2).max(50).messages({ 'string.min': 'Le prénom doit contenir au moins 2 caractères' }),
  firstName: Joi.string().min(2).max(50),
  lastName:  Joi.string().min(2).max(50),

  email: Joi.string().email().required().messages({
    'string.email': 'Veuillez fournir un email valide',
    'any.required': "L'email est obligatoire",
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
    'any.required': 'Le mot de passe est obligatoire',
  }),
  role: Joi.string()
    .valid('cardiologist', 'cardiologue', 'clinic', 'patient', 'nurse', 'technician')
    .required()
    .messages({
      'any.only': 'Rôle invalide',
      'any.required': 'Le rôle est obligatoire',
    }),
})
// Au moins une forme de prénom/nom doit être fournie
.or('nom', 'firstName')
.or('prenom', 'lastName');

// ── Login ─────────────────────────────────────────────────────
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Veuillez fournir un email valide',
    'any.required': "L'email est obligatoire",
  }),
  password: Joi.string().required().messages({
    'any.required': 'Le mot de passe est obligatoire',
  }),
});

// ── Forgot password ──────────────────────────────────────────
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Veuillez fournir un email valide',
    'any.required': "L'email est obligatoire",
  }),
});

// ── Verify OTP (password reset) ──────────────────────────────
const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp:   Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length':       'Le code OTP doit contenir exactement 6 chiffres',
    'string.pattern.base': 'Le code OTP doit contenir uniquement des chiffres',
  }),
});

// ── Reset password ───────────────────────────────────────────
const resetPasswordSchema = Joi.object({
  email:       Joi.string().email().required(),
  otp:         Joi.string().length(6).pattern(/^\d+$/).required(),
  newPassword: Joi.string().min(8).required().messages({
    'string.min':  'Le nouveau mot de passe doit contenir au moins 8 caractères',
    'any.required':'Le nouveau mot de passe est obligatoire',
  }),
});

// ── Verify email (OTP registration) ─────────────────────────
const verifyEmailSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length':       'Verification code must be exactly 6 digits',
    'string.pattern.base': 'Verification code must contain only digits',
    'any.required':        'Verification code is required',
  }),
});

// ── Resend verification ──────────────────────────────────────
const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
});

// ── Admin login (plus strict) ────────────────────────────────
const adminLoginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  adminLoginSchema,
};
