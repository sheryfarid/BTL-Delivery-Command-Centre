import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { Panel, Pill, Btn, Empty, Avatar, Modal, Field, Icon } from '../ui.jsx';
import { RAID_KINDS } from '../methodology.js';
import { byId, userName, fmtDate, uid, nowISO, TODAY, can, activeWave, addDays, fmt } from '../engine.js';

export default function Raid() {
  const { s, me, route, update, toast } = useStore();
  const [pid, setPid] = useState(route.projectId || 'all');
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('open');
  const [form, setForm] = useState(null);
  const [cr, setCr] = useState(null);
  const rows = s.raid.filter((r) => (pid === 'all' || r.projectId === pid) && (kind === 'all' || r.kind === kind) && (status === 'all' || (status === 'open' ? r.status !== 'Closed' && r.status !== 'Rejected' : r.status === 'Closed' || r.status === 'Rejected')));
  const people = s.users.filter((u) => u.globalRole !== 'admin');

  function save() {
    const p = byId(s.projects, form.projectId);
    update((st) => {
      if (form.id) {
        const x = st.raid.find((y) => y.id === form.id);
        x.history.push({ at: nowISO(), by: me.id, text: `Updated: status ${form.status}` });
        Object.assign(x, form);
      } else {
        const prefix = { Risk: 'R', Assumption: 'A', Issue: 'I', Dependency: 'DP', Decision: 'D', 'Change request': 'CR' }[form.kind];
        st.raid.push({ ...form, id: uid('r'), waveId: (activeWave(st, form.projectId) || {}).id, code: `${prefix}-${String(st.raid.filter((r) => r.kind === form.kind).length + 1).padStart(2, '0')}`, status: form.kind === 'Change request' ? 'Proposed' : 'Open', history: [{ at: nowISO(), by: me.id, text: 'Raised' }] });
      }
    }, { action: form.id ? `${form.kind} updated` : `${form.kind} raised`, detail: form.title, projectId: form.projectId });
    toast(form.id ? 'Saved' : `${form.kind} added to the register`);
    setForm(null);
  }

  function decideCR(r, approve) {
    const p = byId(s.projects, r.projectId);
    update((st) => {
      const x = st.raid.find((y) => y.id === r.id);
      x.status = approve ? 'Approved' : 'Rejected';
      x.decidedBy = me.id;
      x.history.push({ at: nowISO(), by: me.id, text: approve ? 'Approved; baseline updated' : 'Rejected' });
      if (approve) {
        const pr = st.projects.find((y) => y.id === r.projectId);
        pr.baselines = pr.baselines || [{ version: 1, at: pr.createdAt, by: pr.team.deliveryLead, budget: pr.budget, end: pr.end, reason: 'Original baseline' }];
        pr.budget = pr.budget + (+r.costImpact || 0);
        pr.end = addDays(pr.end, +r.daysImpact || 0);
        pr.baselines.push({ version: pr.baselines.length + 1, at: nowISO(), by: me.id, budget: pr.budget, end: pr.end, reason: `${r.code} ${r.title}` });
        st.workItems.push({ id: uid('wi'), waveId: (activeWave(st, r.projectId) || {}).id, sprintId: null, code: r.code, title: r.title, status: 'Backlog', owner: '', priority: 'Medium', estimate: 3, reqId: '', dod: { built: false, reviewed: false, meetsDesign: false }, pr: '', blocked: false, blockReason: '', notes: 'Added by approved change request' });
      }
    }, { action: `Change request ${approve ? 'approved' : 'rejected'}`, detail: `${r.code} ${r.title}${approve ? `. Budget +£${fmt(r.costImpact)}, schedule +${r.daysImpact} days. Added to backlog, not the running sprint.` : ''}`, projectId: r.projectId });
    toast(`${r.code} ${approve ? 'approved and baseline updated' : 'rejected'}`);
    setCr(null);
  }

  const score = (r) => (r.kind === 'Risk' ? r.probability * r.impact : 0);
  return (
    <div className="stack">
      <div className="page-h">
        <div><h1>Risk and change</h1><p className="muted">One register for risks, assumptions, issues, dependencies, decisions and change requests.</p></div>
        <Btn kind="primary" icon="plus" onClick={() => setForm({ projectId: pid === 'all' ? s.projects[0].id : pid, kind: 'Risk', title: '', owner: '', probability: 3, impact: 3, due: addDays(TODAY, 14), mitigation: '', costImpact: 0, daysImpact: 0, status: 'Open' })}>Add entry</Btn>
      </div>
      <div className="filters">
        <select value={pid} onChange={(e) => setPid(e.target.value)} aria-label="Project"><option value="all">All projects</option>{s.projects.map((p) => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select>
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type"><option value="all">All types</option>{RAID_KINDS.map((k) => <option key={k}>{k}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="open">Open</option><option value="closed">Closed or rejected</option><option value="all">Any status</option></select>
      </div>
      <Panel pad={false}>
        {rows.length === 0 ? <Empty icon="alert" title="No entries match" /> : (
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Entry</th><th>Type</th><th>Owner</th><th className="num">Score</th><th>Due</th><th>Status</th><th>Mitigation or impact</th><th /></tr></thead>
            <tbody>{rows.sort((a, b) => score(b) - score(a)).map((r) => {
              const p = byId(s.projects, r.projectId);
              const overdue = r.due && r.due < TODAY && r.status !== 'Closed';
              return (
                <tr key={r.id}>
                  <td><strong>{r.code}</strong> {r.title}<div className="muted small">{p && p.name}</div></td>
                  <td><Pill tone={r.kind === 'Risk' ? 'red' : r.kind === 'Change request' ? 'amber' : 'neutral'}>{r.kind}</Pill></td>
                  <td>{r.owner ? <Avatar s={s} id={r.owner} size={22} showName /> : <span className="err-text small">No owner</span>}</td>
                  <td className="num">{r.kind === 'Risk' ? <span className={score(r) >= 12 ? 'err-text' : ''}>{score(r)}</span> : '–'}</td>
                  <td className={'small' + (overdue ? ' err-text' : '')}>{r.due ? fmtDate(r.due) : '–'}{overdue && <div>Overdue</div>}</td>
                  <td><Pill tone={['Closed', 'Approved'].includes(r.status) ? 'green' : r.status === 'Rejected' ? 'neutral' : 'amber'}>{r.status}</Pill></td>
                  <td className="small">{r.kind === 'Change request' ? `+£${fmt(r.costImpact)}, +${r.daysImpact} days` : r.mitigation || <span className="muted">None recorded</span>}</td>
                  <td className="nowrap">
                    {r.kind === 'Change request' && r.status === 'Proposed' && can(me, p, 'advance') && <Btn small kind="primary" onClick={() => setCr(r)}>Decide</Btn>}
                    {r.kind !== 'Change request' && <button className="icon-btn" aria-label={`Edit ${r.code}`} onClick={() => setForm({ ...r })}><Icon name="edit" size={14} /></button>}
                  </td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </Panel>
      <Baselines />
      {form && (
        <Modal title={form.id ? `Edit ${form.code}` : 'Add to the register'} onClose={() => setForm(null)} footer={<><Btn onClick={() => setForm(null)}>Cancel</Btn><Btn kind="primary" disabled={!form.title.trim() || !form.owner} onClick={save}>Save entry</Btn></>}>
          <div className="form-grid">
            <Field label="Project"><select disabled={!!form.id} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>{s.projects.map((p) => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select></Field>
            <Field label="Type"><select disabled={!!form.id} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{RAID_KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
            <Field label="Description" wide><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Accountable owner" error={!form.owner ? 'Every entry needs an owner.' : null}><select value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}><option value="">Choose</option>{people.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
            <Field label="Due date"><input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></Field>
            {form.kind === 'Risk' && <><Field label="Probability (1 to 5)"><input type="number" min="1" max="5" value={form.probability} onChange={(e) => setForm({ ...form, probability: +e.target.value })} /></Field><Field label="Impact (1 to 5)"><input type="number" min="1" max="5" value={form.impact} onChange={(e) => setForm({ ...form, impact: +e.target.value })} /></Field></>}
            {form.kind === 'Change request' ? <><Field label="Cost impact (£)"><input type="number" value={form.costImpact} onChange={(e) => setForm({ ...form, costImpact: +e.target.value })} /></Field><Field label="Schedule impact (days)"><input type="number" value={form.daysImpact} onChange={(e) => setForm({ ...form, daysImpact: +e.target.value })} /></Field></> : <Field label="Mitigation or response" wide><textarea rows="2" value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} /></Field>}
            {form.id && <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{['Open', 'In progress', 'Closed'].map((x) => <option key={x}>{x}</option>)}</select></Field>}
          </div>
        </Modal>
      )}
      {cr && (
        <Modal title={`Decide ${cr.code}`} onClose={() => setCr(null)} footer={<><Btn onClick={() => setCr(null)}>Cancel</Btn><Btn kind="danger" onClick={() => decideCR(cr, false)}>Reject change</Btn><Btn kind="primary" onClick={() => decideCR(cr, true)}>Approve and update baseline</Btn></>}>
          <p><strong>{cr.title}</strong></p>
          <dl className="review"><dt>Cost</dt><dd>+£{fmt(cr.costImpact)}</dd><dt>Schedule</dt><dd>+{cr.daysImpact} days</dd><dt>Scope</dt><dd>Added to the backlog for the next sprint plan. The running sprint is not changed.</dd></dl>
          <p className="small muted">Approval creates a new version of the project baseline.</p>
        </Modal>
      )}
    </div>
  );
}

function Baselines() {
  const { s } = useStore();
  const list = s.projects.filter((p) => (p.baselines || []).length);
  if (!list.length) return null;
  return (
    <Panel title="Baseline history" sub="Every approved change creates a new baseline version" pad={false}>
      <div className="table-wrap"><table className="tbl"><thead><tr><th>Project</th><th>Version</th><th className="num">Budget</th><th>End date</th><th>Reason</th><th>Approved by</th></tr></thead>
        <tbody>{list.flatMap((p) => p.baselines.map((b) => <tr key={p.id + b.version}><td>{p.name}</td><td>v{b.version}</td><td className="num">£{fmt(b.budget)}</td><td>{fmtDate(b.end)}</td><td className="small">{b.reason}</td><td className="small">{userName(s, b.by)}, {fmtDate(b.at)}</td></tr>))}</tbody></table></div>
    </Panel>
  );
}
