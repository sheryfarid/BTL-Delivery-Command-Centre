import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { Panel, Stat, Rag, Bar, Avatar, Pill, Icon, Btn, Empty } from '../ui.jsx';
import { PHASES, PHASE_META } from '../methodology.js';
import { canView, isClientUser, activeWave, health, projectProgress, nextAction, attention, gateState, defectsOf, money, fmtDate, clientName, wavesOf, userName, phasesFor, itemsOf, sprintsOf, can, notificationsFor, byId, TODAY, daysBetween } from '../engine.js';

export default function Dashboard() {
  const { s, me, go } = useStore();
  const client = isClientUser(me);
  const projects = s.projects.filter((p) => canView(me, p));
  const [phaseFilter, setPhaseFilter] = useState(null);

  const live = projects.map((p) => ({ p, w: activeWave(s, p.id), h: health(s, p) }));
  const activeWaves = live.filter((x) => x.w && x.w.status !== 'closed');
  const onTrack = live.filter((x) => x.h.rag === 'green').length;
  const atRisk = live.filter((x) => x.h.rag !== 'green').length;
  const gateWaves = activeWaves.filter((x) => x.w.phase === 'gate' && !x.w.gate.decision);
  const pendingGateSigs = gateWaves.reduce((n, x) => n + gateState(s, x.p, x.w).approvals.filter((a) => !a.a).length, 0);
  const allDefects = activeWaves.flatMap((x) => defectsOf(s, x.w.id)).filter((d) => d.status !== 'Closed');
  const crit = allDefects.filter((d) => d.severity === 'Critical').length;
  const high = allDefects.filter((d) => d.severity === 'High').length;
  const budget = projects.reduce((n, p) => n + p.budget, 0);
  const actual = projects.reduce((n, p) => n + p.actual, 0);
  const releases = activeWaves.filter((x) => ['prove', 'deploy'].includes(x.w.phase));
  const att = attention(s, projects);
  const phaseCounts = Object.fromEntries(PHASES.map((ph) => [ph, activeWaves.filter((x) => x.w.phase === ph)]));
  const shown = phaseFilter ? live.filter((x) => x.w && x.w.status !== 'closed' && x.w.phase === phaseFilter) : live;

  if (client) return <ClientHome projects={projects} />;

  return (
    <div className="stack">
      <div className="page-h">
        <div>
          <h1>Delivery command centre</h1>
          <p className="muted">From Discovery to signed-off delivery, one controlled wave at a time.</p>
        </div>
        <Btn kind="primary" icon="plus" onClick={() => go({ page: 'portfolio', wizard: true })}>New project</Btn>
      </div>

      <div className="stats">
        <Stat label="Active projects" value={live.filter((x) => x.w && x.w.status !== 'closed').length} sub={`${projects.length} in portfolio`} onClick={() => go({ page: 'portfolio' })} />
        <Stat label="Active delivery waves" value={activeWaves.length} sub={`${s.waves.filter((w) => w.status === 'closed' && projects.some((p) => p.id === w.projectId)).length} closed at a gate`} />
        <Stat label="On track" value={onTrack} tone="green" sub="No red or amber signals" />
        <Stat label="At risk or watch" value={atRisk} tone={atRisk ? 'amber' : undefined} sub={live.filter((x) => x.h.rag === 'red').length + ' red'} />
        <Stat label="Outstanding gate approvals" value={pendingGateSigs} sub={`${gateWaves.length} wave${gateWaves.length === 1 ? '' : 's'} at the Gate`} onClick={() => go({ page: 'gates' })} />
        <Stat label="Open critical defects" value={crit} tone={crit ? 'red' : undefined} sub={`${high} high also open`} />
        <Stat label="Budget utilisation" value={Math.round((actual / budget) * 100) + '%'} sub={`${money(actual)} of ${money(budget)}`} />
        <Stat label="Upcoming releases" value={releases.length} sub="Waves in Prove or Deploy" />
      </div>

      <Panel title="Delivery flow" sub="Active waves in each phase. Select a phase to filter the portfolio below." actions={phaseFilter && <Btn small kind="ghost" icon="x" onClick={() => setPhaseFilter(null)}>Clear filter</Btn>}>
        <ol className="flow">
          {PHASES.map((ph) => {
            const list = phaseCounts[ph];
            const blocked = list.some((x) => x.h.rag === 'red');
            const awaiting = ph === 'gate' ? gateWaves.length : 0;
            return (
              <li key={ph} className={'flow-s' + (list.length ? ' has' : '') + (blocked ? ' blocked' : '') + (phaseFilter === ph ? ' sel' : '') + (ph === 'gate' ? ' flow-gate' : '')}>
                <button onClick={() => setPhaseFilter(phaseFilter === ph ? null : ph)} aria-pressed={phaseFilter === ph}>
                  <span className="flow-n">{list.length}</span>
                  <span className="flow-l">{PHASE_META[ph].label}</span>
                  <span className="flow-sub">{ph === 'discovery' ? 'External only' : blocked ? 'Has red signals' : awaiting ? `${awaiting} awaiting decision` : list.length ? 'In progress' : 'None'}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="muted small flow-note">Every wave closes at the Gate with a recorded decision. Internal BTL projects start each wave at Design.</p>
      </Panel>

      <div className="grid-2-1">
        <Panel title="Portfolio delivery health" sub={phaseFilter ? `Waves currently in ${PHASE_META[phaseFilter].label}` : 'Every project, its current wave and the next required action'} pad={false}>
          {shown.length === 0 ? <Empty title="No waves in this phase">Clear the filter to see every project.</Empty> : (
            <div className="pcards">
              {shown.map(({ p, w, h }) => (
                <button key={p.id} className="pcard" onClick={() => go({ page: 'project', projectId: p.id, waveId: w && w.id, phase: w && w.phase })}>
                  <div className="pcard-top">
                    <div>
                      <span className="muted small">{p.code}  {clientName(s, p)}</span>
                      <strong>{p.name}</strong>
                    </div>
                    <Rag rag={h.rag} />
                  </div>
                  <div className="pcard-meta">
                    <span><span className="muted">Wave</span> {w ? `${w.num} of ${Math.max(p.plannedWaves, wavesOf(s, p.id).length)}` : '–'}</span>
                    <span><span className="muted">Phase</span> {w ? (w.status === 'closed' ? 'Closed' : PHASE_META[w.phase].label) : '–'}</span>
                    <span><span className="muted">Due</span> {fmtDate(p.end)}</span>
                    <span className="pcard-owner"><Avatar s={s} id={p.team.deliveryLead} size={20} showName /></span>
                  </div>
                  <Bar value={projectProgress(s, p)} label="Progress" tone={h.rag === 'red' ? 'red' : 'teal'} />
                  <div className="pcard-next"><Icon name="right" size={14} /><span>{nextAction(s, p)}</span><span className="muted small">{Math.round(projectProgress(s, p) * 100)}%</span></div>
                  {h.reasons.length > 0 && <div className="pcard-why">{h.reasons.join('. ')}</div>}
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Immediate attention" sub={`${att.length} items from live records`} pad={false}>
          {att.length === 0 ? <Empty icon="check" title="Nothing needs attention" /> : (
            <ul className="att">
              {att.slice(0, 12).map((a, i) => (
                <li key={i}>
                  <button onClick={() => go(a.route ? { page: a.route, projectId: a.p.id } : { page: 'project', projectId: a.p.id, waveId: a.w.id, phase: a.phase, tab: a.tab })}>
                    <span className={'att-dot att-' + a.sev} />
                    <span className="att-t"><span className="att-k">{a.kind}</span>{a.text}<span className="muted small">{a.p.name}. {a.meta}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid-2">
        <Panel title="Gate decision queue" sub="Waves waiting for an evidence-based decision" actions={<Btn small kind="ghost" onClick={() => go({ page: 'gates' })}>Open gate approvals</Btn>}>
          {gateWaves.length === 0 ? <Empty icon="shield" title="No waves at the Gate" /> : gateWaves.map(({ p, w }) => {
            const g = gateState(s, p, w);
            return (
              <button key={w.id} className="gq" onClick={() => go({ page: 'project', projectId: p.id, waveId: w.id, phase: 'gate' })}>
                <div className="gq-h"><strong>{p.name}, wave {w.num}</strong><Pill tone={g.failed.length ? 'amber' : 'green'}>{g.passed} of 8 checks</Pill></div>
                <div className="gq-signers">{g.approvals.map((a) => <span key={a.spec} className={'sig' + (a.a ? (a.a.decision === 'approve' ? ' sig-ok' : ' sig-no') : '')} title={`${a.label}: ${userName(s, a.userId)}${a.a ? ' signed' : ' waiting'}`}><Avatar s={s} id={a.userId} size={24} /></span>)}</div>
                {g.failed.length > 0 && <p className="small muted">Missing: {g.failed.map((f) => f.label.toLowerCase()).join('; ')}</p>}
              </button>
            );
          })}
        </Panel>
        <Panel title="Budget against actual cost" sub="Recorded project budgets and actual spend to date">
          <BudgetChart rows={projects.map((p) => ({ label: p.name, budget: p.budget, actual: p.actual }))} />
        </Panel>
      </div>

      <div className="grid-3">
        <Panel title="Open defects by severity" sub="Active waves only">
          <SevChart defects={allDefects} />
        </Panel>
        <Panel title="Sprint throughput" sub="Points done per sprint, active waves">
          <Throughput s={s} waves={activeWaves.map((x) => x.w)} />
        </Panel>
        <Panel title="Delivery capacity" sub="Allocated share of each person's week" actions={<Btn small kind="ghost" onClick={() => go({ page: 'team' })}>Team</Btn>}>
          <Capacity s={s} />
        </Panel>
      </div>
    </div>
  );
}

export function BudgetChart({ rows }) {
  const max = Math.max(...rows.map((r) => Math.max(r.budget, r.actual)), 1);
  return (
    <div className="hchart">
      {rows.map((r) => (
        <div className="hrow" key={r.label}>
          <span className="hrow-l">{r.label}</span>
          <div className="hrow-bars">
            <i className="hb hb-budget" style={{ width: (r.budget / max) * 100 + '%' }} />
            <i className={'hb hb-actual' + (r.actual > r.budget ? ' over' : r.actual > r.budget * 0.85 ? ' near' : '')} style={{ width: (r.actual / max) * 100 + '%' }} />
          </div>
          <span className="hrow-v">{money(r.actual)} <span className="muted">/ {money(r.budget)}</span></span>
        </div>
      ))}
      <div className="legend"><span><i className="hb-budget" />Budget</span><span><i className="hb-actual" />Actual</span></div>
    </div>
  );
}

function SevChart({ defects }) {
  const sev = ['Critical', 'High', 'Medium', 'Low'];
  const counts = sev.map((x) => defects.filter((d) => d.severity === x).length);
  const max = Math.max(...counts, 1);
  return (
    <div className="vchart">
      {sev.map((x, i) => (
        <div className="vcol" key={x}>
          <span className="vval">{counts[i]}</span>
          <div className="vbar-wrap"><i className={'vbar sev-' + x.toLowerCase()} style={{ height: (counts[i] / max) * 100 + '%' }} /></div>
          <span className="vlab">{x}</span>
        </div>
      ))}
    </div>
  );
}

function Throughput({ s, waves }) {
  const rows = waves.flatMap((w) => sprintsOf(s, w.id).map((sp) => ({ label: `${byId(s.projects, w.projectId).code} S${sp.num}`, pts: itemsOf(s, w.id).filter((i) => i.sprintId === sp.id && i.status === 'Done').reduce((n, i) => n + (+i.estimate || 0), 0) }))).slice(-8);
  if (!rows.length) return <Empty icon="chart" title="No sprints yet" />;
  const max = Math.max(...rows.map((r) => r.pts), 1);
  return (
    <div className="vchart">
      {rows.map((r) => (
        <div className="vcol" key={r.label}>
          <span className="vval">{r.pts}</span>
          <div className="vbar-wrap"><i className="vbar" style={{ height: (r.pts / max) * 100 + '%' }} /></div>
          <span className="vlab">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Capacity({ s, full }) {
  const people = s.users.filter((u) => u.org === 'btl' && u.capacity > 0).map((u) => ({ u, pct: s.allocations.filter((a) => a.userId === u.id).reduce((n, a) => n + +a.pct, 0) })).sort((a, b) => b.pct - a.pct);
  return (
    <ul className="cap">
      {(full ? people : people.slice(0, 8)).map(({ u, pct }) => (
        <li key={u.id}>
          <Avatar s={s} id={u.id} size={22} showName />
          <Bar value={pct / 100} tone={pct > 100 ? 'red' : pct > 85 ? 'amber' : 'teal'} label={`${u.name} allocation`} />
          <span className={'small' + (pct > 100 ? ' err-text' : '')}>{pct}%</span>
        </li>
      ))}
    </ul>
  );
}

function ClientHome({ projects }) {
  const { s, me, go } = useStore();
  const asks = notificationsFor(s, me);
  return (
    <div className="stack">
      <div className="page-h"><div><h1>Welcome, {me.name.split(' ')[0]}</h1><p className="muted">{byId(s.clients, me.org).name}. Delivery progress, reviews and sign-offs for your projects.</p></div></div>
      <Panel title="Waiting for your review or sign-off" sub="Each sign-off is recorded with your name and the time">
        {asks.length === 0 ? <Empty icon="check" title="Nothing is waiting for you" /> : (
          <ul className="att">{asks.map((n) => <li key={n.id}><button onClick={() => go({ page: 'project', projectId: n.p.id, waveId: n.w.id, phase: n.phase, tab: n.tab })}><span className="att-dot att-amber" /><span className="att-t">{n.text}<span className="muted small">{n.p.name}</span></span></button></li>)}</ul>
        )}
      </Panel>
      {projects.map((p) => {
        const w = activeWave(s, p.id);
        return (
          <Panel key={p.id} title={p.name} sub={`${p.code}. Wave ${w.num}: ${w.name}`} actions={<Btn small kind="primary" onClick={() => go({ page: 'project', projectId: p.id })}>Open project</Btn>}>
            <p className="muted">{p.objective}</p>
            <div className="client-prog"><Bar value={projectProgress(s, p)} /><span>{Math.round(projectProgress(s, p) * 100)}% complete. Current phase: <strong>{PHASE_META[w.phase].label}</strong>. Planned completion {fmtDate(p.end)}.</span></div>
          </Panel>
        );
      })}
    </div>
  );
}
