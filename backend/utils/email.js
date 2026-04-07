const nodemailer = require("nodemailer");

// Create Transporter (Singleton)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // 16-digit Google App Password
  },
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  const isPlaceholder = process.env.EMAIL_PASS === "VOTRE_CODE_GOOGLE_DE_16_LETTRES_REEL";
  
  if (isPlaceholder) {
    console.error("\n❗ ATTENTION : Votre fichier .env contient encore des identifiants EXEMPLES.");
    console.error("👉 Remplacez 'VOTRE_CODE_GOOGLE_DE_16_LETTRES_REEL' par vos 16 lettres réelles.");
    console.log("------------------------------------------");
  }

  console.log(`[SMTP] Checking config: User=${process.env.EMAIL_USER}, PassLength=${process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0}`);
  
  if (error) {
    console.log("❌ [SMTP] ERROR:", error.message);
  } else {
    console.log("✅ [SMTP] Server is ready to send emails");
  }
});

/**
 * Global reusable email sending function
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - Optional HTML content
 */
const sendEmail = async (to, subject, text, html = null) => {
  console.log(`[EMAIL] Attempting to send to: ${to} | Subject: ${subject}`);

  const isPlaceholder = process.env.EMAIL_PASS === "VOTRE_CODE_GOOGLE_DE_16_LETTRES_REEL" || !process.env.EMAIL_PASS || process.env.EMAIL_PASS.length < 10;

  if (isPlaceholder) {
    console.log("------------------------------------------");
    console.log("⚠️ [MODE TEST ACTIF] Car Gmail n'est pas configuré");
    console.log(`🔑 CONTENU : ${text}`);
    console.log("------------------------------------------");
    return { success: true, messageId: "test-id" };
  }

  const mailOptions = {
    from: `"Caredify" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html: html || text, 
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [EMAIL] Envoyé ! ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.log("❌ [EMAIL] ERREUR SMTP :", error.message);
    throw error;
  }
};

/**
 * Send Professional Account Verification Link
 */
const sendVerificationEmail = async (to, token) => {
  const verificationURL = `http://localhost:5000/api/auth/verify-email?token=${token}`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9; padding: 50px 0; border-radius: 10px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2f80ed; margin: 0;">Caredify</h1>
          <p style="color: #64748b; font-size: 16px;">Vérification de votre compte</p>
        </div>
        <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">Bonjour,</p>
        <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">Merci de vous être inscrit sur <strong>Caredify</strong>. Veuillez cliquer sur le bouton ci-dessous pour activer votre compte :</p>
        <div style="text-align: center; margin: 40px 0;">
          <a href="${verificationURL}" style="background-color: #2f80ed; color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block;">Activer mon compte</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        <p style="text-align: center; color: #94a3b8; font-size: 12px;">© 2024 Caredify. Tous droits réservés.</p>
      </div>
    </div>
  `;

  return await sendEmail(to, "Bienvenue sur Caredify - Vérifiez votre compte", `Activez votre compte ici : ${verificationURL}`, htmlContent);
};

/**
 * Send Password Reset OTP
 */
const sendPasswordResetOTP = async (to, otp) => {
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 0;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center;">
        <h2 style="color: #2f80ed; margin-bottom: 20px;">Caredify</h2>
        <p style="color: #475569; font-size: 16px; margin-bottom: 30px;">Voici votre code de validation pour réinitialiser votre mot de passe :</p>
        <div style="background-color: #f1f5f9; padding: 25px; border-radius: 8px; display: inline-block; margin-bottom: 30px;">
          <h1 style="color: #1e293b; font-size: 42px; margin: 0; letter-spacing: 12px; font-family: monospace;">${otp}</h1>
        </div>
        <p style="color: #64748b; font-size: 14px;">Ce code est valide pendant <strong>10 minutes</strong>.</p>
      </div>
    </div>
  `;

  return await sendEmail(to, "Caredify - Réinitialisation de mot de passe", `Votre code est : ${otp}`, htmlContent);
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetOTP
};
