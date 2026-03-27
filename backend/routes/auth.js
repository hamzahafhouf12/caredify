const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Helper to generate JWT Token
const generateToken = (id, role) => {
  // Use a secret from .env or a fallback for dev
  const secret = process.env.JWT_SECRET || "caredify_super_secret_dev_key";
  return jwt.sign({ id, role }, secret, {
    expiresIn: "30d",
  });
};

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post("/register", async (req, res) => {
  try {
    const { nom, prenom, email, password, role } = req.body;

    if (!nom || !prenom || !email || !password || !role) {
      return res.status(400).json({ message: "Veuillez remplir tous les champs obligatoires" });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "Un utilisateur avec cet email existe déjà" });
    }

    const user = await User.create({
      nom,
      prenom,
      email,
      password,
      role,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(400).json({ message: "Données utilisateur invalides" });
    }
  } catch (error) {
    console.error("Erreur Inscription Backend:", error);
    res.status(500).json({ message: error.message || "Erreur serveur lors de la création du compte" });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Auth user & get token
 * @access Public
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Veuillez fournir l'email et le mot de passe" });
    }

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur lors de la connexion", error: error.message });
  }
});

module.exports = router;
