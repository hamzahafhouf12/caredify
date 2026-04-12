const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  serialNumber: { type: String, required: true, unique: true, trim: true },
  model:        { type: String, required: true },
  type:         { type: String, enum: ['portable', 'fixed', 'wearable', 'holter'], required: true },
  leads:        { type: Number, enum: [1, 3, 6, 12], default: 12 },

  clinicId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', default: null },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',   default: null },

  status: {
    type: String,
    enum: ['active', 'offline', 'maintenance', 'faulty', 'unassigned'],
    default: 'unassigned',
  },

  firmware: {
    current:     { type: String, default: '1.0.0' },
    latest:      { type: String, default: '1.0.0' },
    needsUpdate: { type: Boolean, default: false },
    lastUpdated: { type: Date },
  },

  batteryLevel:   { type: Number, min: 0, max: 100, default: null },
  lastSeenOnline: { type: Date, default: null },
  purchaseDate:    { type: Date },
  warrantyExpires: { type: Date },

  location: {
    room:     { type: String },
    building: { type: String },
    floor:    { type: String },
  },

  deletedAt: { type: Date, default: null },
  notes:     { type: String },

}, { timestamps: true });

deviceSchema.index({ clinicId: 1 });
deviceSchema.index({ status: 1 });

module.exports = mongoose.model('Device', deviceSchema);
