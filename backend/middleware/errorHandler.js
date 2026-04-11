/**
 * @desc Centralized Error Handler Middleware
 * Catches all errors from all routes in one place
 */
const errorHandler = (err, req, res, next) => {
  // Log the error in development mode
  if (process.env.NODE_ENV !== "production") {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, err.message);
  }

  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Mongoose - CastError (invalid ObjectId)
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found (invalid ID)";
  }

  // Mongoose - Duplicate key (e.g. email or CIN already used)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `The value for field '${field}' already exists`;
  }

  // Mongoose - Validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // JWT - Invalid token
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token, please log in again";
  }

  // JWT - Expired token
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Session expired, please log in again";
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Stack trace only in development
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

module.exports = errorHandler;