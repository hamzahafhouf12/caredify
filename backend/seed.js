/**
 * Seed Script — Caredify
 * Generates test data: alerts (all types), messages, and vitals
 * Usage: node seed.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Patient = require("./models/Patient");
const Alert = require("./models/Alert");
const Message = require("./models/Message");
const Vitals = require("./models/Vitals");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/caredify";

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Find first cardiologue
  const medecin = await User.findOne({ role: "cardiologue" });
  if (!medecin) {
    console.error("❌ No cardiologue found. Please register one first.");
    process.exit(1);
  }
  console.log(`👨‍⚕️ Using doctor: ${medecin.prenom} ${medecin.nom}`);

  // Find or create test patients
  let patients = await Patient.find({ medecin: medecin._id });
  if (patients.length === 0) {
    patients = await Patient.insertMany([
      { cin: "SEED001", nom: "Ben Salem", age: 62, adresse: "Tunis", etat: "Critique", medecin: medecin._id },
      { cin: "SEED002", nom: "Chaabane", age: 45, adresse: "Sfax", etat: "Stable", medecin: medecin._id },
      { cin: "SEED003", nom: "Trabelsi", age: 55, adresse: "Sousse", etat: "Modéré", medecin: medecin._id },
    ]);
    console.log(`✅ Created ${patients.length} test patients`);
  }

  // Clear old seed data
  await Alert.deleteMany({ detail: /\[SEED\]/ });
  await Message.deleteMany({ contenu: /\[SEED\]/ });
  await Vitals.deleteMany({ ecgNote: /\[SEED\]/ });

  // Create alerts (all 3 types)
  await Alert.insertMany([
    { patient: patients[0]._id, medecin: medecin._id, type: "Urgente", detail: "[SEED] Fibrillation auriculaire détectée", lue: false },
    { patient: patients[1]._id, medecin: medecin._id, type: "Urgente", detail: "[SEED] Tachycardie sévère > 180 bpm", lue: false },
    { patient: patients[2]._id, medecin: medecin._id, type: "Modéré", detail: "[SEED] HRV faible détectée", lue: false },
    { patient: patients[0]._id, medecin: medecin._id, type: "Modéré", detail: "[SEED] Irrégularité du rythme cardiaque", lue: true },
    { patient: patients[1]._id, medecin: medecin._id, type: "Info", detail: "[SEED] ECG normal enregistré", lue: false },
    { patient: patients[2]._id, medecin: medecin._id, type: "Info", detail: "[SEED] Mesure SpO2 complétée: 98%", lue: true },
  ]);
  console.log("✅ Created 6 test alerts (Urgente, Modéré, Info)");

  // Create messages
  await Message.insertMany([
    {
      expediteur: medecin._id,
      destinataire: medecin._id,
      patient: patients[0]._id,
      contenu: "[SEED] Résultats ECG disponibles pour révision",
      lue: false,
    },
    {
      expediteur: medecin._id,
      destinataire: medecin._id,
      patient: patients[1]._id,
      contenu: "[SEED] Patient demande renouvellement ordonnance",
      lue: false,
    },
    {
      expediteur: medecin._id,
      destinataire: medecin._id,
      patient: patients[2]._id,
      contenu: "[SEED] Rapport mensuel prêt",
      lue: true,
    },
  ]);
  console.log("✅ Created 3 test messages");

  // Create vitals
  const vitalsData = patients.flatMap((p) =>
    Array.from({ length: 5 }, (_, i) => ({
      patient: p._id,
      medecin: medecin._id,
      frequenceCardiaque: 60 + Math.floor(Math.random() * 40),
      hrv: 20 + Math.floor(Math.random() * 60),
      spo2: 94 + Math.floor(Math.random() * 6),
      tensionSystolique: 110 + Math.floor(Math.random() * 40),
      tensionDiastolique: 70 + Math.floor(Math.random() * 20),
      ecgNote: "[SEED] Auto-generated vital",
      source: "device",
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
    }))
  );
  await Vitals.insertMany(vitalsData);
  console.log("✅ Created 15 test vitals records");

  console.log("\n🎉 Seeding complete! Run npm run dev and test /api/dashboard/stats");
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seed error:", err.message);
  process.exit(1);
});