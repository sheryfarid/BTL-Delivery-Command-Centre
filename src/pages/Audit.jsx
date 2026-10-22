import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { Panel, Avatar, Empty } from '../ui.jsx';
import { userName, fmtTime, byId } from '../engine.js';

export default function Audit() {
  const { s } = useStore();
  const [q, setQ] = useState('');
  const [pid, setPid] = useState('all');
  const list = s.audit.filter((a) => (pid === 'all' || a.projectId === pid) && (a.action + a.detail + userName(s, a.userId)).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="stack">
      <div className="page-h"><div><h1>Audit log</h1><p className="muted">Every change, sign-off and gate decision with who made it and when. Entries cannot be edited.</p></div></div>
      <div className="filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by action, detail or person" aria-label="Filter audit log" />
        <select value={pid} onChange={(e) => setPid(e.target.value)} aria-label="Project"><option value="all">All projects</option>{s.projects.map((p) => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select>
      </div>
      <Panel pad={false}>
        {list.length === 0 ? <Empty icon="history" title="No matching entries" /> : (
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Project</th><th>Detail</th></tr></thead>
            <tbody>{list.map((a) => <tr key={a.id}><td className="small nowrap">{fmtTime(a.at)}</td><td><Avatar s={s} id={a.userId} size={22} showName /></td><td><strong>{a.action}</strong></td><td className="small">{a.projectId ? (byId(s.projects, a.projectId) || {}).name : '–'}</td><td className="small">{a.detail}</td></tr>)}</tbody>
          </table></div>
        )}
      </Panel>
    </div>
  );
}
