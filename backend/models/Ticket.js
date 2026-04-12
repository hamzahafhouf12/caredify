const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketNumber: { type: String, unique: true },
  title:        { type: String, required: true, maxlength: 200 },
  description:  { type: String, required: true, maxlength: 5000 },
  category: {
    type: String,
    enum: ['hardware', 'software', 'connectivity', 'data', 'account', 'billing', 'compliance', 'other'],
    required: true,
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status:   { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },

  clinicId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', default: null },
  deviceId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Device', default: null },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  messages: [{
    authorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorEmail: { type: String },
    content:     { type: String },
    createdAt:   { type: Date, default: Date.now },
  }],

  sla: {
    dueAt:      { type: Date },
    resolvedAt: { type: Date },
    breached:   { type: Boolean, default: false },
  },

  resolvedAt: { type: Date },
  closedAt:   { type: Date },
  resolution: { type: String },

}, { timestamps: true });

ticketSchema.pre('save', function (next) {
  if (this.isNew) {
    this.ticketNumber = `TKT-${Date.now().toString().slice(-8)}`;
    const slaHours = { critical: 4, high: 24, medium: 72, low: 168 };
    this.sla.dueAt = new Date(Date.now() + (slaHours[this.priority] || 72) * 3600000);
  }
  next();
});

ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ clinicId: 1 });
ticketSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
