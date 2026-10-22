import React, { useState, useEffect, useRef } from 'react';
import { PHASE_META } from './methodology.js';
import { initials, userName } from './engine.js';

const P = {
  grid: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  folder: 'M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.6 3.9A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z',
  waves: 'M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1',
  shield: 'M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.7 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2 4-4',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  alert: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
  file: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zM14 2v4a2 2 0 0 0 2 2h4M10 13H8M16 17H8',
  spark: 'M9.9 15.5A2 2 0 0 0 8.5 14.1L2.4 12.5a.5.5 0 0 1 0-1l6.1-1.6a2 2 0 0 0 1.4-1.4l1.6-6.1a.5.5 0 0 1 1 0l1.6 6.1a2 2 0 0 0 1.4 1.4l6.1 1.6a.5.5 0 0 1 0 1l-6.1 1.6a2 2 0 0 0-1.4 1.4l-1.6 6.1a.5.5 0 0 1-1 0zM20 3v4M22 5h-4',
  chart: 'M3 3v18h18M18 17V9M13 17V5M8 17v-3',
  history: 'M3 12a9 9 0 1 0 9-9 9.8 9.8 0 0 0-6.7 2.7L3 8M3 3v5h5M12 7v5l4 2',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4',
  moon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  x: 'M18 6 6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  check: 'M20 6 9 17l-5-5',
  right: 'm9 18 6-6-6-6',
  down: 'm6 9 6 6 6-6',
  left: 'm15 18-6-6 6-6',
  lock: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  layers: 'm12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5',
  flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  book: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20',
  bug: 'M8 2l1.9 1.9M14.1 3.9 16 2M9 7.1V6a3 3 0 1 1 6 0v1.1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.5 13H3M21 13h-3.5M6 9 3.5 7M18 9l2.5-2M6 17l-2.5 2M18 17l2.5 2',
  rocket: 'M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1zM12 15l-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2zM9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5',
};

export function Icon({ name, size = 18, className = '', title }) {
  return (
    <svg className={'ico ' + className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <path d={P[name] || ''} />
    </svg>
  );
}

export function Btn({ kind = 'secondary', icon, children, disabled, onClick, title, type = 'button', small, full }) {
  return (
    <button type={type} className={`btn btn-${kind}${small ? ' btn-sm' : ''}${full ? ' btn-full' : ''}`} disabled={disabled} onClick={onClick} title={title}>
      {icon && <Icon name={icon} size={small ? 14 : 16} />}
      {children && <span>{children}</span>}
    </button>
  );
}

export const Pill = ({ tone = 'neutral', children, title }) => <span className={`pill pill-${tone}`} title={title}>{children}</span>;
export const Rag = ({ rag }) => <span className={`rag rag-${rag}`}><i />{rag === 'red' ? 'At risk' : rag === 'amber' ? 'Watch' : 'On track'}</span>;

export function Avatar({ s, id, size = 26, showName }) {
  const n = userName(s, id);
  const u = s.users.find((x) => x.id === id);
  const client = u && u.org !== 'btl';
  return (
    <span className="avatar-wrap">
      <span className={'avatar' + (client ? ' avatar-client' : '')} style={{ width: size, height: size, fontSize: size * 0.4 }} title={n}>{initials(n)}</span>
      {showName && <span className="avatar-name">{n}</span>}
    </span>
  );
}

export function Panel({ title, sub, actions, children, className = '', pad = true, id }) {
  return (
    <section className={'panel ' + className} id={id}>
      {(title || actions) && (
        <header className="panel-h">
          <div>
            {title && <h3>{title}</h3>}
            {sub && <p className="muted small">{sub}</p>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      <div className={pad ? 'panel-b' : ''}>{children}</div>
    </section>
  );
}

export function Field({ label, hint, error, children, wide }) {
  return (
    <label className={'field' + (wide ? ' field-wide' : '')}>
      <span className="field-l">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-err">{error}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    const first = ref.current && ref.current.querySelector('input, select, textarea, button');
    if (first) first.focus();
    return () => document.removeEventListener('keydown', k);
  }, []);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' modal-wide' : '')} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header className="modal-h"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button></header>
        <div className="modal-b">{children}</div>
        {footer && <footer className="modal-f">{footer}</footer>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(([k, label, count]) => (
        <button key={k} role="tab" aria-selected={value === k} className={'tab' + (value === k ? ' on' : '')} onClick={() => onChange(k)}>
          {label}{count != null && <span className="tab-count">{count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon = 'folder', title, children, action }) {
  return (
    <div className="empty">
      <Icon name={icon} size={28} />
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function CheckRow({ ok, label, detail, onClick, locked }) {
  return (
    <li className={'check ' + (ok ? 'ok' : 'no')}>
      <span className="check-i">{ok ? <Icon name="check" size={14} /> : locked ? <Icon name="lock" size={12} /> : ''}</span>
      <div className="check-t">
        <span>{label}</span>
        {detail && <span className="muted small">{detail}</span>}
      </div>
      {onClick && !ok && <button className="link small" onClick={onClick}>Open</button>}
    </li>
  );
}

export function Bar({ value, tone = 'teal', label }) {
  return (
    <div className="bar" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin="0" aria-valuemax="100" aria-label={label}>
      <i className={'bar-' + tone} style={{ width: Math.max(0, Math.min(100, value * 100)) + '%' }} />
    </div>
  );
}

// The wave rail: the seven phases of the BTL method, shown as one connected track.
// Discovery is drawn as "not used" for internal projects rather than hidden,
// so the difference between the two lifecycles stays visible.
export function WaveRail({ project, wave, selected, onSelect, compact, blockedPhase }) {
  const all = ['discovery', 'design', 'build', 'prove', 'deploy', 'adopt', 'gate'];
  return (
    <ol className={'rail' + (compact ? ' rail-compact' : '')}>
      {all.map((ph) => {
        const later = project.kind === 'external' && wave && wave.num > 1 && ph === 'discovery';
        const skipped = (project.kind === 'internal' && ph === 'discovery') || later;
        const done = wave && (wave.status === 'closed' || wave.completedPhases.includes(ph));
        const active = wave && wave.status !== 'closed' && wave.phase === ph;
        const blocked = active && blockedPhase;
        const st = skipped ? 'skip' : active ? (blocked ? 'blocked' : 'active') : done ? 'done' : 'todo';
        const clickable = onSelect && !skipped;
        return (
          <li key={ph} className={`rail-s rail-${st}${selected === ph ? ' sel' : ''}${ph === 'gate' ? ' rail-gate' : ''}`}>
            <button disabled={!clickable} onClick={() => clickable && onSelect(ph)} title={later ? 'Discovery runs once per project, in wave 1' : skipped ? 'Internal projects skip Discovery' : PHASE_META[ph].title} aria-current={active ? 'step' : undefined}>
              <span className="rail-l">{PHASE_META[ph].label}</span>
              {!compact && <span className="rail-sub">{later ? 'In wave 1' : skipped ? 'Not used' : active ? (blocked ? 'Blocked' : 'Current') : done ? 'Done' : ph === 'gate' ? 'Decision' : '\u00a0'}</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function Toasts({ toasts }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className={'toast toast-' + t.kind}>{t.kind === 'err' ? <Icon name="alert" size={16} /> : <Icon name="check" size={16} />}{t.text}</div>)}
    </div>
  );
}

export function Stat({ label, value, sub, tone, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={'stat' + (tone ? ' stat-' + tone : '') + (onClick ? ' stat-click' : '')} onClick={onClick}>
      <span className="stat-l">{label}</span>
      <span className="stat-v">{value}</span>
      {sub && <span className="stat-s">{sub}</span>}
    </Tag>
  );
}

export function useConfirm() {
  const [c, setC] = useState(null);
  const ask = (opts) => setC(opts);
  const node = c && (
    <Modal title={c.title} onClose={() => setC(null)} footer={<><Btn onClick={() => setC(null)}>Cancel</Btn><Btn kind="primary" onClick={() => { c.onYes(); setC(null); }}>{c.yes}</Btn></>}>
      <p>{c.body}</p>
    </Modal>
  );
  return [ask, node];
}
