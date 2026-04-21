require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const seedAdmin = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/caredify";
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB for seeding");

    const email = "medecin@caredify.com";
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("ℹ️ User already exists:", email);
    } else {
      await User.create({
        nom: "Hafnouf",
        prenom: "Hamza",
        email: email,
        password: "password123",
        role: "medecin",
        isVerified: true
      });
      console.log("✅ Created test doctor: medecin@caredify.com / password123");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error.message);
    process.exit(1);
  }
};

seedAdmin();
