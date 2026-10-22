import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { Panel, Pill, Icon, Btn, Empty, Modal, Field, Avatar, CheckRow } from '../ui.jsx';
import { GATE_DECISIONS, PHASE_META } from '../methodology.js';
import { newWave } from '../seed.js';
import { can, canSign, uid, nowISO, userName, fmtDate, fmtTime, gateState, decisionBlocker, wavesOf, clientName, phasesFor, TODAY, addDays, metricsOf, metTarget, reqsOf } from '../engine.js';
import { useWave } from './phases.jsx';

export function GateWS({ p, w, ro }) {
  const { s, me, go, update, toast } = useStore();
  const W = useWave(p, w);
  const g = gateState(s, p, w);
  const closed = w.status === 'closed';
  const decided = !!w.gate.decision;
  const canEditInputs = !ro && !decided && can(me, p, 'edit');
  const [inputs, setInputs] = useState({ lessons: w.gate.lessons, nextPlan: w.gate.nextPlan });
  const [sign, setSign] = useState(null);
  const [draft, setDraft] = useState({ kind: g.failed.length ? 'conditions' : 'proceed', comment: '', conditions: g.failed.map((f) => ({ text: f.label, owner: '', due: addDays(TODAY, 14) })), riskAccepted: false });
  const [nextW, setNextW] = useState(null);
  const [replan, setReplan] = useState(null);
  const blocker = decisionBlocker(s, p, w, draft.kind, draft);
  const btl = s.users.filter((u) => u.org === 'btl' && u.capacity > 0).concat(s.users.filter((u) => u.org === p.clientId));
  const evidence = s.evidence.filter((e) => e.waveId === w.id);
  const waves = wavesOf(s, p.id);

  function recordApproval() {
    update((st) => { st.waves.find((x) => x.id === w.id).gate.approvals[sign.spec] = { userId: me.id, decision: sign.decision, at: nowISO(), comment: sign.comment }; },
      { action: `Gate ${sign.decision === 'approve' ? 'approval' : 'rejection'} recorded`, detail: `${sign.label}, wave ${w.num}${sign.comment ? `: ${sign.comment}` : ''}`, projectId: p.id });
    toast(sign.decision === 'approve' ? 'Approval recorded' : 'Rejection recorded');
    setSign(null);
  }

  function recordDecision() {
    if (blocker) return;
    const conds = draft.kind === 'conditions' ? draft.conditions.filter((c) => c.text.trim()) : [];
    update((st) => {
      const x = st.waves.find((y) => y.id === w.id);
      x.gate.decision = { kind: draft.kind, by: me.id, at: nowISO(), comment: draft.comment, conditions: conds, riskAccepted: draft.riskAccepted, checklist: g.list.map((c) => ({ label: c.label, ok: c.ok, detail: c.detail })) };
      conds.forEach((c, i) => st.raid.push({ id: uid('r'), projectId: p.id, waveId: w.id, kind: 'Issue', code: `GC-${w.num}.${i + 1}`, title: `Gate condition: ${c.text}`, owner: c.owner, probability: 0, impact: 0, status: 'Open', due: c.due, mitigation: 'Condition of the wave gate decision', history: [] }));
      st.evidence.push({ id: uid('ev'), projectId: p.id, waveId: w.id, phase: 'gate', type: 'Gate Decision Record', title: `Gate decision record, wave ${w.num}`, version: '1.0', owner: me.id, status: 'Approved', at: nowISO(), ref: GATE_DECISIONS[draft.kind].label, file: null });
    }, { action: `Gate decision: ${GATE_DECISIONS[draft.kind].label}`, detail: `Wave ${w.num}. ${draft.comment}${conds.length ? ` Conditions: ${conds.map((c) => `${c.text} (${userName(s, c.owner)}, ${c.due})`).join('; ')}` : ''}`, projectId: p.id });
    toast(`Decision recorded: ${GATE_DECISIONS[draft.kind].label}`);
  }

  function startNext() {
    update((st) => {
      const x = st.waves.find((y) => y.id === w.id);
      x.status = 'closed';
      x.completedPhases = Array.from(new Set([...x.completedPhases, 'gate']));
      const nw = newWave({ projectId: p.id, num: w.num + 1, name: nextW.name, scope: nextW.scope, phase: 'design', milestone: nextW.milestone, effort: +nextW.effort });
      st.waves.push(nw);
      (x.adopt.improvements || []).forEach((t, i) => st.workItems.push({ id: uid('wi'), waveId: nw.id, sprintId: null, code: `${p.code.split('-')[0]}-${300 + st.workItems.length}`, title: t, status: 'Backlog', owner: '', priority: 'Medium', estimate: 3, reqId: '', dod: { built: false, reviewed: false, meetsDesign: false }, pr: '', blocked: false, blockReason: '', notes: `Carried from wave ${w.num} improvement backlog` }));
      if (st.projects.find((y) => y.id === p.id).plannedWaves < w.num + 1) st.projects.find((y) => y.id === p.id).plannedWaves = w.num + 1;
    }, { action: `Wave ${w.num + 1} started`, detail: `Authorised by the wave ${w.num} gate decision (${GATE_DECISIONS[w.gate.decision.kind].label}). Starts at Design.`, projectId: p.id });
    toast(`Wave ${w.num + 1} started at Design`);
    setNextW(null);
    go({ page: 'project', projectId: p.id });
  }

  function closeProject() {
    update((st) => { const x = st.waves.find((y) => y.id === w.id); x.status = 'closed'; x.completedPhases = Array.from(new Set([...x.completedPhases, 'gate'])); }, { action: `Wave ${w.num} closed`, detail: 'Final wave closed after gate decision', projectId: p.id });
    toast(`Wave ${w.num} closed`);
  }

  function doReplan() {
    update((st) => {
      const x = st.waves.find((y) => y.id === w.id);
      x.gate.history = [...(x.gate.history || []), { ...x.gate.decision, approvals: x.gate.approvals }];
      x.gate.decision = null; x.gate.approvals = {}; x.gate.compliance = null;
      x.phase = 'design'; x.status = 'active';
      x.completedPhases = x.completedPhases.filter((ph) => ph === 'discovery');
      x.phaseLog.push({ phase: 'design', at: nowISO(), by: me.id, note: 'Re-plan after stop decision' });
      x.scope = replan.scope;
    }, { action: `Wave ${w.num} re-planned`, detail: `Returned to Design after a stop decision. Revised scope: ${replan.scope}`, projectId: p.id });
    toast(`Wave ${w.num} returned to Design with a revised plan`);
    setReplan(null);
  }

  return (
    <div className="stack">
      <div className="gate-head">
        <div>
          <h3>Gate review board, wave {w.num}</h3>
          <p className="muted small">The checklist updates from recorded evidence. Approvers sign as themselves; the decision is recorded by the delivery lead or accountable partner.</p>
        </div>
        <div className="gate-score"><strong>{g.passed}</strong><span>of 8 checks met</span></div>
      </div>

      <div className="grid-2">
        <Panel title="The checklist">
          <ul className="checks">{g.list.map((c, i) => <CheckRow key={c.id} label={`${i + 1}. ${c.label}`} ok={c.ok} detail={c.detail} onClick={!decided && c.phase !== 'gate' ? () => go({ page: 'project', projectId: p.id, waveId: w.id, phase: c.phase }) : null} />)}</ul>
        </Panel>
        <Panel title="Evidence collected this wave" sub={`${evidence.length} records in the evidence vault`} actions={<Btn small kind="ghost" onClick={() => go({ page: 'vault', projectId: p.id })}>Open vault</Btn>}>
          {evidence.length === 0 ? <Empty icon="file" title="No evidence recorded" /> : (
            <ul className="evlist">{evidence.slice(0, 10).map((e) => <li key={e.id}><Icon name="file" size={14} /><span>{e.title}<span className="muted small"> {PHASE_META[e.phase] ? PHASE_META[e.phase].label : e.phase}, v{e.version}</span></span><Pill tone={e.status === 'Approved' ? 'green' : 'amber'}>{e.status}</Pill></li>)}</ul>
          )}
        </Panel>
      </div>

      <Panel title="Lessons, next-wave plan and compliance">
        <div className="form-grid">
          <Field label="Lessons learned" wide><textarea rows="2" disabled={!canEditInputs} value={inputs.lessons} onChange={(e) => setInputs({ ...inputs, lessons: e.target.value })} /></Field>
          <Field label="Next-wave plan" wide hint={`${(w.adopt.improvements || []).length} improvement items will carry into the next wave backlog.`}><textarea rows="2" disabled={!canEditInputs} value={inputs.nextPlan} onChange={(e) => setInputs({ ...inputs, nextPlan: e.target.value })} /></Field>
        </div>
        <div className="row-between">
          <div className="compliance">
            {w.gate.compliance ? <span className="ok-text small"><Icon name="check" size={14} /> Compliance and security checks confirmed by {userName(s, w.gate.compliance.by)}, {fmtTime(w.gate.compliance.at)}</span>
              : can(me, p, 'compliance') && !decided && !ro ? <Btn small icon="shield" onClick={() => W((x) => { x.gate.compliance = { by: me.id, at: nowISO() }; }, 'Compliance and security confirmed', `Wave ${w.num}`)}>Confirm compliance and security checks passed</Btn>
              : <span className="small muted">Compliance confirmation waits for the test lead or a partner.</span>}
          </div>
          {canEditInputs && <Btn kind="primary" disabled={inputs.lessons === w.gate.lessons && inputs.nextPlan === w.gate.nextPlan} onClick={() => W((x) => Object.assign(x.gate, inputs), 'Gate lessons and plan updated', `Wave ${w.num}`)}>Save lessons and plan</Btn>}
        </div>
      </Panel>

      <Panel title="Who signs" sub={p.kind === 'internal' ? 'Internal delivery: Munir signs the build, Tabs the quality and Rizwan market-readiness. Misbah records the decision.' : 'Business owner, solution architect, test lead, delivery lead and accountable partner.'}>
        <ul className="approvers">
          {g.approvals.map((a) => (
            <li key={a.spec} className={a.a ? (a.a.decision === 'approve' ? 'ok' : 'no') : ''}>
              <Avatar s={s} id={a.userId} size={34} />
              <div>
                <strong>{a.label}</strong>
                <span className="small">{userName(s, a.userId)}</span>
                <span className="small muted">{a.a ? `${a.a.decision === 'approve' ? 'Approved' : 'Rejected'}, ${fmtTime(a.a.at)}` : 'Not yet signed'}</span>
                {a.a && a.a.comment && <span className="small">“{a.a.comment}”</span>}
              </div>
              {!a.a && !decided && !ro && canSign(me, p, a.spec) && <Btn small kind="primary" onClick={() => setSign({ ...a, decision: 'approve', comment: '', confirm: false })}>Review and sign</Btn>}
            </li>
          ))}
        </ul>
      </Panel>

      {!decided && !ro && (
        <Panel title="Record the decision" sub="Three possible decisions. The next wave does not start without one.">
          <div className="decisions">
            {Object.entries(GATE_DECISIONS).map(([k, d]) => (
              <button key={k} className={'decision d-' + k + (draft.kind === k ? ' on' : '')} onClick={() => setDraft({ ...draft, kind: k })} aria-pressed={draft.kind === k}>
                <strong>{d.label}</strong><span className="small">{d.text}</span>
              </button>
            ))}
          </div>
          {draft.kind === 'conditions' && (
            <div className="conds">
              <p className="small muted">Each open item needs an accountable owner and a date. Conditions are added to the risk and change register.</p>
              {draft.conditions.map((c, i) => (
                <div className="cond" key={i}>
                  <input aria-label="Condition" value={c.text} onChange={(e) => { const cs = [...draft.conditions]; cs[i] = { ...c, text: e.target.value }; setDraft({ ...draft, conditions: cs }); }} placeholder="Agreed action" />
                  <select aria-label="Owner" value={c.owner} onChange={(e) => { const cs = [...draft.conditions]; cs[i] = { ...c, owner: e.target.value }; setDraft({ ...draft, conditions: cs }); }}><option value="">Owner</option>{btl.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                  <input aria-label="Due date" type="date" value={c.due} onChange={(e) => { const cs = [...draft.conditions]; cs[i] = { ...c, due: e.target.value }; setDraft({ ...draft, conditions: cs }); }} />
                  <button className="icon-btn" aria-label="Remove condition" onClick={() => setDraft({ ...draft, conditions: draft.conditions.filter((_, j) => j !== i) })}><Icon name="trash" size={14} /></button>
                </div>
              ))}
              <Btn small icon="plus" onClick={() => setDraft({ ...draft, conditions: [...draft.conditions, { text: '', owner: '', due: addDays(TODAY, 14) }] })}>Add condition</Btn>
              <label className="checkline"><input type="checkbox" checked={draft.riskAccepted} onChange={(e) => setDraft({ ...draft, riskAccepted: e.target.checked })} />The accountable partner explicitly accepts the residual risk of the open items.</label>
            </div>
          )}
          <Field label={draft.kind === 'stop' ? 'Why the wave must stop or re-plan' : 'Decision comments'}><textarea rows="2" value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} /></Field>
          <div className="row-between">
            <span className={'small ' + (blocker ? 'warn-text' : 'ok-text')}>{blocker || (can(me, p, 'recordGate') ? 'Ready to record.' : `Only ${userName(s, p.team.deliveryLead)} (delivery lead) or ${userName(s, p.team.partner)} (accountable partner) can record the decision.`)}</span>
            <Btn kind="primary" icon="shield" disabled={!!blocker || !can(me, p, 'recordGate')} onClick={recordDecision}>Record decision</Btn>
          </div>
        </Panel>
      )}

      {decided && <GateRecord p={p} w={w} />}

      {decided && !closed && (
        <Panel title="What happens next">
          {w.gate.decision.kind === 'stop' ? (
            <div className="row-between"><p>The wave is stopped. Agree a revised plan, then return the wave to Design.</p>{can(me, p, 'advance') && <Btn kind="primary" onClick={() => setReplan({ scope: w.scope })}>Re-plan the wave</Btn>}</div>
          ) : (
            <div className="row-between">
              <p>The gate authorises continuation. {waves.length < p.plannedWaves ? `Wave ${w.num + 1} can now start at Design.` : 'This is the last planned wave.'}</p>
              {can(me, p, 'advance') && <div className="row-gap">{waves.length >= p.plannedWaves && <Btn onClick={closeProject}>Close the wave</Btn>}<Btn kind="primary" icon="rocket" onClick={() => setNextW({ name: '', scope: w.gate.nextPlan, milestone: addDays(TODAY, 60), effort: 40 })}>Start wave {w.num + 1}</Btn></div>}
            </div>
          )}
        </Panel>
      )}

      {sign && (
        <Modal title={`${sign.label}: wave ${w.num}`} onClose={() => setSign(null)} footer={<><Btn onClick={() => setSign(null)}>Cancel</Btn><Btn kind={sign.decision === 'approve' ? 'primary' : 'danger'} disabled={!sign.confirm || (sign.decision === 'reject' && !sign.comment.trim())} onClick={recordApproval}>{sign.decision === 'approve' ? 'Record my approval' : 'Record my rejection'}</Btn></>}>
          <p>Signing as <strong>{me.name}</strong>. {g.passed} of 8 checklist items are met{g.failed.length ? `; not met: ${g.failed.map((f) => f.label.toLowerCase()).join(', ')}` : ''}.</p>
          <div className="seg seg-sm"><button className={sign.decision === 'approve' ? 'on' : ''} onClick={() => setSign({ ...sign, decision: 'approve' })}>Approve</button><button className={sign.decision === 'reject' ? 'on' : ''} onClick={() => setSign({ ...sign, decision: 'reject' })}>Reject</button></div>
          <Field label={sign.decision === 'reject' ? 'Reason for rejection (required)' : 'Comment (optional)'}><textarea rows="3" value={sign.comment} onChange={(e) => setSign({ ...sign, comment: e.target.value })} /></Field>
          <label className="checkline"><input type="checkbox" checked={sign.confirm} onChange={(e) => setSign({ ...sign, confirm: e.target.checked })} />I have reviewed the gate evidence and this is my own decision.</label>
        </Modal>
      )}
      {nextW && (
        <Modal title={`Start wave ${w.num + 1}`} onClose={() => setNextW(null)} footer={<><Btn onClick={() => setNextW(null)}>Cancel</Btn><Btn kind="primary" disabled={!nextW.name.trim() || !nextW.scope.trim()} onClick={startNext}>Start wave {w.num + 1}</Btn></>}>
          <p className="small muted">Discovery runs once per project, so the new wave starts at Design. {(w.adopt.improvements || []).length} improvement items move into its backlog.</p>
          <div className="form-grid">
            <Field label="Wave name" wide><input value={nextW.name} onChange={(e) => setNextW({ ...nextW, name: e.target.value })} /></Field>
            <Field label="Scope" wide><textarea rows="3" value={nextW.scope} onChange={(e) => setNextW({ ...nextW, scope: e.target.value })} /></Field>
            <Field label="Milestone"><input type="date" value={nextW.milestone} onChange={(e) => setNextW({ ...nextW, milestone: e.target.value })} /></Field>
            <Field label="Estimated effort (person-days)"><input type="number" value={nextW.effort} onChange={(e) => setNextW({ ...nextW, effort: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
      {replan && (
        <Modal title={`Re-plan wave ${w.num}`} onClose={() => setReplan(null)} footer={<><Btn onClick={() => setReplan(null)}>Cancel</Btn><Btn kind="primary" disabled={!replan.scope.trim()} onClick={doReplan}>Return wave to Design</Btn></>}>
          <p className="small muted">The stop decision is kept in the wave history. Approvals and compliance must be collected again at the next gate.</p>
          <Field label="Revised scope"><textarea rows="4" value={replan.scope} onChange={(e) => setReplan({ ...replan, scope: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}

export function GateRecord({ p, w }) {
  const { s } = useStore();
  const d = w.gate.decision;
  const g = gateState(s, p, w);
  const list = d.checklist || g.list;
  return (
    <article className="doc gate-doc">
      <header className="doc-head">
        <div><p className="doc-k">Gate decision record</p><h2>{p.name}, wave {w.num}</h2><p>{clientName(s, p)}. {w.name}.</p></div>
        <div className={'stamp stamp-' + d.kind}>{GATE_DECISIONS[d.kind].label}</div>
      </header>
      <dl className="review">
        <dt>Recorded by</dt><dd>{userName(s, d.by)}, {fmtTime(d.at)}</dd>
        <dt>Comments</dt><dd>{d.comment || '–'}</dd>
      </dl>
      <h3>Checklist at the time of decision</h3>
      <ol className="doc-checks">{list.map((c, i) => <li key={i} className={c.ok ? 'ok' : 'no'}>{c.ok ? 'Met' : 'Not met'}: {c.label}. <em>{c.detail}</em></li>)}</ol>
      <h3>Approvals</h3>
      <ul>{g.approvals.map((a) => <li key={a.spec}>{a.label}: {userName(s, a.userId)}, {a.a ? `${a.a.decision === 'approve' ? 'approved' : 'rejected'} ${fmtTime(a.a.at)}${a.a.comment ? `, “${a.a.comment}”` : ''}` : 'not signed'}</li>)}</ul>
      {d.conditions && d.conditions.length > 0 && (<><h3>Conditions</h3><ul>{d.conditions.map((c, i) => <li key={i}>{c.text}. Owner {userName(s, c.owner)}, due {fmtDate(c.due)}.</li>)}</ul><p>{d.riskAccepted ? 'Residual risk explicitly accepted by the accountable partner.' : ''}</p></>)}
      <h3>Lessons learned</h3><p>{w.gate.lessons || '–'}</p>
      <h3>Next-wave plan</h3><p>{w.gate.nextPlan || '–'}</p>
      {p.demo && <p className="doc-k">Demonstration record</p>}
    </article>
  );
}
