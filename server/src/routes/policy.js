const express = require('express');
const SlaPolicy = require('../models/SlaPolicy');
const { policySchema, validate } = require('../validators');
const { sendError } = require('../middleware/errorHandler');
const router = express.Router();

const DEFAULTS = { urgent: 60, high: 240, medium: 480, low: 1440 };
const DEFAULT_MATRIX = {
  p1: { target: 15, resolve: 2, pct: 75 },
  p2: { target: 1, resolve: 8, pct: 80 },
  p3: { target: 4, resolve: 24, pct: 85 },
  p4: { target: 24, resolve: 72, pct: 90 },
};
const DEFAULT_BUSINESS_HOURS = {
  days: [true, true, true, true, true, false, false],
  start: '08:00 AM',
  end: '08:00 PM',
  timezone: 'America/New_York (EST/EDT)',
  pauseOutsideShifts: true,
};
function defaultPolicyDoc() {
  return {
    _id: 'default',
    defaults: DEFAULTS,
    warningPercent: 75,
    rules: [],
    matrix: DEFAULT_MATRIX,
    businessHours: DEFAULT_BUSINESS_HOURS,
    triggers: [],
    meta: { version: '2.4' },
  };
}
async function getOrCreatePolicy() {
  let policy = await SlaPolicy.findById('default');
  if (!policy) policy = await SlaPolicy.create(defaultPolicyDoc());
  return policy;
}

router.get('/', async (req, res, next) => {
  try {
    const policy = await getOrCreatePolicy();
    res.json({ data: policy });
  } catch (err) {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) return sendError(res, 500, 'INTERNAL_ERROR', 'Database not available');
    next(err);
  }
});

router.put('/', validate(policySchema, 'body'), async (req, res, next) => {
  try {
    const payload = {
      defaults: req.body.defaults,
      warningPercent: req.body.warningPercent,
      rules: req.body.rules,
      matrix: req.body.matrix ?? DEFAULT_MATRIX,
      businessHours: req.body.businessHours ?? DEFAULT_BUSINESS_HOURS,
      triggers: req.body.triggers ?? [],
      meta: { ...defaultPolicyDoc().meta, updatedAt: new Date().toISOString() },
    };
    const policy = await SlaPolicy.findByIdAndUpdate('default', { $set: payload }, { upsert: true, new: true, runValidators: true });
    res.json({ data: policy });
  } catch (err) {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) return sendError(res, 500, 'INTERNAL_ERROR', 'Database not available');
    next(err);
  }
});

module.exports = router;
