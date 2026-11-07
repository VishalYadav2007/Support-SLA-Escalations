const express = require('express');
const Ticket = require('../models/Ticket');
const SlaPolicy = require('../models/SlaPolicy');
const { createTicket, statusPatch, validate, objectId } = require('../validators');
const { resolveTarget, withComputed } = require('../sla/slaEngine');
const { sendError } = require('../middleware/errorHandler');
const mongoose = require('mongoose');
const router = express.Router();

const DEFAULTS = { urgent: 60, high: 240, medium: 480, low: 1440 };
function requireDb(res) {
  if (mongoose.connection.readyState !== 1) {
    sendError(res, 500, 'INTERNAL_ERROR', 'Database not available');
    return false;
  }
  return true;
}
async function activePolicy() {
  let p = await SlaPolicy.findById('default');
  if (!p) p = await SlaPolicy.create({ _id: 'default', defaults: DEFAULTS, warningPercent: 75, rules: [] });
  return p;
}

router.get('/', async (req, res, next) => {
  try {
    if (!requireDb(res)) return;
    if (req.query.status && !['open', 'in_progress', 'resolved'].includes(req.query.status)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', [{ path: 'status', message: 'Invalid status' }]);
    }
    const policy = await activePolicy();
    const filter = req.query.status ? { status: req.query.status } : {};
    const tickets = await Ticket.find(filter).lean();
    const now = new Date();
    const data = tickets.map((t) => withComputed(t, policy, now));
    data.sort((a, b) => {
      const ar = a.status === 'resolved' ? 1 : 0;
      const br = b.status === 'resolved' ? 1 : 0;
      if (ar !== br) return ar - br;
      return new Date(a.slaDeadline) - new Date(b.slaDeadline);
    });
    res.json({ data, serverNow: now.toISOString() });
  } catch (err) { next(err); }
});

router.post('/', validate(createTicket, 'body'), async (req, res, next) => {
  try {
    if (!requireDb(res)) return;
    const policy = await activePolicy();
    const target = resolveTarget(req.body, policy);
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + target * 60000);
    const ticket = await Ticket.create({
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      category: req.body.category,
      requesterName: req.body.requesterName,
      status: 'open',
      slaTargetMinutes: target,
      slaDeadline,
    });
    res.status(201).json({ data: withComputed(ticket, policy, now), serverNow: now.toISOString() });
  } catch (err) { next(err); }
});

router.patch('/:id/status', (req, res, next) => {
  const id = req.params.id;
  if (!objectId.safeParse(id).success) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
  const r = statusPatch.safeParse(req.body);
  if (!r.success) {
    const details = r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
  }
  next();
}, async (req, res, next) => {
  try {
    if (!requireDb(res)) return;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return sendError(res, 404, 'NOT_FOUND', 'Ticket not found');
    ticket.status = req.body.status;
    ticket.resolvedAt = req.body.status === 'resolved' ? new Date() : null;
    await ticket.save();
    const policy = await activePolicy();
    res.json({ data: withComputed(ticket, policy, new Date()), serverNow: new Date().toISOString() });
  } catch (err) { next(err); }
});

module.exports = router;
