const Joi = require("joi");

const registerSchema = Joi.object({
  nom: Joi.string().min(2).max(50).required().messages({
    "string.min": "Le nom doit contenir au moins 2 caractères",
    "any.required": "Le nom est obligatoire",
  }),
  prenom: Joi.string().min(2).max(50).required().messages({
    "string.min": "Le prénom doit contenir au moins 2 caractères",
    "any.required": "Le prénom est obligatoire",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Veuillez fournir un email valide",
    "any.required": "L'email est obligatoire",
  }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Le mot de passe doit contenir au moins 8 caractères",
    "any.required": "Le mot de passe est obligatoire",
  }),
  role: Joi.string().valid("cardiologue", "admin", "patient").required().messages({
    "any.only": "Le rôle doit être: cardiologue, admin ou patient",
    "any.required": "Le rôle est obligatoire",
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Veuillez fournir un email valide",
    "any.required": "L'email est obligatoire",
  }),
  password: Joi.string().required().messages({
    "any.required": "Le mot de passe est obligatoire",
  }),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Veuillez fournir un email valide",
    "any.required": "L'email est obligatoire",
  }),
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    "string.length": "Le code OTP doit contenir exactement 6 chiffres",
    "string.pattern.base": "Le code OTP doit contenir uniquement des chiffres",
  }),
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "Le nouveau mot de passe doit contenir au moins 8 caractères",
    "any.required": "Le nouveau mot de passe est obligatoire",
  }),
});

const verifyEmailSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email",
    "any.required": "Email is required",
  }),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    "string.length": "Verification code must be exactly 6 digits",
    "string.pattern.base": "Verification code must contain only digits",
    "any.required": "Verification code is required",
  }),
});

const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email",
    "any.required": "Email is required",
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
};