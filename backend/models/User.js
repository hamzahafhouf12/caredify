const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    nom:      { type: String, required: true },
    prenom:   { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role:     { type: String, required: true },

    // --- Email Verification ---
    isVerified:               { type: Boolean, default: false },
    emailVerificationToken:   { type: String },
    emailVerificationExpires: { type: Date },

    // --- Password Reset ---
    resetPasswordToken:   { type: String },
    resetPasswordExpires: { type: Date },

    // --- Profile Info ---
    avatar:     { type: String },
    specialite: { type: String, default: "Cardiologue" },
  },
  { timestamps: true }
);

// Hash password before saving to the database
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;