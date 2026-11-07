import React, { useCallback, useEffect, useState } from 'react';
import { getTickets, getPolicy, patchStatus, errMsg } from '../api/http';
import NewTicketModal from '../components/NewTicketModal';
import Countdown from '../components/Countdown';

const STATUSES = ['open', 'in_progress', 'resolved'];
const LABELS = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved' };

export default function TicketsPage({ showModal, setShowModal, query }) {
  const [tickets, setTickets] = useState([]);
  const [offset, setOffset] = useState(0);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({});

  const load = useCallback(async () => {
    try {
      const [ticketsRes, policyRes] = await Promise.all([getTickets(), getPolicy()]);
      setTickets(ticketsRes.data);
      setOffset(new Date(ticketsRes.serverNow).getTime() - Date.now());
      setPolicy(policyRes);
      setError('');
    } catch (e) { setError(errMsg(e)); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) load(); }, 30000);
    return () => clearInterval(id);
  }, [load]);

  function onStatusChange(id, nextStatus) {
    const prev = tickets.find((t) => t._id === id)?.status;
    setTickets((all) => all.map((t) => (t._id === id ? { ...t, status: nextStatus } : t)));
    setFeedback((f) => ({ ...f, [id]: 'Saving…' }));
    patchStatus(id, nextStatus)
      .then(() => { setFeedback((f) => ({ ...f, [id]: 'Saved' })); load(); })
      .catch(() => {
        setTickets((all) => all.map((t) => (t._id === id ? { ...t, status: prev } : t)));
        setFeedback((f) => ({ ...f, [id]: 'Failed' }));
      });
  }

  const filtered = tickets.filter((t) => {
    const q = (query || '').trim().toLowerCase();
    return !q || t.title.toLowerCase().includes(q) || t.requesterName.toLowerCase().includes(q) || t._id.toLowerCase().includes(q);
  });

  const total = tickets.length;
  const open = tickets.filter((t) => t.status === 'open').length;
  const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
  const needsAttention = tickets.filter((t) => t.slaState === 'warning' || t.slaState === 'breached').length;
  const cards = [
    { label: 'Total tickets', value: total },
    { label: 'Open', value: open },
    { label: 'In progress', value: inProgress },
    { label: 'Needs attention', value: needsAttention },
  ];

  if (loading) return <div className="bg-surface-container-lowest text-on-surface min-h-screen flex items-center justify-center"><span className="material-symbols-outlined animate-pulse text-secondary">hourglass_empty</span><span className="ml-2 font-body-md">Loading tickets…</span></div>;
  if (error && tickets.length === 0) {
    return <div className="bg-surface-container-lowest text-on-surface min-h-screen flex flex-col items-center justify-center gap-3 p-6"><p className="text-error font-body-md">{error}</p><button className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-label-md" onClick={() => { setLoading(true); load(); }}>Retry</button></div>;
  }

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen font-body-md">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-surface-container-low border border-secondary/10 rounded-xl p-4">
              <div className="text-timer-display font-bold text-on-surface">{c.value}</div>
              <div className="text-label-md text-secondary/70">{c.label}</div>
            </div>
          ))}
        </div>
        <div className="bg-surface-container-low border border-secondary/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-secondary/10">
            <h1 className="font-headline-sm text-headline-sm text-on-surface">Ticket Queue</h1>
            <span className="text-label-md text-secondary/70">Sorted by nearest deadline</span>
          </div>
          {tickets.length === 0 ? (
            <div className="p-10 text-center text-secondary/70"><p className="font-body-md mb-4">No tickets yet.</p><button className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-label-md" onClick={() => setShowModal(true)}>New ticket</button></div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-secondary/70 font-body-md">No tickets match your search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-md border-collapse">
                <thead>
                  <tr className="bg-surface-container-high/60 text-secondary font-label-sm uppercase tracking-wider border-b border-secondary/10">
                    <th className="py-3 px-4">Ticket</th><th className="py-3 px-4">Requester</th><th className="py-3 px-4">Priority</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">SLA</th><th className="py-3 px-4">Time left</th><th className="py-3 px-4">Deadline</th>
                  </tr>
                </thead>
                <tbody className="text-on-surface divide-y divide-secondary/5">
                  {filtered.map((t, i) => (
                    <tr key={t._id + '-' + i} className="hover:bg-surface-container transition-colors">
                      <td className="py-3 px-4"><div className="font-semibold">{t.title}</div><div className="text-secondary/60 text-body-sm font-mono">{t._id}</div></td>
                      <td className="py-3 px-4">{t.requesterName}</td>
                      <td className="py-3 px-4"><span className={'inline-block w-2.5 h-2.5 rounded-full mr-2 ' + (t.priority === 'urgent' ? 'bg-primary' : t.priority === 'high' ? 'bg-tertiary' : 'bg-secondary/40')}></span><span className="capitalize">{t.priority}</span></td>
                      <td className="py-3 px-4">
                        <select value={t.status} onChange={(e) => onStatusChange(t._id, e.target.value)} aria-label={'Status for ' + t.title} className="bg-surface-container-high border border-secondary/20 rounded-lg px-2 py-1 text-on-surface font-body-md">
                          {STATUSES.map((s) => <option key={s} value={s}>{LABELS[s]}</option>)}
                        </select>
                        {feedback[t._id] && <div className={'text-label-sm mt-1 ' + (feedback[t._id] === 'Saved' ? 'text-[#BAD62C]' : 'text-error')}>{feedback[t._id]}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex gap-1 flex-wrap">
                          <span className={'px-2 py-0.5 rounded-full text-label-sm ' + (t.slaState === 'normal' ? 'bg-[#BAD62C]/15 text-[#BAD62C]' : t.slaState === 'warning' ? 'bg-tertiary-container/30 text-tertiary' : t.slaState === 'breached' ? 'bg-primary-container/40 text-primary' : 'bg-surface-container-high text-secondary')}>{t.slaState === 'resolved' ? 'Resolved' : t.slaState}</span>
                          {t.escalated && t.slaState === 'breached' && <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container text-label-sm">Escalated</span>}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-timer-display tabular-nums"><Countdown ticket={t} offset={offset} /></td>
                      <td className="py-3 px-4 text-secondary/80">{new Date(t.slaDeadline).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {error && <div className="p-6 text-center"><p className="text-error font-body-md mb-3">{error}</p><button className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface font-label-md" onClick={load}>Retry</button></div>}
        </div>
      </div>
      {showModal && <NewTicketModal policy={policy} onClose={() => setShowModal(false)} onCreated={() => load()} />}
    </div>
  );
}
