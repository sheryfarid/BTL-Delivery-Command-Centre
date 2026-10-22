import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { Panel, Pill, Icon, Btn, Empty, Modal, Field, Avatar } from '../ui.jsx';
import { SPRINT_DAYS, WORK_STATUSES, DOD_CHECKS } from '../methodology.js';
import { can, uid, nowISO, userName, fmtDate, fmtTime, reqsOf, itemsOf, sprintsOf, daysBetween, TODAY, byId } from '../engine.js';

export const sprintDay = (sp) => Math.max(1, Math.min(10, Math.floor((daysBetween(sp.start, TODAY) * 10) / 14) + 1));

export function BuildWS({ p, w, ro }) {
  const { s, me, update, toast } = useStore();
  const lock = ro || !can(me, p, 'edit');
  const sprints = sprintsOf(s, w.id);
  const active = sprints.find((x) => x.status === 'active');
  const items = itemsOf(s, w.id);
  const reqs = reqsOf(s, w.id);
  const [view, setView] = useState(active ? 'sprint' : 'all');
  const [form, setForm] = useState(null);
  const [demo, setDemo] = useState(null);
  const [closeSp, setCloseSp] = useState(null);
  const [drag, setDrag] = useState(null);
  const day = active ? sprintDay(active) : 0;
  const shown = view === 'sprint' && active ? items.filter((i) => i.sprintId === active.id) : items;
  const people = s.users.filter((u) => u.org === 'btl' && u.capacity > 0);
  const act = (fn, action, detail) => update(fn, { action, detail, projectId: p.id });

  function move(item, status) {
    if (item.status === status) return;
    if (status === 'Done') {
      const missing = DOD_CHECKS.filter(([k]) => !item.dod[k]).map(([, l]) => l.toLowerCase());
      if (missing.length) { toast(`${item.code} cannot be Done. Definition of done not met: ${missing.join(', ')}.`, 'err'); return; }
      if (item.blocked) { toast(`${item.code} is blocked. Clear the blocker first.`, 'err'); return; }
    }
    act((st) => { st.workItems.find((x) => x.id === item.id).status = status; }, 'Work item moved', `${item.code} ${item.status} to ${status}`);
  }

  function saveItem() {
    const f = form;
    if (f.status === 'Done' && DOD_CHECKS.some(([k]) => !f.dod[k])) { toast('Tick every definition-of-done check before marking Done.', 'err'); return; }
    act((st) => {
      if (f.id) Object.assign(st.workItems.find((x) => x.id === f.id), f);
      else st.workItems.push({ ...f, id: uid('wi'), waveId: w.id, code: `${p.code.split('-')[0]}-${200 + st.workItems.length}` });
    }, f.id ? 'Work item updated' : 'Work item added to backlog', f.title);
    setForm(null);
  }

  const canPlanInto = active && day <= 1;

  return (
    <div className="stack">
      <Panel title={active ? `Sprint ${active.num}: day ${day} of 10` : 'No sprint running'} sub={active ? `${active.goal || 'No sprint goal'}. Started ${fmtDate(active.start)}.` : 'Plan the next sprint from the prioritised backlog.'}
        actions={!lock && (active
          ? <>{can(me, p, 'advance') && <Btn small onClick={() => setDemo({ sp: active, notes: active.demo.notes || '' })}>{active.demo.notes ? 'Edit demo notes' : 'Record demo notes'}</Btn>}{can(me, p, 'advance') && <Btn small kind="primary" onClick={() => setCloseSp({ sp: active, retro: active.retro || '' })}>Close sprint</Btn>}</>
          : can(me, p, 'advance') && <Btn small kind="primary" icon="plus" onClick={() => act((st) => { st.sprints.push({ id: uid('sp'), waveId: w.id, num: sprints.length + 1, start: TODAY, status: 'active', goal: '', demo: { notes: '', acceptedBy: null, at: null }, retro: '' }); }, 'Sprint started', `Sprint ${sprints.length + 1}`)}>Start sprint {sprints.length + 1}</Btn>)}>
        <ol className="sprint-line">
          {SPRINT_DAYS.map(([name, days, desc, a, b]) => <li key={name} className={active && day >= a && day <= b ? 'now' : active && day > b ? 'past' : ''}><strong>{name}</strong><span className="small">{days}</span><span className="small muted">{desc}</span></li>)}
        </ol>
        {active && active.demo.notes && (
          <div className="demo-box">
            <div><strong>Demo notes</strong><p className="small">{active.demo.notes}</p></div>
            {active.demo.acceptedBy ? <Pill tone="green">Accepted by {userName(s, active.demo.acceptedBy)}</Pill>
              : can(me, p, 'acceptDemo') ? <Btn small kind="primary" onClick={() => act((st) => { const x = st.sprints.find((y) => y.id === active.id); x.demo.acceptedBy = me.id; x.demo.at = nowISO(); }, 'Sprint demo accepted', `Sprint ${active.num}`)}>Accept demo</Btn>
              : <Pill tone="amber">Waiting for {userName(s, p.team.businessOwner)}</Pill>}
          </div>
        )}
      </Panel>

      <div className="board-bar">
        <div className="seg seg-sm">
          <button className={view === 'sprint' ? 'on' : ''} disabled={!active} onClick={() => setView('sprint')}>Current sprint</button>
          <button className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>Whole wave</button>
        </div>
        <span className="muted small">Change control: new requests go on the backlog, not into the running sprint.</span>
        {!lock && <Btn small kind="primary" icon="plus" onClick={() => setForm({ title: '', status: 'Backlog', owner: '', priority: 'Medium', estimate: 3, reqId: reqs[0] ? reqs[0].id : '', sprintId: null, dod: { built: false, reviewed: false, meetsDesign: false }, pr: '', blocked: false, blockReason: '', notes: '' })}>Add to backlog</Btn>}
      </div>

      <div className="board" role="list">
        {WORK_STATUSES.map((st) => {
          const col = shown.filter((i) => i.status === st);
          return (
            <div key={st} className={'col' + (drag ? ' drop' : '')} onDragOver={(e) => !lock && e.preventDefault()} onDrop={() => { const it = items.find((x) => x.id === drag); if (it && !lock) move(it, st); setDrag(null); }}>
              <div className="col-h"><strong>{st}</strong><span>{col.length}</span></div>
              {col.map((i) => (
                <article key={i.id} className={'card' + (i.blocked ? ' blocked' : '')} draggable={!lock} onDragStart={() => setDrag(i.id)} onDragEnd={() => setDrag(null)} onClick={() => !lock && setForm({ ...i, dod: { ...i.dod } })} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && !lock && setForm({ ...i, dod: { ...i.dod } })}>
                  <div className="card-top"><span className="muted small">{i.code}</span><Pill tone={i.priority === 'High' ? 'amber' : 'neutral'}>{i.priority}</Pill></div>
                  <p>{i.title}</p>
                  {i.blocked && <p className="small err-text"><Icon name="alert" size={12} /> {i.blockReason || 'Blocked'}</p>}
                  <div className="card-f">
                    <Avatar s={s} id={i.owner} size={20} />
                    <span className="small muted">{i.estimate} pts</span>
                    <span className="dod" title="Definition of done">{DOD_CHECKS.map(([k, l]) => <i key={k} className={i.dod[k] ? 'on' : ''} title={l} />)}</span>
                  </div>
                  {!lock && (
                    <select className="card-move" aria-label={`Move ${i.code}`} value={i.status} onClick={(e) => e.stopPropagation()} onChange={(e) => move(i, e.target.value)}>
                      {WORK_STATUSES.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  )}
                </article>
              ))}
            </div>
          );
        })}
      </div>

      <Panel title="Sprint history" pad={false}>
        {sprints.length === 0 ? <Empty title="No sprints yet" /> : (
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Sprint</th><th>Started</th><th className="num">Points done</th><th>Demo</th><th>Retrospective</th></tr></thead>
            <tbody>{sprints.map((sp) => <tr key={sp.id}><td>Sprint {sp.num} {sp.status === 'active' && <Pill tone="teal">Running</Pill>}</td><td>{fmtDate(sp.start)}</td><td className="num">{items.filter((i) => i.sprintId === sp.id && i.status === 'Done').reduce((n, i) => n + +i.estimate, 0)}</td><td>{sp.demo.acceptedBy ? <span className="ok-text small">Accepted by {userName(s, sp.demo.acceptedBy)}</span> : <span className="small muted">{sp.demo.notes ? 'Awaiting acceptance' : 'Not held'}</span>}</td><td className="small">{sp.retro || <span className="muted">–</span>}</td></tr>)}</tbody>
          </table></div>
        )}
      </Panel>

      {form && (
        <Modal wide title={form.id ? `${form.code} ${form.title}` : 'Add to backlog'} onClose={() => setForm(null)} footer={<><Btn onClick={() => setForm(null)}>Cancel</Btn><Btn kind="primary" disabled={!form.title.trim()} onClick={saveItem}>Save work item</Btn></>}>
          <div className="form-grid">
            <Field label="Title" wide><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Requirement"><select value={form.reqId} onChange={(e) => setForm({ ...form, reqId: e.target.value })}><option value="">Not linked</option>{reqs.map((r) => <option key={r.id} value={r.id}>{r.code} {r.title}</option>)}</select></Field>
            <Field label="Owner"><select value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}><option value="">Unassigned</option>{people.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
            <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{WORK_STATUSES.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Priority"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{['High', 'Medium', 'Low'].map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Estimate (points)"><input type="number" min="0" value={form.estimate} onChange={(e) => setForm({ ...form, estimate: e.target.value })} /></Field>
            <Field label="Sprint" hint={active && !canPlanInto ? `Sprint ${active.num} is past planning day; new work waits for the next sprint.` : ''}>
              <select value={form.sprintId || ''} onChange={(e) => setForm({ ...form, sprintId: e.target.value || null })}>
                <option value="">Backlog</option>
                {sprints.filter((x) => x.status === 'active' && (canPlanInto || form.sprintId === x.id)).map((x) => <option key={x.id} value={x.id}>Sprint {x.num}</option>)}
              </select>
            </Field>
            <Field label="Pull request"><input value={form.pr} onChange={(e) => setForm({ ...form, pr: e.target.value })} placeholder="PR #123" /></Field>
            <Field label="Development and test notes" wide><textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <fieldset className="field field-wide"><legend className="field-l">Definition of done</legend>
              {DOD_CHECKS.map(([k, l]) => <label key={k} className="checkline"><input type="checkbox" checked={!!form.dod[k]} onChange={(e) => setForm({ ...form, dod: { ...form.dod, [k]: e.target.checked } })} />{l}</label>)}
            </fieldset>
            <label className="checkline field-wide"><input type="checkbox" checked={form.blocked} onChange={(e) => setForm({ ...form, blocked: e.target.checked })} />Blocked</label>
            {form.blocked && <Field label="What is blocking it" wide><input value={form.blockReason} onChange={(e) => setForm({ ...form, blockReason: e.target.value })} /></Field>}
          </div>
        </Modal>
      )}
      {demo && (
        <Modal title={`Sprint ${demo.sp.num} demo`} onClose={() => setDemo(null)} footer={<><Btn onClick={() => setDemo(null)}>Cancel</Btn><Btn kind="primary" disabled={!demo.notes.trim()} onClick={() => { act((st) => { st.sprints.find((x) => x.id === demo.sp.id).demo.notes = demo.notes; st.evidence.push({ id: uid('ev'), projectId: p.id, waveId: w.id, phase: 'build', type: 'Sprint Demo Notes', title: `Sprint ${demo.sp.num} demo notes`, version: '1.0', owner: me.id, status: 'In review', at: nowISO(), ref: '', file: null }); }, 'Sprint demo notes recorded', `Sprint ${demo.sp.num}`); setDemo(null); }}>Save demo notes</Btn></>}>
          <Field label="What was shown, and the business owner's feedback"><textarea rows="5" value={demo.notes} onChange={(e) => setDemo({ ...demo, notes: e.target.value })} /></Field>
        </Modal>
      )}
      {closeSp && (
        <Modal title={`Close sprint ${closeSp.sp.num}`} onClose={() => setCloseSp(null)} footer={<><Btn onClick={() => setCloseSp(null)}>Cancel</Btn><Btn kind="primary" disabled={!closeSp.sp.demo.acceptedBy || !closeSp.retro.trim()} onClick={() => { act((st) => { const x = st.sprints.find((y) => y.id === closeSp.sp.id); x.status = 'closed'; x.retro = closeSp.retro; st.workItems.filter((i) => i.sprintId === x.id && i.status !== 'Done').forEach((i) => { i.sprintId = null; }); }, 'Sprint closed', `Sprint ${closeSp.sp.num}. Unfinished items returned to the backlog.`); setCloseSp(null); setView('all'); }}>Close sprint</Btn></>}>
          {!closeSp.sp.demo.acceptedBy && <div className="note note-warn">The business owner must accept the sprint demo before the sprint closes.</div>}
          <p className="small muted">Unfinished items go back to the backlog for the next sprint plan.</p>
          <Field label="Retrospective: what to keep, what to change"><textarea rows="4" value={closeSp.retro} onChange={(e) => setCloseSp({ ...closeSp, retro: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}
