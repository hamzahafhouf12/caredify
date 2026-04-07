require("dotenv").config();
const nodemailer = require("nodemailer");

async function checkSMTP() {
  console.log("--- 🕵️ AUDIT SMTP CAREDIFY ---");
  console.log("Email : ", process.env.EMAIL_USER);
  console.log("Pass (longueur) : ", (process.env.EMAIL_PASS || "").length);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    console.log("1. Tentative de connexion...");
    await transporter.verify();
    console.log("✅ Connexion réussie !");

    console.log("2. Tentative d'envoi d'e-mail...");
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Test Final Caredify",
      text: "L'envoi fonctionne !"
    });
    console.log("🚀 E-mail envoyé avec succès !");
  } catch (error) {
    console.log("❌ ERREUR :");
    console.log(error.message);
  }
}

checkSMTP();
