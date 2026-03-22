const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_caredify';
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Connexion à MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connecté à MongoDB Atlas'))
  .catch((err) => console.error('Erreur de connexion à MongoDB:', err));

// Endpoint de connexion
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis.' });
  }

  try {
    // Vérification des identifiants (recherche par email ou role)
    const user = await User.findOne({
      $or: [{ email: email }, { role: email }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    // Comparaison avec le mot de passe hashé
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
       return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    // Génération du token JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Erreur lors du login:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
