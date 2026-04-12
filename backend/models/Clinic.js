const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  slug:  { type: String, unique: true, lowercase: true },
  type:  {
    type: String,
    enum: ['hospital', 'clinic', 'cabinet', 'emergency_center', 'other'],
    default: 'clinic',
  },

  address: {
    street:  { type: String },
    city:    { type: String },
    state:   { type: String },
    zip:     { type: String },
    country: { type: String, default: 'FR' },
  },
  phone:   { type: String },
  email:   { type: String },
  website: { type: String },

  timezone: { type: String, default: 'Europe/Paris' },
  language: { type: String, default: 'fr' },
  currency: { type: String, default: 'EUR' },

  licenseNumber: { type: String },
  license: {
    type:       { type: String, enum: ['trial', 'basic', 'professional', 'enterprise'], default: 'trial' },
    startDate:  { type: Date },
    endDate:    { type: Date },
    maxDevices: { type: Number, default: 5 },
    maxUsers:   { type: Number, default: 20 },
    isActive:   { type: Boolean, default: true },
  },

  status:    { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  deletedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes:     { type: String, maxlength: 2000 },

}, { timestamps: true });

clinicSchema.index({ status: 1 });
clinicSchema.index({ createdAt: -1 });

clinicSchema.pre('save', function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = this.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();
  }
  next();
});

module.exports = mongoose.model('Clinic', clinicSchema);
