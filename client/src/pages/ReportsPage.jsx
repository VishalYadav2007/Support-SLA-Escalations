import React, { useEffect, useState } from 'react';
import { getTickets, getPolicy, errMsg } from '../api/http';

export default function ReportsPage() {
  const [tickets, setTickets] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { Promise.all([getTickets(), getPolicy()]).then(([t, p]) => { setTickets(t.data); setPolicy(p); }).catch((e) => setError(errMsg(e))); }, []);
  if (error) return <div className="bg-surface-container-lowest text-on-surface min-h-screen flex flex-col items-center justify-center gap-3 p-6"><p className="text-error">{error}</p><button className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container" onClick={() => window.location.reload()}>Retry</button></div>;
  if (!policy) return <div className="bg-surface-container-lowest text-on-surface min-h-screen flex items-center justify-center"><span className="material-symbols-outlined animate-pulse text-secondary">hourglass_empty</span><span className="ml-2">Loading report…</span></div>;
  const byPriority = {};
  const bySla = {};
  for (const t of tickets) { byPriority[t.priority] = (byPriority[t.priority] || 0) + 1; bySla[t.slaState] = (bySla[t.slaState] || 0) + 1; }
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen font-body-md anim-fade-in-up">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <h1 className="font-headline-lg text-on-surface mb-1">Reports</h1>
        <p className="text-secondary/70 font-body-md mb-6">Ticket and SLA compliance breakdown.</p>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-surface-container-low border border-secondary/10 rounded-xl p-6">
            <h2 className="font-headline-sm mb-4">By priority</h2>
            {Object.entries(byPriority).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 mb-2"><span className="w-20 capitalize font-body-md">{k}</span><div className="flex-1 h-2 rounded-full bg-surface-container-highest"><div className="h-full bg-secondary rounded-full" style={{ width: (v / Math.max(1, tickets.length) * 100) + '%' }} /></div><span className="text-label-md tabular-nums">{v}</span></div>
            ))}
          </div>
          <div className="bg-surface-container-low border border-secondary/10 rounded-xl p-6">
            <h2 className="font-headline-sm mb-4">By SLA state</h2>
            {Object.entries(bySla).map(([k, v]) => (
              <div key={k} className="flex justify-between font-body-md mb-2"><span className="capitalize">{k}</span><span className="tabular-nums">{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
