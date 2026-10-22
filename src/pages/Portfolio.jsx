import React, { useState, useEffect } from 'react';
import { useStore } from '../store.jsx';
import { Panel, Rag, Bar, Avatar, Pill, Icon, Btn, Empty, Modal, Field, WaveRail } from '../ui.jsx';
import { CLASSIFICATIONS, TEAM_SLOTS, PHASE_META } from '../methodology.js';
import { newWave } from '../seed.js';
import { canView, isClientUser, activeWave, health, projectProgress, nextAction, money, fmtDate, clientName, wavesOf, uid, nowISO, TODAY, addDays, can } from '../engine.js';

export default function Portfolio() {
  const { s, me, go, route } = useStore();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [rag, setRag] = useState('all');
  const [wiz, setWiz] = useState(!!route.wizard);
  useEffect(() => { if (route.wizard) setWiz(true); }, [route.wizard]);
  const client = isClientUser(me);
  const rows = s.projects.filter((p) => canView(me, p)).map((p) => ({ p, w: activeWave(s, p.id), h: health(s, p) }))
    .filter(({ p, h }) => (kind === 'all' || p.kind === kind) && (rag === 'all' || h.rag === rag) && (p.name + p.code + clientName(s, p)).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="stack">
      <div className="page-h">
        <div><h1>Projects</h1><p className="muted">External client projects start at Discovery. Internal BTL projects start each wave at Design.</p></div>
        {!client && <Btn kind="primary" icon="plus" onClick={() => setWiz(true)}>New project</Btn>}
      </div>
      <div className="filters">
        <label className="search search-inline"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name, code or client" aria-label="Filter projects" /></label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Project type"><option value="all">All types</option><option value="external">External client</option><option value="internal">Internal BTL</option></select>
        <select value={rag} onChange={(e) => setRag(e.target.value)} aria-label="Health"><option value="all">Any health</option><option value="green">On track</option><option value="amber">Watch</option><option value="red">At risk</option></select>
      </div>
      <Panel pad={false}>
        {rows.length === 0 ? <Empty title="No projects match these filters" action={<Btn onClick={() => { setQ(''); setKind('all'); setRag('all'); }}>Clear filters</Btn>} /> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Project</th><th>Type</th><th>Current wave</th><th className="hide-sm">Lifecycle</th><th>Health</th><th className="hide-sm">Progress</th>{!client && <th className="num hide-sm">Budget used</th>}<th className="hide-sm">Next action</th></tr></thead>
              <tbody>
                {rows.map(({ p, w, h }) => (
                  <tr key={p.id} className="row-click" onClick={() => go({ page: 'project', projectId: p.id })}>
                    <td><strong>{p.name}</strong><div className="muted small">{p.code}  {clientName(s, p)}</div></td>
                    <td><Pill tone={p.kind === 'external' ? 'teal' : 'amber'}>{p.kind === 'external' ? 'External' : 'Internal'}</Pill></td>
                    <td>{w ? <>Wave {w.num}<div className="muted small">{w.status === 'closed' ? 'Closed' : PHASE_META[w.phase].label}</div></> : '–'}</td>
                    <td className="hide-sm" style={{ minWidth: 260 }}>{w && <WaveRail project={p} wave={w} compact />}</td>
                    <td><Rag rag={h.rag} /></td>
                    <td className="hide-sm" style={{ minWidth: 110 }}><Bar value={projectProgress(s, p)} /><span className="small muted">{Math.round(projectProgress(s, p) * 100)}%</span></td>
                    {!client && <td className="num hide-sm">{Math.round((p.actual / p.budget) * 100)}%<div className="muted small">{money(p.actual)} of {money(p.budget)}</div></td>}
                    <td className="hide-sm small">{nextAction(s, p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {wiz && <Wizard onClose={() => { setWiz(false); if (route.wizard) go({ page: 'portfolio' }); }} />}
    </div>
  );
}

const STEPS = ['Project information', 'Delivery classification', 'Delivery team', 'First delivery wave', 'Review and launch'];

function Wizard({ onClose }) {
  const { s, update, go, toast, me } = useStore();
  const btl = s.users.filter((u) => u.org === 'btl' && u.globalRole !== 'admin');
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [f, setF] = useState({
    name: '', clientMode: 'existing', clientId: s.clients[0] ? s.clients[0].id : '', newClient: '', industry: '', description: '', objective: '', budget: '', start: TODAY, end: addDays(TODAY, 120), commercial: 'Fixed price per wave',
    kind: 'external', classes: [],
    team: { partner: 'rizwan', deliveryLead: 'misbah', architect: 'munir', engLead: 'anusha', qaLead: 'tabs', infraLead: 'nikhil', supportLead: 'sheryaar', businessOwner: '', sponsor: '' },
    newBO: '', newSponsor: '', plannedWaves: 2,
    waveName: '', scope: '', milestone: addDays(TODAY, 45), effort: 40,
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setTeam = (k, v) => setF((x) => ({ ...x, team: { ...x.team, [k]: v } }));
  const clientUsers = f.kind === 'external' && f.clientMode === 'existing' ? s.users.filter((u) => u.org === f.clientId) : [];

  function validate(i) {
    const e = {};
    if (i === 0) {
      if (!f.name.trim()) e.name = 'Enter a project title.';
      if (f.kind === 'external' && f.clientMode === 'new' && !f.newClient.trim()) e.newClient = 'Enter the client name.';
      if (!(+f.budget > 0)) e.budget = 'Enter a budget above zero.';
      if (!f.objective.trim()) e.objective = 'State the business objective. Adopt measures value against it.';
      if (f.end <= f.start) e.end = 'The target completion must be after the start date.';
    }
    if (i === 1 && f.classes.length === 0) e.classes = 'Choose at least one technical classification.';
    if (i === 2) {
      ['partner', 'deliveryLead', 'architect', 'qaLead'].forEach((k) => { if (!f.team[k]) e[k] = 'Required.'; });
      if (f.kind === 'external') {
        if (!f.team.businessOwner && !f.newBO.trim()) e.businessOwner = 'Name the client business owner. They sign the design pack and UAT.';
        if (!f.team.sponsor && !f.newSponsor.trim()) e.sponsor = 'Name the client sponsor. They approve the discovery plan.';
      } else if (!f.team.businessOwner) e.businessOwner = 'Choose the internal business owner.';
    }
    if (i === 3) {
      if (!f.waveName.trim()) e.waveName = 'Name the first wave.';
      if (!f.scope.trim()) e.scope = 'Describe what this wave delivers.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  const next = () => validate(step) && setStep(step + 1);

  function launch() {
    for (let i = 0; i < 4; i++) if (!validate(i)) { setStep(i); return; }
    const pid = uid('p');
    update((st) => {
      let clientId = null;
      if (f.kind === 'external') {
        clientId = f.clientId;
        if (f.clientMode === 'new') { clientId = uid('c'); st.clients.push({ id: clientId, name: f.newClient.trim(), industry: f.industry }); }
      }
      const team = { ...f.team };
      if (f.kind === 'external') {
        if (!team.businessOwner && f.newBO.trim()) { const id = uid('u'); st.users.push({ id, name: f.newBO.trim(), title: 'Business owner', team: 'Client', org: clientId, skills: [], capacity: 0, note: '' }); team.businessOwner = id; }
        if (!team.sponsor && f.newSponsor.trim()) { const id = uid('u'); st.users.push({ id, name: f.newSponsor.trim(), title: 'Client sponsor', team: 'Client', org: clientId, skills: [], capacity: 0, note: '' }); team.sponsor = id; }
      }
      const code = (f.kind === 'internal' ? 'BTL-INT-' : (f.newClient || (st.clients.find((c) => c.id === clientId) || {}).name || 'CLI').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() + '-') + String(st.projects.length + 1).padStart(3, '0');
      st.projects.push({ id: pid, code, name: f.name.trim(), clientId, kind: f.kind, classes: f.classes, industry: f.industry, description: f.description, objective: f.objective, budget: +f.budget, actual: 0, start: f.start, end: f.end, commercial: f.commercial, plannedWaves: +f.plannedWaves || 1, team, members: [], demo: false, createdAt: nowISO() });
      const w = newWave({ projectId: pid, num: 1, name: f.waveName.trim(), scope: f.scope, phase: f.kind === 'external' ? 'discovery' : 'design', effort: +f.effort, milestone: f.milestone });
      st.waves.push(w);
    }, { action: 'Project created', detail: `${f.name} launched as ${f.kind} project; first wave starts at ${f.kind === 'external' ? 'Discovery' : 'Design'}`, projectId: pid });
    toast(`${f.name} created. Wave 1 starts at ${f.kind === 'external' ? 'Discovery' : 'Design'}.`);
    onClose();
    go({ page: 'project', projectId: pid });
  }

  const sel = (k, list, allowEmpty) => (
    <select value={f.team[k]} onChange={(e) => setTeam(k, e.target.value)}>
      {allowEmpty && <option value="">Choose a person</option>}
      {list.map((u) => <option key={u.id} value={u.id}>{u.name}, {u.title}</option>)}
    </select>
  );

  return (
    <Modal wide title="New project" onClose={onClose} footer={<>
      <span className="muted small wiz-count">Step {step + 1} of {STEPS.length}</span>
      {step > 0 && <Btn onClick={() => setStep(step - 1)}>Back</Btn>}
      {step < 4 ? <Btn kind="primary" onClick={next}>Continue</Btn> : <Btn kind="primary" icon="rocket" onClick={launch}>Launch project</Btn>}
    </>}>
      <ol className="wiz-steps">{STEPS.map((x, i) => <li key={x} className={i === step ? 'on' : i < step ? 'done' : ''}><span>{i + 1}</span>{x}</li>)}</ol>
      {step === 0 && (
        <div className="form-grid">
          <Field label="Project title" error={errors.name} wide><input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="For example, Claims document assistant" /></Field>
          <Field label="Delivery type" wide>
            <div className="seg">
              <button className={f.kind === 'external' ? 'on' : ''} onClick={() => set('kind', 'external')}>External client project<span>Starts at Discovery</span></button>
              <button className={f.kind === 'internal' ? 'on' : ''} onClick={() => { set('kind', 'internal'); setF((x) => ({ ...x, kind: 'internal', team: { ...x.team, businessOwner: 'rizwan', sponsor: '' } })); }}>Internal BTL product<span>Starts at Design</span></button>
            </div>
          </Field>
          {f.kind === 'external' && (
            <>
              <Field label="Client">
                <select value={f.clientMode === 'new' ? '__new' : f.clientId} onChange={(e) => e.target.value === '__new' ? set('clientMode', 'new') : setF((x) => ({ ...x, clientMode: 'existing', clientId: e.target.value, team: { ...x.team, businessOwner: '', sponsor: '' } }))}>
                  {s.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="__new">Add a new client</option>
                </select>
              </Field>
              {f.clientMode === 'new' ? <Field label="New client name" error={errors.newClient}><input value={f.newClient} onChange={(e) => set('newClient', e.target.value)} /></Field> : <span />}
            </>
          )}
          <Field label="Industry"><input value={f.industry} onChange={(e) => set('industry', e.target.value)} placeholder="Healthcare, logistics, public sector" /></Field>
          <Field label="Commercial arrangement"><select value={f.commercial} onChange={(e) => set('commercial', e.target.value)}>{['Fixed price per wave', 'Time and materials', 'Time and materials, capped', 'Discovery fixed fee, then per wave', 'Internal investment'].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Business objective" error={errors.objective} hint="A measurable outcome. Adopt reports value against it." wide><input value={f.objective} onChange={(e) => set('objective', e.target.value)} placeholder="Cut triage time by 40% without reducing accuracy" /></Field>
          <Field label="Description" wide><textarea rows="2" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <Field label="Budget (£)" error={errors.budget}><input type="number" min="0" value={f.budget} onChange={(e) => set('budget', e.target.value)} /></Field>
          <Field label="Planned waves"><input type="number" min="1" max="12" value={f.plannedWaves} onChange={(e) => set('plannedWaves', e.target.value)} /></Field>
          <Field label="Start date"><input type="date" value={f.start} onChange={(e) => set('start', e.target.value)} /></Field>
          <Field label="Target completion" error={errors.end}><input type="date" value={f.end} onChange={(e) => set('end', e.target.value)} /></Field>
        </div>
      )}
      {step === 1 && (
        <div className="stack-s">
          <p className="muted">Choose every classification that applies. AI or ML projects add the model design section in Design and the model accuracy check in Prove.</p>
          <div className="chips">{CLASSIFICATIONS.map((c) => <button key={c} className={'chip' + (f.classes.includes(c) ? ' on' : '')} aria-pressed={f.classes.includes(c)} onClick={() => set('classes', f.classes.includes(c) ? f.classes.filter((x) => x !== c) : [...f.classes, c])}>{f.classes.includes(c) && <Icon name="check" size={14} />}{c}</button>)}</div>
          {errors.classes && <span className="field-err">{errors.classes}</span>}
          <div className="note"><strong>{f.kind === 'external' ? 'External client project' : 'Internal BTL product development'}</strong>. {f.kind === 'external' ? 'The first wave starts at Discovery: requirements, systems, data, plan and cost are confirmed before any design or price is committed.' : PHASE_META.discovery.internal}</div>
        </div>
      )}
      {step === 2 && (
        <div className="form-grid">
          {TEAM_SLOTS.filter(([k]) => !['businessOwner', 'sponsor'].includes(k)).map(([k, label]) => <Field key={k} label={label} error={errors[k]}>{sel(k, btl, true)}</Field>)}
          {f.kind === 'external' ? (
            <>
              <Field label="Client business owner" error={errors.businessOwner} hint={clientUsers.length ? 'Or type a new name below' : 'Type their name'}>
                {clientUsers.length > 0 ? sel('businessOwner', clientUsers, true) : <input value={f.newBO} onChange={(e) => set('newBO', e.target.value)} placeholder="Full name" />}
              </Field>
              <Field label="Client sponsor" error={errors.sponsor}>
                {clientUsers.length > 0 ? sel('sponsor', clientUsers, true) : <input value={f.newSponsor} onChange={(e) => set('newSponsor', e.target.value)} placeholder="Full name" />}
              </Field>
            </>
          ) : (
            <Field label="Business owner" error={errors.businessOwner} hint="For internal delivery the partners sign the gate: Munir build, Tabs quality, Rizwan market-readiness.">{sel('businessOwner', btl, true)}</Field>
          )}
        </div>
      )}
      {step === 3 && (
        <div className="form-grid">
          <Field label="Wave name" error={errors.waveName} wide><input value={f.waveName} onChange={(e) => set('waveName', e.target.value)} placeholder="For example, Intake and summarisation" /></Field>
          <Field label="Wave scope" error={errors.scope} wide hint="Each release or feature group runs the same wave and closes at its own gate."><textarea rows="3" value={f.scope} onChange={(e) => set('scope', e.target.value)} /></Field>
          <Field label="Wave milestone"><input type="date" value={f.milestone} onChange={(e) => set('milestone', e.target.value)} /></Field>
          <Field label="Estimated effort (person-days)"><input type="number" min="0" value={f.effort} onChange={(e) => set('effort', e.target.value)} /></Field>
        </div>
      )}
      {step === 4 && (
        <div className="stack-s">
          <dl className="review">
            <dt>Project</dt><dd>{f.name}</dd>
            <dt>Client</dt><dd>{f.kind === 'internal' ? 'Business Technique Limited (internal)' : f.clientMode === 'new' ? f.newClient : (s.clients.find((c) => c.id === f.clientId) || {}).name}</dd>
            <dt>Classification</dt><dd>{f.classes.join(', ')}</dd>
            <dt>Budget</dt><dd>£{Number(f.budget).toLocaleString('en-GB')}, {f.commercial.toLowerCase()}</dd>
            <dt>Dates</dt><dd>{fmtDate(f.start)} to {fmtDate(f.end)}</dd>
            <dt>Wave 1</dt><dd>{f.waveName}. {f.scope}</dd>
          </dl>
          <p className="muted small">The lifecycle that will be activated:</p>
          <WaveRail project={{ kind: f.kind }} wave={{ phase: f.kind === 'external' ? 'discovery' : 'design', completedPhases: [], status: 'active' }} />
        </div>
      )}
    </Modal>
  );
}
