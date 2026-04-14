const Joi = require("joi");

const createPatientSchema = Joi.object({
  cin: Joi.string().min(6).max(20).required().messages({
    "string.min": "Le CIN doit contenir au moins 6 caractères",
    "any.required": "Le CIN est obligatoire",
  }),
  nom: Joi.string().min(2).max(100).required().messages({
    "any.required": "Le nom est obligatoire",
  }),
  age: Joi.number().integer().min(0).max(150).required().messages({
    "number.min": "L'âge ne peut pas être négatif",
    "number.max": "L'âge semble invalide",
    "any.required": "L'âge est obligatoire",
  }),
  adresse: Joi.string().max(255).optional().allow(""),
  etat: Joi.string()
    .valid("Stable", "Modéré", "Critique")
    .default("Stable")
    .messages({
      "any.only": "L'état doit être: Stable, Modéré ou Critique",
    }),
});

const updatePatientSchema = Joi.object({
  cin: Joi.string().min(6).max(20).optional(),
  nom: Joi.string().min(2).max(100).optional(),
  age: Joi.number().integer().min(0).max(150).optional(),
  adresse: Joi.string().max(255).optional().allow(""),
  etat: Joi.string().valid("Stable", "Modéré", "Critique").optional(),
  groupeSanguin: Joi.string().valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-").optional().allow(null, ""),
  antecedents: Joi.array().items(Joi.string()).optional(),
  traitementsEnCours: Joi.array().items(Joi.string()).optional(),
  observations: Joi.array().items(
    Joi.object({
      texte: Joi.string().required(),
      date: Joi.date().optional(),
      medecinId: Joi.string().optional()
    })
  ).optional()
});

module.exports = { createPatientSchema, updatePatientSchema };