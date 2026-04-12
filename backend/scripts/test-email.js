/**
 * TEST EMAIL SCRIPT — CAREDIFY
 * Usage : node scripts/test-email.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('--- 📧 TEST ENVOI EMAIL ---');
console.log('Host     :', process.env.MAILTRAP_HOST || 'NON DÉFINI');
console.log('Port     :', process.env.MAILTRAP_PORT || 'NON DÉFINI');
console.log('User     :', process.env.MAILTRAP_USER ? '✅ défini' : '❌ NON DÉFINI');
console.log('Password :', process.env.MAILTRAP_PASS ? '✅ défini' : '❌ NON DÉFINI');

if (!process.env.MAILTRAP_USER || !process.env.MAILTRAP_PASS) {
  console.log('\n❌ MAILTRAP_USER ou MAILTRAP_PASS manquants dans .env');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: parseInt(process.env.MAILTRAP_PORT),
  auth: { user: process.env.MAILTRAP_USER, pass: process.env.MAILTRAP_PASS },
});

async function runTest() {
  try {
    console.log('\n1. Vérification connexion SMTP...');
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie !');

    console.log('2. Envoi email de test...');
    await transporter.sendMail({
      from:    '"Caredify Test" <no-reply@caredify.dev>',
      to:      'test@example.com',
      subject: 'CAREDIFY — Test SMTP',
      text:    'Si vous lisez ceci, le service email fonctionne correctement.',
    });
    console.log('🚀 Email envoyé avec succès vers Mailtrap !');
    console.log('   → Vérifiez votre inbox sur https://mailtrap.io');
  } catch (error) {
    console.error('\n❌ ERREUR SMTP:', error.message);
  }
}

runTest();
