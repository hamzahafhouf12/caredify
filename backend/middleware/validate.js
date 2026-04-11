/**
 * @desc Validation Middleware (Joi)
 * Uses a Joi schema to validate the request body
 * and forwards any error to the centralized error handler
 */
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false,   // Return all errors at once
    stripUnknown: true,  // Remove unknown fields
  });

  if (error) {
    const message = error.details.map((d) => d.message).join(", ");
    const err = new Error(message);
    err.statusCode = 422;
    return next(err);
  }

  next();
};

module.exports = validate;