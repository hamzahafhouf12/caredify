const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendEmail, sendPasswordResetOTP } = require("../utils/email");

const router = express.Router();

/**
 * Helper to generate JWT Token
 */
const generateToken = (id, role) => {
  const secret = process.env.JWT_SECRET || "caredify_super_secret_dev_key";
  return jwt.sign({ id, role }, secret, {
    expiresIn: "30d",
  });
};

/**
 * @route POST /api/auth/register
 * @desc Register a new user
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

    const user = await User.create({ nom, prenom, email, password, role });

    res.status(201).json({
      _id: user._id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    console.error("Erreur Inscription Backend:", error);
    res.status(500).json({ message: error.message || "Erreur serveur lors de la création du compte" });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Auth user & get token
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

/**
 * @route POST /api/auth/forgot-password
 * @desc  Request a password reset OTP
 */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Veuillez fournir un email" });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendPasswordResetOTP(email, otp);
    res.json({ message: "Un code de réinitialisation a été envoyé par e-mail." });
  } catch (error) {
    console.error("[AUTH] Forgot Password Error:", error.message);
    res.status(500).json({ message: "Erreur serveur lors de la demande" });
  }
});

/**
 * @route POST /api/auth/reset-password
 * @desc  Reset password using the OTP
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Données manquantes" });
    }

    const user = await User.findOne({ 
      email, 
      resetPasswordToken: otp,
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ message: "Code invalide ou expiré" });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Votre mot de passe a été réinitialisé avec succès !" });
  } catch (error) {
    console.error("[AUTH] Reset Password Error:", error.message);
    res.status(500).json({ message: "Erreur serveur lors de la réinitialisation" });
  }
});

module.exports = router;
