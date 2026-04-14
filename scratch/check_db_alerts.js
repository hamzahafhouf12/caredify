const mongoose = require('mongoose');
require('dotenv').config();

const checkAlerts = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/caredify";
    await mongoose.connect(mongoURI);
    const Alert = require('./backend/models/Alert');
    const count = await Alert.countDocuments();
    console.log(`Nombre d'alertes : ${count}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkAlerts();
