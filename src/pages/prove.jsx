import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { Panel, Pill, Icon, Btn, Empty, Modal, Field, Avatar, Tabs } from '../ui.jsx';
import { TEST_LAYERS, SEVERITIES } from '../methodology.js';
import { can, uid, nowISO, userName, fmtDate, fmtTime, reqsOf, testsOf, defectsOf, itemsOf, isAI, isClientUser, byId } from '../engine.js';
import { useWave } from './phases.jsx';

export function ProveWS({ p, w, ro }) {
  const { s, me, route, go, update, toast } = useStore();
  const tab = route.tab === 'defects' ? 'defects' : 'tests';
  const lock = ro || !can(me, p, 'edit');
  const tests = testsOf(s, w.id);
  const defects = defectsOf(s, w.id);
  const reqs = reqsOf(s, w.id);
  const items = itemsOf(s, w.id);
  const W = useWave(p, w);
  const layers = TEST_LAYERS.filter(([k]) => k !== 'model' || isAI(p));
  const [layer, setLayer] = useState('all');
  const [tform, setTform] = useState(null);
  const [run, setRun] = useState(null);
  const [dform, setDform] = useState(null);
  const [model, setModel] = useState(null);
  const act = (fn, action, detail) => update(fn, { action, detail, projectId: p.id });
  const builderOf = (reqId) => items.filter((i) => i.reqId === reqId).map((i) => i.owner);

  function recordRun() {
    const t = run.t;
    if (t.layer !== 'uat' && builderOf(t.reqId).includes(me.id)) { toast('Testers are not the people who built it. Ask someone who did not build this requirement to run the test.', 'err'); return; }
    act((st) => { Object.assign(st.tests.find((x) => x.id === t.id), { status: run.status, actual: run.actual, evidence: run.evidence, tester: me.id, runAt: nowISO() }); }, `Test ${run.status === 'Pass' ? 'passed' : 'failed'}`, `${t.title}${run.evidence ? `. Evidence: ${run.evidence}` : ''}`);
    if (run.status === 'Fail') setDform({ title: `${t.title}: ${run.actual}`, severity: 'High', owner: builderOf(t.reqId)[0] || '', testId: t.id });
    setRun(null);
  }

  function saveDefect() {
    act((st) => { st.defects.push({ id: uid('d'), waveId: w.id, code: `DEF-${String(200 + st.defects.length)}`, title: dform.title, severity: dform.severity, status: 'Open', owner: dform.owner, raisedBy: me.id, testId: dform.testId || null, at: nowISO(), history: [{ at: nowISO(), by: me.id, text: 'Raised' }] }); }, 'Defect raised', `${dform.severity}: ${dform.title}`);
    setDform(null);
    go({ ...route, tab: 'defects' });
  }

  function defectStep(d, to) {
    if (to === 'Closed' && d.history.some((h) => h.by === me.id && h.text === 'Fixed')) { toast('The person who fixed a defect cannot close it. A tester must retest it.', 'err'); return; }
    act((st) => { const x = st.defects.find((y) => y.id === d.id); x.status = to; x.history.push({ at: nowISO(), by: me.id, text: to === 'Fixed' ? 'Fixed' : to === 'Closed' ? 'Retested and closed' : 'Retest failed, reopened' }); }, `Defect ${to.toLowerCase()}`, `${d.code} ${d.title}`);
  }

  const m = w.prove.model;
  return (
    <div className="stack">
      <div className="layers">
        {layers.map(([k, l, d]) => {
          const ts = tests.filter((t) => t.layer === k);
          const pass = ts.filter((t) => t.status === 'Pass').length, fail = ts.filter((t) => t.status === 'Fail').length;
          return (
            <button key={k} className={'layer' + (layer === k ? ' on' : '') + (fail ? ' has-fail' : ts.length && pass === ts.length ? ' all-pass' : '')} onClick={() => { setLayer(layer === k ? 'all' : k); go({ ...route, tab: undefined }); }} aria-pressed={layer === k}>
              <strong>{l}</strong>
              <span className="small muted">{d}</span>
              <span className="layer-n">{ts.length ? `${pass}/${ts.length} pass${fail ? `, ${fail} fail` : ''}` : 'No tests'}</span>
            </button>
          );
        })}
      </div>

      {isAI(p) && (
        <Panel title="Model accuracy against the agreed baseline" sub="A score counts only when compared with the target approved in Design" actions={!lock && <Btn small icon="edit" onClick={() => setModel({ ...m })}>Record result</Btn>}>
          <div className="acc">
            <div><span className="muted small">Measure</span><strong>{m.name}</strong></div>
            <div><span className="muted small">Baseline</span><strong>{m.baseline !== '' ? m.baseline + m.unit : '–'}</strong></div>
            <div><span className="muted small">Target</span><strong>{m.target !== '' ? m.target + m.unit : 'Not set'}</strong></div>
            <div><span className="muted small">Back-test result</span><strong>{m.actual !== '' ? m.actual + m.unit : 'Not run'}</strong></div>
            <div>{m.actual === '' || m.target === '' ? <Pill>Not assessed</Pill> : (m.higherBetter ? +m.actual >= +m.target : +m.actual <= +m.target) ? <Pill tone="green">Meets target</Pill> : <Pill tone="red">Below target</Pill>}</div>
          </div>
          {m.source && <p className="small muted">Evidence: {m.source}</p>}
        </Panel>
      )}

      <Tabs value={tab} onChange={(t) => go({ ...route, tab: t === 'tests' ? undefined : t })} tabs={[['tests', 'Test cases', tests.length], ['defects', 'Defect register', defects.filter((d) => d.status !== 'Closed').length]]} />

      {tab === 'tests' && (
        <Panel pad={false} title={layer === 'all' ? 'All test cases' : `${TEST_LAYERS.find((x) => x[0] === layer)[1]} tests`} sub="Every result is traced to a requirement" actions={!lock && <Btn small kind="primary" icon="plus" disabled={!reqs.length} onClick={() => setTform({ reqId: reqs[0].id, layer: layer === 'all' ? 'functional' : layer, title: '', expected: reqs[0].criteria })}>Add test case</Btn>}>
          {tests.filter((t) => layer === 'all' || t.layer === layer).length === 0 ? <Empty title="No test cases">Add test cases from the test plan, linked to requirements.</Empty> : (
            <div className="table-wrap"><table className="tbl">
              <thead><tr><th>Test</th><th>Requirement</th><th>Layer</th><th>Result</th><th>Tester</th><th>Evidence</th><th /></tr></thead>
              <tbody>
                {tests.filter((t) => layer === 'all' || t.layer === layer).map((t) => {
                  const r = byId(s.requirements, t.reqId);
                  const conflict = t.tester && t.layer !== 'uat' && builderOf(t.reqId).includes(t.tester) && t.status !== 'Not run';
                  const canRun = (t.layer === 'uat' ? can(me, p, 'uat') : !isClientUser(me) && can(me, p, 'edit')) && !ro;
                  return (
                    <tr key={t.id}>
                      <td><strong>{t.title}</strong><div className="muted small">Expected: {t.expected}</div>{t.actual && <div className="small">Actual: {t.actual}</div>}</td>
                      <td className="small">{r ? r.code : '–'}</td>
                      <td className="small">{(TEST_LAYERS.find((x) => x[0] === t.layer) || [, t.layer])[1]}</td>
                      <td><Pill tone={t.status === 'Pass' ? 'green' : t.status === 'Fail' ? 'red' : 'neutral'}>{t.status}</Pill></td>
                      <td className="small">{t.tester ? <>{userName(s, t.tester)}{t.runAt && <div className="muted">{fmtDate(t.runAt)}</div>}{conflict && <div className="err-text">Run by the builder</div>}</> : '–'}</td>
                      <td className="small">{t.evidence || <span className="muted">None</span>}</td>
                      <td>{canRun && <Btn small onClick={() => setRun({ t, status: 'Pass', actual: '', evidence: '' })}>{t.status === 'Not run' ? 'Run' : 'Re-run'}</Btn>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </Panel>
      )}

      {tab === 'defects' && (
        <Panel pad={false} title="Defect register" sub="Critical and high defects are fixed before go-live" actions={!lock && <Btn small kind="primary" icon="plus" onClick={() => setDform({ title: '', severity: 'Medium', owner: '', testId: null })}>Raise defect</Btn>}>
          {defects.length === 0 ? <Empty icon="bug" title="No defects raised" /> : (
            <div className="table-wrap"><table className="tbl">
              <thead><tr><th>Defect</th><th>Severity</th><th>Status</th><th>Owner</th><th>History</th><th /></tr></thead>
              <tbody>{[...defects].sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity)).map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.code}</strong> {d.title}<div className="muted small">Raised by {userName(s, d.raisedBy)}, {fmtDate(d.at)}</div></td>
                  <td><Pill tone={d.severity === 'Critical' || d.severity === 'High' ? 'red' : d.severity === 'Medium' ? 'amber' : 'neutral'}>{d.severity}</Pill></td>
                  <td><Pill tone={d.status === 'Closed' ? 'green' : d.status === 'Fixed' ? 'teal' : 'amber'}>{d.status === 'Fixed' ? 'Fixed, awaiting retest' : d.status}</Pill></td>
                  <td>{d.owner ? <Avatar s={s} id={d.owner} size={22} showName /> : <span className="muted small">Unassigned</span>}</td>
                  <td className="small">{d.history.slice(-2).map((h, i) => <div key={i}>{h.text} by {userName(s, h.by)}, {fmtDate(h.at)}</div>)}</td>
                  <td className="nowrap">{!lock && d.status === 'Open' && <Btn small onClick={() => defectStep(d, 'Fixed')}>Mark fixed</Btn>}{!lock && d.status === 'Fixed' && <><Btn small kind="primary" onClick={() => defectStep(d, 'Closed')}>Retest passed</Btn><Btn small onClick={() => defectStep(d, 'Open')}>Retest failed</Btn></>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Panel>
      )}

      {tform && (
        <Modal title="Add test case" onClose={() => setTform(null)} footer={<><Btn onClick={() => setTform(null)}>Cancel</Btn><Btn kind="primary" disabled={!tform.title.trim()} onClick={() => { act((st) => { st.tests.push({ id: uid('t'), waveId: w.id, ...tform, actual: '', status: 'Not run', tester: null, runAt: null, evidence: '' }); }, 'Test case added', tform.title); setTform(null); }}>Save test case</Btn></>}>
          <div className="form-grid">
            <Field label="Test case" wide><input value={tform.title} onChange={(e) => setTform({ ...tform, title: e.target.value })} /></Field>
            <Field label="Requirement"><select value={tform.reqId} onChange={(e) => setTform({ ...tform, reqId: e.target.value, expected: (byId(s.requirements, e.target.value) || {}).criteria || '' })}>{reqs.map((r) => <option key={r.id} value={r.id}>{r.code} {r.title}</option>)}</select></Field>
            <Field label="Layer"><select value={tform.layer} onChange={(e) => setTform({ ...tform, layer: e.target.value })}>{layers.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Expected result" wide><textarea rows="2" value={tform.expected} onChange={(e) => setTform({ ...tform, expected: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
      {run && (
        <Modal title={`Record result: ${run.t.title}`} onClose={() => setRun(null)} footer={<><Btn onClick={() => setRun(null)}>Cancel</Btn><Btn kind="primary" disabled={!run.actual.trim() || (run.status === 'Pass' && !run.evidence.trim())} onClick={recordRun}>Record {run.status === 'Pass' ? 'pass' : 'fail'}</Btn></>}>
          <p className="small muted">Expected: {run.t.expected}</p>
          <div className="seg seg-sm"><button className={run.status === 'Pass' ? 'on' : ''} onClick={() => setRun({ ...run, status: 'Pass' })}>Pass</button><button className={run.status === 'Fail' ? 'on' : ''} onClick={() => setRun({ ...run, status: 'Fail' })}>Fail</button></div>
          <Field label="Actual result"><textarea rows="2" value={run.actual} onChange={(e) => setRun({ ...run, actual: e.target.value })} /></Field>
          <Field label="Evidence reference" hint={run.status === 'Pass' ? 'A pass needs evidence: test log, screenshot set or signed script.' : 'Optional for a fail. A defect form opens next.'}><input value={run.evidence} onChange={(e) => setRun({ ...run, evidence: e.target.value })} /></Field>
          <p className="small muted">Recorded as run by {me.name}.</p>
        </Modal>
      )}
      {dform && (
        <Modal title="Raise defect" onClose={() => setDform(null)} footer={<><Btn onClick={() => setDform(null)}>Cancel</Btn><Btn kind="primary" disabled={!dform.title.trim()} onClick={saveDefect}>Raise defect</Btn></>}>
          <div className="form-grid">
            <Field label="Defect" wide><input value={dform.title} onChange={(e) => setDform({ ...dform, title: e.target.value })} /></Field>
            <Field label="Severity"><select value={dform.severity} onChange={(e) => setDform({ ...dform, severity: e.target.value })}>{SEVERITIES.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Assign to"><select value={dform.owner} onChange={(e) => setDform({ ...dform, owner: e.target.value })}><option value="">Unassigned</option>{s.users.filter((u) => u.org === 'btl' && u.capacity > 0).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          </div>
        </Modal>
      )}
      {model && (
        <Modal title="Model accuracy result" onClose={() => setModel(null)} footer={<><Btn onClick={() => setModel(null)}>Cancel</Btn><Btn kind="primary" disabled={model.actual !== '' && !model.source.trim()} onClick={() => { W((x) => { x.prove.model = model; }, 'Model accuracy recorded', `${model.name}: ${model.actual}${model.unit} against target ${model.target}${model.unit}`); setModel(null); }}>Save result</Btn></>}>
          <div className="form-grid">
            <Field label="Measure" wide><input value={model.name} onChange={(e) => setModel({ ...model, name: e.target.value })} /></Field>
            <Field label="Baseline"><input type="number" value={model.baseline} onChange={(e) => setModel({ ...model, baseline: e.target.value })} /></Field>
            <Field label="Agreed target"><input type="number" value={model.target} onChange={(e) => setModel({ ...model, target: e.target.value })} /></Field>
            <Field label="Back-test result"><input type="number" value={model.actual} onChange={(e) => setModel({ ...model, actual: e.target.value })} /></Field>
            <Field label="Unit"><input value={model.unit} onChange={(e) => setModel({ ...model, unit: e.target.value })} /></Field>
            <Field label="Evidence (dataset and report)" wide error={model.actual !== '' && !model.source.trim() ? 'A result needs its evidence.' : null}><input value={model.source} onChange={(e) => setModel({ ...model, source: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
