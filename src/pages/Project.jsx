import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { Panel, Rag, Bar, Avatar, Pill, Icon, Btn, Empty, Modal, Field, WaveRail, Tabs, CheckRow } from '../ui.jsx';
import { PHASE_META, TEAM_SLOTS, DESIGN_AREAS, TEST_LAYERS } from '../methodology.js';
import { activeWave, health, projectProgress, money, fmtDate, fmtTime, clientName, wavesOf, userName, phasesFor, exitChecks, signoffSpecs, signoff, signerId, canSign, can, isClientUser, uid, nowISO, reqsOf, testsOf, itemsOf, byId, TODAY } from '../engine.js';
import { DiscoveryWS, DesignWS, DeployWS, AdoptWS } from './phases.jsx';
import { BuildWS } from './build.jsx';
import { ProveWS } from './prove.jsx';
import { GateWS } from './gate.jsx';

export default function ProjectPage({ p }) {
  const { s, me, route, go } = useStore();
  const waves = wavesOf(s, p.id);
  const w = byId(s.waves, route.waveId) && byId(s.waves, route.waveId).projectId === p.id ? byId(s.waves, route.waveId) : activeWave(s, p.id);
  const phases = phasesFor(p, w);
  const phase = route.phase && phases.includes(route.phase) ? route.phase : w.status === 'closed' ? 'gate' : w.phase;
  const tab = route.tab && ['requirements', 'team', 'activity'].includes(route.tab) ? route.tab : 'phase';
  const setR = (patch) => go({ ...route, page: 'project', projectId: p.id, waveId: w.id, phase, tab: tab === 'phase' ? route.tab : tab, ...patch });
  const h = health(s, p);
  const [edit, setEdit] = useState(false);
  const checks = exitChecks(s, p, w, w.phase);
  const client = isClientUser(me);

  return (
    <div className="stack">
      <div className="proj-h">
        <button className="link small" onClick={() => go({ page: 'portfolio' })}><Icon name="left" size={14} />Projects</button>
        <div className="page-h">
          <div>
            <div className="proj-tags"><Pill tone={p.kind === 'external' ? 'teal' : 'amber'}>{p.kind === 'external' ? 'External client' : 'Internal BTL'}</Pill>{p.classes.map((c) => <Pill key={c}>{c}</Pill>)}{p.demo && <Pill tone="demo">Demo data</Pill>}</div>
            <h1>{p.name}</h1>
            <p className="muted">{p.code}. {clientName(s, p)}. {p.objective}</p>
          </div>
          <div className="proj-side">
            <Rag rag={h.rag} />
            {can(me, p, 'edit') && <Btn small icon="edit" onClick={() => setEdit(true)}>Edit project</Btn>}
          </div>
        </div>
        <div className="proj-kpis">
          <div><span className="muted small">Progress</span><Bar value={projectProgress(s, p)} /><span className="small">{Math.round(projectProgress(s, p) * 100)}% across {Math.max(p.plannedWaves, waves.length)} planned waves</span></div>
          {can(me, p, 'budget') && <div><span className="muted small">Budget</span><Bar value={p.actual / p.budget} tone={p.actual > p.budget ? 'red' : p.actual > p.budget * 0.85 ? 'amber' : 'teal'} /><span className="small">{money(p.actual)} of {money(p.budget)}</span></div>}
          <div><span className="muted small">Planned completion</span><strong>{fmtDate(p.end)}</strong></div>
          <div><span className="muted small">Delivery lead</span><Avatar s={s} id={p.team.deliveryLead} size={22} showName /></div>
        </div>
        {h.reasons.length > 0 && <div className="note note-warn"><Icon name="alert" size={16} />{h.reasons.join('. ')}.</div>}
      </div>

      <div className="wave-bar">
        <div className="wave-tabs" role="tablist" aria-label="Delivery waves">
          {waves.map((x) => (
            <button key={x.id} role="tab" aria-selected={x.id === w.id} className={'wave-tab' + (x.id === w.id ? ' on' : '')} onClick={() => go({ page: 'project', projectId: p.id, waveId: x.id })}>
              <strong>Wave {x.num}</strong>
              <span>{x.status === 'closed' ? `Closed, ${x.gate.decision ? (x.gate.decision.kind === 'conditions' ? 'proceed with conditions' : x.gate.decision.kind) : ''}` : x.status === 'replan' ? 'Re-plan' : PHASE_META[x.phase].label}</span>
            </button>
          ))}
          {waves.length < p.plannedWaves && <span className="wave-tab planned" title="Starts only after the previous wave's gate decision">{activeWave(s, p.id).gate.decision && activeWave(s, p.id).gate.decision.kind !== 'stop' ? <><Icon name="check" size={12} /><strong>Wave {waves.length + 1}</strong><span>Authorised by the gate</span></> : <><Icon name="lock" size={12} /><strong>Wave {waves.length + 1}</strong><span>Locked until the gate</span></>}</span>}
        </div>
        <div className="wave-name"><strong>{w.name}</strong><span className="muted small">{w.scope}</span></div>
      </div>

      <WaveRail project={p} wave={w} selected={tab === 'phase' ? phase : null} onSelect={(ph) => go({ page: 'project', projectId: p.id, waveId: w.id, phase: ph })} blockedPhase={checks.some((c) => !c.ok) && h.rag === 'red'} />

      <Tabs value={tab} onChange={(t) => go({ page: 'project', projectId: p.id, waveId: w.id, phase, tab: t === 'phase' ? undefined : t })} tabs={[['phase', `${PHASE_META[phase].label} workspace`], ['requirements', 'Requirements and traceability', reqsOf(s, w.id).length], ['team', 'Team'], ...(client ? [] : [['activity', 'Activity']])]} />

      {tab === 'phase' && <PhaseView p={p} w={w} phase={phase} />}
      {tab === 'requirements' && <Requirements p={p} w={w} />}
      {tab === 'team' && <TeamTab p={p} />}
      {tab === 'activity' && <Activity p={p} />}
      {edit && <EditProject p={p} onClose={() => setEdit(false)} />}
    </div>
  );
}

function PhaseView({ p, w, phase }) {
  const { s } = useStore();
  const m = PHASE_META[phase];
  const phases = phasesFor(p, w);
  const cur = w.status === 'closed' ? phases.length : phases.indexOf(w.phase);
  const idx = phases.indexOf(phase);
  const state = w.status === 'closed' || idx < cur ? 'done' : idx === cur ? 'current' : 'future';
  const ro = state !== 'current' || w.status !== 'active';
  const Body = { discovery: DiscoveryWS, design: DesignWS, build: BuildWS, prove: ProveWS, deploy: DeployWS, adopt: AdoptWS, gate: GateWS }[phase];
  const log = w.phaseLog.find((x) => x.phase === phase);

  return (
    <div className="phase-grid">
      <div className="stack">
        <div className="phase-intro">
          <div>
            <h2>{m.label}: {m.title.toLowerCase()}</h2>
            <p>{m.purpose}</p>
            <p className="muted small">{m.duration}{log ? `. Entered ${fmtDate(log.at)}` : ''}{state === 'done' ? '. Completed' : ''}</p>
          </div>
          <ol className="steps">{m.steps.map((x, i) => <li key={i}><span>{i + 1}</span>{x}</li>)}</ol>
          {p.kind === 'internal' && <div className="note"><strong>Internal delivery.</strong> {m.internal}</div>}
        </div>
        {state === 'future' ? (
          <Panel><Empty icon="lock" title={`${m.label} has not started`}>This wave is in {PHASE_META[w.phase].label}. {m.label} opens when every exit check before it passes and the delivery lead advances the wave.</Empty></Panel>
        ) : <Body p={p} w={w} ro={ro} />}
      </div>
      <aside className="stack">
        {phase !== 'gate' && <ExitPanel p={p} w={w} phase={phase} state={state} />}
        <SignoffPanel p={p} w={w} phase={phase} state={state} />
        <Panel title="Who does what">
          <ul className="who">{m.who.map(([r, d]) => <li key={r}><strong>{r}</strong><span className="muted small">{d}</span></li>)}</ul>
          <p className="small out"><strong>Output.</strong> {m.output}</p>
        </Panel>
      </aside>
    </div>
  );
}

function ExitPanel({ p, w, phase, state }) {
  const { s, me, update, toast, go } = useStore();
  const checks = exitChecks(s, p, w, phase);
  const ok = checks.every((c) => c.ok);
  const phases = phasesFor(p, w);
  const next = phases[phases.indexOf(phase) + 1];
  const allowed = can(me, p, 'advance');

  function advance() {
    update((st) => {
      const x = st.waves.find((y) => y.id === w.id);
      if (x.phase !== phase) return false;
      x.completedPhases.push(phase);
      x.phase = next;
      x.phaseLog.push({ phase: next, at: nowISO(), by: me.id });
    }, { action: `Wave ${w.num} advanced to ${PHASE_META[next].label}`, detail: `${PHASE_META[phase].label} exit checks passed: ${checks.map((c) => c.label).join('; ')}`, projectId: p.id });
    toast(`Wave ${w.num} moved to ${PHASE_META[next].label}`);
    go({ page: 'project', projectId: p.id, waveId: w.id, phase: next });
  }

  return (
    <Panel title="Exit check" sub={PHASE_META[phase].exit}>
      <ul className="checks">{checks.map((c) => <CheckRow key={c.id} {...c} />)}</ul>
      {state === 'current' && w.status === 'active' && (
        <div className="advance">
          <Btn kind="primary" full disabled={!ok || !allowed} onClick={advance} icon={ok ? 'check' : 'lock'}>{`Advance to ${PHASE_META[next].label}`}</Btn>
          <p className="small muted">{!ok ? `${checks.filter((c) => !c.ok).length} check${checks.filter((c) => !c.ok).length > 1 ? 's' : ''} must pass first.` : !allowed ? `Only the delivery lead (${userName(s, p.team.deliveryLead)}) or accountable partner (${userName(s, p.team.partner)}) can advance the wave.` : 'All checks pass. Advancing is recorded in the audit log.'}</p>
        </div>
      )}
      {state === 'done' && <p className="small muted">Phase complete.</p>}
    </Panel>
  );
}

export function SignoffPanel({ p, w, phase, state }) {
  const { s, me, update, toast } = useStore();
  const specs = signoffSpecs(p, phase);
  const [open, setOpen] = useState(null);
  const [comment, setComment] = useState('');
  const [confirm, setConfirm] = useState(false);
  if (!specs.length) return null;

  function sign() {
    const [key, label] = open;
    update((st) => {
      if (st.signoffs.some((x) => x.waveId === w.id && x.key === key)) return false;
      st.signoffs.push({ id: uid('so'), waveId: w.id, key, userId: me.id, at: nowISO(), comment });
      st.evidence.push({ id: uid('ev'), projectId: p.id, waveId: w.id, phase, type: 'Approval', title: `Sign-off: ${label}`, version: '1.0', owner: me.id, status: 'Approved', at: nowISO(), ref: comment, file: null });
    }, { action: 'Sign-off recorded', detail: `${label}, wave ${w.num}${comment ? `. Comment: ${comment}` : ''}`, projectId: p.id });
    toast(`Signed: ${label}`);
    setOpen(null); setComment(''); setConfirm(false);
  }

  return (
    <Panel title="Sign-offs" sub="Recorded against the signed-in person. Nobody can sign on someone else's behalf." id="signoff">
      <ul className="signs">
        {specs.map(([key, label, spec]) => {
          const so = signoff(s, w.id, key);
          const who = signerId(p, spec);
          return (
            <li key={key} className={so ? 'signed' : ''}>
              <Avatar s={s} id={who} size={28} />
              <div>
                <strong>{label}</strong>
                <span className="small muted">{so ? `Signed by ${userName(s, so.userId)}, ${fmtTime(so.at)}` : `Waiting for ${userName(s, who)}`}</span>
                {so && so.comment && <span className="small">“{so.comment}”</span>}
              </div>
              {!so && canSign(me, p, spec) && state === 'current' && w.status === 'active' && <Btn small kind="primary" onClick={() => setOpen([key, label])}>Sign</Btn>}
            </li>
          );
        })}
      </ul>
      {open && (
        <Modal title={open[1]} onClose={() => setOpen(null)} footer={<><Btn onClick={() => setOpen(null)}>Cancel</Btn><Btn kind="primary" disabled={!confirm} onClick={sign}>Record my sign-off</Btn></>}>
          <p>You are signing as <strong>{me.name}</strong> ({me.title}) for {p.name}, wave {w.num}. The sign-off is stored with your name and the time and cannot be edited.</p>
          <Field label="Comment (optional)"><textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
          <label className="checkline"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />I have reviewed the evidence for this phase and approve it.</label>
        </Modal>
      )}
    </Panel>
  );
}

function Requirements({ p, w }) {
  const { s, me, update, toast } = useStore();
  const reqs = reqsOf(s, w.id);
  const tests = testsOf(s, w.id);
  const items = itemsOf(s, w.id);
  const [form, setForm] = useState(null);
  const open = w.status === 'active' && ['discovery', 'design'].includes(w.phase);
  const canEdit = can(me, p, 'edit') && open;

  function save() {
    if (!form.title.trim()) return;
    update((st) => {
      if (form.id) Object.assign(st.requirements.find((r) => r.id === form.id), { title: form.title, criteria: form.criteria, type: form.type, priority: form.priority, designArea: form.designArea });
      else st.requirements.push({ id: uid('r'), projectId: p.id, waveId: w.id, code: `REQ-${String(reqs.length + 1).padStart(2, '0')}`, title: form.title, criteria: form.criteria, type: form.type, priority: form.priority, designArea: form.designArea, status: 'draft', approvedBy: null });
    }, { action: form.id ? 'Requirement edited' : 'Requirement added', detail: form.title, projectId: p.id });
    setForm(null);
  }
  function approve(r) {
    update((st) => { const x = st.requirements.find((y) => y.id === r.id); x.status = 'approved'; x.approvedBy = me.id; }, { action: 'Requirement approved', detail: `${r.code} ${r.title}`, projectId: p.id });
    toast(`${r.code} approved`);
  }

  return (
    <Panel title="Requirements and traceability" sub={`Business objective: ${p.objective}`} pad={false} actions={canEdit && <Btn small kind="primary" icon="plus" onClick={() => setForm({ title: '', criteria: '', type: 'Functional', priority: 'Must', designArea: '' })}>Add requirement</Btn>}>
      {!open && w.status === 'active' && <div className="note note-inset">Scope is locked after Design. New requests go to the backlog through a change request in Risk and change, not into the running wave.</div>}
      {reqs.length === 0 ? <Empty title="No requirements yet">{canEdit ? 'Add the first requirement confirmed with the business owner.' : 'Requirements are captured in Discovery or Design.'}</Empty> : (
        <div className="table-wrap">
          <table className="tbl trace">
            <thead><tr><th>Requirement</th><th>Acceptance criterion</th><th>Design</th><th>Work items</th><th>Tests</th><th>Approval</th><th /></tr></thead>
            <tbody>
              {reqs.map((r) => {
                const ts = tests.filter((t) => t.reqId === r.id);
                const wi = items.filter((i) => i.reqId === r.id);
                return (
                  <tr key={r.id}>
                    <td><strong>{r.code}</strong> {r.title}<div className="muted small">{r.type}, {r.priority}</div></td>
                    <td className="small">{r.criteria || <span className="err-text">No pass mark yet</span>}</td>
                    <td className="small">{r.designArea ? (DESIGN_AREAS.find((d) => d[0] === r.designArea) || [, r.designArea])[1] : <span className="muted">–</span>}</td>
                    <td className="small">{wi.length ? `${wi.filter((i) => i.status === 'Done').length}/${wi.length} done` : <span className="muted">–</span>}</td>
                    <td className="small">{ts.length ? <span className="trace-t">{ts.map((t) => <i key={t.id} className={'tdot t-' + t.status.replace(' ', '').toLowerCase()} title={`${t.title}: ${t.status}`} />)}{ts.filter((t) => t.status === 'Pass').length}/{ts.length} pass</span> : <span className="muted">No tests</span>}</td>
                    <td className="small">{r.status === 'approved' ? <span className="ok-text">Approved by {userName(s, r.approvedBy)}</span> : can(me, p, 'approveReq') && open ? <Btn small onClick={() => approve(r)}>Approve</Btn> : <Pill tone="amber">Draft</Pill>}</td>
                    <td>{canEdit && <button className="icon-btn" aria-label={`Edit ${r.code}`} onClick={() => setForm({ ...r })}><Icon name="edit" size={15} /></button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {form && (
        <Modal title={form.id ? `Edit ${form.code}` : 'Add requirement'} onClose={() => setForm(null)} footer={<><Btn onClick={() => setForm(null)}>Cancel</Btn><Btn kind="primary" disabled={!form.title.trim()} onClick={save}>Save requirement</Btn></>}>
          <div className="form-grid">
            <Field label="Requirement" wide><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Acceptance criterion (measurable pass mark)" wide hint="Design cannot exit until every requirement has one."><textarea rows="2" value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} /></Field>
            <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Functional</option><option>Non-functional</option></select></Field>
            <Field label="Priority"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{['Must', 'Should', 'Could'].map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Design section" wide><select value={form.designArea} onChange={(e) => setForm({ ...form, designArea: e.target.value })}><option value="">Not yet mapped</option>{DESIGN_AREAS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          </div>
        </Modal>
      )}
    </Panel>
  );
}

function TeamTab({ p }) {
  const { s, me } = useStore();
  const client = isClientUser(me);
  return (
    <div className="grid-2">
      <Panel title="Accountable roles" sub="These assignments decide who can approve, sign and advance">
        <ul className="roles">{TEAM_SLOTS.filter(([k]) => p.team[k]).map(([k, l]) => <li key={k}><span className="muted small">{l}</span><Avatar s={s} id={p.team[k]} size={24} showName /></li>)}</ul>
      </Panel>
      {!client && (
        <Panel title="Delivery team" sub="Members who build, test and run the service">
          {(p.members || []).length === 0 ? <Empty icon="users" title="No members assigned">Add members from Edit project.</Empty> : <ul className="roles">{p.members.map((id) => <li key={id}><Avatar s={s} id={id} size={24} showName /><span className="muted small">{(byId(s.users, id) || {}).title}</span></li>)}</ul>}
        </Panel>
      )}
    </div>
  );
}

function Activity({ p }) {
  const { s } = useStore();
  const list = s.audit.filter((a) => a.projectId === p.id);
  return (
    <Panel title="Activity" sub="Every change to this project, with who made it and when" pad={false}>
      {list.length === 0 ? <Empty icon="history" title="No recorded activity yet">Changes you make appear here.</Empty> : <ul className="audit">{list.map((a) => <li key={a.id}><Avatar s={s} id={a.userId} size={24} /><div><strong>{a.action}</strong><span className="small">{a.detail}</span><span className="muted small">{userName(s, a.userId)}, {fmtTime(a.at)}</span></div></li>)}</ul>}
    </Panel>
  );
}

function EditProject({ p, onClose }) {
  const { s, me, update, toast } = useStore();
  const [f, setF] = useState({ name: p.name, objective: p.objective, description: p.description, budget: p.budget, actual: p.actual, end: p.end, plannedWaves: p.plannedWaves, team: { ...p.team }, members: [...(p.members || [])] });
  const btl = s.users.filter((u) => u.org === 'btl' && u.globalRole !== 'admin');
  const clientUsers = p.clientId ? s.users.filter((u) => u.org === p.clientId) : btl;
  const teamEdit = can(me, p, 'advance');
  function save() {
    update((st) => {
      const x = st.projects.find((y) => y.id === p.id);
      const changes = [];
      ['name', 'objective', 'description', 'end'].forEach((k) => { if (x[k] !== f[k]) changes.push(k); });
      if (+x.budget !== +f.budget) changes.push(`budget ${x.budget} to ${f.budget}`);
      if (+x.actual !== +f.actual) changes.push(`actual cost ${x.actual} to ${f.actual}`);
      Object.assign(x, { name: f.name, objective: f.objective, description: f.description, budget: +f.budget, actual: +f.actual, end: f.end, plannedWaves: +f.plannedWaves });
      if (teamEdit) { x.team = f.team; x.members = f.members; }
    }, { action: 'Project details edited', detail: 'Updated project record', projectId: p.id });
    toast('Project saved');
    onClose();
  }
  return (
    <Modal wide title={`Edit ${p.name}`} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={save} disabled={!f.name.trim()}>Save project</Btn></>}>
      <div className="form-grid">
        <Field label="Project title" wide><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Business objective" wide><input value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })} /></Field>
        <Field label="Budget (£)"><input type="number" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} /></Field>
        <Field label="Actual cost to date (£)" hint="Enter from your finance records."><input type="number" value={f.actual} onChange={(e) => setF({ ...f, actual: e.target.value })} /></Field>
        <Field label="Planned completion"><input type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
        <Field label="Planned waves"><input type="number" min="1" value={f.plannedWaves} onChange={(e) => setF({ ...f, plannedWaves: e.target.value })} /></Field>
        {teamEdit ? TEAM_SLOTS.map(([k, l]) => (
          <Field key={k} label={l}>
            <select value={f.team[k] || ''} onChange={(e) => setF({ ...f, team: { ...f.team, [k]: e.target.value } })}>
              <option value="">Not assigned</option>
              {(['businessOwner', 'sponsor'].includes(k) ? clientUsers : btl).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
        )) : <p className="muted small field-wide">Only the delivery lead or accountable partner can change role assignments.</p>}
        {teamEdit && (
          <Field label="Delivery team members" wide>
            <div className="chips">{btl.filter((u) => !Object.values(f.team).includes(u.id)).map((u) => <button key={u.id} className={'chip' + (f.members.includes(u.id) ? ' on' : '')} aria-pressed={f.members.includes(u.id)} onClick={() => setF({ ...f, members: f.members.includes(u.id) ? f.members.filter((x) => x !== u.id) : [...f.members, u.id] })}>{u.name}</button>)}</div>
          </Field>
        )}
      </div>
    </Modal>
  );
}
