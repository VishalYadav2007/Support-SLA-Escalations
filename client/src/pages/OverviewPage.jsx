import React, { useEffect, useState } from 'react';
import { getTickets, errMsg } from '../api/http';

export default function OverviewPage() {
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { getTickets().then((r) => setTickets(r.data)).catch((e) => setError(errMsg(e))); }, []);
  if (error) return <div className="bg-surface-container-lowest text-on-surface min-h-screen flex flex-col items-center justify-center gap-3 p-6"><p className="text-error">{error}</p><button className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container" onClick={() => window.location.reload()}>Retry</button></div>;
  const total = tickets.length;
  const open = tickets.filter((t) => t.status === 'open').length;
  const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
  const breached = tickets.filter((t) => t.slaState === 'breached').length;
  const warning = tickets.filter((t) => t.slaState === 'warning').length;
  const top = tickets.filter((t) => t.status !== 'resolved').slice(0, 5);
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen font-body-md anim-fade-in-up">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <h1 className="font-headline-lg text-on-surface mb-1">Overview</h1>
        <p className="text-secondary/70 font-body-md mb-6">Live queue health across all tickets.</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          {[['Total tickets', total], ['Open', open], ['In progress', inProgress], ['Warning now', warning], ['Breached / Escalated', breached]].map(([l, v]) => (
            <div key={l} className="bg-surface-container-low border border-secondary/10 rounded-xl p-4"><div className="text-timer-display font-bold">{v}</div><div className="text-label-md text-secondary/70">{l}</div></div>
          ))}
        </div>
        <div className="bg-surface-container-low border border-secondary/10 rounded-xl p-6">
          <h2 className="font-headline-sm mb-4">Needs attention (nearest deadlines)</h2>
          {top.length === 0 ? <p className="text-secondary/70 font-body-md">No unresolved tickets.</p> : (
            <ul className="flex flex-col gap-2">{top.map((t) => (
              <li key={t._id} className="flex justify-between bg-surface-container rounded-lg px-4 py-3 border border-secondary/10">
                <span className="font-body-md">{t.title} <span className="text-secondary/60">— {t.requesterName}</span></span>
                <span className={'px-2 py-0.5 rounded-full text-label-sm ' + (t.slaState === 'breached' ? 'bg-primary-container/40 text-primary' : 'bg-tertiary-container/30 text-tertiary')}>{t.slaState}</span>
              </li>
            ))}</ul>
          )}
        </div>
      </div>
    </div>
  );
}
