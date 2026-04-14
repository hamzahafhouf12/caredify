const express = require("express");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// --- Multer Configuration for Avatar Upload ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/avatars/");
  },
  filename: (req, file, cb) => {
    cb(null, `avatar-${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Seules les images (jpeg, jpg, png, webp) sont autorisées"));
  },
});

/**
 * @route GET /api/users/profile
 * @desc  Get current user profile
 */
router.get("/profile", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/users/profile
 * @desc  Update user profile and/or avatar
 */
router.put("/profile", protect, upload.single("avatar"), async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      const err = new Error("Utilisateur non trouvé");
      err.statusCode = 404;
      return next(err);
    }

    const { nom, prenom, specialite } = req.body;
    if (nom) user.nom = nom;
    if (prenom) user.prenom = prenom;
    if (specialite) user.specialite = specialite;

    if (req.file) {
      // Store the relative path to the avatar
      user.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      nom: updatedUser.nom,
      prenom: updatedUser.prenom,
      email: updatedUser.email,
      role: updatedUser.role,
      avatar: updatedUser.avatar,
      specialite: updatedUser.specialite,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
