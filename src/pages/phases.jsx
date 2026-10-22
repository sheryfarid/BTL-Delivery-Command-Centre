import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { Panel, Pill, Icon, Btn, Empty, Modal, Field, Avatar } from '../ui.jsx';
import { DESIGN_AREAS, ARCH_LAYERS, DEPLOY_STEPS, DEPLOY_PREREQS, VALUE_LOOP } from '../methodology.js';
import { can, uid, nowISO, userName, fmtDate, fmtTime, reqsOf, isAI, signoff, signoffSpecs, metricsOf, metTarget, clientName, money, fmt } from '../engine.js';

export function useWave(p, w) {
  const { update } = useStore();
  return (fn, action, detail = '') => update((st) => fn(st.waves.find((x) => x.id === w.id), st), { action, detail, projectId: p.id });
}

export function ListEditor({ title, sub, rows, cols, onAdd, onRemove, ro, empty }) {
  const blank = Object.fromEntries(cols.map(([k, , , opts]) => [k, opts ? opts[0] : '']));
  const [draft, setDraft] = useState(null);
  const valid = draft && cols.filter(([, , req]) => req !== false).every(([k]) => String(draft[k]).trim());
  return (
    <Panel title={title} sub={sub} pad={false} actions={!ro && <Btn small icon="plus" onClick={() => setDraft({ ...blank })}>Add</Btn>}>
      {rows.length === 0 && !draft ? <Empty title={empty || 'Nothing recorded yet'} /> : (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr>{cols.map(([k, l]) => <th key={k}>{l}</th>)}{!ro && <th />}</tr></thead>
            <tbody>
              {rows.map((r, i) => <tr key={r.id || i}>{cols.map(([k, , , , render]) => <td key={k}>{render ? render(r[k], r) : r[k]}</td>)}{!ro && <td className="num"><button className="icon-btn" aria-label="Remove" onClick={() => onRemove(i)}><Icon name="trash" size={14} /></button></td>}</tr>)}
              {draft && (
                <tr className="draft-row">
                  {cols.map(([k, l, , opts]) => <td key={k}>{opts ? <select aria-label={l} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}>{opts.map((o) => <option key={o}>{o}</option>)}</select> : <input aria-label={l} type={k === 'date' ? 'date' : k === 'attendees' ? 'number' : 'text'} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />}</td>)}
                  <td className="num nowrap"><Btn small kind="primary" disabled={!valid} onClick={() => { onAdd({ id: uid('x'), ...draft }); setDraft(null); }}>Save</Btn><button className="icon-btn" aria-label="Cancel" onClick={() => setDraft(null)}><Icon name="x" size={14} /></button></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// ---------------- Discovery ----------------
export function DiscoveryWS({ p, w, ro }) {
  const { s, me, go } = useStore();
  const W = useWave(p, w);
  const d = w.discovery;
  const lock = ro || !can(me, p, 'edit');
  const [plan, setPlan] = useState({ exclusions: d.exclusions, plan: d.plan, cost: d.cost });
  const [report, setReport] = useState(false);
  const reqs = reqsOf(s, w.id);
  const dirty = plan.exclusions !== d.exclusions || plan.plan !== d.plan || +plan.cost !== +d.cost;
  const addTo = (k, label) => (row) => W((x) => { x.discovery[k].push(row); }, `Discovery: ${label} added`, Object.values(row).slice(1).join(', '));
  const rm = (k, label) => (i) => W((x) => { x.discovery[k].splice(i, 1); }, `Discovery: ${label} removed`);

  return (
    <div className="stack">
      <div className="grid-4 mini-cards">
        <button className="mini" onClick={() => go({ page: 'project', projectId: p.id, waveId: w.id, tab: 'requirements' })}><strong>{reqs.length}</strong><span>Requirements, {reqs.filter((r) => r.status === 'approved').length} approved</span></button>
        <div className="mini"><strong>{d.systems.length}</strong><span>Source systems</span></div>
        <div className="mini"><strong>{d.dataFindings.length}</strong><span>Data findings</span></div>
        <div className="mini"><strong>{d.cost ? money(d.cost) : '–'}</strong><span>Agreed cost</span></div>
      </div>
      <ListEditor title="Stakeholders" sub="Who sets goals, confirms requirements and owns the data" ro={lock} rows={d.stakeholders} cols={[['name', 'Name'], ['role', 'Role'], ['org', 'Organisation']]} onAdd={addTo('stakeholders', 'stakeholder')} onRemove={rm('stakeholders', 'stakeholder')} empty="No stakeholders yet" />
      <ListEditor title="Workshops" sub="Requirements and success-measure workshops" ro={lock} rows={d.workshops || []} cols={[['title', 'Workshop'], ['date', 'Date', true, null, (v) => fmtDate(v)]]} onAdd={addTo('workshops', 'workshop')} onRemove={rm('workshops', 'workshop')} empty="No workshops scheduled" />
      <ListEditor title="Systems, access and constraints" sub="Confirmed with client IT" ro={lock} rows={d.systems} cols={[['name', 'System'], ['owner', 'Owner'], ['access', 'Access', true, ['Requested', 'Sandbox only', 'Read-only API', 'Granted', 'Refused']]]} onAdd={addTo('systems', 'system')} onRemove={rm('systems', 'system')} empty="No systems logged" />
      <ListEditor title="Data profile and gaps" sub="What exists, its quality, sensitivity and owner" ro={lock} rows={d.dataFindings} cols={[['dataset', 'Data set'], ['finding', 'Finding'], ['severity', 'Severity', true, ['Low', 'Medium', 'High']]]} onAdd={addTo('dataFindings', 'data finding')} onRemove={rm('dataFindings', 'data finding')} empty="No data findings logged" />
      <Panel title="Plan, scope and cost" sub="Agreed before anyone commits to a design or a price" actions={<Btn small icon="file" onClick={() => setReport(true)}>View discovery report</Btn>}>
        <div className="form-grid">
          <Field label="Out of scope" wide><textarea rows="2" disabled={lock} value={plan.exclusions} onChange={(e) => setPlan({ ...plan, exclusions: e.target.value })} /></Field>
          <Field label="Waves, order and team" wide><textarea rows="2" disabled={lock} value={plan.plan} onChange={(e) => setPlan({ ...plan, plan: e.target.value })} /></Field>
          <Field label="Estimated cost (£)"><input type="number" disabled={lock} value={plan.cost} onChange={(e) => setPlan({ ...plan, cost: e.target.value })} /></Field>
          {!lock && <div className="field align-end"><Btn kind="primary" disabled={!dirty} onClick={() => W((x) => Object.assign(x.discovery, { exclusions: plan.exclusions, plan: plan.plan, cost: +plan.cost }), 'Discovery plan updated', `Cost £${fmt(plan.cost)}`)}>Save plan</Btn></div>}
        </div>
      </Panel>
      {report && <DiscoveryReport p={p} w={w} onClose={() => setReport(false)} />}
    </div>
  );
}

function DiscoveryReport({ p, w, onClose }) {
  const { s } = useStore();
  const d = w.discovery;
  const reqs = reqsOf(s, w.id);
  const so = signoff(s, w.id, 'discovery.report');
  return (
    <Modal wide title="Discovery report and delivery plan" onClose={onClose}>
      <article className="doc">
        <p className="doc-k">Generated from project records, {fmtDate(new Date())}</p>
        <h2>{p.name}</h2>
        <p>{clientName(s, p)}. Prepared by Business Technique Limited.</p>
        <h3>Business objective</h3><p>{p.objective}</p>
        <h3>Requirements</h3>
        {reqs.length ? <ol>{reqs.map((r) => <li key={r.id}>{r.code}: {r.title} <em>({r.status === 'approved' ? 'approved' : 'draft'})</em></li>)}</ol> : <p><em>None recorded.</em></p>}
        <h3>Systems</h3>{d.systems.length ? <ul>{d.systems.map((x, i) => <li key={i}>{x.name}, owned by {x.owner}. Access: {x.access.toLowerCase()}.</li>)}</ul> : <p><em>None recorded.</em></p>}
        <h3>Data findings</h3>{d.dataFindings.length ? <ul>{d.dataFindings.map((x, i) => <li key={i}>{x.dataset}: {x.finding} ({x.severity.toLowerCase()})</li>)}</ul> : <p><em>None recorded.</em></p>}
        <h3>Out of scope</h3><p>{d.exclusions || <em>Not recorded.</em>}</p>
        <h3>Plan and cost</h3><p>{d.plan || <em>Not recorded.</em>} {d.cost ? `Estimated cost £${fmt(d.cost)}.` : ''}</p>
        <h3>Approval</h3><p>{so ? `Signed by ${userName(s, so.userId)} on ${fmtTime(so.at)}.` : 'Not yet signed by the client sponsor.'}</p>
      </article>
    </Modal>
  );
}

// ---------------- Design ----------------
export function DesignWS({ p, w, ro }) {
  const { s, me } = useStore();
  const W = useWave(p, w);
  const lock = ro || !can(me, p, 'edit');
  const areas = DESIGN_AREAS.filter(([k]) => k !== 'ai' || isAI(p));
  const [edit, setEdit] = useState(null);
  const [newComp, setNewComp] = useState({ layer: ARCH_LAYERS[0][0], name: '' });
  const [drag, setDrag] = useState(null);
  const comps = w.design.components || [];

  return (
    <div className="stack">
      {p.kind === 'internal' && <div className="note">The platform already exists, so each section records a fit check against the current architecture and any gap decisions.</div>}
      <div className="design-grid">
        {areas.map(([k, label, desc]) => {
          const a = w.design.areas[k] || { status: 'draft', notes: '' };
          return (
            <div key={k} className={'dcard' + (a.status === 'complete' ? ' complete' : '')}>
              <div className="dcard-h"><strong>{label}</strong><Pill tone={a.status === 'complete' ? 'green' : 'neutral'}>{a.status === 'complete' ? 'Complete' : 'Draft'}</Pill></div>
              <p className="small muted">{desc}</p>
              {a.notes && <p className="small">{a.notes}</p>}
              {a.by && <p className="small muted">{a.status === 'complete' ? 'Completed' : 'Updated'} by {userName(s, a.by)}, {fmtDate(a.at)}</p>}
              {!lock && <Btn small onClick={() => setEdit({ k, label, status: a.status, notes: a.notes || '' })}>Edit section</Btn>}
            </div>
          );
        })}
        {!isAI(p) && <div className="dcard muted-card"><strong>AI and model design</strong><p className="small muted">Not required: this project is not classified as AI or ML.</p></div>}
      </div>

      <Panel title="Reference architecture" sub={lock ? 'Components by layer' : 'Add components and drag them between layers'}>
        <div className="arch">
          {ARCH_LAYERS.map(([layer, desc]) => (
            <div key={layer} className={'arch-l' + (drag ? ' drop' : '')} onDragOver={(e) => !lock && e.preventDefault()} onDrop={() => { if (drag && !lock) W((x) => { x.design.components.find((c) => c.id === drag).layer = layer; }, 'Architecture component moved', layer); setDrag(null); }}>
              <div className="arch-n"><strong>{layer}</strong><span className="small muted">{desc}</span></div>
              <div className="arch-c">
                {comps.filter((c) => c.layer === layer).map((c) => (
                  <span key={c.id} className="comp" draggable={!lock} onDragStart={() => setDrag(c.id)} onDragEnd={() => setDrag(null)}>
                    {c.name}
                    {!lock && <button aria-label={`Remove ${c.name}`} onClick={() => W((x) => { x.design.components = x.design.components.filter((y) => y.id !== c.id); }, 'Architecture component removed', c.name)}><Icon name="x" size={12} /></button>}
                  </span>
                ))}
                {comps.filter((c) => c.layer === layer).length === 0 && <span className="small muted">No components</span>}
              </div>
            </div>
          ))}
        </div>
        {!lock && (
          <div className="inline-add">
            <select value={newComp.layer} onChange={(e) => setNewComp({ ...newComp, layer: e.target.value })} aria-label="Layer">{ARCH_LAYERS.map(([l]) => <option key={l}>{l}</option>)}</select>
            <input value={newComp.name} placeholder="Component name, for example Referral API" onChange={(e) => setNewComp({ ...newComp, name: e.target.value })} aria-label="Component name" />
            <Btn icon="plus" disabled={!newComp.name.trim()} onClick={() => { W((x) => { x.design.components = [...(x.design.components || []), { id: uid('c'), layer: newComp.layer, name: newComp.name.trim() }]; }, 'Architecture component added', `${newComp.name} in ${newComp.layer}`); setNewComp({ ...newComp, name: '' }); }}>Add component</Btn>
          </div>
        )}
      </Panel>

      {edit && (
        <Modal title={edit.label} onClose={() => setEdit(null)} footer={<><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn kind="primary" disabled={edit.status === 'complete' && !edit.notes.trim()} onClick={() => { W((x) => { x.design.areas[edit.k] = { status: edit.status, notes: edit.notes, by: me.id, at: nowISO() }; }, `Design section ${edit.status === 'complete' ? 'completed' : 'updated'}`, edit.label); setEdit(null); }}>Save section</Btn></>}>
          <Field label="Design notes and decisions" hint={edit.status === 'complete' ? 'A completed section needs a summary of its decisions.' : ''}><textarea rows="5" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
          <label className="checkline"><input type="checkbox" checked={edit.status === 'complete'} onChange={(e) => setEdit({ ...edit, status: e.target.checked ? 'complete' : 'draft' })} />This section is complete and ready for sign-off.</label>
        </Modal>
      )}
    </div>
  );
}

// ---------------- Deploy ----------------
export function DeployWS({ p, w, ro }) {
  const { s, me, toast } = useStore();
  const W = useWave(p, w);
  const lock = ro || !can(me, p, 'deploy');
  const dp = w.deploy;
  const [meta, setMeta] = useState({ version: dp.version, window: dp.window });
  const preOk = DEPLOY_PREREQS.every(([k]) => dp.prereqs[k]);
  const signsOk = signoffSpecs(p, 'deploy').every(([k]) => signoff(s, w.id, k));

  function stepBlock(i) {
    const [k] = DEPLOY_STEPS[i];
    if (dp.steps[k]) return null;
    if (i > 0 && !dp.steps[DEPLOY_STEPS[i - 1][0]]) return `Complete ${DEPLOY_STEPS[i - 1][1].toLowerCase()} first`;
    if (k === 'readiness' && !preOk) return 'Every item in "In place before go-live" must be confirmed';
    if (k === 'gonogo' && !signsOk) return 'Technical readiness and go-live approval must be signed';
    if (k === 'cutover' && !dp.version) return 'Record the release version first';
    return null;
  }

  return (
    <div className="stack">
      <Panel title="Release" sub="One controlled release per wave">
        <div className="form-grid">
          <Field label="Release version"><input disabled={lock} value={meta.version} onChange={(e) => setMeta({ ...meta, version: e.target.value })} placeholder="2.0.0" /></Field>
          <Field label="Deployment window"><input disabled={lock} type="date" value={meta.window} onChange={(e) => setMeta({ ...meta, window: e.target.value })} /></Field>
          {!lock && <div className="field align-end"><Btn kind="primary" disabled={meta.version === dp.version && meta.window === dp.window} onClick={() => W((x) => Object.assign(x.deploy, meta), 'Release details updated', `Version ${meta.version}, window ${meta.window}`)}>Save release</Btn></div>}
        </div>
      </Panel>
      <Panel title="In place before go-live" sub="Each item is confirmed by a named person">
        <ul className="prereqs">
          {DEPLOY_PREREQS.map(([k, label, desc]) => {
            const r = dp.prereqs[k];
            return (
              <li key={k} className={r ? 'ok' : ''}>
                <span className="check-i">{r && <Icon name="check" size={14} />}</span>
                <div><strong>{label}</strong><span className="small muted">{r ? `Confirmed by ${userName(s, r.by)}, ${fmtTime(r.at)}` : desc}</span></div>
                {!r && !lock && <Btn small onClick={() => W((x) => { x.deploy.prereqs[k] = { by: me.id, at: nowISO() }; }, 'Go-live prerequisite confirmed', label)}>Confirm</Btn>}
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel title="Go-live sequence" sub="Each step is recorded in order with a timestamp">
        <ol className="seq">
          {DEPLOY_STEPS.map(([k, label, desc], i) => {
            const r = dp.steps[k];
            const b = stepBlock(i);
            const nextUp = !r && (i === 0 || dp.steps[DEPLOY_STEPS[i - 1][0]]);
            return (
              <li key={k} className={r ? 'done' : nextUp ? 'next' : ''}>
                <span className="seq-n">{r ? <Icon name="check" size={14} /> : i + 1}</span>
                <div className="seq-t"><strong>{label}</strong><span className="small muted">{r ? `${userName(s, r.by)}, ${fmtTime(r.at)}` : desc}</span>{nextUp && b && <span className="small warn-text">{b}</span>}</div>
                {nextUp && !lock && <Btn small kind="primary" disabled={!!b} onClick={() => { W((x) => { x.deploy.steps[k] = { by: me.id, at: nowISO() }; }, `Deploy: ${label} recorded`, `Version ${dp.version}`); toast(`${label} recorded`); }}>Record {label.toLowerCase()}</Btn>}
              </li>
            );
          })}
        </ol>
      </Panel>
    </div>
  );
}

// ---------------- Adopt ----------------
export function AdoptWS({ p, w, ro }) {
  const { s, me } = useStore();
  const W = useWave(p, w);
  const { update } = useStore();
  const lock = ro || !can(me, p, 'edit');
  const ms = metricsOf(s, w.id);
  const [m, setM] = useState(null);
  const [imp, setImp] = useState('');
  const [rem, setRem] = useState(w.adopt.remediation || '');

  function saveMetric() {
    update((st) => {
      if (m.id) Object.assign(st.metrics.find((x) => x.id === m.id), m);
      else st.metrics.push({ ...m, id: uid('m'), waveId: w.id });
    }, { action: m.id ? 'Measure updated' : 'Measure added', detail: `${m.name}: ${m.actual !== '' ? m.actual + ' ' + m.unit : 'not yet measured'}${m.source ? ` (source: ${m.source})` : ''}`, projectId: p.id });
    setM(null);
  }

  return (
    <div className="stack">
      <ol className="loop">{VALUE_LOOP.map(([t, when, d]) => <li key={t}><strong>{t}</strong><span className="small">{when}</span><span className="small muted">{d}</span></li>)}</ol>
      <Panel title="Adoption and value against the baseline" sub="A result counts only when its source evidence is recorded" pad={false} actions={!lock && <Btn small icon="plus" onClick={() => setM({ kind: 'adoption', name: '', unit: '', baseline: '', target: '', actual: '', higherBetter: true, source: '' })}>Add measure</Btn>}>
        {ms.length === 0 ? <Empty icon="chart" title="No measures defined">Add the adoption and value measures agreed in Design.</Empty> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Measure</th><th className="num">Baseline</th><th className="num">Target</th><th className="num">Actual</th><th>Status</th><th>Source evidence</th><th /></tr></thead>
              <tbody>
                {ms.map((x) => {
                  const ev = x.actual !== '' && x.source.trim();
                  return (
                    <tr key={x.id}>
                      <td><strong>{x.name}</strong><div className="muted small">{x.kind === 'adoption' ? 'Adoption' : 'Value'}, {x.higherBetter ? 'higher is better' : 'lower is better'}</div></td>
                      <td className="num">{x.baseline}{x.unit && ' ' + x.unit}</td>
                      <td className="num">{x.target}{x.unit && ' ' + x.unit}</td>
                      <td className="num">{x.actual !== '' ? x.actual + (x.unit ? ' ' + x.unit : '') : '–'}</td>
                      <td>{!ev ? <Pill>Not evidenced</Pill> : metTarget(x) ? <Pill tone="green">On target</Pill> : <Pill tone="amber">Below target</Pill>}</td>
                      <td className="small">{x.source || <span className="muted">None</span>}</td>
                      <td>{!lock && <button className="icon-btn" aria-label={`Edit ${x.name}`} onClick={() => setM({ ...x })}><Icon name="edit" size={14} /></button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <div className="grid-2">
        <ListEditor title="Training and knowledge transfer" ro={lock} rows={w.adopt.training} cols={[['title', 'Session'], ['date', 'Date', true, null, (v) => fmtDate(v)], ['attendees', 'Attendees']]} onAdd={(r) => W((x) => { x.adopt.training.push(r); }, 'Training session recorded', r.title)} onRemove={(i) => W((x) => { x.adopt.training.splice(i, 1); }, 'Training session removed')} empty="No sessions recorded" />
        <Panel title="Improvement backlog" sub="Feeds the next wave">
          <ul className="plain">{(w.adopt.improvements || []).map((t, i) => <li key={i}><span>{t}</span>{!lock && <button className="icon-btn" aria-label="Remove" onClick={() => W((x) => { x.adopt.improvements.splice(i, 1); }, 'Improvement removed', t)}><Icon name="trash" size={14} /></button>}</li>)}</ul>
          {(w.adopt.improvements || []).length === 0 && <p className="muted small">No improvements logged.</p>}
          {!lock && <div className="inline-add"><input value={imp} onChange={(e) => setImp(e.target.value)} placeholder="User request or fix for the next wave" aria-label="Improvement" /><Btn icon="plus" disabled={!imp.trim()} onClick={() => { W((x) => { x.adopt.improvements = [...(x.adopt.improvements || []), imp.trim()]; }, 'Improvement logged', imp); setImp(''); }}>Add</Btn></div>}
        </Panel>
      </div>
      <Panel title="Plan to close the gap" sub="Required when targets are not yet met; the business owner can accept it instead of the targets">
        <textarea rows="3" disabled={lock} value={rem} onChange={(e) => setRem(e.target.value)} aria-label="Remediation plan" />
        {!lock && <div className="row-end"><Btn disabled={rem === (w.adopt.remediation || '')} onClick={() => W((x) => { x.adopt.remediation = rem; }, 'Adoption gap plan updated')}>Save plan</Btn></div>}
      </Panel>
      {m && (
        <Modal title={m.id ? `Edit ${m.name}` : 'Add measure'} onClose={() => setM(null)} footer={<><Btn onClick={() => setM(null)}>Cancel</Btn><Btn kind="primary" disabled={!m.name.trim() || (m.actual !== '' && !m.source.trim())} onClick={saveMetric}>Save measure</Btn></>}>
          <div className="form-grid">
            <Field label="Measure" wide><input value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} /></Field>
            <Field label="Kind"><select value={m.kind} onChange={(e) => setM({ ...m, kind: e.target.value })}><option value="adoption">Adoption</option><option value="value">Value</option></select></Field>
            <Field label="Unit"><input value={m.unit} onChange={(e) => setM({ ...m, unit: e.target.value })} placeholder="%, min, users" /></Field>
            <Field label="Baseline"><input type="number" value={m.baseline} onChange={(e) => setM({ ...m, baseline: e.target.value })} /></Field>
            <Field label="Target"><input type="number" value={m.target} onChange={(e) => setM({ ...m, target: e.target.value })} /></Field>
            <Field label="Actual"><input type="number" value={m.actual} onChange={(e) => setM({ ...m, actual: e.target.value === '' ? '' : e.target.value })} /></Field>
            <Field label="Direction"><select value={m.higherBetter ? 'up' : 'down'} onChange={(e) => setM({ ...m, higherBetter: e.target.value === 'up' })}><option value="up">Higher is better</option><option value="down">Lower is better</option></select></Field>
            <Field label="Source evidence" wide error={m.actual !== '' && !m.source.trim() ? 'An actual result needs its source evidence.' : null}><input value={m.source} onChange={(e) => setM({ ...m, source: e.target.value })} placeholder="Report, export or study the figure comes from" /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
