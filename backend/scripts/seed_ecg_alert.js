const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Patient = require('../models/Patient');
const User = require('../models/User');
const ECGRecord = require('../models/Ecgrecord');
const Alert = require('../models/Alert');

const seedTestData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/caredify');
    console.log('Connected to MongoDB');

    const doctor = await User.findOne({ role: 'cardiologue' });
    if (!doctor) {
      console.log('No cardiologist found. Please register one first.');
      process.exit(1);
    }

    let patient = await Patient.findOne({ medecin: doctor._id });
    if (!patient) {
      patient = await Patient.create({
        nom: 'Patient Test Verification',
        prenom: 'Verification',
        age: 45,
        cin: '12345678',
        adresse: 'Rue des Tests, Tunis',
        medecin: doctor._id,
        etat: 'Stable'
      });
      console.log('Created test patient');
    }

    // Create a mock ECG record
    const ecg = await ECGRecord.create({
      patient: patient._id,
      medecin: doctor._id,
      signalData: Array.from({ length: 500 }, () => Math.random()),
      frequenceEchantillonnage: 250,
      source: 'simulation',
      iaInterpretations: {
        arythmie: true,
        scoreRisque: 65,
        resumeIA: 'Rythme irrégulier détecté par le modèle SG1.'
      },
      annotationMedecin: 'Observation initiale.',
      decisionIA: 'en_attente'
    });
    console.log('Created test ECG record');

    // Create a mock alert
    const alert = await Alert.create({
      patient: patient._id,
      medecin: doctor._id,
      type: 'Modéré',
      priorite: 'A_surveiller',
      detail: 'Alerte IA: Rythme irrégulier détecté.',
      source: 'ia',
      annotationMedecin: '',
      statut: 'en_attente',
      lue: false
    });
    console.log('Created test alert');

    console.log('Seeding complete successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seedTestData();
