import React from 'react';

const LABELS = { normal: 'Normal', warning: 'Warning', breached: 'Breached', resolved: 'Resolved' };

export default function SlaBadge({ slaState, escalated }) {
  const label = LABELS[slaState] || slaState;
  return (
    <span className="badgeRow">
      <span className={'badge badge-' + slaState}>{label}</span>
      {escalated && slaState === 'breached' && <span className="badge badge-escalated">Escalated</span>}
    </span>
  );
}
