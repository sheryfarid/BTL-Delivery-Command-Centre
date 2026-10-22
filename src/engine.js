import { PHASES, DESIGN_AREAS, DEPLOY_STEPS, DEPLOY_PREREQS, GATE_SIGNERS_EXTERNAL, GATE_SIGNERS_INTERNAL } from './methodology.js';

export const TODAY = new Date().toISOString().slice(0, 10);
export const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
export const nowISO = () => new Date().toISOString();

// ---------- lookups ----------
export const byId = (list, id) => list.find((x) => x.id === id);
export const userName = (s, id) => (byId(s.users, id) || {}).name || 'Unassigned';
export const clientName = (s, p) => (p.clientId ? (byId(s.clients, p.clientId) || {}).name : 'Business Technique Limited');
export const wavesOf = (s, pid) => s.waves.filter((w) => w.projectId === pid).sort((a, b) => a.num - b.num);
export const activeWave = (s, pid) => {
  const ws = wavesOf(s, pid);
  return ws.find((w) => w.status === 'active' || w.status === 'replan') || ws[ws.length - 1];
};
// Discovery runs once per project, and only for external clients: later waves start at Design.
export const phasesFor = (p, w) => (p.kind === 'external' && (!w || w.num === 1) ? PHASES : PHASES.slice(1));
export const isAI = (p) => p.classes.includes('AI or ML');
export const reqsOf = (s, wid) => s.requirements.filter((r) => r.waveId === wid);
export const testsOf = (s, wid) => s.tests.filter((t) => t.waveId === wid);
export const defectsOf = (s, wid) => s.defects.filter((d) => d.waveId === wid);
export const itemsOf = (s, wid) => s.workItems.filter((i) => i.waveId === wid);
export const sprintsOf = (s, wid) => s.sprints.filter((x) => x.waveId === wid).sort((a, b) => a.num - b.num);
export const metricsOf = (s, wid) => s.metrics.filter((m) => m.waveId === wid);
export const signoff = (s, wid, key) => s.signoffs.find((x) => x.waveId === wid && x.key === key);
export const openDefect = (d) => d.status !== 'Closed';
export const blocking = (d) => openDefect(d) && (d.severity === 'Critical' || d.severity === 'High');

// ---------- permissions ----------
const PARTNERS = ['munir', 'rizwan', 'tabs'];
export const isClientUser = (u) => u && u.org !== 'btl';
export const slotsOf = (p, u) => Object.keys(p.team).filter((k) => p.team[k] === u.id);
export const canView = (u, p) => !isClientUser(u) || p.clientId === u.org;

export function can(u, p, action) {
  if (!u || !p) return false;
  const slots = slotsOf(p, u);
  const admin = u.globalRole === 'admin';
  const btl = !isClientUser(u);
  const onTeam = slots.length > 0 || (p.members || []).includes(u.id) || PARTNERS.includes(u.id) || u.id === 'misbah';
  switch (action) {
    case 'view': return canView(u, p);
    case 'budget': return btl;
    case 'edit': return admin || (btl && onTeam);
    case 'advance': return admin || slots.includes('deliveryLead') || slots.includes('partner');
    case 'recordGate': return slots.includes('deliveryLead') || slots.includes('partner');
    case 'approveReq': return slots.some((x) => ['businessOwner', 'sponsor', 'deliveryLead'].includes(x));
    case 'acceptDemo': return slots.includes('businessOwner');
    case 'uat': return slots.includes('businessOwner') || (btl && onTeam);
    case 'compliance': return slots.includes('qaLead') || slots.includes('partner') || u.id === 'tabs';
    case 'deploy': return admin || slots.some((x) => ['deliveryLead', 'infraLead', 'partner', 'supportLead'].includes(x));
    default: return false;
  }
}

// A sign-off spec is either a team slot ("businessOwner") or a named person ("u:munir").
export const signerId = (p, spec) => (spec.startsWith('u:') ? spec.slice(2) : p.team[spec]);
export const canSign = (u, p, spec) => !!u && signerId(p, spec) === u.id;

export function signoffSpecs(p, phase) {
  const ext = p.kind === 'external';
  const map = {
    discovery: [['discovery.report', 'Discovery report and plan signed', 'sponsor']],
    design: ext
      ? [['design.business', 'Design pack signed by the business owner', 'businessOwner'], ['design.itsec', 'Architecture approved by IT and security', 'architect']]
      : [['design.arch', 'Architecture fit check', 'u:munir'], ['design.testplan', 'Test plan written', 'u:tabs'], ['design.market', 'Wording and market-readiness criteria agreed', 'u:rizwan']],
    prove: [['prove.uat', 'User acceptance testing signed', 'businessOwner']],
    deploy: ext
      ? [['deploy.tech', 'Technical readiness approved', 'architect'], ['deploy.golive', 'Go-live approved by the business owner', 'businessOwner']]
      : [['deploy.tech', 'Technical readiness approved', 'u:munir'], ['deploy.market', 'Market-readiness signed before go-live', 'u:rizwan']],
    adopt: [['adopt.value', 'Value report accepted, or gap plan agreed', 'businessOwner']],
  };
  return map[phase] || [];
}

export const gateSigners = (p) => (p.kind === 'external' ? GATE_SIGNERS_EXTERNAL.map(([k, l, d]) => [k, l, d]) : GATE_SIGNERS_INTERNAL.map(([k, l, d]) => ['u:' + k, l, d]));

// ---------- phase exit checks (the state machine guards) ----------
function signChecks(s, p, w, phase) {
  return signoffSpecs(p, phase).map(([key, label, spec]) => {
    const so = signoff(s, w.id, key);
    return { id: key, label, ok: !!so, detail: so ? `Signed by ${userName(s, so.userId)}` : `Waiting for ${userName(s, signerId(p, spec))}`, tab: 'signoff' };
  });
}

export function exitChecks(s, p, w, phase = w.phase) {
  const reqs = reqsOf(s, w.id);
  const c = [];
  if (phase === 'discovery') {
    const d = w.discovery;
    c.push({ id: 'req', label: 'Requirements confirmed and approved', ok: reqs.length > 0 && reqs.every((r) => r.status === 'approved'), detail: `${reqs.filter((r) => r.status === 'approved').length} of ${reqs.length} approved`, tab: 'requirements' });
    c.push({ id: 'sys', label: 'Source systems and access understood', ok: d.systems.length > 0, detail: `${d.systems.length} systems logged`, tab: 'discovery' });
    c.push({ id: 'data', label: 'Data profiled and gaps logged', ok: d.dataFindings.length > 0, detail: `${d.dataFindings.length} findings`, tab: 'discovery' });
    c.push({ id: 'scope', label: 'Out-of-scope items recorded', ok: !!d.exclusions.trim(), detail: d.exclusions.trim() ? 'Recorded' : 'Not recorded', tab: 'discovery' });
    c.push({ id: 'cost', label: 'Plan, waves and cost agreed', ok: d.cost > 0 && !!d.plan.trim(), detail: d.cost > 0 ? `£${fmt(d.cost)} estimated` : 'No estimate', tab: 'discovery' });
    c.push(...signChecks(s, p, w, phase));
  }
  if (phase === 'design') {
    const areas = DESIGN_AREAS.filter(([k]) => k !== 'ai' || isAI(p));
    const done = areas.filter(([k]) => w.design.areas[k] && w.design.areas[k].status === 'complete').length;
    c.push({ id: 'areas', label: 'Design pack complete', ok: done === areas.length, detail: `${done} of ${areas.length} sections complete`, tab: 'design' });
    c.push({ id: 'pass', label: 'Every requirement has a measurable pass mark', ok: reqs.length > 0 && reqs.every((r) => r.criteria.trim()), detail: `${reqs.filter((r) => r.criteria.trim()).length} of ${reqs.length} have acceptance criteria`, tab: 'requirements' });
    c.push(...signChecks(s, p, w, phase));
  }
  if (phase === 'build') {
    const items = itemsOf(s, w.id);
    const done = items.filter((i) => i.status === 'Done').length;
    c.push({ id: 'scope', label: 'All wave scope built', ok: items.length > 0 && done === items.length, detail: `${done} of ${items.length} items done`, tab: 'build' });
    const blocked = items.filter((i) => i.blocked && i.status !== 'Done');
    c.push({ id: 'blk', label: 'No blocked work items', ok: blocked.length === 0, detail: blocked.length ? `${blocked.length} blocked` : 'None', tab: 'build' });
    const sp = sprintsOf(s, w.id);
    const pending = sp.filter((x) => !x.demo.acceptedBy);
    c.push({ id: 'demo', label: 'Business owner accepted every sprint demo', ok: sp.length > 0 && pending.length === 0, detail: sp.length ? `${sp.length - pending.length} of ${sp.length} demos accepted` : 'No sprints yet', tab: 'build' });
  }
  if (phase === 'prove') {
    const tests = testsOf(s, w.id);
    const untested = reqs.filter((r) => !tests.some((t) => t.reqId === r.id && t.status === 'Pass'));
    c.push({ id: 'trace', label: 'Every requirement has passing test evidence', ok: reqs.length > 0 && untested.length === 0, detail: untested.length ? `No passing evidence: ${untested.map((r) => r.code).join(', ')}` : `${reqs.length} requirements covered`, tab: 'prove' });
    const failed = tests.filter((t) => t.status === 'Fail');
    c.push({ id: 'fail', label: 'No failed tests left unresolved', ok: failed.length === 0, detail: failed.length ? `${failed.length} failing` : 'None failing', tab: 'prove' });
    const bl = defectsOf(s, w.id).filter(blocking);
    c.push({ id: 'def', label: 'No open critical or high defects', ok: bl.length === 0, detail: bl.length ? `${bl.length} open: ${bl.map((d) => d.code).join(', ')}` : 'None open', tab: 'defects' });
    if (isAI(p)) {
      const m = w.prove.model;
      const ok = m && m.actual !== '' && m.actual != null && (m.higherBetter ? +m.actual >= +m.target : +m.actual <= +m.target);
      c.push({ id: 'acc', label: 'Model accuracy meets the agreed target', ok: !!ok, detail: m && m.actual !== '' ? `${m.name} ${m.actual}${m.unit} against target ${m.target}${m.unit}` : 'No accuracy result recorded', tab: 'prove' });
    }
    const conflicts = independenceConflicts(s, w);
    c.push({ id: 'ind', label: 'Testers are not the people who built it', ok: conflicts.length === 0, detail: conflicts.length ? `${conflicts.length} test(s) run by the builder` : 'Independent', tab: 'prove' });
    c.push(...signChecks(s, p, w, phase));
  }
  if (phase === 'deploy') {
    const pre = DEPLOY_PREREQS.filter(([k]) => !w.deploy.prereqs[k]);
    c.push({ id: 'pre', label: 'Rollback, runbook, monitoring and support in place', ok: pre.length === 0, detail: pre.length ? `Missing: ${pre.map((x) => x[1].toLowerCase()).join(', ')}` : 'All in place', tab: 'deploy' });
    const steps = DEPLOY_STEPS.filter(([k]) => !w.deploy.steps[k]);
    c.push({ id: 'seq', label: 'Go-live sequence complete through handover', ok: steps.length === 0, detail: steps.length ? `Next: ${steps[0][1]}` : 'Support owns the run', tab: 'deploy' });
    c.push(...signChecks(s, p, w, phase));
  }
  if (phase === 'adopt') {
    const ms = metricsOf(s, w.id);
    c.push({ id: 'base', label: 'Adoption and value measures defined against the baseline', ok: ms.some((m) => m.kind === 'adoption') && ms.some((m) => m.kind === 'value'), detail: `${ms.length} measures`, tab: 'adopt' });
    const missing = ms.filter((m) => m.actual === '' || m.actual == null || !m.source.trim());
    c.push({ id: 'ev', label: 'Every result has source evidence', ok: ms.length > 0 && missing.length === 0, detail: missing.length ? `${missing.length} without measured evidence` : 'All evidenced', tab: 'adopt' });
    c.push({ id: 'train', label: 'Users trained', ok: w.adopt.training.length > 0, detail: `${w.adopt.training.length} sessions recorded`, tab: 'adopt' });
    c.push(...signChecks(s, p, w, phase));
  }
  if (phase === 'gate') {
    const d = w.gate.decision;
    c.push({ id: 'dec', label: 'A recorded gate decision exists', ok: !!d && d.kind !== 'stop', detail: d ? `${d.kind === 'stop' ? 'Stop or re-plan' : d.kind === 'conditions' ? 'Proceed with conditions' : 'Proceed'} recorded by ${userName(s, d.by)}` : 'No decision recorded', tab: 'gate' });
  }
  return c;
}

export function independenceConflicts(s, w) {
  const items = itemsOf(s, w.id);
  return testsOf(s, w.id).filter((t) => t.tester && t.status !== 'Not run' && items.some((i) => i.reqId === t.reqId && i.owner === t.tester));
}

export const metTarget = (m) => m.actual !== '' && m.actual != null && (m.higherBetter ? +m.actual >= +m.target : +m.actual <= +m.target);

// ---------- the gate ----------
export function gateChecklist(s, p, w) {
  const reqs = reqsOf(s, w.id);
  const tests = testsOf(s, w.id);
  const ms = metricsOf(s, w.id);
  const risks = s.raid.filter((r) => r.projectId === p.id && r.kind === 'Risk' && r.status !== 'Closed');
  const unowned = risks.filter((r) => !r.owner || !r.mitigation.trim());
  const accOk = reqs.length > 0 && reqs.every((r) => r.criteria.trim() && tests.some((t) => t.reqId === r.id && t.status === 'Pass'));
  return [
    { id: 'g1', label: 'Acceptance criteria met', ok: accOk, detail: accOk ? `${reqs.length} requirements with passing evidence` : 'Requirements without passing evidence remain', phase: 'prove' },
    { id: 'g2', label: 'User acceptance signed', ok: !!signoff(s, w.id, 'prove.uat'), detail: signoff(s, w.id, 'prove.uat') ? `Signed by ${userName(s, signoff(s, w.id, 'prove.uat').userId)}` : 'UAT not signed', phase: 'prove' },
    { id: 'g3', label: 'Live, stable and supported', ok: !!w.deploy.steps.handover, detail: w.deploy.steps.handover ? `Handover accepted ${fmtDate(w.deploy.steps.handover.at)}` : 'Support handover not recorded', phase: 'deploy' },
    { id: 'g4', label: 'Value measured against baseline', ok: ms.length > 0 && ms.every((m) => m.actual !== '' && m.source.trim()) && !!signoff(s, w.id, 'adopt.value'), detail: `${ms.filter((m) => m.actual !== '').length} of ${ms.length} measured, ${ms.filter(metTarget).length} on target`, phase: 'adopt' },
    { id: 'g5', label: 'Lessons logged and fed forward', ok: !!w.gate.lessons.trim(), detail: w.gate.lessons.trim() ? 'Recorded' : 'Not recorded', phase: 'gate' },
    { id: 'g6', label: 'Plan and backlog updated', ok: !!w.gate.nextPlan.trim() && (w.adopt.improvements || []).length > 0, detail: `${(w.adopt.improvements || []).length} improvement items, next-wave plan ${w.gate.nextPlan.trim() ? 'written' : 'missing'}`, phase: 'gate' },
    { id: 'g7', label: 'Compliance and security checks passed', ok: !!w.gate.compliance, detail: w.gate.compliance ? `Confirmed by ${userName(s, w.gate.compliance.by)}` : 'Not confirmed', phase: 'gate' },
    { id: 'g8', label: 'Residual risks identified and owned', ok: unowned.length === 0, detail: unowned.length ? `${unowned.length} risk(s) without owner or mitigation` : `${risks.length} open risks, all owned`, phase: 'gate' },
  ];
}

export function gateState(s, p, w) {
  const list = gateChecklist(s, p, w);
  const signers = gateSigners(p);
  const approvals = signers.map(([spec, label]) => ({ spec, label, userId: signerId(p, spec), a: w.gate.approvals[spec] }));
  const allApproved = approvals.every((x) => x.a && x.a.decision === 'approve');
  const anyRejected = approvals.some((x) => x.a && x.a.decision === 'reject');
  const failed = list.filter((x) => !x.ok);
  return { list, approvals, allApproved, anyRejected, failed, passed: list.length - failed.length };
}

// Returns null when the decision is allowed, otherwise the reason it is not.
export function decisionBlocker(s, p, w, kind, draft) {
  const g = gateState(s, p, w);
  if (w.phase !== 'gate') return 'The wave has not reached the Gate.';
  if (kind === 'stop') return draft.comment.trim() ? null : 'Record why the wave must stop or re-plan.';
  if (g.anyRejected) return 'An approver rejected the wave. Only Stop or re-plan can be recorded.';
  if (!g.allApproved) return `Every approver must sign first (${g.approvals.filter((x) => !x.a).length} still to sign).`;
  if (kind === 'proceed') return g.failed.length ? `Proceed needs all eight checks. ${g.failed.length} not met; use Proceed with conditions or fix them.` : null;
  if (kind === 'conditions') {
    const conds = draft.conditions.filter((c) => c.text.trim());
    if (!conds.length) return 'Add at least one condition.';
    if (conds.some((c) => !c.owner || !c.due)) return 'Every condition needs an owner and a due date.';
    if (!draft.riskAccepted) return 'Confirm that the accountable partner accepts the residual risk.';
    return null;
  }
  return 'Choose a decision.';
}

// ---------- progress and health ----------
export function waveProgress(p, w) {
  const ph = phasesFor(p, w);
  if (w.status === 'closed') return 1;
  const i = Math.max(0, ph.indexOf(w.phase));
  return i / ph.length;
}
export function projectProgress(s, p) {
  const ws = wavesOf(s, p.id);
  const closed = ws.filter((w) => w.status === 'closed').length;
  const aw = activeWave(s, p.id);
  const cur = aw && aw.status !== 'closed' ? waveProgress(p, aw) : 0;
  return Math.min(1, (closed + cur) / Math.max(p.plannedWaves, ws.length));
}

export function health(s, p) {
  const w = activeWave(s, p.id);
  const red = [], amber = [];
  if (w) {
    const bl = defectsOf(s, w.id).filter(blocking);
    if (bl.length) red.push(`${bl.length} open critical or high defect${bl.length > 1 ? 's' : ''}`);
    if (w.gate.decision && w.gate.decision.kind === 'stop') red.push('Gate decided stop or re-plan');
    const blocked = itemsOf(s, w.id).filter((i) => i.blocked && i.status !== 'Done');
    if (blocked.length) amber.push(`${blocked.length} blocked work item${blocked.length > 1 ? 's' : ''}`);
    const failing = testsOf(s, w.id).filter((t) => t.status === 'Fail');
    if (failing.length) amber.push(`${failing.length} failing test${failing.length > 1 ? 's' : ''}`);
  }
  if (p.end < TODAY && w && w.status !== 'closed') red.push('Past planned completion date');
  if (p.actual > p.budget) red.push('Over budget');
  else if (p.actual > p.budget * 0.85 && projectProgress(s, p) < 0.8) amber.push(`${Math.round((p.actual / p.budget) * 100)}% of budget used`);
  const overdue = s.raid.filter((r) => r.projectId === p.id && r.status !== 'Closed' && r.due && r.due < TODAY);
  if (overdue.length) amber.push(`${overdue.length} overdue RAID item${overdue.length > 1 ? 's' : ''}`);
  return { rag: red.length ? 'red' : amber.length ? 'amber' : 'green', reasons: [...red, ...amber] };
}

export function nextAction(s, p) {
  const w = activeWave(s, p.id);
  if (!w) return 'Create the first wave';
  if (w.status === 'closed') return 'Plan the next wave';
  if (w.status === 'replan') return 'Re-plan the wave after the stop decision';
  const failing = exitChecks(s, p, w).filter((c) => !c.ok);
  if (w.phase === 'gate') {
    const g = gateState(s, p, w);
    const waiting = g.approvals.filter((x) => !x.a);
    if (w.gate.decision) return 'Start the next wave';
    if (g.failed.length) return `Gate evidence: ${g.failed[0].label.toLowerCase()}`;
    if (waiting.length) return `Gate sign-off from ${userName(s, waiting[0].userId)}`;
    return 'Record the gate decision';
  }
  return failing.length ? failing[0].label : `Advance to the next phase`;
}

export function attention(s, projects) {
  const out = [];
  projects.forEach((p) => {
    const w = activeWave(s, p.id);
    if (!w) return;
    defectsOf(s, w.id).filter(blocking).forEach((d) => out.push({ sev: 'red', kind: 'Defect', text: `${d.code} ${d.title}`, meta: `${d.severity}, owner ${userName(s, d.owner)}`, p, w, phase: 'prove', tab: 'defects' }));
    itemsOf(s, w.id).filter((i) => i.blocked && i.status !== 'Done').forEach((i) => out.push({ sev: 'amber', kind: 'Blocker', text: `${i.code} ${i.title}`, meta: i.blockReason || 'Blocked', p, w, phase: 'build' }));
    s.raid.filter((r) => r.projectId === p.id && r.status !== 'Closed' && r.due && r.due < TODAY).forEach((r) => out.push({ sev: 'amber', kind: r.kind, text: `${r.code} ${r.title}`, meta: `Due ${fmtDate(r.due)}, overdue`, p, w, route: 'raid' }));
    s.raid.filter((r) => r.projectId === p.id && r.kind === 'Change request' && r.status === 'Proposed').forEach((r) => out.push({ sev: 'amber', kind: 'Scope change', text: `${r.code} ${r.title}`, meta: 'Awaiting impact decision', p, w, route: 'raid' }));
    if (w.status === 'active' && w.phase !== 'gate') {
      signoffSpecs(p, w.phase).forEach(([key, label, spec]) => { if (!signoff(s, w.id, key)) out.push({ sev: 'amber', kind: 'Approval', text: label, meta: `Waiting for ${userName(s, signerId(p, spec))}`, p, w, phase: w.phase }); });
    }
    if (w.phase === 'gate' && !w.gate.decision) gateState(s, p, w).failed.forEach((f) => out.push({ sev: 'amber', kind: 'Missing evidence', text: f.label, meta: f.detail, p, w, phase: 'gate' }));
    if (p.end >= TODAY && daysBetween(TODAY, p.end) <= 21 && w.status !== 'closed') out.push({ sev: 'amber', kind: 'Milestone', text: `Planned completion ${fmtDate(p.end)}`, meta: `${daysBetween(TODAY, p.end)} days left, currently in ${w.phase}`, p, w, phase: w.phase });
  });
  return out.sort((a, b) => (a.sev === b.sev ? 0 : a.sev === 'red' ? -1 : 1));
}

export function notificationsFor(s, u) {
  const out = [];
  s.projects.filter((p) => canView(u, p)).forEach((p) => {
    const w = activeWave(s, p.id);
    if (!w || w.status === 'closed') return;
    if (w.phase !== 'gate') signoffSpecs(p, w.phase).forEach(([key, label, spec]) => { if (!signoff(s, w.id, key) && canSign(u, p, spec)) out.push({ id: `${w.id}:${key}`, text: `Your sign-off is needed: ${label.toLowerCase()}`, p, w, phase: w.phase }); });
    if (w.phase === 'gate') gateSigners(p).forEach(([spec, label]) => { if (!w.gate.approvals[spec] && canSign(u, p, spec)) out.push({ id: `${w.id}:gate:${spec}`, text: `Gate approval needed (${label.toLowerCase()}) for wave ${w.num}`, p, w, phase: 'gate' }); });
    sprintsOf(s, w.id).filter((x) => x.demo.notes && !x.demo.acceptedBy).forEach((x) => { if (can(u, p, 'acceptDemo')) out.push({ id: `${x.id}:demo`, text: `Sprint ${x.num} demo is ready for your acceptance`, p, w, phase: 'build' }); });
    s.defects.filter((d) => d.waveId === w.id && d.owner === u.id && d.status === 'Open').forEach((d) => out.push({ id: `${d.id}:own`, text: `${d.severity} defect assigned to you: ${d.code}`, p, w, phase: 'prove', tab: 'defects' }));
  });
  return out;
}

// ---------- formatting ----------
export const fmt = (n) => Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 });
export const money = (n) => '£' + (n >= 1e6 ? (n / 1e6).toFixed(2) + 'm' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : fmt(n));
export function fmtDate(d) {
  if (!d) return '';
  const x = new Date(d);
  return x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function fmtTime(d) {
  if (!d) return '';
  const x = new Date(d);
  return x.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
export const initials = (n) => (n || '?').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
