const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { sendPasswordResetOTP, sendVerificationOTP } = require("../utils/email");
const validate = require("../middleware/validate");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} = require("../validators/Auth.validators");

const router = express.Router();

const generateToken = (id, role) => {
  const secret = process.env.JWT_SECRET || "caredify_super_secret_dev_key";
  return jwt.sign({ id, role }, secret, { expiresIn: "30d" });
};

/**
 * @route POST /api/auth/register
 */
router.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const { nom, prenom, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      const err = new Error("Un utilisateur avec cet email existe déjà");
      err.statusCode = 400;
      return next(err);
    }

    // Generate 6-digit verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    const user = await User.create({
      nom, prenom, email, password, role,
      isVerified: false,
      emailVerificationToken: hashedOtp,
      emailVerificationExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Send verification OTP email
    await sendVerificationOTP(email, otp);

    res.status(201).json({
      message: "Account created. Please check your email to verify your account.",
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/login
 */
router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      const err = new Error("Email ou mot de passe incorrect");
      err.statusCode = 401;
      return next(err);
    }

    // [DEBUG] Block login if email not verified - Temporarily disabled to unblock user
    // if (!user.isVerified) {
    //   const err = new Error("Please verify your email address before logging in.");
    //   err.statusCode = 403;
    //   return next(err);
    // }

    res.json({
      _id: user._id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/verify-email
 * @desc  Verify email using the 6-digit OTP sent on registration
 */
router.post("/verify-email", validate(verifyEmailSchema), async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user || !user.emailVerificationToken) {
      const err = new Error("Verification code is invalid or has expired");
      err.statusCode = 400;
      return next(err);
    }

    if (user.isVerified) {
      return res.json({ message: "Your account is already verified. You can log in." });
    }

    const isMatch = await bcrypt.compare(otp, user.emailVerificationToken);
    if (!isMatch) {
      const err = new Error("Incorrect verification code");
      err.statusCode = 400;
      return next(err);
    }

    // Mark account as verified and clear token
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      message: "Email verified successfully! You can now log in.",
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/resend-verification
 * @desc  Resend the email verification OTP
 */
router.post("/resend-verification", validate(resendVerificationSchema), async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      const err = new Error("No account found with this email");
      err.statusCode = 404;
      return next(err);
    }

    if (user.isVerified) {
      const err = new Error("This account is already verified");
      err.statusCode = 400;
      return next(err);
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    user.emailVerificationToken = await bcrypt.hash(otp, salt);
    user.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendVerificationOTP(email, otp);

    res.json({ message: "A new verification code has been sent to your email." });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/forgot-password
 */
router.post("/forgot-password", validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      const err = new Error("Utilisateur non trouvé");
      err.statusCode = 404;
      return next(err);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    user.resetPasswordToken = await bcrypt.hash(otp, salt);
    user.resetPasswordExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendPasswordResetOTP(email, otp);
    res.json({ message: "Un code de réinitialisation a été envoyé par e-mail." });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/verify-otp
 */
router.post("/verify-otp", validate(verifyOtpSchema), async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email, resetPasswordExpires: { $gt: Date.now() } });
    if (!user || !user.resetPasswordToken) {
      const err = new Error("Code invalide ou expiré");
      err.statusCode = 400;
      return next(err);
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordToken);
    if (!isMatch) {
      const err = new Error("Code OTP incorrect");
      err.statusCode = 400;
      return next(err);
    }

    res.json({ success: true, message: "Code vérifié avec succès" });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/reset-password
 */
router.post("/reset-password", validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email, resetPasswordExpires: { $gt: Date.now() } });
    if (!user || !user.resetPasswordToken) {
      const err = new Error("Session de réinitialisation expirée");
      err.statusCode = 400;
      return next(err);
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordToken);
    if (!isMatch) {
      const err = new Error("Code OTP invalide");
      err.statusCode = 400;
      return next(err);
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Votre mot de passe a été réinitialisé avec succès !" });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/auth/temp-verify/:email
 * @desc  TEMP ROUTE - Manually verify a user for development purposes
 */
router.get("/temp-verify/:email", async (req, res, next) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    
    res.json({ message: `User ${email} verified successfully!` });
  } catch (error) {
    next(error);
  }
});

module.exports = router;