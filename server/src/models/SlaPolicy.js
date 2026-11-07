const mongoose = require('mongoose');
const { Schema } = mongoose;
const rule = new Schema(
  {
    priority: { type: String, enum: ['any', 'low', 'medium', 'high', 'urgent'], default: 'any' },
    category: { type: String, enum: ['any', 'billing', 'technical', 'account', 'general'], default: 'any' },
    targetMinutes: { type: Number, required: true },
  },
  { _id: false }
);
const policySchema = new Schema(
  {
    _id: { type: String, default: 'default' },
    defaults: {
      urgent: { type: Number, default: 60 },
      high: { type: Number, default: 240 },
      medium: { type: Number, default: 480 },
      low: { type: Number, default: 1440 },
    },
    warningPercent: { type: Number, default: 75 },
    rules: { type: [rule], default: [] },
    // Full settings surface exposed by the SLA Policies editor (mockup-parity).
    matrix: { type: Schema.Types.Mixed, default: {} },
    businessHours: { type: Schema.Types.Mixed, default: {} },
    triggers: { type: [Schema.Types.Mixed], default: [] },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
module.exports = mongoose.model('SlaPolicy', policySchema);
