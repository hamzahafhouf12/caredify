/**
 * VALIDATE MIDDLEWARE — Joi
 * Compatible avec le repo partagé (utilise validate(schema)).
 */
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly:   false,
    stripUnknown: true,
  });

  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    const err     = new Error(message);
    err.statusCode = 422;
    return next(err);
  }

  next();
};

module.exports = validate;
