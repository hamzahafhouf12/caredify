const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const secret = process.env.JWT_SECRET || "caredify_super_secret_dev_key";
      const decoded = jwt.verify(token, secret);

      // Get user from the token
      req.user = await User.findById(decoded.id).select("-password");

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Non autorisé, token invalide" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Non autorisé, pas de token" });
  }
};

// Admin middleware - Only admin can pass
const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Non autorisé en tant qu'administrateur" });
  }
};

// Doctor middleware - Doctor or admin can pass
const doctor = (req, res, next) => {
  if (req.user && (req.user.role === "cardiologue" || req.user.role === "medecin" || req.user.role === "admin")) {
    next();
  } else {
    res.status(403).json({ message: "Non autorisé en tant que cardiologue" });
  }
};

module.exports = { protect, admin, doctor };
