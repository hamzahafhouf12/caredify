const Joi = require('joi');

// ── Create patient ────────────────────────────────────────────
const createPatientSchema = Joi.object({
  cin:    Joi.string().min(6).max(20).required().messages({
    'string.min':  'Le CIN doit contenir au moins 6 caractères',
    'any.required':'Le CIN est obligatoire',
  }),
  nom:    Joi.string().min(2).max(100).required().messages({
    'any.required':'Le nom est obligatoire',
  }),
  prenom: Joi.string().max(100).optional().allow(''),
  age:    Joi.number().integer().min(0).max(150).required().messages({
    'number.min':  "L'âge ne peut pas être négatif",
    'number.max':  "L'âge semble invalide",
    'any.required':"L'âge est obligatoire",
  }),
  adresse:      Joi.string().max(255).optional().allow(''),
  telephone:    Joi.string().max(20).optional().allow(''),
  dateNaissance:Joi.date().optional().allow(null),
  etat: Joi.string()
    .valid('Stable', 'Modéré', 'Critique')
    .default('Stable')
    .messages({ 'any.only': "L'état doit être: Stable, Modéré ou Critique" }),
  // Relations optionnelles (définies côté controller selon le rôle)
  medecin:      Joi.string().optional(),
  clinicId:     Joi.string().optional().allow(null),
  dispositifECG:Joi.string().optional().allow(null),
});

// ── Update patient ────────────────────────────────────────────
const updatePatientSchema = Joi.object({
  cin:          Joi.string().min(6).max(20).optional(),
  nom:          Joi.string().min(2).max(100).optional(),
  prenom:       Joi.string().max(100).optional().allow(''),
  age:          Joi.number().integer().min(0).max(150).optional(),
  adresse:      Joi.string().max(255).optional().allow(''),
  telephone:    Joi.string().max(20).optional().allow(''),
  dateNaissance:Joi.date().optional().allow(null),
  etat:         Joi.string().valid('Stable', 'Modéré', 'Critique').optional(),
  medecin:      Joi.string().optional(),
  clinicId:     Joi.string().optional().allow(null),
  dispositifECG:Joi.string().optional().allow(null),
});

module.exports = { createPatientSchema, updatePatientSchema };
