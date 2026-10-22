// Workflow restriction tests for the delivery engine. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../src/seed.js';
import { exitChecks, gateState, decisionBlocker, phasesFor, can, canSign, byId, health, activeWave } from '../src/engine.js';

const S = () => seed();
const P = (s, id) => byId(s.projects, id);
const W = (s, pid) => activeWave(s, pid);
const blank = { comment: '', conditions: [], riskAccepted: false };

test('external projects include Discovery, internal projects start at Design', () => {
  const s = S();
  assert.equal(phasesFor(P(s, 'pa'), { num: 1 })[0], 'discovery');
  assert.equal(phasesFor(P(s, 'pb'), { num: 1 })[0], 'design');
});

test('Discovery runs once: later external waves start at Design', () => {
  const s = S();
  assert.equal(phasesFor(P(s, 'pa'), { num: 2 })[0], 'design');
});

test('Prove cannot exit with open high defects, failing tests or unsigned UAT', () => {
  const s = S(); const p = P(s, 'pc'); const w = W(s, 'pc');
  const failing = exitChecks(s, p, w).filter((c) => !c.ok).map((c) => c.id);
  for (const id of ['trace', 'fail', 'def', 'prove.uat']) assert.ok(failing.includes(id), id);
  assert.equal(health(s, p).rag, 'red');
});

test('Build cannot exit while work is unfinished or a demo is unaccepted', () => {
  const s = S(); const p = P(s, 'pb'); const w = W(s, 'pb');
  const failing = exitChecks(s, p, w).filter((c) => !c.ok).map((c) => c.id);
  assert.deepEqual(failing.sort(), ['blk', 'demo', 'scope']);
});

test('Gate decision is blocked until every approver signs', () => {
  const s = S(); const p = P(s, 'pa'); const w = W(s, 'pa');
  assert.match(decisionBlocker(s, p, w, 'proceed', blank), /Every approver must sign/);
});

test('Proceed needs all eight checks; conditions need owners, dates and risk acceptance', () => {
  const s = S(); const p = P(s, 'pa'); const w = W(s, 'pa');
  for (const [spec] of [['businessOwner'], ['architect'], ['qaLead'], ['deliveryLead'], ['partner']]) w.gate.approvals[spec] = { userId: p.team[spec], decision: 'approve', at: 'x' };
  assert.match(decisionBlocker(s, p, w, 'proceed', blank), /Proceed needs all eight checks/);
  assert.match(decisionBlocker(s, p, w, 'conditions', { ...blank, conditions: [{ text: 'Write plan', owner: '', due: '' }] }), /owner and a due date/);
  assert.match(decisionBlocker(s, p, w, 'conditions', { ...blank, conditions: [{ text: 'Write plan', owner: 'misbah', due: '2026-11-01' }] }), /accepts the residual risk/);
  assert.equal(decisionBlocker(s, p, w, 'conditions', { comment: '', conditions: [{ text: 'Write plan', owner: 'misbah', due: '2026-11-01' }], riskAccepted: true }), null);
  w.gate.nextPlan = 'Wave 3'; w.gate.compliance = { by: 'tabs', at: 'x' };
  assert.equal(gateState(s, p, w).failed.length, 0);
  assert.equal(decisionBlocker(s, p, w, 'proceed', blank), null);
});

test('A rejection allows only Stop or re-plan', () => {
  const s = S(); const p = P(s, 'pa'); const w = W(s, 'pa');
  w.gate.approvals.partner = { userId: 'rizwan', decision: 'reject', at: 'x' };
  assert.match(decisionBlocker(s, p, w, 'conditions', blank), /Only Stop/);
  assert.equal(decisionBlocker(s, p, w, 'stop', { ...blank, comment: 'Scope changed' }), null);
});

test('Nobody signs on behalf of someone else', () => {
  const s = S(); const p = P(s, 'pa');
  assert.equal(canSign(byId(s.users, 'misbah'), p, 'businessOwner'), false);
  assert.equal(canSign(byId(s.users, 'helen'), p, 'businessOwner'), true);
  assert.equal(canSign(byId(s.users, 'admin'), p, 'partner'), false);
});

test('Internal gate uses the partner model', () => {
  const s = S(); const p = P(s, 'pb'); const w = W(s, 'pb');
  assert.deepEqual(gateState(s, p, w).approvals.map((a) => a.userId), ['munir', 'tabs', 'rizwan']);
});

test('Client users see only their own projects and no budgets', () => {
  const s = S(); const priya = byId(s.users, 'priya');
  assert.equal(can(priya, P(s, 'pc'), 'view'), true);
  assert.equal(can(priya, P(s, 'pa'), 'view'), false);
  assert.equal(can(priya, P(s, 'pc'), 'budget'), false);
  assert.equal(can(priya, P(s, 'pc'), 'advance'), false);
});
