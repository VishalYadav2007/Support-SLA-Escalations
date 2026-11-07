import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getPolicy, putPolicy, getTickets, createTicket, errMsg } from '../../api/http';

export const PRESETS = [
  { id: 'enterprise_gold', title: 'Enterprise Gold Policy', uuid: 'pol_ent_gold_009941_tier1', desc: 'Strict SLA policy for mission-critical enterprise accounts with 99.9% uptime SLA.', p1: '15', resolve: '2.0', tenants: '42 Accounts', p1Label: '15m Max', badge: 'DEFAULT' },
  { id: 'standard', title: 'Standard SLA Policy', uuid: 'pol_std_norm_008321_tier2', desc: 'Balanced default policy for commercial tier accounts with standard 99.5% uptime coverage.', p1: '60', resolve: '8.0', tenants: '180 Accounts', p1Label: '1h 00m', badge: 'Active' },
  { id: 'vip_partner', title: 'VIP Partner SLA Policy', uuid: 'pol_vip_plat_007812_tier0', desc: 'Dedicated high-touch infrastructure policy with ultra-low response triggers and VIP routing.', p1: '10', resolve: '1.5', tenants: '8 Accounts', p1Label: '10m Max', badge: 'Ultra-Low' },
  { id: 'community', title: 'Trial / Community Policy', uuid: 'pol_comm_fre_001294_tier3', desc: 'Best-effort community level SLAs without financial penalty commitments or expedited queues.', p1: '120', resolve: '24.0', tenants: '95 Accounts', p1Label: 'Best Effort', badge: 'Non-Binding' },
];

const ROWS = [
  { tier: 'p1', unit: 'min', label: 'P1 Critical', dot: 'bg-primary glow-dot-crimson', target: 15, resolve: 2, pct: 75 },
  { tier: 'p2', unit: 'hours', label: 'P2 High', dot: 'bg-secondary', target: 1, resolve: 8, pct: 80 },
  { tier: 'p3', unit: 'hours', label: 'P3 Medium', dot: 'bg-secondary/50', target: 4, resolve: 24, pct: 85 },
  { tier: 'p4', unit: 'hours', label: 'P4 Low', dot: 'bg-secondary/30', target: 24, resolve: 72, pct: 90 },
];

const DEFAULT_MATRIX = {
  p1: { target: 15, resolve: 2, pct: 75 },
  p2: { target: 1, resolve: 8, pct: 80 },
  p3: { target: 4, resolve: 24, pct: 85 },
  p4: { target: 24, resolve: 72, pct: 90 },
};

const DEFAULT_BUSINESS_HOURS = {
  days: [true, true, true, true, true, false, false],
  start: '08:00 AM',
  end: '08:00 PM',
  timezone: 'America/New_York (EST/EDT)',
  pauseOutsideShifts: true,
};

// Tracks which preset is currently highlighted in the sidebar (kept in sync by pickPreset).
const activePresetRef = { current: PRESETS[0].id };

function warningMark(target, pct, unit) {
  const w = target * (pct / 100);
  if (unit === 'min') return `@ ${w.toFixed(2)} min`;
  return w < 1 ? `@ ${(w * 60).toFixed(2)} min` : `@ ${w.toFixed(2)} hrs`;
}

export function useTheme() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('supportsla-theme') !== 'light'; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem('supportsla-theme', dark ? 'dark' : 'light'); } catch {}
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('light', !dark);
  }, [dark]);
  return { dark, setDark };
}

export default function StitchPage() {
  const { dark, setDark } = useTheme();
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);
  const showToast = useCallback((msg) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      const p = (x) => String(x).padStart(2, '0');
      setClock(`${p(n.getUTCHours())}:${p(n.getUTCMinutes())}:${p(n.getUTCSeconds())} UTC`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ---- Data loading / saving ----
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ticketsCount, setTicketsCount] = useState(0);
  const [breachedCount, setBreachedCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [attentionCount, setAttentionCount] = useState(0);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [ntForm, setNtForm] = useState({ title: '', description: '', priority: 'medium', category: 'general', requesterName: '' });
  const [ntSaving, setNtSaving] = useState(false);

  useEffect(() => {
    getTickets().then((r) => {
      const d = r.data || [];
      setTicketsCount(d.length);
      const breached = d.filter((t) => t.slaState === 'breached');
      setBreachedCount(breached.length);
      setAttentionCount(d.filter((t) => t.slaState === 'breached' || t.slaState === 'warning').length);
      setNotifications(d.filter((t) => t.slaState === 'breached' || t.slaState === 'warning').map((t) => ({
        id: t._id,
        title: t.title,
        body: t.slaState === 'breached' ? 'Breached deadline — escalated' : 'Approaching deadline — needs attention',
        time: new Date(t.slaDeadline).toLocaleString(),
      })).slice(0, 5));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const p = await getPolicy();
        if (!cancelled) setPolicy(p);
      } catch (e) {
        if (!cancelled) setError(errMsg(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---- Hooks hoisted above early returns ----
  const matrixDefault = policy?.matrix || DEFAULT_MATRIX;
  const bhDefault = policy?.businessHours || DEFAULT_BUSINESS_HOURS;
  const [nameInput, setNameInput] = useState('Enterprise Gold (Active)');
  const [descInput, setDescInput] = useState('Strict SLA policy for mission-critical enterprise accounts with 99.9% uptime SLA.');
  const [badgeP1, setBadgeP1] = useState('15 MIN');
  const [badgeResolve, setBadgeResolve] = useState('2.0 HRS');
  const [matrix, setMatrix] = useState(() => {
    const m = {};
    ROWS.forEach((r) => {
      const src = matrixDefault[r.tier] || {};
      m[r.tier] = { target: src.target ?? r.target, pct: src.pct ?? r.pct };
    });
    return m;
  });

  const [days, setDays] = useState([...DEFAULT_BUSINESS_HOURS.days]);
  const [pause, setPause] = useState(true);
  const [shiftStart, setShiftStart] = useState('08:00 AM');
  const [shiftEnd, setShiftEnd] = useState('08:00 PM');

  const [triggers, setTriggers] = useState([
    { icon: 'crisis_alert', cond: 'Ticket Priority == P1', and: 'First Response Remaining < 5 min', then: 'Notify On-Call Engineer via PagerDuty (Sev-1 Rotation) & dispatch to #support-sev1' },
    { icon: 'arrow_upward', cond: 'SLA Status == Breached', then: 'Automatically re-route to Tier-2 Escalation Pod and assign ticket to current Shift Lead' },
    { icon: 'support_agent', cond: 'Customer Tier == Enterprise Gold', and: 'At Risk for > 10 min', then: 'Dispatch priority memo to assigned Dedicated Account Executive via Email & Webhook' },
  ]);

  const [unsaved, setUnsaved] = useState(false);
  const [deploy, setDeploy] = useState({ icon: 'bolt', text: 'Save & Deploy Policy', spinning: false, disabled: false });
  const [modalOpen, setModalOpen] = useState(false);
  const [cond, setCond] = useState('Ticket Priority == P2 AND At Risk for > 20 min');
  const [action, setAction] = useState('Escalate priority to Sev-2 queue and send SMS to secondary on-call engineer');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (policy) {
      const md = policy.matrix || DEFAULT_MATRIX;
      const bh = policy.businessHours || DEFAULT_BUSINESS_HOURS;
      const m = {};
      ROWS.forEach((r) => { const src = md[r.tier] || {}; m[r.tier] = { target: src.target ?? r.target, pct: src.pct ?? r.pct }; });
      setMatrix(m);
      setNameInput(`${policy.meta?.title || 'Enterprise Gold'} (Active)`);
      setDescInput(policy.meta?.desc || 'Strict SLA policy for mission-critical enterprise accounts with 99.9% uptime SLA.');
      setBadgeP1(`${md.p1?.target ?? 15} MIN`);
      setBadgeResolve(`${md.p1?.resolve ?? 2} HRS`);
      setDays(Array.isArray(bh.days) ? bh.days : [...DEFAULT_BUSINESS_HOURS.days]);
      setPause(!!bh.pauseOutsideShifts);
      setShiftStart(bh.start || '08:00 AM');
      setShiftEnd(bh.end || '08:00 PM');
      if (policy.triggers && policy.triggers.length) setTriggers(policy.triggers);
    }
  }, [policy]);

  const markDirty = () => setUnsaved(true);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest p-6">
        <div className="max-w-md bg-surface-container-low rounded-xl border border-secondary/15 p-6 shadow-2xl text-center">
          <span className="material-symbols-outlined text-error text-headline-lg block mb-3">error</span>
          <p className="font-body-md text-body-md text-on-surface mb-4">{error}</p>
          <button className="btn" onClick={() => window.location.reload()} type="button">Retry</button>
        </div>
      </div>
    );
  }
  if (!policy || loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest p-6">
        <div className="bg-surface-container-low rounded-xl border border-secondary/15 p-6 shadow-2xl flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-secondary animate-pulse text-headline-lg">hourglass_empty</span>
          <span className="font-body-sm text-body-sm text-secondary/70">Loading settings…</span>
        </div>
      </div>
    );
  }

  function pickPreset(p) {
    activePresetRef.current = p.id;
    const m = {};
    ROWS.forEach((r) => {
      const src = (p.matrix && p.matrix[r.tier]) || { target: r.target, pct: r.pct };
      m[r.tier] = { target: src.target, pct: src.pct };
    });
    setMatrix(m);
    setBadgeP1(`${m.p1.target} MIN`);
    setBadgeResolve(`${m.p1.resolve} HRS`);
    setNameInput(`${p.title} (Active)`);
    setDescInput(p.desc);
    setDays(Array.isArray(p.businessHours?.days) ? p.businessHours.days : DEFAULT_BUSINESS_HOURS.days);
    setPause(!!(p.businessHours?.pauseOutsideShifts ?? true));
    setShiftStart(p.businessHours?.start || '08:00 AM');
    setShiftEnd(p.businessHours?.end || '08:00 PM');
    setTriggers(p.triggers && p.triggers.length ? p.triggers : []);
    setUnsaved(true);
    showToast(`Loaded preset "${p.title}" into editor.`);
  }

  function deleteRule(i) {
    setDeleting(i);
    setTimeout(() => {
      setTriggers((r) => r.filter((_, idx) => idx !== i));
      setDeleting(null);
      markDirty();
      showToast('Escalation rule deleted from policy.');
    }, 300);
  }

  function deployClick() {
    setDeploy({ icon: 'refresh', text: 'Deploying Rules...', spinning: true, disabled: true });
    setTimeout(() => {
      setDeploy({ icon: 'verified', text: 'Deployed to Fleet', spinning: false, disabled: true });
      showToast('Enterprise Gold SLA Policy successfully deployed to production fleet.');
      setTimeout(() => {
        setDeploy({ icon: 'bolt', text: 'Save & Deploy Policy', spinning: false, disabled: false });
        setUnsaved(false);
      }, 1800);
    }, 1000);
  }
  function discard() {
    setUnsaved(false);
    setMatrix(() => {
      const m = {};
      ROWS.forEach((r) => { const src = matrixDefault[r.tier] || {}; m[r.tier] = { target: src.target ?? r.target, pct: src.pct ?? r.pct }; });
      return m;
    });
    setDays(DEFAULT_BUSINESS_HOURS.days);
    setPause(DEFAULT_BUSINESS_HOURS.pauseOutsideShifts);
    setShiftStart(DEFAULT_BUSINESS_HOURS.start);
    setShiftEnd(DEFAULT_BUSINESS_HOURS.end);
    showToast('Modifications discarded. Restored active policy state.');
  }

  async function save() {
    setError('');
    setUnsaved(false);
    const payload = {
      defaults: policy.defaults,
      warningPercent: policy.warningPercent,
      rules: policy.rules,
      matrix,
      businessHours: { days, start: shiftStart, end: shiftEnd, timezone: bhDefault.timezone, pauseOutsideShifts: pause },
      triggers,
      meta: {
        ...(policy.meta || {}),
        title: 'Enterprise Gold',
        desc: descInput,
        updatedAt: new Date().toISOString(),
      },
    };
    try {
      const saved = await putPolicy(payload);
      setPolicy(saved);
      showToast('Policy saved to server.');
    } catch (err) {
      setError(errMsg(err));
      setUnsaved(true);
    }
  }

  const NAV = [
    { icon: 'timer', label: 'SLA Policies', to: '/', active: true },
    { icon: 'dashboard', label: 'Overview', to: '/overview' },
    { icon: 'inbox', label: 'Ticket Queue', to: '/queue', count: String(ticketsCount) },
    { icon: 'warning', label: 'Escalations', to: '/escalations', count: String(breachedCount), red: true },
    { icon: 'monitoring', label: 'Reports', to: '/reports' },
    { icon: 'groups', label: 'Team', to: '/team' },
    { icon: 'settings', label: 'Settings', to: '/settings' },
  ];

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body-md text-body-md antialiased selection:bg-secondary/20 selection:text-secondary">
      <aside className="fixed left-0 top-0 h-full w-60 bg-surface-container-lowest z-50 flex flex-col justify-between border-r border-secondary/15">
        <div className="flex flex-col">
          <div className="h-16 px-space-md flex items-center justify-between border-b border-secondary/15">
            <div className="flex items-center gap-space-sm">
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-none">SupportSLA</span>
                <span className="font-label-sm text-label-sm text-secondary/60 leading-none mt-1">ENTERPRISE OPS</span>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-secondary font-label-sm text-label-sm border border-secondary/20">v2.4</span>
          </div>
          <nav className="flex flex-col px-space-sm py-space-md gap-space-xs">
            {NAV.map((n) => (
              <a key={n.label} href={n.to} className={n.active ? 'group flex items-center justify-between px-space-sm py-2 rounded-r-lg transition-colors bg-secondary/10 text-on-surface font-semibold border-l-2 border-secondary shadow-sm' : 'group flex items-center justify-between px-space-sm py-2 rounded-r-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all duration-200'}>
                <div className="flex items-center gap-space-sm">
                  <span className={'material-symbols-outlined text-body-lg ' + (n.red ? 'text-error' : 'text-secondary')}>{n.icon}</span>
                  <span className="font-label-md text-label-md">{n.label}</span>
                </div>
                {n.count && <span className={'px-1.5 py-0.5 rounded-full font-label-sm text-label-sm tabular-nums border ' + (n.red ? 'bg-error-container/40 text-error border-error/30' : 'bg-surface-container-high text-secondary border-secondary/20')}>{n.count}</span>}
              </a>
            ))}
          </nav>
        </div>
        <div className="p-space-sm border-t border-secondary/15 bg-surface-container-lowest/80">
          <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low border border-secondary/10 hover:border-secondary/30 transition-all cursor-pointer">
            <div className="flex items-center gap-space-sm">
              <span className="w-8 h-8 rounded-full bg-secondary-container text-secondary flex items-center justify-center font-bold text-xs">SJ</span>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-semibold leading-tight">Sarah Jenkins</span>
                <span className="font-label-sm text-label-sm text-secondary/70 leading-tight">Support Manager</span>
              </div>
            </div>
            <button className="text-on-surface-variant hover:text-on-surface p-1 rounded hover:bg-surface-container transition-colors" title="Session Options" type="button">
              <span className="material-symbols-outlined text-body-lg">more_vert</span>
            </button>
          </div>
        </div>
      </aside>
      <div className="pl-60">
        <header className="fixed top-0 left-60 right-0 h-16 bg-surface-container-lowest/95 backdrop-blur-xl border-b border-secondary/15 z-40 px-space-lg flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm">
            <span className="font-label-md text-label-md text-secondary/70">Mission Control</span>
            <span className="text-secondary/40 font-body-sm text-body-sm">/</span>
            <span className="font-label-md text-label-md text-on-surface font-medium">Operations Board</span>
          </div>
          <div className="flex-1 max-w-xl mx-auto">
            <div className="relative flex items-center w-full group">
              <span className="material-symbols-outlined absolute left-3 text-secondary/50 text-body-lg pointer-events-none group-focus-within:text-secondary transition-colors">search</span>
              <input className="w-full h-9 pl-9 pr-14 bg-surface-container-low border border-secondary/15 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 font-body-sm text-body-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all duration-200" placeholder="Search tickets by ID (#TK-...), customer, or subject..." type="text" />
              <span className="absolute right-2 px-1.5 py-0.5 rounded bg-surface-container-high border border-secondary/20 text-secondary font-label-sm text-label-sm pointer-events-none shadow-sm">⌘K</span>
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="hidden xl:flex items-center gap-2 px-space-sm py-1 rounded bg-surface-container-low border border-secondary/15 text-secondary font-label-sm text-label-sm tabular-nums hover:border-secondary/30 transition-colors cursor-default">
              <span className="material-symbols-outlined text-body-sm text-secondary/80">schedule</span>
              <span>{clock}</span>
            </div>
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-[#BAD62C]/10 border border-[#BAD62C]/30 shadow-sm cursor-default transition-all hover:bg-[#BAD62C]/15">
              <span className="w-2 h-2 rounded-full bg-[#BAD62C] glow-dot-lime"></span>
              <span className="font-label-sm text-label-sm text-[#BAD62C] font-semibold tabular-nums">94.2% Healthy</span>
            </div>
            <div className="relative flex items-center has-tooltip">
              <button aria-label="Toggle dark or light theme" className="relative flex items-center gap-1.5 p-1 rounded-full bg-surface-container-low border border-secondary/20 hover:border-secondary/40 transition-all cursor-pointer group shadow-sm focus:outline-none focus:ring-1 focus:ring-secondary/50" onClick={() => { setDark(!dark); showToast(!dark ? 'Dark theme enabled' : 'Light theme enabled'); }} type="button">
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-secondary transition-all">
                  <span className="material-symbols-outlined text-[16px] leading-none text-secondary">{dark ? 'dark_mode' : 'light_mode'}</span>
                  <span className="hidden md:inline font-label-sm text-label-sm font-semibold tracking-wide uppercase text-secondary/90 ml-0.5">{dark ? 'Dark' : 'Light'}</span>
                </span>
              </button>
              <span className="tooltip-content absolute left-1/2 -bottom-8 z-30 px-2.5 py-1 rounded bg-surface-bright text-on-surface font-label-sm text-label-sm border border-secondary/25 shadow-lg whitespace-nowrap">Switch theme (Light/Dark)</span>
            </div>
            <div className="relative">
              <button className="relative p-2 rounded-lg bg-surface-container-low border border-secondary/15 text-on-surface-variant hover:text-on-surface hover:border-secondary/30 transition-all active:scale-95" type="button" aria-label="Notifications" onClick={() => setShowNotif(!showNotif)}>
                <span className="material-symbols-outlined text-body-lg">notifications</span>
                {attentionCount > 0 && <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm tabular-nums border border-error/40">{attentionCount}</span>}
              </button>
              {showNotif && (
                <div className="absolute right-0 mt-2 w-80 bg-surface-container-low border border-secondary/20 rounded-xl shadow-2xl z-50 p-3">
                  <div className="flex justify-between items-center pb-2 border-b border-secondary/10"><b className="font-label-md">Notifications</b><button className="text-secondary text-label-sm hover:text-on-surface" onClick={() => setShowNotif(false)} type="button">Close</button></div>
                  {notifications.length === 0 ? <p className="text-label-md text-secondary/70 p-3">No new alerts.</p> : (
                    <ul className="flex flex-col gap-2 mt-2">
                      {notifications.map((n) => (
                        <li key={n.id} className="bg-surface-container rounded-lg px-3 py-2 border border-secondary/10">
                          <b className="font-label-md block">{n.title}</b>
                          <span className="text-label-sm text-secondary/70">{n.body}</span>
                          <span className="block text-label-sm text-secondary/50 mt-1">{n.time}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button className="w-full mt-3 py-2 rounded-lg bg-surface-container-high text-on-surface font-label-md" onClick={() => { setShowNotif(false); showToast('All alerts marked as read.'); }} type="button">Mark all as read</button>
                </div>
              )}
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container hover:bg-primary-container/85 hover:shadow-md hover:shadow-primary-container/20 active:scale-95 transition-all font-label-md text-label-md font-semibold" type="button" onClick={() => setShowNewTicket(true)}>
              <span className="material-symbols-outlined text-body-md">add</span><span>New Ticket</span>
            </button>
          </div>
        </header>
        <main className="w-full pt-16 bg-surface-container-lowest min-h-screen">
          <div className="flex flex-col w-full">
            <div className="relative w-full overflow-hidden">
              <div className="absolute -top-32 left-1/4 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '8s' }}></div>
              <div className="absolute -top-24 right-1/3 w-80 h-80 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="w-full px-space-lg py-space-md grid grid-cols-12 gap-gutter-desktop">
                {/* LEFT COLUMN: presets + telemetry */}
                <aside className="col-span-12 xl:col-span-3 flex flex-col gap-space-md anim-fade-in-up" style={{ animationDelay: '50ms' }}>
                  <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col justify-between shadow-xl border border-secondary/10">
                    <div>
                      <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-secondary/10">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-body-lg">policy</span>
                          <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Policy Presets</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm tabular-nums">4 Tiers</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-secondary/70 mb-space-md">Configured SLA contracts and resolution matrices mapped to tenancy tiers.</p>
                      <div className="flex flex-col gap-2">
                        {PRESETS.map((p) => {
                          const active = activePresetRef.current === p.id;
                          return (
                            <div key={p.id} onClick={() => pickPreset(p)} className={'preset-card relative p-3 rounded-lg cursor-pointer transition-all duration-200 border ' + (active ? 'bg-surface-container text-on-surface shadow-md border-secondary/30' : 'bg-surface-container-lowest/60 hover:bg-surface-container text-on-surface-variant border-transparent hover:border-secondary/20')}>
                              {active && <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#BAD62C] rounded-r"></div>}
                              <div className="flex items-center justify-between pl-2">
                                <div className="flex items-center gap-1.5">
                                  <span className={'w-2 h-2 rounded-full ' + (active ? 'bg-[#BAD62C]' : 'hidden')} />
                                  <span className="font-label-md text-label-md text-on-surface font-semibold">{p.id === 'community' ? 'Trial / Community' : p.title.replace(' SLA Policy', '').replace(' Policy', '')}</span>
                                </div>
                                <span className="px-1.5 py-0.2 rounded bg-[#BAD62C]/15 text-[#BAD62C] font-label-sm text-label-sm uppercase tracking-wider font-semibold border border-[#BAD62C]/30">{p.badge}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 text-secondary/80 font-body-sm text-body-sm pl-2">
                                <div><span className="block text-secondary/50 font-label-sm text-label-sm">TENANTS</span><span className="font-semibold text-on-surface font-timer-display text-label-md">{p.tenants}</span></div>
                                <div className="text-right"><span className="block text-secondary/50 font-label-sm text-label-sm">P1 TARGET</span><span className="text-primary font-timer-display text-label-md font-bold">{p.p1Label}</span></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-space-md pt-space-md">
                      <button className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md font-semibold border border-secondary/15 hover:border-secondary/30" onClick={() => showToast('Creating new policy preset template...')} type="button">
                        <span className="material-symbols-outlined text-body-md text-secondary">add_circle</span><span>Create New Policy</span>
                      </button>
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-3 border border-secondary/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#BAD62C]"></span><span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary/80">Fleet SLA Compliance</span></div>
                      <span className="font-timer-display text-timer-display text-[#BAD62C] tabular-nums font-bold">98.6%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden p-0.5 border border-secondary/10">
                      <div className="h-full bg-[#BAD62C] rounded-full shadow-[0_0_8px_rgba(186,214,44,0.4)]" style={{ width: '98.6%' }}></div>
                    </div>
                    <div className="flex items-center justify-between text-secondary/60 font-body-sm text-body-sm"><span>323 Total Monitored Accounts</span><span className="text-primary font-medium cursor-pointer">4 Breaches (30d)</span></div>
                  </div>
                  <div className="relative overflow-hidden bg-surface-container-low rounded-xl p-space-md flex flex-col gap-2 border border-secondary/10 has-tooltip">
                    <div className="flex items-center gap-2 text-secondary">
                      <span className="material-symbols-outlined text-body-md">verified_user</span>
                      <span className="font-label-md text-label-md font-semibold text-on-surface">SOC2 Policy Enforcement</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-secondary/70">All rule modifications are logged to immutable append-only trail `#AUDIT-SEC-2025`.</p>
                    <div className="flex items-center gap-3 pt-2">
                      <span className="font-label-sm text-label-sm text-on-surface font-medium">Automated Ledger</span>
                      <span className="font-label-sm text-label-sm text-secondary/70 font-mono">v2.4-strict-hash</span>
                    </div>
                    <div className="tooltip-content absolute left-1/2 -top-9 z-30 px-2.5 py-1 rounded bg-surface-bright text-on-surface font-label-sm text-label-sm border border-secondary/25 shadow-lg whitespace-nowrap">Cryptographic signature verified • SHA-256</div>
                  </div>
                </aside>

                {/* RIGHT SECTION: main editor */}
                <section className="col-span-12 xl:col-span-9 flex flex-col gap-space-lg pb-24 anim-fade-in-up" style={{ animationDelay: '100ms' }}>
                  <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col gap-space-md shadow-xl border border-secondary/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-sm border-b border-secondary/10">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-surface-container-high text-secondary border border-secondary/20 shadow-sm"><span className="material-symbols-outlined text-headline-md">shield</span></div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">{nameInput.replace(' (Active)', '')}</span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#BAD62C]/10 text-[#BAD62C] font-label-sm text-label-sm font-semibold tracking-wide border border-[#BAD62C]/35 shadow-sm shadow-[#BAD62C]/5"><span className="w-1.5 h-1.5 rounded-full bg-[#BAD62C] glow-dot-secondary"></span>ACTIVE &amp; ENFORCED</span>
                          </div>
                          <span className="font-label-sm text-label-sm text-secondary/60 font-mono">UUID: {policy.meta?.uuid || 'pol_ent_gold_009941_tier1'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 rounded-lg bg-surface-container flex flex-col items-end border border-secondary/15 transition-all hover:border-primary/40">
                          <span className="font-label-sm text-label-sm text-secondary/60 uppercase">P1 RESPONSE TIME</span>
                          <span className="font-timer-display text-timer-display text-primary font-bold">{badgeP1}</span>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-surface-container flex flex-col items-end border border-secondary/15 transition-all hover:border-secondary/40">
                          <span className="font-label-sm text-label-sm text-secondary/60 uppercase">RESOLVE CEILING</span>
                          <span className="font-timer-display text-timer-display text-on-surface font-bold">{badgeResolve}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary/80">Policy Display Name</label>
                        <input className="h-10 px-3.5 rounded-lg bg-surface-container text-on-surface font-body-md text-body-md border border-secondary/15 focus:outline-none focus:bg-surface-container-high focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all" value={nameInput} onChange={(e) => { setNameInput(e.target.value); markDirty(); }} type="text" />
                      </div>
                      <div className="flex flex-col gap-1.5 md:col-span-2">
                        <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary/80">Description &amp; Contract Bounds</label>
                        <input className="h-10 px-3.5 rounded-lg bg-surface-container text-on-surface font-body-md text-body-md border border-secondary/15 focus:outline-none focus:bg-surface-container-high focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all" value={descInput} onChange={(e) => { setDescInput(e.target.value); markDirty(); }} type="text" />
                      </div>
                    </div>
                  </div>

                  {/* Response & Resolution Matrix */}
                  <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col gap-space-md shadow-xl border border-secondary/10">
                    <div className="flex items-center justify-between pb-space-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-headline-sm">speed</span>
                        <div>
                          <h2 className="font-headline-sm text-headline-sm text-on-surface">Response &amp; Resolution Targets Matrix</h2>
                          <p className="font-body-sm text-body-sm text-secondary/70">Configured duration metrics before automated escalations and breach triggers trigger.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#BAD62C]/10 text-[#BAD62C] font-label-sm text-label-sm font-semibold border border-[#BAD62C]/30"><span className="w-1.5 h-1.5 rounded-full bg-[#BAD62C]"></span>ONLINE</span><span className="font-label-sm text-label-sm text-secondary/50 font-mono">4 PRIORITY TIERS</span></div>
                    </div>
                    <div className="overflow-x-auto rounded-lg bg-surface-container-lowest/80 border border-secondary/10">
                      <table className="w-full text-left font-body-md text-body-md border-collapse" id="targets-matrix-table">
                        <thead>
                          <tr className="bg-surface-container-high/60 text-secondary font-label-sm text-label-sm uppercase tracking-wider border-b border-secondary/10">
                            <th className="py-3 px-4">Priority Level</th>
                            <th className="py-3 px-4">First Response Target</th>
                            <th className="py-3 px-4">Resolution Target</th>
                            <th className="py-3 px-4">Operational Hours</th>
                            <th className="py-3 px-4">Auto-Escalate At (%)</th>
                            <th className="py-3 px-4 text-right">Warning Mark</th>
                          </tr>
                        </thead>
                        <tbody className="text-on-surface divide-y divide-secondary/5">
                          {ROWS.map((row) => {
                            const m = matrix[row.tier];
                            const isP1 = row.tier === 'p1';
                            const maxVal = row.unit === 'min' ? 180 : 240;
                            return (
                              <tr key={row.tier} className={'matrix-row transition-colors ' + (isP1 ? 'bg-primary-container/10 hover:bg-primary-container/20' : 'hover:bg-surface-container')}>
                                <td className="py-3.5 px-4 font-semibold">
                                  <div className="flex items-center gap-2">
                                    <span className={row.dot + (isP1 ? ' glow-dot-crimson' : '')} />
                                    <span className={'font-label-md text-label-md ' + (isP1 ? 'text-primary font-bold' : 'text-on-surface')}>{row.label}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5 max-w-[130px]">
                                    <input className="matrix-input-target w-14 h-8 px-2 rounded bg-surface-container-high text-on-surface font-timer-display text-body-md text-center border border-secondary/20 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all" max={maxVal} min="1" type="number" value={m.target} onChange={(e) => { const v = Number(e.target.value); setMatrix({ ...matrix, [row.tier]: { ...m, target: v } }); if (row.tier === 'p1') setBadgeP1(`${v} MIN`); markDirty(); }} />
                                    <span className="font-label-sm text-label-sm text-secondary">{row.unit === 'min' ? 'Min' : 'Hours'}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5 max-w-[130px]">
                                    <input className="w-14 h-8 px-2 rounded bg-surface-container-high text-on-surface font-timer-display text-body-md text-center border border-secondary/20 focus:outline-none focus:ring-1 focus:ring-secondary/50 focus:border-secondary transition-all" max="240" min="1" type="number" value={m.resolve} onChange={(e) => { const v = Number(e.target.value); setMatrix({ ...matrix, [row.tier]: { ...m, resolve: v } }); if (row.tier === 'p1') setBadgeResolve(`${v} HRS`); markDirty(); }} />
                                    <span className="font-label-sm text-label-sm text-secondary">Hours</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  {isP1 ? <span className="px-2 py-0.5 rounded bg-primary-container/40 text-on-primary-container font-label-sm text-label-sm font-semibold border border-primary/30">24/7/365 Non-stop</span> : <span className="px-2 py-0.5 rounded bg-surface-container-high text-secondary font-label-sm text-label-sm">Business Hours</span>}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <input className="matrix-input-pct w-12 h-8 px-2 rounded bg-surface-container-high text-on-surface font-timer-display text-body-md text-center border border-secondary/20 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all" max="99" min="10" type="number" value={m.pct} onChange={(e) => { setMatrix({ ...matrix, [row.tier]: { ...m, pct: Number(e.target.value) } }); markDirty(); }} />
                                    <span className="text-secondary font-label-sm text-label-sm">%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className={'font-timer-display text-label-md ' + (isP1 ? 'text-primary font-bold' : 'text-on-surface') + ' tabular-nums'}>{warningMark(m.target, m.pct, row.unit)}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Business Hours & Holiday Calendar */}
                  <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col gap-space-md shadow-xl border border-secondary/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-headline-sm">calendar_month</span>
                        <div>
                          <h2 className="font-headline-sm text-headline-sm text-on-surface">Business Hours &amp; Holiday Calendar</h2>
                          <p className="font-body-sm text-body-sm text-secondary/70">Clocks pause outside designated business shifts for non-critical ticket tiers.</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer self-start sm:self-auto select-none group">
                        <span className="font-label-md text-label-md text-on-surface group-hover:text-on-surface transition-colors">Pause timer outside shifts for P2–P4</span>
                        <span className="relative inline-block w-11 h-6">
                          <input checked={pause} onChange={(e) => { const v = e.target.checked; setPause(v); markDirty(); showToast(v ? 'Shift pause: Clocks paused outside active hours.' : 'Shift pause disabled: 24/7 continuous ticking active.'); }} className="sr-only" type="checkbox" />
                          <span className={'absolute inset-0 rounded-full ' + (pause ? 'bg-[#BAD62C]/25' : 'bg-surface-container-highest')}></span>
                          <span className={'absolute top-0.5 left-[2px] h-5 w-5 rounded-full ' + (pause ? 'translate-x-5 ' : '') + (pause ? 'bg-[#BAD62C]' : 'bg-on-surface')} transition-all duration-300></span>
                        </span>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md pt-2">
                      <div className="md:col-span-7 bg-surface-container rounded-lg p-space-md flex flex-col gap-3 border border-secondary/10">
                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary/80">Active Workdays Schedule</span>
                        <div className="flex items-center gap-2 flex-wrap" id="day-pills-container">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                            <label key={d} className={'flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer font-label-md text-label-md select-none border ' + (days[i] ? 'bg-[#BAD62C]/15 text-on-surface border-[#BAD62C]/30' : 'bg-surface-container-lowest text-secondary/40 border-transparent')}>
                              <input checked={days[i]} onChange={() => { setDays(days.map((v, idx) => (idx === i ? !v : v))); markDirty(); }} className="w-4 h-4 rounded bg-surface-container-lowest text-[#BAD62C] focus:ring-0 transition-transform cursor-pointer accent-[#BAD62C]" type="checkbox" />
                              <span className="font-medium">{d}</span>
                              {days[i] && <span className="material-symbols-outlined text-label-sm text-[#BAD62C]">check</span>}
                            </label>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="flex flex-col gap-1">
                            <span className="font-label-sm text-label-sm text-secondary/60">SHIFT START TIME</span>
                            <div className="flex items-center gap-2 h-9 px-3 rounded bg-surface-container-high text-on-surface font-timer-display text-body-md border border-secondary/15">
                              <span className="material-symbols-outlined text-body-sm text-secondary">schedule</span>
                              <input className="bg-transparent border-0 text-on-surface focus:outline-none w-full p-0 font-timer-display" type="text" value={shiftStart} onChange={(e) => { setShiftStart(e.target.value); markDirty(); }} />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="font-label-sm text-label-sm text-secondary/60">SHIFT END TIME</span>
                            <div className="flex items-center gap-2 h-9 px-3 rounded bg-surface-container-high text-on-surface font-timer-display text-body-md border border-secondary/15">
                              <span className="material-symbols-outlined text-body-sm text-secondary">schedule</span>
                              <input className="bg-transparent border-0 text-on-surface focus:outline-none w-full p-0 font-timer-display" type="text" value={shiftEnd} onChange={(e) => { setShiftEnd(e.target.value); markDirty(); }} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-5 bg-surface-container rounded-lg p-space-md flex flex-col justify-between gap-3 border border-secondary/10">
                        <div className="flex flex-col gap-2">
                          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary/80">Timezone Context</span>
                          <div className="flex items-center justify-between p-2.5 rounded bg-surface-container-high border border-secondary/10 cursor-pointer">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-secondary text-body-md">public</span>
                              <span className="font-label-md text-label-md text-on-surface font-medium">{bhDefault.timezone}</span>
                            </div>
                            <span className="font-label-sm text-label-sm text-secondary/60 font-mono">UTC-5</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary text-body-sm">event_busy</span>
                            <span className="font-body-sm text-body-sm text-secondary/80">US Federal Holiday Calendar</span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-surface-container-high text-secondary font-label-sm text-label-sm border border-secondary/20">Enforced</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trigger Conditions & Action Automation */}
                  <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col gap-space-md shadow-xl border border-secondary/10">
                    <div className="flex items-center justify-between pb-space-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-headline-sm">account_tree</span>
                        <div>
                          <h2 className="font-headline-sm text-headline-sm text-on-surface">Trigger Conditions &amp; Action Automation</h2>
                          <p className="font-body-sm text-body-sm text-secondary/70">Reactive logic pipeline executing automatic escalations, webhook notifications, and reassignments.</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#BAD62C]/10 text-[#BAD62C] font-label-sm text-label-sm font-semibold border border-[#BAD62C]/30"><span className="w-1.5 h-1.5 rounded-full bg-[#BAD62C]"></span>{triggers.length} Active Triggers</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {triggers.map((r, i) => (
                        <div key={i} className={'rule-item p-space-md rounded-lg bg-surface-container flex flex-col lg:flex-row lg:items-center justify-between gap-space-md border border-secondary/10 hover:border-secondary/30 transition-colors ' + (deleting === i ? 'opacity-0 scale-[0.95]' : '')} style={{ transition: deleting === i ? 'all 0.3s ease' : undefined }}>
                          <div className="flex items-start gap-3">
                            <div className={'p-2 rounded shadow-sm ' + (i === 0 ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-secondary')}>
                              <span className="material-symbols-outlined text-body-lg">{r.icon}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold">IF</span>
                                <span className="font-label-md text-label-md text-on-surface font-mono">{r.cond}</span>
                                {r.and && <><span className="text-secondary/50 font-label-sm text-label-sm">AND</span><span className="font-label-md text-label-md text-on-surface font-mono">{r.and}</span></>}
                              </div>
                              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-secondary-container/40 text-secondary font-label-sm text-label-sm font-semibold">THEN</span>
                                <span className="font-body-md text-body-md text-secondary/90">{r.then}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end lg:self-center">
                            <button className="rule-edit-btn p-1.5 rounded hover:bg-surface-container-high text-secondary/60 hover:text-on-surface" onClick={() => { setCond(r.cond); setAction(r.then); setModalOpen(true); showToast('Editing rule.'); }} type="button"><span className="material-symbols-outlined text-body-md">edit</span></button>
                            <button className="rule-delete-btn p-1.5 rounded hover:bg-primary-container/20 text-secondary/60 hover:text-primary" onClick={() => deleteRule(i)} type="button"><span className="material-symbols-outlined text-body-md">delete</span></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="w-full py-3 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary hover:text-on-surface font-label-md text-label-md font-semibold flex items-center justify-center gap-2 border border-dashed border-secondary/25 hover:border-secondary/50" onClick={() => setModalOpen(true)} type="button">
                      <span className="material-symbols-outlined text-body-md">add</span><span>Add New Escalation Trigger Rule</span>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>

        {/* Unsaved modifications bar */}
        <div className={'fixed bottom-0 right-0 left-60 bg-surface-container-low/95 backdrop-blur-xl px-space-lg py-3 z-40 flex items-center justify-between gap-space-md shadow-2xl border-t border-secondary/15 transition-transform duration-300 ' + (unsaved ? '' : 'translate-y-full')} id="unsaved-bar">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-pulse"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span></span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Unsaved modifications detected</span>
              <span className="hidden sm:inline text-secondary/40 text-body-sm">•</span>
              <span className="font-body-sm text-body-sm text-secondary/70">Enterprise Gold Matrix targets updated (P1 15m / P2 1h)</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary hover:text-on-surface font-label-md text-label-md font-medium border border-secondary/15" onClick={discard} type="button">Discard Changes</button>
            <button className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary-container hover:bg-primary-container/85 text-on-primary-container font-label-md text-label-md font-semibold" onClick={save} disabled={deploy.spinning} type="button">
              <span className={'material-symbols-outlined text-body-md' + (deploy.spinning ? ' animate-spin' : '')}>{deploy.icon === 'refresh' ? 'refresh' : deploy.icon === 'verified' ? 'verified' : 'bolt'}</span>
              <span>{deploy.disabled && !deploy.spinning ? 'Deployed to Fleet' : (deploy.spinning ? 'Deploying Rules…' : 'Save & Deploy Policy')}</span>
            </button>
          </div>
        </div>

        {/* Add escalation trigger modal */}
        <div className={'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300 ' + (modalOpen ? '' : 'opacity-0 pointer-events-none')}>
          <div className={'bg-surface-container-low border border-secondary/20 rounded-xl w-full max-w-lg p-6 shadow-2xl transition-transform duration-300 ' + (modalOpen ? 'scale-100' : 'scale-95')} id="rule-modal-card">
            <div className="flex items-center justify-between pb-3 border-b border-secondary/15 mb-4">
              <div className="flex items-center gap-2"><span className="material-symbols-outlined text-secondary">add_alert</span><h3 className="font-headline-sm text-headline-sm text-on-surface">Add Escalation Trigger</h3></div>
              <button className="text-secondary/60 hover:text-on-surface" onClick={() => setModalOpen(false)} type="button"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="flex flex-col gap-3 font-body-sm">
              <label className="text-secondary font-label-sm uppercase">Condition (IF)</label>
              <input className="h-9 px-3 rounded bg-surface-container text-on-surface border border-secondary/20 focus:border-secondary focus:outline-none" value={cond} onChange={(e) => setCond(e.target.value)} type="text" />
              <label className="text-secondary font-label-sm uppercase mt-2">Action Dispatch (THEN)</label>
              <input className="h-9 px-3 rounded bg-surface-container text-on-surface border border-secondary/20 focus:border-secondary focus:outline-none" value={action} onChange={(e) => setAction(e.target.value)} type="text" />
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-secondary/15">
              <button className="px-4 py-2 rounded-lg bg-surface-container text-secondary hover:text-on-surface font-label-md" onClick={() => setModalOpen(false)} type="button">Cancel</button>
              <button className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold hover:bg-primary-container/85" onClick={() => { setTriggers([...triggers, { icon: 'notifications_active', cond: cond || 'Ticket Priority == P2', then: action || 'Send urgent notification' }]); setModalOpen(false); markDirty(); showToast('New escalation trigger added successfully!'); }} type="button">Create Rule</button>
            </div>
          </div>
        </div>

        <div className="fixed bottom-20 right-6 z-50 flex flex-col gap-2 pointer-events-none" id="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-bright text-on-surface border border-secondary/30 shadow-2xl text-body-md font-medium transition-all duration-300 opacity-100 translate-y-0">
              <span className="material-symbols-outlined text-secondary text-body-lg">check_circle</span>
              <span>{t.msg}</span>
            </div>
          ))}
        </div>
      </div>
      {showNewTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-secondary/20 rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="font-headline-sm mb-4 text-on-surface">New ticket</h3>
            <div className="flex flex-col gap-3">
              <label className="text-secondary text-label-md">Title<input className="mt-1 w-full h-10 px-3 rounded-lg bg-surface-container text-on-surface border border-secondary/20" value={ntForm.title} onChange={(e) => setNtForm({ ...ntForm, title: e.target.value })} /></label>
              <label className="text-secondary text-label-md">Description<textarea className="mt-1 w-full h-20 px-3 py-2 rounded-lg bg-surface-container text-on-surface border border-secondary/20" value={ntForm.description} onChange={(e) => setNtForm({ ...ntForm, description: e.target.value })} /></label>
              <span className="grid grid-cols-2 gap-3">
                <label className="text-secondary text-label-md">Priority<select className="mt-1 w-full h-10 rounded-lg bg-surface-container text-on-surface border border-secondary/20" value={ntForm.priority} onChange={(e) => setNtForm({ ...ntForm, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
                <label className="text-secondary text-label-md">Category<select className="mt-1 w-full h-10 rounded-lg bg-surface-container text-on-surface border border-secondary/20" value={ntForm.category} onChange={(e) => setNtForm({ ...ntForm, category: e.target.value })}><option value="billing">Billing</option><option value="technical">Technical</option><option value="account">Account</option><option value="general">General</option></select></label>
              </span>
              <label className="text-secondary text-label-md">Requester name<input className="mt-1 w-full h-10 px-3 rounded-lg bg-surface-container text-on-surface border border-secondary/20" value={ntForm.requesterName} onChange={(e) => setNtForm({ ...ntForm, requesterName: e.target.value })} /></label>
              <div className="text-body-sm text-secondary/70">SLA target: {policy ? (policy.defaults[ntForm.priority] || '—') : '—'} min</div>
              <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-secondary/15">
                <button className="px-4 py-2 rounded-lg bg-surface-container text-secondary" onClick={() => setShowNewTicket(false)} type="button">Cancel</button>
                <button className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold" disabled={ntSaving} onClick={async () => { setNtSaving(true); try { await createTicket(ntForm); setShowNewTicket(false); showToast('Ticket created.'); setNtForm({ title: '', description: '', priority: 'medium', category: 'general', requesterName: '' }); } catch (e) { showToast(errMsg(e)); } setNtSaving(false); }} type="button">{ntSaving ? 'Creating…' : 'Create ticket'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

