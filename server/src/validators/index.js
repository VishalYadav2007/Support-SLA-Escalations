const { z } = require('zod');

const statuses = z.enum(['open', 'in_progress', 'resolved']);
const priorities = z.enum(['low', 'medium', 'high', 'urgent']);
const categories = z.enum(['billing', 'technical', 'account', 'general']);
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const nonEmpty = (max) => z.string().trim().min(1, 'Required').max(max);
const minutes = z.number({ error: 'Expected number' }).int().min(5).max(43200);

const createTicket = z.object({
  title: nonEmpty(150).min(5),
  description: nonEmpty(2000).min(10),
  priority: priorities,
  category: categories,
  requesterName: nonEmpty(120),
});

const statusPatch = z.object({ status: statuses });
const listQuery = z.object({ status: statuses.optional() });

const ruleSchema = z.object({
  priority: z.enum(['any', 'low', 'medium', 'high', 'urgent']).default('any'),
  category: z.enum(['any', 'billing', 'technical', 'account', 'general']).default('any'),
  targetMinutes: minutes,
});

const policySchema = z.object({
  defaults: z.object({
    urgent: minutes,
    high: minutes,
    medium: minutes,
    low: minutes,
  }),
  warningPercent: z.number().int().min(50).max(95),
  rules: z.array(ruleSchema).max(20).default([]),
  // Optional extended settings surface (persisted but not strictly validated field-by-field).
  matrix: z.record(z.any()).optional(),
  businessHours: z.record(z.any()).optional(),
  triggers: z.array(z.any()).optional(),
  meta: z.record(z.any()).optional(),
});

function validate(schema, where) {
  return (req, res, next) => {
    const data = { body: req.body, query: req.query, params: req.params };
    const result = schema.safeParse(data[where]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details } });
    }
    req[where] = result.data;
    next();
  };
}

module.exports = { createTicket, statusPatch, listQuery, policySchema, validate, objectId };
