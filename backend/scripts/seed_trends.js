const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Patient = require('../models/Patient');
const User = require('../models/User');
const ECGRecord = require('../models/Ecgrecord');
const Vitals = require('../models/Vitals');
const Alert = require('../models/Alert');

const seedHistory = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/caredify');
    console.log('Connected to MongoDB');

    const doctor = await User.findOne({ role: 'cardiologue' });
    if (!doctor) {
      console.log('No cardiologist found.');
      process.exit(1);
    }

    let patient = await Patient.findOne({ cin: '12345678' });
    if (!patient) {
      patient = await Patient.create({
        nom: 'Patient Test Tendances',
        prenom: 'Historique',
        age: 62,
        cin: '12345678',
        adresse: 'Tunis',
        medecin: doctor._id,
        etat: 'Stable'
      });
    }

    console.log(`Generating history for patient: ${patient.nom}`);

    // Generate 20 data points over the last 10 days
    for (let i = 0; i < 20; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (20 - i));

        // Random vitals with a trend
        const hrBase = 70 + (i < 10 ? i : 20 - i); // Pulse up then down
        await Vitals.create({
            patient: patient._id,
            medecin: doctor._id,
            frequenceCardiaque: hrBase + Math.floor(Math.random() * 10),
            hrv: 40 + Math.random() * 20,
            spo2: 95 + Math.random() * 4,
            source: 'device',
            createdAt: date
        });

        // Random ECG Risk Score
        const risk = i > 15 ? 80 : (20 + Math.random() * 30);
        await ECGRecord.create({
            patient: patient._id,
            medecin: doctor._id,
            signalData: Array.from({ length: 100 }, () => Math.random()),
            iaInterpretations: {
                arythmie: i > 15,
                scoreRisque: risk,
                resumeIA: i > 15 ? 'Anomalie détectée' : 'Rythme normal'
            },
            createdAt: date
        });
    }

    console.log('Successfully generated 20 history points.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding trends failed:', err);
    process.exit(1);
  }
};

seedHistory();
