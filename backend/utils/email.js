const nodemailer = require("nodemailer");

// Create Transporter (Singleton)
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: process.env.MAILTRAP_PORT,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.log("❌ [SMTP] ERROR:", error.message);
  } else {
    console.log("✅ [SMTP] Mailtrap is ready to catch emails");
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

  const isPlaceholder =
    (process.env.EMAIL_PASS === "VOTRE_CODE_GOOGLE_DE_16_LETTRES_REEL" ||
      !process.env.EMAIL_PASS ||
      process.env.EMAIL_PASS.length < 10) &&
    !process.env.MAILTRAP_PASS;

  if (isPlaceholder) {
    console.log("------------------------------------------");
    console.log("⚠️ [TEST MODE ACTIVE] Gmail is not configured");
    console.log(`🔑 CONTENT : ${text}`);
    console.log("------------------------------------------");
    return { success: true, messageId: "test-id" };
  }

  const mailOptions = {
    from: `"Caredify" <no-reply@caredify.dev>`,

    to,
    subject,
    text,
    html: html || text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [EMAIL] Sent! ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.log("❌ [EMAIL] SMTP ERROR (Rate Limit or Connection):", error.message);
    
    // --- FALLBACK FOR DEVELOPMENT ---
    console.log("--------------------------------------------------");
    console.log("⚠️  [FALLBACK] L'envoi SMTP a échoué !");
    console.log(`📧 DESTINATAIRE : ${to}`);
    console.log(`📝 SUJET : ${subject}`);
    console.log(`🔑 CONTENU : ${text}`);
    console.log("--------------------------------------------------");
    
    // On retourne un objet simulant le succès pour ne pas bloquer le frontend
    return { success: true, isMock: true, messageId: "fallback-id" };
  }
}

/**
 * Send Email Verification OTP
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit verification code
 */
const sendVerificationOTP = async (to, otp) => {
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 0;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center;">
        <h2 style="color: #2f80ed; margin-bottom: 8px;">Caredify</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 0;">Secure Medical Platform</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #475569; font-size: 16px; margin-bottom: 8px;">Welcome! Please verify your email address.</p>
        <p style="color: #475569; font-size: 15px; margin-bottom: 30px;">Use the code below to activate your account:</p>
        <div style="background-color: #f1f5f9; padding: 25px; border-radius: 8px; display: inline-block; margin-bottom: 24px;">
          <h1 style="color: #1e293b; font-size: 42px; margin: 0; letter-spacing: 12px; font-family: monospace;">${otp}</h1>
        </div>
        <p style="color: #64748b; font-size: 14px;">This code is valid for <strong>10 minutes</strong>.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">If you did not create a Caredify account, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="text-align: center; color: #94a3b8; font-size: 12px;">© 2024 Caredify. All rights reserved.</p>
      </div>
    </div>
  `;

  return await sendEmail(
    to,
    "Caredify - Verify your email address",
    `Your verification code is: ${otp}. Valid for 10 minutes.`,
    htmlContent
  );
};

/**
 * Send Password Reset OTP
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit reset code
 */
const sendPasswordResetOTP = async (to, otp) => {
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 0;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center;">
        <h2 style="color: #2f80ed; margin-bottom: 20px;">Caredify</h2>
        <p style="color: #475569; font-size: 16px; margin-bottom: 30px;">Here is your password reset code:</p>
        <div style="background-color: #f1f5f9; padding: 25px; border-radius: 8px; display: inline-block; margin-bottom: 30px;">
          <h1 style="color: #1e293b; font-size: 42px; margin: 0; letter-spacing: 12px; font-family: monospace;">${otp}</h1>
        </div>
        <p style="color: #64748b; font-size: 14px;">This code is valid for <strong>10 minutes</strong>.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="text-align: center; color: #94a3b8; font-size: 12px;">© 2024 Caredify. All rights reserved.</p>
      </div>
    </div>
  `;

  return await sendEmail(
    to,
    "Caredify - Password Reset",
    `Your reset code is: ${otp}`,
    htmlContent
  );
};

module.exports = {
  sendEmail,
  sendVerificationOTP,
  sendPasswordResetOTP,
};