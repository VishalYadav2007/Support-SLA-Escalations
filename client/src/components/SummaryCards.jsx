import React from 'react';

export default function SummaryCards({ tickets }) {
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
  return (
    <div className="summaryGrid">
      {cards.map((c) => (
        <div key={c.label} className="card statCard">
          <div className="statNum">{c.value}</div>
          <div className="muted">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
