// Pure SLA functions. No DB, no Date.now inside. `now` is always passed in.
function resolveTarget(ticket, policy) {
  for (const rule of policy.rules || []) {
    const pOk = !rule.priority || rule.priority === 'any' || rule.priority === ticket.priority;
    const cOk = !rule.category || rule.category === 'any' || rule.category === ticket.category;
    if (pOk && cOk) return rule.targetMinutes;
  }
  return policy.defaults[ticket.priority];
}
function computeState(ticket, now, warningPercent = 75) {
  if (ticket.status === 'resolved') {
    return { slaState: 'resolved', remainingMs: null, escalated: false };
  }
  const deadline = new Date(ticket.slaDeadline).getTime();
  const nowMs = new Date(now).getTime();
  const remainingMs = deadline - nowMs;
  if (remainingMs <= 0) {
    return { slaState: 'breached', remainingMs, escalated: true };
  }
  const windowMs = (ticket.slaTargetMinutes || 0) * 60000;
  let elapsedPercent = windowMs > 0 ? 100 * (1 - remainingMs / windowMs) : 0;
  elapsedPercent = Math.max(0, Math.min(100, elapsedPercent));
  if (elapsedPercent >= warningPercent) {
    return { slaState: 'warning', remainingMs, escalated: false };
  }
  return { slaState: 'normal', remainingMs, escalated: false };
}
function withComputed(ticket, policy, now) {
  const obj = ticket.toObject ? ticket.toObject() : { ...ticket };
  delete obj.__v;
  const warningPercent = policy.warningPercent ?? 75;
  const c = computeState(obj, now, warningPercent);
  return { ...obj, slaState: c.slaState, remainingMs: c.remainingMs, escalated: c.escalated };
}
module.exports = { resolveTarget, computeState, withComputed };
