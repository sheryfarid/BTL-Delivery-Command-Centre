import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { Panel, Pill, Btn, Empty, Avatar, Tabs } from '../ui.jsx';
import { GATE_DECISIONS } from '../methodology.js';
import { canView, gateState, userName, fmtDate, byId, canSign, clientName } from '../engine.js';

export default function GateCentre() {
  const { s, me, go } = useStore();
  const [tab, setTab] = useState('queue');
  const visible = s.waves.map((w) => ({ w, p: byId(s.projects, w.projectId) })).filter(({ p }) => p && canView(me, p));
  const queue = visible.filter(({ w }) => w.phase === 'gate' && !w.gate.decision && w.status !== 'closed');
  const decided = visible.filter(({ w }) => w.gate.decision || (w.gate.history || []).length).sort((a, b) => ((b.w.gate.decision || {}).at || '').localeCompare((a.w.gate.decision || {}).at || ''));
  const mine = queue.filter(({ p, w }) => gateState(s, p, w).approvals.some((a) => !a.a && canSign(me, p, a.spec)));

  return (
    <div className="stack">
      <div className="page-h"><div><h1>Gate approvals</h1><p className="muted">Each wave closes with an evidence-based decision: proceed, proceed with conditions, or stop and re-plan.</p></div></div>
      <Tabs value={tab} onChange={setTab} tabs={[['queue', 'Awaiting decision', queue.length], ['mine', 'Waiting for me', mine.length], ['history', 'Decision history', decided.length]]} />
      {(tab === 'queue' || tab === 'mine') && (
        <Panel pad={false}>
          {(tab === 'queue' ? queue : mine).length === 0 ? <Empty icon="shield" title={tab === 'mine' ? 'No gate approvals are waiting for you' : 'No waves are waiting at the Gate'} /> : (
            <div className="table-wrap"><table className="tbl">
              <thead><tr><th>Project and wave</th><th>Checklist</th><th>Approvers</th><th>Missing evidence</th><th /></tr></thead>
              <tbody>{(tab === 'queue' ? queue : mine).map(({ p, w }) => {
                const g = gateState(s, p, w);
                return (
                  <tr key={w.id}>
                    <td><strong>{p.name}</strong><div className="muted small">{clientName(s, p)}. Wave {w.num}: {w.name}</div></td>
                    <td><Pill tone={g.failed.length ? 'amber' : 'green'}>{g.passed} of 8</Pill></td>
                    <td><div className="gq-signers">{g.approvals.map((a) => <span key={a.spec} className={'sig' + (a.a ? (a.a.decision === 'approve' ? ' sig-ok' : ' sig-no') : '')} title={`${a.label}: ${userName(s, a.userId)}`}><Avatar s={s} id={a.userId} size={24} /></span>)}</div><span className="small muted">{g.approvals.filter((a) => a.a).length} of {g.approvals.length} signed</span></td>
                    <td className="small">{g.failed.length ? g.failed.map((f) => f.label).join('; ') : <span className="ok-text">None</span>}</td>
                    <td><Btn small kind="primary" onClick={() => go({ page: 'project', projectId: p.id, waveId: w.id, phase: 'gate' })}>Open gate</Btn></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          )}
        </Panel>
      )}
      {tab === 'history' && (
        <Panel pad={false}>
          {decided.length === 0 ? <Empty icon="shield" title="No gate decisions recorded yet" /> : (
            <div className="table-wrap"><table className="tbl">
              <thead><tr><th>Project and wave</th><th>Decision</th><th>Recorded by</th><th>Conditions</th><th /></tr></thead>
              <tbody>{decided.flatMap(({ p, w }) => [...(w.gate.history || []).map((h, i) => ({ d: h, key: w.id + 'h' + i })), ...(w.gate.decision ? [{ d: w.gate.decision, key: w.id }] : [])].map(({ d, key }) => (
                <tr key={key}>
                  <td><strong>{p.name}</strong><div className="muted small">Wave {w.num}: {w.name}</div></td>
                  <td><Pill tone={d.kind === 'proceed' ? 'green' : d.kind === 'conditions' ? 'amber' : 'red'}>{GATE_DECISIONS[d.kind].label}</Pill></td>
                  <td className="small">{userName(s, d.by)}<div className="muted">{fmtDate(d.at)}</div></td>
                  <td className="small">{d.conditions && d.conditions.length ? d.conditions.map((c) => `${c.text} (${userName(s, c.owner)}, ${fmtDate(c.due)})`).join('; ') : '–'}</td>
                  <td><Btn small onClick={() => go({ page: 'project', projectId: p.id, waveId: w.id, phase: 'gate' })}>View record</Btn></td>
                </tr>
              )))}</tbody>
            </table></div>
          )}
        </Panel>
      )}
    </div>
  );
}
