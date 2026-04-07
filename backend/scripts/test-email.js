require("dotenv").config();
const nodemailer = require("nodemailer");

console.log("--- 📧 TEST ENVOI GMAIL ---");
console.log("Email utilisé :", process.env.EMAIL_USER || "NON DÉFINI");
console.log("Pass (longueur) :", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0, "caractères");

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.log("❌ Erreur : EMAIL_USER ou EMAIL_PASS manquants dans le fichier .env");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function runTest() {
  console.log("1. Vérification de la connexion SMTP...");
  try {
    await transporter.verify();
    console.log("✅ Connexion réussie ! Vos identifiants sont corrects.");

    console.log("2. Envoi d'un e-mail de test...");
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // S'envoyer à soi-même
      subject: "Test Caredify SMTP",
      text: "Si vous lisez ceci, l'envoi d'e-mail fonctionne parfaitement !",
    });
    console.log("🚀 E-mail envoyé avec succès ! Vérifiez votre boîte de réception.");
  } catch (error) {
    console.log("❌ ERREUR :");
    console.log(error);
    if (error.message.includes("535")) {
      console.log("\n💡 CONSEIL : C'est une erreur d'authentification.");
      console.log("- Vérifiez que vous utilisez un 'Mot de passe d'application' (16 lettres).");
      console.log("- Ne mettez PAS votre mot de passe Gmail habituel.");
    }
  }
}

runTest();
