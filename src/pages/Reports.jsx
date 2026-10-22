import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { Panel, Btn, Tabs, Pill } from '../ui.jsx';
import { PHASE_META } from '../methodology.js';
import { canView, health, activeWave, projectProgress, gateState, defectsOf, money, fmtDate, clientName, userName, wavesOf, nextAction, metricsOf, metTarget, can, reqsOf, testsOf, byId } from '../engine.js';
import { BudgetChart } from './Dashboard.jsx';

export default function Reports() {
  const { s, me, route } = useStore();
  const projects = s.projects.filter((p) => canView(me, p));
  const [tab, setTab] = useState('exec');
  const [pid, setPid] = useState(route.projectId || projects[0].id);
  const showBudget = can(me, projects[0], 'budget');
  const today = fmtDate(new Date());

  return (
    <div className="stack">
      <div className="page-h"><div><h1>Reports</h1><p className="muted">Generated from stored records at the moment you open them.</p></div></div>
      <Tabs value={tab} onChange={setTab} tabs={[['exec', 'Executive delivery report'], ['project', 'Project status report']]} />
      {tab === 'exec' && (
        <article className="doc report">
          <p className="doc-k">Business Technique Limited. Executive delivery report, {today}</p>
          <h2>Portfolio delivery</h2>
          <p>{projects.length} projects, {projects.filter((p) => health(s, p).rag === 'green').length} on track, {projects.filter((p) => health(s, p).rag === 'red').length} at risk. {projects.reduce((n, p) => n + wavesOf(s, p.id).filter((w) => w.phase === 'gate' && !w.gate.decision && w.status !== 'closed').length, 0)} wave(s) waiting at the Gate.</p>
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Project</th><th>Wave and phase</th><th>Health</th><th className="num">Progress</th>{showBudget && <th className="num">Spend</th>}<th>Next action</th></tr></thead>
            <tbody>{projects.map((p) => { const w = activeWave(s, p.id); const h = health(s, p); return (
              <tr key={p.id}><td><strong>{p.name}</strong><div className="small muted">{clientName(s, p)}</div></td><td>Wave {w.num}, {w.status === 'closed' ? 'closed' : PHASE_META[w.phase].label}</td><td><Pill tone={h.rag === 'green' ? 'green' : h.rag === 'red' ? 'red' : 'amber'}>{h.rag === 'green' ? 'On track' : h.rag === 'red' ? 'At risk' : 'Watch'}</Pill>{h.reasons.length > 0 && <div className="small muted">{h.reasons.join('; ')}</div>}</td><td className="num">{Math.round(projectProgress(s, p) * 100)}%</td>{showBudget && <td className="num">{money(p.actual)} / {money(p.budget)}</td>}<td className="small">{nextAction(s, p)}</td></tr>
            ); })}</tbody>
          </table></div>
          {showBudget && <><h3>Budget against actual</h3><BudgetChart rows={projects.map((p) => ({ label: p.name, budget: p.budget, actual: p.actual }))} /></>}
          <h3>Open high-severity risks</h3>
          <ul>{s.raid.filter((r) => r.kind === 'Risk' && r.status !== 'Closed' && r.probability * r.impact >= 10 && projects.some((p) => p.id === r.projectId)).map((r) => <li key={r.id}>{byId(s.projects, r.projectId).name}: {r.title} (score {r.probability * r.impact}, owner {r.owner ? userName(s, r.owner) : 'none'})</li>)}</ul>
          {projects.some((p) => p.demo) && <p className="doc-k">Contains demonstration data</p>}
        </article>
      )}
      {tab === 'project' && (
        <>
          <div className="filters"><select value={pid} onChange={(e) => setPid(e.target.value)} aria-label="Project">{projects.map((p) => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select></div>
          <ProjectReport p={byId(s.projects, pid)} showBudget={showBudget} />
        </>
      )}
    </div>
  );
}

function ProjectReport({ p, showBudget }) {
  const { s } = useStore();
  const w = activeWave(s, p.id);
  const g = gateState(s, p, w);
  const reqs = reqsOf(s, w.id);
  const tests = testsOf(s, w.id);
  const defects = defectsOf(s, w.id).filter((d) => d.status !== 'Closed');
  const ms = metricsOf(s, w.id);
  return (
    <article className="doc report">
      <p className="doc-k">Project status report, {fmtDate(new Date())}</p>
      <h2>{p.name}</h2>
      <p>{clientName(s, p)}. {p.objective}</p>
      <dl className="review">
        <dt>Current wave</dt><dd>Wave {w.num}: {w.name}. {w.status === 'closed' ? 'Closed' : `In ${PHASE_META[w.phase].label}`}.</dd>
        <dt>Health</dt><dd>{health(s, p).reasons.join('; ') || 'No red or amber signals'}</dd>
        <dt>Delivery lead</dt><dd>{userName(s, p.team.deliveryLead)}</dd>
        {showBudget && <><dt>Budget</dt><dd>{money(p.actual)} spent of {money(p.budget)}</dd></>}
        <dt>Planned completion</dt><dd>{fmtDate(p.end)}</dd>
      </dl>
      <h3>Requirements and evidence</h3>
      <p>{reqs.length} requirements; {reqs.filter((r) => tests.some((t) => t.reqId === r.id && t.status === 'Pass')).length} with passing test evidence. {tests.filter((t) => t.status === 'Fail').length} failing tests.</p>
      <h3>Open defects</h3>
      {defects.length ? <ul>{defects.map((d) => <li key={d.id}>{d.code} {d.title} ({d.severity}, {d.status})</li>)}</ul> : <p>None.</p>}
      <h3>Value against baseline</h3>
      {ms.length ? <ul>{ms.map((m) => <li key={m.id}>{m.name}: baseline {m.baseline}{m.unit}, target {m.target}{m.unit}, actual {m.actual !== '' ? m.actual + m.unit : 'not measured'}{m.source ? ` (${m.source})` : ''}{m.actual !== '' && m.source ? (metTarget(m) ? '. On target.' : '. Below target.') : ''}</li>)}</ul> : <p>No measures recorded yet.</p>}
      <h3>Gate readiness</h3>
      <p>{g.passed} of 8 checklist items met. {g.approvals.filter((a) => a.a).length} of {g.approvals.length} approvals recorded.</p>
    </article>
  );
}
