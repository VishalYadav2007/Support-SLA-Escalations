import React, { useEffect, useState } from 'react';
import { getPolicy, putPolicy, errMsg } from '../api/http';

export default function SettingsPage() {
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { getPolicy().then((p) => setPolicy(p)).catch((e) => setError(errMsg(e))); }, []);
  if (error) return <div className="state"><p className="err">{error}</p><button className="btn" onClick={() => window.location.reload()}>Retry</button></div>;
  if (!policy) return <div className="state"><span className="spinner" /> Loading settings…</div>;
  function validate() {
    for (const k of ['urgent', 'high', 'medium', 'low']) {
      const v = policy.defaults[k];
      if (!Number.isInteger(v) || v < 5 || v > 43200) return k + ' target must be 5–43200 minutes';
    }
    if (!Number.isInteger(policy.warningPercent) || policy.warningPercent < 50 || policy.warningPercent > 95) return 'Warning threshold must be 50–95%';
    if (policy.rules.length > 20) return 'At most 20 rules allowed';
    for (const r of policy.rules) if (!Number.isInteger(r.targetMinutes) || r.targetMinutes < 5 || r.targetMinutes > 43200) return 'Rule target must be 5–43200 minutes';
    return '';
  }
  async function save(ev) {
    ev.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setError(''); setMsg(''); setSaving(true);
    try { const saved = await putPolicy(policy); setPolicy(saved); setMsg('Saved.'); } catch (err) { setError(errMsg(err)); }
    setSaving(false);
  }
  function setDefault(k, v) { setPolicy({ ...policy, defaults: { ...policy.defaults, [k]: Number(v) } }); }
  function setRule(i, patch) { setPolicy({ ...policy, rules: policy.rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }); }
  return (
    <form onSubmit={save} noValidate>
      <h1>SLA settings</h1>
      <div className="card">
        <h2>Default targets</h2>
        {['urgent', 'high', 'medium', 'low'].map((k) => (
          <label key={k}>{k}<input type="number" min="5" max="43200" value={policy.defaults[k]} onChange={(e) => setDefault(k, e.target.value)} required /></label>
        ))}
        <label>Warning threshold (%)<input type="number" min="50" max="95" value={policy.warningPercent} onChange={(e) => setPolicy({ ...policy, warningPercent: Number(e.target.value) })} required /></label>
      </div>
      <div className="card">
        <h2>Rule builder</h2>
        {policy.rules.map((r, i) => (
          <div key={i} className="ruleRow">
            <select value={r.priority} onChange={(e) => setRule(i, { priority: e.target.value })} aria-label="Rule priority">
              <option value="any">Any priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
            <select value={r.category} onChange={(e) => setRule(i, { category: e.target.value })} aria-label="Rule category">
              <option value="any">Any category</option><option value="billing">Billing</option><option value="technical">Technical</option><option value="account">Account</option><option value="general">General</option>
            </select>
            <input type="number" min="5" max="43200" value={r.targetMinutes} onChange={(e) => setRule(i, { targetMinutes: Number(e.target.value) })} aria-label="Rule target minutes" />
            <button type="button" className="btn ghost" onClick={() => setPolicy({ ...policy, rules: policy.rules.filter((_, idx) => idx !== i) })}>Delete</button>
          </div>
        ))}
        <button type="button" className="btn ghost" onClick={() => setPolicy({ ...policy, rules: [...policy.rules, { priority: 'any', category: 'any', targetMinutes: 120 }] })}>Add rule</button>
        <div className="modalActions"><button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
        {msg && <p className="ok">{msg}</p>}
        {error && <p className="err">{error}</p>}
      </div>
    </form>
  );
}
