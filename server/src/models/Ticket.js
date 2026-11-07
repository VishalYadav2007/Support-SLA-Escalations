const mongoose = require('mongoose');
const { Schema } = mongoose;
const ticketSchema = new Schema(
  {
    title: { type: String, required: true, minlength: 5, maxlength: 150, trim: true },
    description: { type: String, required: true, minlength: 10, maxlength: 2000, trim: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], required: true },
    category: { type: String, enum: ['billing', 'technical', 'account', 'general'], required: true },
    requesterName: { type: String, required: true, trim: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
    slaTargetMinutes: { type: Number, required: true },
    slaDeadline: { type: Date, required: true },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
ticketSchema.index({ status: 1, slaDeadline: 1 });
module.exports = mongoose.model('Ticket', ticketSchema);
