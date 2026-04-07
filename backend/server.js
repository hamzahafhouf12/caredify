require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://mongo:27017/caredify";

// Middlewares
app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/auth");
const patientRoutes = require("./routes/patientRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Basic Route
app.get("/api", (req, res) => {
  res.json({ message: "Welcome to Caredify API!" });
});

// Database Connection Logic
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Successfully connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ MongoDB Atlas connection error:", err.message);
    console.log("🔄 Attempting local MongoDB fallback...");
    
    const LOCAL_MONGO = "mongodb://127.0.0.1:27017/caredify";
    try {
      await mongoose.connect(LOCAL_MONGO);
      console.log("✅ Successfully connected to local MongoDB");
    } catch (localErr) {
      console.error("❌ Critical Error: All MongoDB connections failed.");
    }
  }
};

connectDB();

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Backend Server running on port ${PORT}`);
});
