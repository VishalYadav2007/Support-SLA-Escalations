import React, { useEffect, useState } from 'react';
import { getTickets, errMsg } from '../api/http';

export default function TeamPage() {
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { getTickets().then((r) => setTickets(r.data)).catch((e) => setError(errMsg(e))); }, []);
  if (error) return <div className="bg-surface-container-lowest text-on-surface min-h-screen flex flex-col items-center justify-center gap-3 p-6"><p className="text-error">{error}</p><button className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container" onClick={() => window.location.reload()}>Retry</button></div>;
  const byRequester = {};
  for (const t of tickets) byRequester[t.requesterName] = (byRequester[t.requesterName] || 0) + 1;
  const entries = Object.entries(byRequester);
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen font-body-md anim-fade-in-up">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <h1 className="font-headline-lg text-on-surface mb-1">Team</h1>
        <p className="text-secondary/70 font-body-md mb-6">Ticket workload by requester (derived from live tickets).</p>
        {entries.length === 0 ? <div className="bg-surface-container-low border border-secondary/10 rounded-xl p-10 text-center text-secondary/70">No tickets yet.</div> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {entries.map(([name, n]) => (
              <div key={name} className="bg-surface-container-low border border-secondary/10 rounded-xl p-4 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-secondary-container text-secondary flex items-center justify-center font-bold">{name.slice(0, 1).toUpperCase()}</span>
                <div><div className="font-label-md font-semibold">{name}</div><div className="text-label-sm text-secondary/70">{n} ticket{n === 1 ? '' : 's'}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
