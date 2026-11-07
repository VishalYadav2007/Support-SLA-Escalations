import React, { useEffect, useState } from 'react';
function format(remainingMs) {
  const abs = Math.abs(remainingMs);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  return { h, m, s };
}
export default function Countdown({ ticket, offset }) {
  const [now, setNow] = useState(Date.now() + offset);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(id);
  }, [offset]);
  if (ticket.status === 'resolved' || ticket.slaState === 'resolved') return <span>Done</span>;
  const deadline = new Date(ticket.slaDeadline).getTime();
  const remaining = deadline - now;
  const { h, m, s } = format(remaining);
  if (remaining <= 0) return <span>Breached by {h}h {m}m</span>;
  return <span>{h}h {m}m {s}s left</span>;
}
