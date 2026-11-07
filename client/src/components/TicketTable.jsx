import React from 'react';
import SlaBadge from './SlaBadge';
import Countdown from './Countdown';

const STATUSES = ['open', 'in_progress', 'resolved'];
const LABELS = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved' };
const DOT_CLASS = { urgent: 'dot-urgent', high: 'dot-high', medium: 'dot-medium', low: 'dot-low' };

function formatDeadline(value) {
  const d = new Date(value);
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function TicketTable({ tickets, offset, feedback, onStatusChange }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Ticket</th><th>Requester</th><th>Priority</th><th>Status</th><th>SLA</th><th>Time left</th><th>Deadline</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t, i) => (
            <tr key={t._id + '-' + i}>
              <td>
                <div className="cellTitle">{t.title}</div>
                <div className="muted">{t._id}</div>
              </td>
              <td>{t.requesterName}</td>
              <td>
                <span className={'dot ' + (DOT_CLASS[t.priority] || 'dot-medium')} />
                <span className="capitalize">{t.priority}</span>
              </td>
              <td>
                <select value={t.status} onChange={(e) => onStatusChange(t._id, e.target.value)} aria-label={'Status for ' + t.title}>
                  {STATUSES.map((s) => <option key={s} value={s}>{LABELS[s]}</option>)}
                </select>
                {feedback[t._id] && <div className={feedback[t._id] === 'Saved' ? 'ok small' : 'err small'}>{feedback[t._id]}</div>}
              </td>
              <td><SlaBadge slaState={t.slaState} escalated={t.escalated} /></td>
              <td><Countdown ticket={t} offset={offset} /></td>
              <td>{formatDeadline(t.slaDeadline)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
