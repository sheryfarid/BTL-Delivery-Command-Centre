import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { Panel, Pill, Btn, Empty, Modal, Field, Icon, Tabs } from '../ui.jsx';
import { DOC_TYPES, PHASE_META, PHASES } from '../methodology.js';
import { byId, userName, fmtDate, uid, nowISO, canView, can, wavesOf, isClientUser } from '../engine.js';

const TEMPLATES = {
  'Discovery Report': ['Business goals and success measures', 'Users, processes and priorities', 'Systems, access and constraints', 'Data profile and gaps', 'Out of scope', 'Waves, team, timeline and cost', 'Risks and dependencies', 'Client sign-off'],
  'Solution Design Pack': ['Solution architecture and hosting', 'Data model and source-to-target mapping', 'Interfaces, APIs and reconciliation', 'Security, privacy and residency', 'AI and model design: baseline and target', 'Acceptance criteria per requirement', 'Business owner and IT sign-off'],
  'Test Plan': ['Scope and test data', 'Six layers: functional, integration, data quality, security and speed, model accuracy, UAT', 'Defect severity rules', 'Tester independence', 'Exit criteria'],
  'Operational Runbook': ['Service overview', 'Monitoring and alerts', 'Common incidents and fixes', 'Rollback procedure', 'Escalation and support hours'],
  'Value Report': ['Baseline from Design', 'Adoption: active users, task completion, drop-off', 'Value against target with source evidence', 'User feedback', 'Gap plan if targets are not met'],
  'Gate Decision Record': ['Checklist status', 'Approvals by role', 'Decision', 'Conditions with owners and dates', 'Lessons learned', 'Next-wave plan'],
};

export default function Vault() {
  const { s, me, route, update, toast } = useStore();
  const projects = s.projects.filter((p) => canView(me, p));
  const [pid, setPid] = useState(route.projectId && projects.some((p) => p.id === route.projectId) ? route.projectId : 'all');
  const [phase, setPhase] = useState('all');
  const [tab, setTab] = useState('docs');
  const [form, setForm] = useState(null);
  const [tpl, setTpl] = useState(null);
  const rows = s.evidence.filter((e) => projects.some((p) => p.id === e.projectId) && (pid === 'all' || e.projectId === pid) && (phase === 'all' || e.phase === phase)).sort((a, b) => b.at.localeCompare(a.at));

  function save() {
    update((st) => {
      st.evidence.push({ id: uid('ev'), projectId: form.projectId, waveId: form.waveId, phase: form.phase, type: form.type, title: form.title, version: form.version, owner: me.id, status: 'In review', at: nowISO(), ref: form.ref, file: form.file });
    }, { action: 'Evidence added', detail: `${form.type}: ${form.title} v${form.version}`, projectId: form.projectId });
    toast('Evidence added for review');
    setForm(null);
  }
  function approve(e) {
    if (e.owner === me.id) { toast('The author cannot approve their own evidence.', 'err'); return; }
    update((st) => { const x = st.evidence.find((y) => y.id === e.id); x.status = 'Approved'; x.approvedBy = me.id; x.approvedAt = nowISO(); }, { action: 'Evidence approved', detail: `${e.title} v${e.version}`, projectId: e.projectId });
  }

  return (
    <div className="stack">
      <div className="page-h">
        <div><h1>Evidence vault</h1><p className="muted">Controlled delivery documents and sign-offs, linked to project, wave and phase.</p></div>
        {!isClientUser(me) && <Btn kind="primary" icon="upload" onClick={() => { const p = projects[0]; setForm({ projectId: p.id, waveId: wavesOf(s, p.id).slice(-1)[0].id, phase: 'design', type: 'Solution Design Pack', title: '', version: '1.0', ref: '', file: null }); }}>Add evidence</Btn>}
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[['docs', 'Documents and evidence', rows.length], ['tpl', 'Templates']]} />
      {tab === 'docs' && (
        <>
          <div className="filters">
            <select value={pid} onChange={(e) => setPid(e.target.value)} aria-label="Project"><option value="all">All projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select>
            <select value={phase} onChange={(e) => setPhase(e.target.value)} aria-label="Phase"><option value="all">All phases</option>{PHASES.map((ph) => <option key={ph} value={ph}>{PHASE_META[ph].label}</option>)}</select>
          </div>
          <Panel pad={false}>
            {rows.length === 0 ? <Empty icon="file" title="No evidence recorded">Sign-offs, demo notes and gate records are added here automatically.</Empty> : (
              <div className="table-wrap"><table className="tbl">
                <thead><tr><th>Document</th><th>Type</th><th>Project and wave</th><th>Phase</th><th>Version</th><th>Owner</th><th>Status</th><th /></tr></thead>
                <tbody>{rows.map((e) => {
                  const p = byId(s.projects, e.projectId); const w = byId(s.waves, e.waveId);
                  return (
                    <tr key={e.id}>
                      <td><strong>{e.title}</strong>{e.ref && <div className="muted small">{e.ref}</div>}{e.file && <div className="small"><Icon name="file" size={12} /> {e.file.name} ({Math.ceil(e.file.size / 1024)} KB)</div>}</td>
                      <td className="small">{e.type}</td>
                      <td className="small">{p.name}{w && <div className="muted">Wave {w.num}</div>}</td>
                      <td className="small">{PHASE_META[e.phase] ? PHASE_META[e.phase].label : e.phase}</td>
                      <td className="small">v{e.version}</td>
                      <td className="small">{userName(s, e.owner)}<div className="muted">{fmtDate(e.at)}</div></td>
                      <td><Pill tone={e.status === 'Approved' ? 'green' : 'amber'}>{e.status}</Pill>{e.demo && <Pill tone="demo">Demo</Pill>}</td>
                      <td>{e.status !== 'Approved' && can(me, p, 'edit') && <Btn small onClick={() => approve(e)}>Approve</Btn>}</td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            )}
          </Panel>
        </>
      )}
      {tab === 'tpl' && (
        <div className="tpl-grid">
          {DOC_TYPES.map((t) => <button key={t} className="tpl" onClick={() => setTpl(t)}><Icon name="file" /><strong>{t}</strong><span className="small muted">{TEMPLATES[t] ? `${TEMPLATES[t].length} sections` : 'Standard BTL layout'}</span></button>)}
        </div>
      )}
      {tpl && (
        <Modal title={`${tpl} template`} onClose={() => setTpl(null)}>
          <article className="doc"><p className="doc-k">Business Technique Limited</p><h2>{tpl}</h2><ol>{(TEMPLATES[tpl] || ['Purpose', 'Scope', 'Content', 'Owner and reviewers', 'Approval']).map((x) => <li key={x}>{x}</li>)}</ol></article>
        </Modal>
      )}
      {form && (
        <Modal title="Add evidence" onClose={() => setForm(null)} footer={<><Btn onClick={() => setForm(null)}>Cancel</Btn><Btn kind="primary" disabled={!form.title.trim() || (!form.ref.trim() && !form.file)} onClick={save}>Add for review</Btn></>}>
          <div className="form-grid">
            <Field label="Project"><select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value, waveId: wavesOf(s, e.target.value).slice(-1)[0].id })}>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select></Field>
            <Field label="Wave"><select value={form.waveId} onChange={(e) => setForm({ ...form, waveId: e.target.value })}>{wavesOf(s, form.projectId).map((w) => <option key={w.id} value={w.id}>Wave {w.num}</option>)}</select></Field>
            <Field label="Phase"><select value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}>{PHASES.map((ph) => <option key={ph} value={ph}>{PHASE_META[ph].label}</option>)}</select></Field>
            <Field label="Document type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{DOC_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Title" wide><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Version"><input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></Field>
            <Field label="Location or reference" hint="SharePoint path, repository link or test run ID"><input value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} /></Field>
            <Field label="Attach file" wide hint="The file name, size and type are recorded with the evidence. Storing file contents needs the document-storage integration."><input type="file" onChange={(e) => { const f = e.target.files[0]; setForm({ ...form, file: f ? { name: f.name, size: f.size, type: f.type } : null }); }} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
