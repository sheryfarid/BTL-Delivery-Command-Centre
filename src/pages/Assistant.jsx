import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { Panel, Btn, Pill, Icon } from '../ui.jsx';
import { PHASE_META, DEPLOY_PREREQS, DEPLOY_STEPS } from '../methodology.js';
import { canView, health, activeWave, exitChecks, gateState, reqsOf, testsOf, defectsOf, itemsOf, signoffSpecs, signoff, signerId, userName, fmtTime, byId, clientName, TODAY, addDays } from '../engine.js';

const ASKS = [
  ['risk', 'Which projects are at risk?'],
  ['approvals', 'Which waves are awaiting approval?'],
  ['blocking', 'What is blocking this project?'],
  ['untested', 'Show the requirements with no test evidence'],
  ['changes', 'What changed in the last 7 days?'],
  ['release', 'What is missing for release readiness?'],
  ['gate', 'Draft a gate review summary'],
  ['discovery', 'What is missing from Discovery?'],
];

export default function Assistant() {
  const { s, me, go } = useStore();
  const projects = s.projects.filter((p) => canView(me, p));
  const [pid, setPid] = useState(projects[0].id);
  const [q, setQ] = useState('');
  const [log, setLog] = useState([]);

  function intent(text) {
    const t = text.toLowerCase();
    if (/risk|red|amber|trouble/.test(t)) return 'risk';
    if (/approv|sign/.test(t)) return 'approvals';
    if (/block|stuck|why/.test(t)) return 'blocking';
    if (/test|evidence|untested|coverage/.test(t)) return 'untested';
    if (/chang|since|recent|steering/.test(t)) return 'changes';
    if (/release|deploy|go.?live|readiness/.test(t)) return 'release';
    if (/gate|decision/.test(t)) return 'gate';
    if (/discovery|missing info|workshop/.test(t)) return 'discovery';
    return null;
  }

  function answer(kind, label) {
    const p = byId(s.projects, pid);
    const w = activeWave(s, pid);
    let lines = [], sources = [];
    if (kind === 'risk') {
      projects.forEach((x) => { const h = health(s, x); if (h.rag !== 'green') { lines.push(`${x.name} is ${h.rag === 'red' ? 'at risk' : 'on watch'}: ${h.reasons.join('; ')}.`); sources.push(`${x.code} health signals`); } });
      if (!lines.length) lines.push('No project has a red or amber signal in the stored records.');
    }
    if (kind === 'approvals') {
      projects.forEach((x) => {
        const aw = activeWave(s, x.id);
        if (!aw || aw.status === 'closed') return;
        if (aw.phase === 'gate') { const g = gateState(s, x, aw); g.approvals.filter((a) => !a.a).forEach((a) => { lines.push(`${x.name}, wave ${aw.num}: gate ${a.label.toLowerCase()} from ${userName(s, a.userId)}.`); sources.push(`${x.code} wave ${aw.num} gate approvals`); }); }
        else signoffSpecs(x, aw.phase).forEach(([k, l, spec]) => { if (!signoff(s, aw.id, k)) { lines.push(`${x.name}, wave ${aw.num}: ${l.toLowerCase()} (${userName(s, signerId(x, spec))}).`); sources.push(`${x.code} ${PHASE_META[aw.phase].label} sign-offs`); } });
      });
      if (!lines.length) lines.push('No approvals are outstanding.');
    }
    if (kind === 'blocking') {
      if (w.phase === 'gate') gateState(s, p, w).failed.forEach((f) => lines.push(`Gate check not met: ${f.label} (${f.detail}).`));
      exitChecks(s, p, w).filter((c) => !c.ok).forEach((c) => lines.push(`${PHASE_META[w.phase].label} exit check not met: ${c.label} (${c.detail}).`));
      itemsOf(s, w.id).filter((i) => i.blocked && i.status !== 'Done').forEach((i) => lines.push(`${i.code} is blocked: ${i.blockReason}.`));
      sources.push(`${p.code} wave ${w.num} exit checks`, `${p.code} work items`);
      if (!lines.length) lines.push(`Nothing is blocking ${p.name}. Every ${PHASE_META[w.phase].label} exit check passes.`);
    }
    if (kind === 'untested') {
      projects.forEach((x) => { const aw = activeWave(s, x.id); if (!aw) return; reqsOf(s, aw.id).forEach((r) => { if (!testsOf(s, aw.id).some((t) => t.reqId === r.id && t.status === 'Pass')) { lines.push(`${x.code} ${r.code}: ${r.title}. ${testsOf(s, aw.id).some((t) => t.reqId === r.id) ? 'Has tests, none passing.' : 'No test cases.'}`); sources.push(`${x.code} ${r.code}`); } }); });
      if (!lines.length) lines.push('Every requirement in active waves has passing test evidence.');
    }
    if (kind === 'changes') {
      const since = addDays(TODAY, -7);
      const ev = s.audit.filter((a) => a.at.slice(0, 10) >= since && (!a.projectId || projects.some((x) => x.id === a.projectId))).slice(0, 15);
      ev.forEach((a) => lines.push(`${fmtTime(a.at)}: ${a.action}${a.projectId ? ` on ${byId(s.projects, a.projectId).name}` : ''}, by ${userName(s, a.userId)}. ${a.detail}`));
      sources.push('Audit log, last 7 days');
      if (!ev.length) lines.push('No changes recorded in the last 7 days.');
    }
    if (kind === 'release') {
      DEPLOY_PREREQS.filter(([k]) => !w.deploy.prereqs[k]).forEach(([, l]) => lines.push(`Not in place: ${l.toLowerCase()}.`));
      const next = DEPLOY_STEPS.find(([k]) => !w.deploy.steps[k]);
      if (next) lines.push(`Next go-live step: ${next[1].toLowerCase()}.`);
      defectsOf(s, w.id).filter((d) => d.status !== 'Closed' && ['Critical', 'High'].includes(d.severity)).forEach((d) => lines.push(`Open ${d.severity.toLowerCase()} defect blocks go-live: ${d.code} ${d.title}.`));
      signoffSpecs(p, 'deploy').forEach(([k, l]) => !signoff(s, w.id, k) && lines.push(`Missing sign-off: ${l.toLowerCase()}.`));
      sources.push(`${p.code} wave ${w.num} deployment record`, `${p.code} defect register`);
      if (!lines.length) lines.push('All release readiness items are recorded.');
    }
    if (kind === 'gate') {
      const g = gateState(s, p, w);
      lines.push(`${p.name}, wave ${w.num} (${w.name}). Currently in ${PHASE_META[w.phase].label}.`);
      g.list.forEach((c, i) => lines.push(`${i + 1}. ${c.label}: ${c.ok ? 'met' : 'not met'}. ${c.detail}.`));
      lines.push(`Approvals: ${g.approvals.map((a) => `${a.label} ${a.a ? 'signed' : 'pending'}`).join(', ')}.`);
      lines.push(g.failed.length === 0 && g.allApproved ? 'All evidence supports Proceed. The decision belongs to the accountable partner and is recorded by the delivery lead.' : g.failed.length ? `Proceed is not supported yet. Options: complete the ${g.failed.length} open item(s), or Proceed with conditions with owners and dates.` : 'Evidence is complete; approvals are outstanding.');
      sources.push(`${p.code} wave ${w.num} gate checklist`, `${p.code} evidence vault`);
    }
    if (kind === 'discovery') {
      const dw = s.waves.find((x) => x.projectId === pid && x.num === 1);
      if (p.kind === 'internal') lines.push('Internal projects skip Discovery; requirements are confirmed in Design.');
      else {
        exitChecks(s, p, dw, 'discovery').filter((c) => !c.ok).forEach((c) => lines.push(`Missing: ${c.label} (${c.detail}).`));
        if (!dw.discovery.stakeholders.some((x) => /data owner/i.test(x.role))) lines.push('No data owner is in the stakeholder register. Ask who owns each data set.');
        if (dw.discovery.systems.some((x) => x.access !== 'Granted')) lines.push(`Access not yet granted: ${dw.discovery.systems.filter((x) => x.access !== 'Granted').map((x) => x.name).join(', ')}. Workshop question: who approves access, and by when?`);
        sources.push(`${p.code} discovery record`);
        if (lines.length === 0) lines.push('Discovery evidence is complete.');
      }
    }
    setLog((l) => [{ id: Date.now(), q: label, lines, sources: Array.from(new Set(sources)), p: ['blocking', 'release', 'gate', 'discovery'].includes(kind) ? p : null }, ...l]);
  }

  const ask = () => { const k = intent(q); if (k) answer(k, q); else setLog((l) => [{ id: Date.now(), q, lines: ['I can answer questions about risk, approvals, blockers, test evidence, recent changes, release readiness, gate reviews and discovery gaps. Try one of the suggestions.'], sources: [] }, ...l]); setQ(''); };

  return (
    <div className="stack">
      <div className="page-h"><div><h1>Delivery assistant</h1><p className="muted">Answers from stored project records only, with the records it used. Advice only: people remain accountable for every decision and sign-off.</p></div></div>
      <Panel>
        <div className="assist-bar">
          <select value={pid} onChange={(e) => setPid(e.target.value)} aria-label="Project in focus">{projects.map((p) => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select>
          <label className="search search-inline grow"><Icon name="spark" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && q.trim() && ask()} placeholder="Ask about risk, approvals, blockers, tests or releases" aria-label="Question" /></label>
          <Btn kind="primary" disabled={!q.trim()} onClick={ask}>Ask</Btn>
        </div>
        <div className="chips">{ASKS.map(([k, l]) => <button key={k} className="chip" onClick={() => answer(k, l)}>{l}</button>)}</div>
        <p className="small muted">This release analyses records with fixed rules inside your browser and only sees projects you can access. A language-model connection is planned as an optional, governed integration.</p>
      </Panel>
      {log.map((a) => (
        <Panel key={a.id} title={a.q} sub={a.p ? `Project in focus: ${a.p.name}` : undefined}>
          <ul className="answer">{a.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
          {a.sources.length > 0 && <div className="sources"><span className="small muted">Records used:</span>{a.sources.map((x) => <Pill key={x}>{x}</Pill>)}</div>}
          {a.p && <Btn small onClick={() => go({ page: 'project', projectId: a.p.id })}>Open {a.p.name}</Btn>}
        </Panel>
      ))}
    </div>
  );
}
