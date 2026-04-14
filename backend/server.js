require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://mongo:27017/caredify";

// ─── Middlewares ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve static files from uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Routes ──────────────────────────────────────────────────────────────────
const authRoutes         = require("./routes/auth");
const patientRoutes      = require("./routes/patientRoutes");
const dashboardRoutes    = require("./routes/dashboardRoutes");
const ecgRoutes          = require("./routes/ecgRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const alertRoutes        = require("./routes/alertRoutes");
const messageRoutes      = require("./routes/messageRoutes");
const userRoutes        = require("./routes/userRoutes");

app.use("/api/auth",          authRoutes);
app.use("/api/patients",      patientRoutes);
app.use("/api/dashboard",     dashboardRoutes);
app.use("/api/ecg",           ecgRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/alerts",        alertRoutes);
app.use("/api/messages",      messageRoutes);
app.use("/api/users",         userRoutes);

// Health check
app.get("/api", (req, res) => {
  res.json({ message: "Welcome to Caredify API!", status: "OK" });
});

// 404 Handler
app.use((req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
});

// Error Handler Middleware (MUST be after routes)
app.use(errorHandler);

// ─── Database Connection Logic ───────────────────────────────────────────────
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
      process.exit(1);
    }
  }
};

connectDB();

// ─── Start Server ────────────────────────────────────────────────────────────
const http = require("http");
const { initSocket } = require("./socket");

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Caredify Backend running on http://localhost:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
});
