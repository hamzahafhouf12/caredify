require("dotenv").config({ path: "./backend/.env" });
const nodemailer = require("nodemailer");

async function checkSMTP() {
  console.log("--- 🕵️ AUDIT SMTP CAREDIFY ---");
  console.log("Host : ", process.env.MAILTRAP_HOST);
  console.log("User : ", process.env.MAILTRAP_USER);

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: process.env.MAILTRAP_PORT,
    auth: {
      user: process.env.MAILTRAP_USER,
      pass: process.env.MAILTRAP_PASS
    }
  });

  try {
    console.log("1. Tentative de connexion...");
    await transporter.verify();
    console.log("✅ Connexion réussie !");

    console.log("2. Tentative d'envoi d'e-mail...");
    await transporter.sendMail({
      from: `"Caredify Test" <no-reply@caredify.dev>`,
      to: "test@caredify.dev",
      subject: "Test Final Caredify",
      text: "L'envoi fonctionne via Mailtrap !"
    });
    console.log("🚀 E-mail envoyé avec succès !");
  } catch (error) {
    console.log("❌ ERREUR :");
    console.log(error.message);
  }
}

checkSMTP();
