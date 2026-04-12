const nodemailer = require('nodemailer');

/**
 * EMAIL UTILITY — CAREDIFY (unified)
 *
 * Utilise Mailtrap en dev, SMTP réel en production.
 * Conserve le fallback console du repo partagé pour le développement.
 */

// ── Transporter (singleton) ──────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.MAILTRAP_PORT) || 2525,
  auth: {
    user: process.env.MAILTRAP_USER || '',
    pass: process.env.MAILTRAP_PASS || '',
  },
});

transporter.verify((error) => {
  if (error) {
    console.log('⚠️  [SMTP] Not configured — emails will use console fallback');
  } else {
    console.log('✅ [SMTP] Mailtrap ready');
  }
});

// ── Core send function ───────────────────────────────────────
const sendEmail = async (to, subject, text, html = null) => {
  console.log(`[EMAIL] → ${to} | ${subject}`);

  const isConfigured = !!(process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS);

  if (!isConfigured) {
    console.log('--------------------------------------------------');
    console.log('⚠️  [DEV MODE] Email not configured');
    console.log(`📧 TO      : ${to}`);
    console.log(`📝 SUBJECT : ${subject}`);
    console.log(`🔑 CONTENT : ${text}`);
    console.log('--------------------------------------------------');
    return { success: true, isMock: true, messageId: 'dev-fallback' };
  }

  const mailOptions = {
    from:    '"Caredify" <no-reply@caredify.dev>',
    to, subject, text,
    html:    html || text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [EMAIL] Sent! ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ [EMAIL] SMTP Error:', error.message);
    // Fallback console — ne bloque pas le frontend
    console.log('--------------------------------------------------');
    console.log('⚠️  [FALLBACK] SMTP failed — logging email content');
    console.log(`📧 TO      : ${to}`);
    console.log(`📝 SUBJECT : ${subject}`);
    console.log(`🔑 CONTENT : ${text}`);
    console.log('--------------------------------------------------');
    return { success: true, isMock: true, messageId: 'fallback-id' };
  }
};

// ── Verification OTP ─────────────────────────────────────────
const sendVerificationOTP = async (to, otp) => {
  const html = `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8fafc;padding:40px 0;">
      <div style="max-width:500px;margin:0 auto;background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);text-align:center;">
        <h2 style="color:#2f80ed;margin-bottom:8px;">Caredify</h2>
        <p style="color:#64748b;font-size:14px;margin-top:0;">Secure Medical Platform</p>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0;">
        <p style="color:#475569;font-size:16px;margin-bottom:8px;">Welcome! Please verify your email address.</p>
        <p style="color:#475569;font-size:15px;margin-bottom:30px;">Use the code below to activate your account:</p>
        <div style="background:#f1f5f9;padding:25px;border-radius:8px;display:inline-block;margin-bottom:24px;">
          <h1 style="color:#1e293b;font-size:42px;margin:0;letter-spacing:12px;font-family:monospace;">${otp}</h1>
        </div>
        <p style="color:#64748b;font-size:14px;">This code is valid for <strong>10 minutes</strong>.</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">If you did not create a Caredify account, you can safely ignore this email.</p>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0;">
        <p style="text-align:center;color:#94a3b8;font-size:12px;">© 2025 Caredify. All rights reserved.</p>
      </div>
    </div>
  `;
  return sendEmail(
    to,
    'Caredify - Verify your email address',
    `Your verification code is: ${otp}. Valid for 10 minutes.`,
    html
  );
};

// ── Password Reset OTP ───────────────────────────────────────
const sendPasswordResetOTP = async (to, otp) => {
  const html = `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8fafc;padding:40px 0;">
      <div style="max-width:500px;margin:0 auto;background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);text-align:center;">
        <h2 style="color:#2f80ed;margin-bottom:20px;">Caredify</h2>
        <p style="color:#475569;font-size:16px;margin-bottom:30px;">Here is your password reset code:</p>
        <div style="background:#f1f5f9;padding:25px;border-radius:8px;display:inline-block;margin-bottom:30px;">
          <h1 style="color:#1e293b;font-size:42px;margin:0;letter-spacing:12px;font-family:monospace;">${otp}</h1>
        </div>
        <p style="color:#64748b;font-size:14px;">This code is valid for <strong>5 minutes</strong>.</p>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0;">
        <p style="text-align:center;color:#94a3b8;font-size:12px;">© 2025 Caredify. All rights reserved.</p>
      </div>
    </div>
  `;
  return sendEmail(
    to,
    'Caredify - Password Reset',
    `Your reset code is: ${otp}. Valid for 5 minutes.`,
    html
  );
};

module.exports = { sendEmail, sendVerificationOTP, sendPasswordResetOTP };
