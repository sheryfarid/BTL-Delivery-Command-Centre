import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { Panel, Pill, Btn, Avatar, Modal, Field, Tabs, Icon } from '../ui.jsx';
import { TEAM_SLOTS } from '../methodology.js';
import { userName, byId, uid } from '../engine.js';
import { Capacity } from './Dashboard.jsx';

const COLUMNS = [
  ['munir', 'AI, Technology and Architecture'],
  ['tabs', 'Quality, Delivery and Support'],
  ['rizwan', 'Strategy, Programme and Marketing'],
];

export default function Team() {
  const { s, me, update, toast } = useStore();
  const [tab, setTab] = useState('org');
  const [edit, setEdit] = useState(null);
  const admin = me.globalRole === 'admin' || ['munir', 'rizwan', 'tabs', 'misbah'].includes(me.id);
  const btl = s.users.filter((u) => u.org === 'btl' && u.globalRole !== 'admin');

  const Person = ({ u, lead }) => (
    <button className={'org-p' + (lead ? ' lead' : '') + (u.id === 'misbah' ? ' hub' : '')} onClick={() => admin && setEdit({ ...u, skills: u.skills.join(', ') })} disabled={!admin} title={admin ? 'Edit details' : undefined}>
      <Avatar s={s} id={u.id} size={lead ? 34 : 26} />
      <span><strong>{u.name}</strong><span className="small muted">{u.title}</span>{u.note && <span className="small warn-text"><Icon name="alert" size={11} /> {u.note}</span>}</span>
      {u.id === 'misbah' && <Pill tone="amber">PM hub</Pill>}
    </button>
  );

  return (
    <div className="stack">
      <div className="page-h"><div><h1>Team and resources</h1><p className="muted">Three partners lead their areas as equals. Misbah coordinates project delivery across all three teams.</p></div></div>
      <Tabs value={tab} onChange={setTab} tabs={[['org', 'Reporting structure'], ['alloc', 'Allocation'], ['raci', 'Responsibility matrix']]} />
      {tab === 'org' && (
        <>
          <div className="org">
            {COLUMNS.map(([pid]) => {
              const lead = byId(s.users, pid);
              return (
                <div className="org-col" key={pid}>
                  <Person u={lead} lead />
                  <ul>{btl.filter((u) => u.reportsTo === pid).map((u) => <li key={u.id}><Person u={u} /></li>)}</ul>
                </div>
              );
            })}
          </div>
          <div className="note"><strong>Project-management hub.</strong> All team members report to Misbah (PM / Lead) for project updates; line leadership stays with the three partners.</div>
          <MisbahView />
        </>
      )}
      {tab === 'alloc' && (
        <div className="grid-2-1">
          <Panel title="Allocation by project" sub="Share of each person's week. Edit a cell to change it." pad={false}>
            <div className="table-wrap"><table className="tbl alloc">
              <thead><tr><th>Person</th>{s.projects.map((p) => <th key={p.id} className="num" title={p.name}>{p.code}</th>)}<th className="num">Total</th></tr></thead>
              <tbody>{btl.map((u) => {
                const total = s.allocations.filter((a) => a.userId === u.id).reduce((n, a) => n + +a.pct, 0);
                return (
                  <tr key={u.id}>
                    <td><Avatar s={s} id={u.id} size={22} showName /></td>
                    {s.projects.map((p) => {
                      const a = s.allocations.find((x) => x.userId === u.id && x.projectId === p.id);
                      return <td key={p.id} className="num"><input className="cell" type="number" min="0" max="100" step="5" disabled={!admin} aria-label={`${u.name} on ${p.code}`} value={a ? a.pct : ''} placeholder="0" onChange={(e) => update((st) => { const x = st.allocations.find((y) => y.userId === u.id && y.projectId === p.id); const v = +e.target.value || 0; if (x) x.pct = v; else st.allocations.push({ id: uid('al'), userId: u.id, projectId: p.id, pct: v }); }, { action: 'Allocation changed', detail: `${u.name} on ${p.code}: ${e.target.value || 0}%`, projectId: p.id })} /></td>;
                    })}
                    <td className={'num' + (total > 100 ? ' err-text' : '')}><strong>{total}%</strong></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          </Panel>
          <Panel title="Load" sub="Over 100% is overcommitted"><Capacity s={s} full /></Panel>
        </div>
      )}
      {tab === 'raci' && (
        <Panel title="Responsibility matrix" sub="Accountable roles on every project" pad={false}>
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Role</th>{s.projects.map((p) => <th key={p.id}>{p.code}<div className="muted small">{p.kind === 'internal' ? 'Internal' : 'External'}</div></th>)}</tr></thead>
            <tbody>{TEAM_SLOTS.map(([k, l]) => <tr key={k}><td><strong>{l}</strong></td>{s.projects.map((p) => <td key={p.id} className="small">{p.team[k] ? userName(s, p.team[k]) : <span className="muted">–</span>}</td>)}</tr>)}</tbody>
          </table></div>
        </Panel>
      )}
      {edit && (
        <Modal title={`Edit ${edit.name}`} onClose={() => setEdit(null)} footer={<><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn kind="primary" disabled={!edit.name.trim()} onClick={() => { update((st) => { Object.assign(st.users.find((u) => u.id === edit.id), { name: edit.name.trim(), title: edit.title, skills: edit.skills.split(',').map((x) => x.trim()).filter(Boolean), capacity: +edit.capacity, note: edit.note }); }, { action: 'Staff details edited', detail: edit.name }); toast('Details saved'); setEdit(null); }}>Save details</Btn></>}>
          <div className="form-grid">
            <Field label="Name" hint={edit.id === 'subha' ? 'The source deck spells this name two ways. Confirm the correct spelling, then clear the note.' : ''}><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Role"><input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="Skills (comma separated)" wide><input value={edit.skills} onChange={(e) => setEdit({ ...edit, skills: e.target.value })} /></Field>
            <Field label="Hours per week"><input type="number" value={edit.capacity} onChange={(e) => setEdit({ ...edit, capacity: e.target.value })} /></Field>
            <Field label="Administrator note"><input value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MisbahView() {
  const { s } = useStore();
  const recent = s.audit.filter((a) => a.projectId).slice(0, 8);
  return (
    <Panel title="Consolidated project updates" sub="Misbah's view of the latest recorded changes across every team">
      {recent.length === 0 ? <p className="muted small">No project updates recorded yet.</p> : <ul className="audit">{recent.map((a) => <li key={a.id}><Avatar s={s} id={a.userId} size={22} /><div><strong>{a.action}</strong><span className="small">{(byId(s.projects, a.projectId) || {}).name}. {a.detail}</span></div></li>)}</ul>}
    </Panel>
  );
}
