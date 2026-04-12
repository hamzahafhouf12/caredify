const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed },
  group: {
    type: String,
    enum: ['general', 'security', 'notifications', 'integrations', 'compliance', 'billing'],
    default: 'general',
  },
  description: { type: String },
  isPublic:    { type: Boolean, default: false },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

settingsSchema.statics.get = async function (key, defaultValue = null) {
  const s = await this.findOne({ key });
  return s ? s.value : defaultValue;
};

module.exports = mongoose.model('Settings', settingsSchema);
