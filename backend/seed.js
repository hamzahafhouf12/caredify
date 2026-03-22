require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI;

const initialUsers = [
  {
    email: 'admin@caredify.com',
    password: 'admin',
    role: 'admin',
    name: 'Administrateur'
  },
  {
    email: 'clinique@caredify.com',
    password: 'clinique',
    role: 'clinique',
    name: 'Responsable Clinique'
  },
  {
    email: 'cardiologue@caredify.com',
    password: 'cardiologue',
    role: 'cardiologue',
    name: 'Dr. Cardiologue'
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connecté à MongoDB.');
    
    // Supprimer les utilisateurs existants pour éviter les doublons (optionnel)
    await User.deleteMany({});
    console.log('Anciens utilisateurs supprimés.');

    // Insérer les nouveaux utilisateurs
    await User.insertMany(initialUsers);
    console.log('Utilisateurs créés avec succès !');

    process.exit();
  } catch (error) {
    console.error('Erreur lors du peuplement de la base:', error);
    process.exit(1);
  }
};

seedDatabase();
