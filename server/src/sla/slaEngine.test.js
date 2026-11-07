const { resolveTarget, computeState } = require('./slaEngine');
const policy = {
  defaults: { urgent: 60, high: 240, medium: 480, low: 1440 },
  warningPercent: 75,
  rules: [
    { priority: 'urgent', category: 'billing', targetMinutes: 30 },
    { priority: 'any', category: 'billing', targetMinutes: 120 },
    { priority: 'low', category: 'any', targetMinutes: 999 },
  ],
};
const now = new Date('2026-01-01T12:00:00Z');
const open = (over = {}) => Object.assign({ status: 'open', priority: 'high', category: 'technical', slaTargetMinutes: 240, slaDeadline: new Date(now.getTime() + 240 * 60000) }, over);
// Each state
test('normal', () => { expect(computeState(open(), now, 75).slaState).toBe('normal'); });
test('warning', () => { expect(computeState(open({ slaDeadline: new Date(now.getTime() + 0.1 * 240 * 60000) }), now, 75).slaState).toBe('warning'); });
test('breached sets escalated', () => { const r = computeState(open({ slaDeadline: new Date(now.getTime() - 1000) }), now, 75); expect(r.slaState).toBe('breached'); expect(r.escalated).toBe(true); });
test('normal/warning not escalated', () => { expect(computeState(open(), now, 75).escalated).toBe(false); });
test('resolved ticket', () => { const r = computeState(open({ status: 'resolved', slaDeadline: new Date(now.getTime() - 1000) }), now, 75); expect(r.slaState).toBe('resolved'); expect(r.remainingMs).toBeNull(); });
// Rule order + default fallback
test('rule order: first match wins (urgent+billing -> 30, not 120)', () => { expect(resolveTarget({ priority: 'urgent', category: 'billing' }, policy)).toBe(30); });
test('second rule matches any priority billing', () => { expect(resolveTarget({ priority: 'high', category: 'billing' }, policy)).toBe(120); });
test('default fallback', () => { expect(resolveTarget({ priority: 'medium', category: 'technical' }, policy)).toBe(480); });
