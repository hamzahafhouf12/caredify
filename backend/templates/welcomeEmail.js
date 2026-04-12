/**
 * WELCOME EMAIL TEMPLATE — CAREDIFY
 * @param {string} nom - Prénom de l'utilisateur
 */
const welcomeEmailTemplate = (nom) => `
  <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;color:#1e293b;">
    <div style="text-align:center;margin-bottom:30px;">
      <h1 style="color:#3b82f6;margin:0;">Bienvenue sur Caredify !</h1>
    </div>
    <p style="font-size:16px;line-height:1.6;">Bonjour <strong>${nom}</strong>,</p>
    <p style="font-size:16px;line-height:1.6;">
      Nous sommes ravis de vous accueillir dans la communauté Caredify.
      Votre compte est désormais actif et prêt à être utilisé.
    </p>
    <div style="background:#f8fafc;padding:20px;border-radius:8px;margin:30px 0;text-align:center;">
      <p style="margin:0;color:#64748b;font-size:14px;">Votre santé, notre priorité.</p>
    </div>
    <p style="font-size:14px;color:#94a3b8;text-align:center;margin-top:40px;">
      © 2025 Caredify Team. Tous droits réservés.
    </p>
  </div>
`;

module.exports = welcomeEmailTemplate;
