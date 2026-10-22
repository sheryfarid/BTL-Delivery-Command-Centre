import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from './store.jsx';
import { Icon, Btn, Toasts, Avatar, useConfirm } from './ui.jsx';
import { canView, isClientUser, notificationsFor, clientName, byId } from './engine.js';
import logo from './logo.png';
import Dashboard from './pages/Dashboard.jsx';
import Portfolio from './pages/Portfolio.jsx';
import ProjectPage from './pages/Project.jsx';
import GateCentre from './pages/GateCentre.jsx';
import Team from './pages/Team.jsx';
import Raid from './pages/Raid.jsx';
import Vault from './pages/Vault.jsx';
import Assistant from './pages/Assistant.jsx';
import Reports from './pages/Reports.jsx';
import Audit from './pages/Audit.jsx';
import Method from './pages/Method.jsx';

const NAV = [
  ['dashboard', 'Command centre', 'grid', 'all'],
  ['portfolio', 'Projects', 'folder', 'all'],
  ['gates', 'Gate approvals', 'shield', 'all'],
  ['raid', 'Risk and change', 'alert', 'btl'],
  ['vault', 'Evidence vault', 'file', 'all'],
  ['team', 'Team and resources', 'users', 'btl'],
  ['reports', 'Reports', 'chart', 'all'],
  ['assistant', 'Delivery assistant', 'spark', 'btl'],
  ['method', 'The method', 'book', 'all'],
  ['audit', 'Audit log', 'history', 'btl'],
];

export default function App() {
  const { s, me, setMeId, route, go, theme, setTheme, toasts, reset, saveError } = useStore();
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const client = isClientUser(me);
  const visibleProjects = s.projects.filter((p) => canView(me, p));
  const nav = NAV.filter(([, , , who]) => who === 'all' || !client);

  // Route guard: a client user can never land on an internal page or another client's project.
  let page = route.page;
  if (!nav.some(([k]) => k === page) && page !== 'project') page = 'dashboard';
  const routeProject = route.projectId && byId(s.projects, route.projectId);
  if (page === 'project' && (!routeProject || !canView(me, routeProject))) page = 'portfolio';

  const content = {
    dashboard: <Dashboard />, portfolio: <Portfolio />, gates: <GateCentre />, raid: <Raid />, vault: <Vault />, team: <Team />,
    reports: <Reports />, assistant: <Assistant />, audit: <Audit />, method: <Method />, project: routeProject ? <ProjectPage key={routeProject.id} p={routeProject} /> : null,
  }[page];

  return (
    <div className={'app' + (collapsed ? ' nav-collapsed' : '')}>
      <aside className={'side' + (navOpen ? ' open' : '')}>
        <div className={'brand' + (collapsed ? ' brand-sm' : '')}>
          <span className="brand-logo"><img src={logo} alt="Business Technique Limited" /></span>
          {!collapsed && <div className="brand-t"><strong>BTL Delivery Command Centre</strong><span>From Discovery to signed-off delivery, one controlled wave at a time.</span></div>}
        </div>
        <nav aria-label="Main">
          {nav.map(([k, label, icon]) => (
            <button key={k} className={'nav-i' + (page === k || (k === 'portfolio' && page === 'project') ? ' on' : '')} onClick={() => { go({ page: k }); setNavOpen(false); }} title={collapsed ? label : undefined}>
              <Icon name={icon} /> {!collapsed && <span>{client && k === 'dashboard' ? 'Client portal' : label}</span>}
            </button>
          ))}
        </nav>
        {!collapsed && (
          <div className="side-projects">
            <span className="side-h">{client ? 'Your projects' : 'Active projects'}</span>
            {visibleProjects.map((p) => (
              <button key={p.id} className={'side-p' + (page === 'project' && route.projectId === p.id ? ' on' : '')} onClick={() => { go({ page: 'project', projectId: p.id }); setNavOpen(false); }}>
                <span className={'kind-dot kind-' + p.kind} />{p.name}
              </button>
            ))}
          </div>
        )}
        <div className="side-foot">
          <button className="nav-i" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}><Icon name={collapsed ? 'right' : 'left'} />{!collapsed && <span>Collapse</span>}</button>
        </div>
      </aside>
      {navOpen && <div className="side-scrim" onClick={() => setNavOpen(false)} />}

      <div className="main">
        <header className="top">
          <button className="icon-btn mobile-only" onClick={() => setNavOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
          <ProjectSwitcher projects={visibleProjects} />
          <GlobalSearch />
          <div className="top-r">
            <Notifications />
            <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Switch theme" title="Switch light or dark theme"><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
            <UserMenu onReset={reset} />
          </div>
        </header>
        <div className="demo-strip">
          <Icon name="flag" size={14} />
          <span>Demonstration data. Projects, clients and figures shown are examples, not real BTL delivery records. Sign-in is simulated: switch user to act as each role.</span>
          {saveError && <strong className="err-text">Changes could not be saved in this browser.</strong>}
        </div>
        <main className="page">{content}</main>
      </div>
      <Toasts toasts={toasts} />
    </div>
  );
}

function ProjectSwitcher({ projects }) {
  const { route, go } = useStore();
  return (
    <label className="proj-switch">
      <span className="sr">Go to project</span>
      <select value={route.page === 'project' ? route.projectId : ''} onChange={(e) => e.target.value ? go({ page: 'project', projectId: e.target.value }) : go({ page: 'portfolio' })}>
        <option value="">All projects</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.code}  {p.name}</option>)}
      </select>
      <Icon name="down" size={14} />
    </label>
  );
}

function GlobalSearch() {
  const { s, me, go } = useStore();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    const h = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    const ok = (pid) => { const p = byId(s.projects, pid); return p && canView(me, p); };
    const out = [];
    s.projects.filter((p) => canView(me, p) && (p.name + p.code + clientName(s, p)).toLowerCase().includes(t)).forEach((p) => out.push({ k: 'Project', text: `${p.code} ${p.name}`, r: { page: 'project', projectId: p.id } }));
    s.requirements.filter((r) => ok(r.projectId) && (r.code + ' ' + r.title).toLowerCase().includes(t)).forEach((r) => out.push({ k: 'Requirement', text: `${r.code} ${r.title}`, r: { page: 'project', projectId: r.projectId, waveId: r.waveId, tab: 'requirements' } }));
    s.defects.forEach((d) => { const w = byId(s.waves, d.waveId); if (w && ok(w.projectId) && (d.code + ' ' + d.title).toLowerCase().includes(t)) out.push({ k: 'Defect', text: `${d.code} ${d.title}`, r: { page: 'project', projectId: w.projectId, waveId: w.id, phase: 'prove', tab: 'defects' } }); });
    if (!isClientUser(me)) s.raid.filter((r) => (r.code + ' ' + r.title).toLowerCase().includes(t)).forEach((r) => out.push({ k: r.kind, text: `${r.code} ${r.title}`, r: { page: 'raid', projectId: r.projectId } }));
    s.evidence.filter((e) => ok(e.projectId) && (e.title + e.type).toLowerCase().includes(t)).forEach((e) => out.push({ k: 'Evidence', text: e.title, r: { page: 'vault', projectId: e.projectId } }));
    if (!isClientUser(me)) s.users.filter((u) => u.org === 'btl' && (u.name + u.title).toLowerCase().includes(t)).forEach((u) => out.push({ k: 'Person', text: `${u.name}, ${u.title}`, r: { page: 'team' } }));
    return out.slice(0, 12);
  }, [q, s, me]);
  return (
    <div className="search" ref={box}>
      <Icon name="search" size={16} />
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search projects, requirements, defects, evidence" aria-label="Search" />
      {open && q.trim().length >= 2 && (
        <div className="search-r">
          {results.length === 0 && <p className="muted small pad">No matches for “{q}”.</p>}
          {results.map((x, i) => <button key={i} onClick={() => { go(x.r); setOpen(false); setQ(''); }}><span className="pill pill-neutral">{x.k}</span>{x.text}</button>)}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const { s, me, go } = useStore();
  const [open, setOpen] = useState(false);
  const list = notificationsFor(s, me);
  return (
    <div className="pop-wrap">
      <button className="icon-btn" onClick={() => setOpen(!open)} aria-label={`Notifications, ${list.length} waiting`}>
        <Icon name="bell" />{list.length > 0 && <span className="badge-n">{list.length}</span>}
      </button>
      {open && (
        <div className="pop" onMouseLeave={() => setOpen(false)}>
          <strong className="pop-h">Waiting for {me.name}</strong>
          {list.length === 0 && <p className="muted small pad">Nothing needs your action.</p>}
          {list.map((n) => <button key={n.id} className="pop-i" onClick={() => { go({ page: 'project', projectId: n.p.id, waveId: n.w.id, phase: n.phase, tab: n.tab }); setOpen(false); }}><span>{n.text}</span><span className="muted small">{n.p.name}</span></button>)}
        </div>
      )}
    </div>
  );
}

function UserMenu({ onReset }) {
  const { s, me, setMeId, go } = useStore();
  const [open, setOpen] = useState(false);
  const [ask, confirmNode] = useConfirm();
  const btl = s.users.filter((u) => u.org === 'btl');
  const clients = s.users.filter((u) => u.org !== 'btl');
  return (
    <div className="pop-wrap">
      <button className="user-btn" onClick={() => setOpen(!open)} aria-label="Switch user">
        <Avatar s={s} id={me.id} size={30} />
        <span className="user-t"><strong>{me.name}</strong><span>{isClientUser(me) ? byId(s.clients, me.org).name : me.title}</span></span>
        <Icon name="down" size={14} />
      </button>
      {open && (
        <div className="pop pop-user" onMouseLeave={() => setOpen(false)}>
          <strong className="pop-h">Act as (simulated sign-in)</strong>
          <div className="pop-scroll">
            <span className="side-h">Business Technique</span>
            {btl.map((u) => <button key={u.id} className={'pop-i row' + (u.id === me.id ? ' on' : '')} onClick={() => { setMeId(u.id); setOpen(false); }}><Avatar s={s} id={u.id} size={22} /><span>{u.name}<span className="muted small"> {u.title}</span></span></button>)}
            <span className="side-h">Client users</span>
            {clients.map((u) => <button key={u.id} className={'pop-i row' + (u.id === me.id ? ' on' : '')} onClick={() => { setMeId(u.id); setOpen(false); go({ page: 'dashboard' }); }}><Avatar s={s} id={u.id} size={22} /><span>{u.name}<span className="muted small"> {byId(s.clients, u.org).name}</span></span></button>)}
          </div>
          <div className="pop-foot"><Btn small kind="ghost" icon="history" onClick={() => { setOpen(false); ask({ title: 'Reload demonstration data', body: 'All changes made in this browser will be replaced by the original demonstration projects.', yes: 'Reload demo data', onYes: onReset }); }}>Reload demo data</Btn></div>
        </div>
      )}
      {confirmNode}
    </div>
  );
}
