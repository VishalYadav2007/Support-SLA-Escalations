import React, { useState } from 'react';
import { createTicket, errMsg } from '../api/http';

export default function NewTicketModal({ policy, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', category: 'general', requesterName: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function preview() {
    if (!policy) return '—';
    for (const r of policy.rules || []) {
      const pOk = !r.priority || r.priority === 'any' || r.priority === form.priority;
      const cOk = !r.category || r.category === 'any' || r.category === form.category;
      if (pOk && cOk) return r.targetMinutes;
    }
    return policy.defaults[form.priority];
  }

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    else if (form.title.trim().length < 5) e.title = 'Title must be at least 5 characters';
    else if (form.title.trim().length > 150) e.title = 'Title must be at most 150 characters';
    if (!form.description.trim()) e.description = 'Description is required';
    else if (form.description.trim().length < 10) e.description = 'Description must be at least 10 characters';
    if (!form.requesterName.trim()) e.requesterName = 'Requester name is required';
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSaving(true);
    try {
      const created = await createTicket(form);
      onCreated(created);
      onClose();
    } catch (err) {
      setErrors({ form: errMsg(err) });
    }
    setSaving(false);
  }

  const field = 'w-full h-10 px-3 rounded-lg bg-surface-container text-on-surface border border-secondary/20 text-body-md focus:outline-none focus:border-secondary';
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-low border border-secondary/20 rounded-xl w-full max-w-lg p-6 shadow-2xl">
        <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">New ticket</h3>
        <form onSubmit={submit} noValidate className="flex flex-col gap-1">
          <label className="font-label-md text-label-md text-secondary">Title
            <input className={field + ' mt-1'} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            {errors.title && <span className="text-error text-body-sm">{errors.title}</span>}
          </label>
          <label className="font-label-md text-label-md text-secondary mt-2">Description
            <textarea className={field + ' mt-1 h-20 py-2'} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {errors.description && <span className="text-error text-body-sm">{errors.description}</span>}
          </label>
          <span className="grid grid-cols-2 gap-3 mt-2">
            <label className="font-label-md text-label-md text-secondary">Priority
              <select className={field + ' mt-1'} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="font-label-md text-label-md text-secondary">Category
              <select className={field + ' mt-1'} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="billing">Billing</option><option value="technical">Technical</option><option value="account">Account</option><option value="general">General</option>
              </select>
            </label>
          </span>
          <label className="font-label-md text-label-md text-secondary mt-2">Requester name
            <input className={field + ' mt-1'} value={form.requesterName} onChange={(e) => setForm({ ...form, requesterName: e.target.value })} />
            {errors.requesterName && <span className="text-error text-body-sm">{errors.requesterName}</span>}
          </label>
          <div className="text-body-sm text-secondary/70 mt-2">SLA target preview: {preview()} minutes</div>
          {errors.form && <p className="text-error text-body-sm">{errors.form}</p>}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-secondary/15">
            <button type="button" className="px-4 py-2 rounded-lg bg-surface-container text-secondary hover:text-on-surface font-label-md" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold" disabled={saving}>{saving ? 'Creating…' : 'Create ticket'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
