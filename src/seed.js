import { TODAY, addDays, uid } from './engine.js';

const d = (n) => addDays(TODAY, n);
const t = (n, h = 10) => new Date(d(n) + `T${String(h).padStart(2, '0')}:00:00`).toISOString();

export function newWave({ projectId, num, name, scope = '', phase, status = 'active', effort = 0, milestone = '' }) {
  return {
    id: uid('w'), projectId, num, name, scope, phase, status, effort, milestone,
    completedPhases: [], phaseLog: [{ phase, at: new Date().toISOString() }],
    discovery: { stakeholders: [], systems: [], dataFindings: [], exclusions: '', plan: '', cost: 0, workshops: [] },
    design: { areas: {}, components: [] },
    prove: { model: { name: 'Accuracy', unit: '%', baseline: '', target: '', actual: '', higherBetter: true, source: '' } },
    deploy: { version: '', window: '', prereqs: {}, steps: {} },
    adopt: { training: [], improvements: [], remediation: '' },
    gate: { lessons: '', nextPlan: '', compliance: null, approvals: {}, decision: null },
  };
}

const people = [
  // Partners: three equal partners, as on the reporting-structure slide.
  ['munir', 'Munir', 'Partner, AI, Technology and Architecture', 'Partners', null, ['Architecture', 'AI', 'Cloud']],
  ['rizwan', 'Rizwan', 'Partner, Strategy, Programme and Marketing', 'Partners', null, ['Programme', 'Strategy', 'Marketing']],
  ['tabs', 'Tabs', 'Partner, Quality, Delivery and Support', 'Partners', null, ['Quality', 'Delivery', 'Support']],
  ['anusha', 'Anusha', 'AI Engineering Lead', 'AI Engineering', 'munir', ['LLM', 'Evaluation', 'Python']],
  ['subha', 'Subha', 'Infrastructure', 'Infrastructure', 'munir', ['Azure', 'Networking', 'Security'], 'Spelled Subha and Shubha in the source deck: an administrator should confirm.'],
  ['nikhil', 'Nikhil', 'Infrastructure', 'Infrastructure', 'munir', ['Kubernetes', 'CI/CD', 'Monitoring']],
  ['areesha', 'Areesha', 'AI Engineer', 'AI Engineering', 'munir', ['NLP', 'Data science']],
  ['nabeel', 'Nabeel', 'AI Engineer', 'AI Engineering', 'munir', ['ML Ops', 'Python']],
  ['sheryaar', 'Sheryaar', 'Development and Customer Service', 'Quality and Software', 'tabs', ['React', 'Node', 'Support']],
  ['mariam', 'Mariam', 'Tester', 'Quality and Software', 'tabs', ['Test design', 'Automation']],
  ['muskaan', 'Muskaan', 'Tester and Junior Developer', 'Quality and Software', 'tabs', ['Testing', 'JavaScript']],
  ['misbah', 'Misbah', 'PM / Lead', 'Project and Marketing', 'rizwan', ['Delivery', 'Agile', 'Reporting']],
  ['dayim', 'Dayim', 'SEO', 'Project and Marketing', 'rizwan', ['SEO', 'Content']],
  ['talha', 'Talha', 'Social Media Marketing', 'Project and Marketing', 'rizwan', ['Social', 'Campaigns']],
];

export function seed() {
  const users = people.map(([id, name, title, team, reportsTo, skills, note]) => ({ id, name, title, team, reportsTo, skills, note: note || '', org: 'btl', capacity: 37.5, globalRole: null }));
  users.push({ id: 'admin', name: 'Platform Admin', title: 'Platform Administrator', team: 'Administration', reportsTo: null, skills: [], note: '', org: 'btl', capacity: 0, globalRole: 'admin' });
  const clients = [
    { id: 'northwind', name: 'Northwind Health (demo)', industry: 'Healthcare' },
    { id: 'meridian', name: 'Meridian Logistics (demo)', industry: 'Logistics' },
    { id: 'halden', name: 'Halden Council (demo)', industry: 'Public sector' },
  ];
  users.push(
    { id: 'helen', name: 'Helen Carter', title: 'Head of Clinical Operations', team: 'Client', org: 'northwind', skills: [], capacity: 0, note: 'Demo client user' },
    { id: 'james', name: 'James Okafor', title: 'Chief Digital Officer', team: 'Client', org: 'northwind', skills: [], capacity: 0, note: 'Demo client user' },
    { id: 'priya', name: 'Priya Shah', title: 'Warehouse Operations Director', team: 'Client', org: 'meridian', skills: [], capacity: 0, note: 'Demo client user' },
    { id: 'owen', name: 'Owen Price', title: 'COO', team: 'Client', org: 'meridian', skills: [], capacity: 0, note: 'Demo client user' },
    { id: 'grace', name: 'Grace Lindqvist', title: 'Director of Digital Services', team: 'Client', org: 'halden', skills: [], capacity: 0, note: 'Demo client user' },
  );

  const s = { version: 3, users, clients, projects: [], waves: [], requirements: [], signoffs: [], sprints: [], workItems: [], tests: [], defects: [], metrics: [], raid: [], evidence: [], audit: [], allocations: [] };
  const so = (waveId, key, userId, at, comment = '') => s.signoffs.push({ id: uid('so'), waveId, key, userId, at, comment, demo: true });
  const ev = (projectId, waveId, phase, type, title, version, owner, status, at) => s.evidence.push({ id: uid('ev'), projectId, waveId, phase, type, title, version, owner, status, at, ref: '', file: null, demo: true });

  // ============ Example A: external enterprise AI, wave 2 at the Gate ============
  const A = { id: 'pa', code: 'NWH-001', name: 'Clinical triage assistant', clientId: 'northwind', kind: 'external', classes: ['AI or ML', 'Healthcare technology', 'Software development'], industry: 'Healthcare', description: 'AI assistant that summarises referral letters and proposes a triage category for clinician review.', objective: 'Cut referral triage time by 40% without reducing triage accuracy.', budget: 420000, actual: 312400, start: d(-170), end: d(40), commercial: 'Fixed price per wave', plannedWaves: 3, demo: true,
    team: { partner: 'rizwan', deliveryLead: 'misbah', architect: 'munir', engLead: 'anusha', qaLead: 'tabs', infraLead: 'nikhil', supportLead: 'sheryaar', businessOwner: 'helen', sponsor: 'james' },
    members: ['areesha', 'nabeel', 'mariam', 'muskaan', 'subha'], createdAt: t(-170) };
  s.projects.push(A);
  const A1 = newWave({ projectId: A.id, num: 1, name: 'Referral intake and summarisation', scope: 'Ingest referral letters, summarise them and show the summary to triage clinicians.', phase: 'gate', status: 'closed', effort: 140 });
  A1.completedPhases = ['discovery', 'design', 'build', 'prove', 'deploy', 'adopt', 'gate'];
  A1.discovery = { stakeholders: [{ name: 'James Okafor', role: 'Client sponsor', org: 'Northwind' }, { name: 'Helen Carter', role: 'Business owner', org: 'Northwind' }], systems: [{ name: 'Referral inbox (NHS mail)', owner: 'Northwind IT', access: 'Granted' }, { name: 'Patient administration system', owner: 'Northwind IT', access: 'Read-only API' }], dataFindings: [{ dataset: 'Referral letters 2023 to 2025', finding: '12% are scanned images and need OCR', severity: 'Medium' }], exclusions: 'No automated triage decisions. Clinician makes every decision.', plan: 'Three waves: intake and summary, clinician review workflow, analytics.', cost: 420000, workshops: [] };
  A1.gate = { lessons: 'OCR quality on scanned letters needed an extra sprint.', nextPlan: 'Wave 2: clinician review workflow and triage suggestion.', compliance: { by: 'tabs', at: t(-84) }, approvals: { businessOwner: { userId: 'helen', decision: 'approve', at: t(-85), comment: '' }, architect: { userId: 'munir', decision: 'approve', at: t(-85), comment: '' }, qaLead: { userId: 'tabs', decision: 'approve', at: t(-85), comment: '' }, deliveryLead: { userId: 'misbah', decision: 'approve', at: t(-84), comment: '' }, partner: { userId: 'rizwan', decision: 'approve', at: t(-84), comment: '' } }, decision: { kind: 'proceed', by: 'misbah', at: t(-84, 15), comment: 'All checks met. Wave 2 approved to start.', conditions: [], riskAccepted: false } };
  A1.deploy.steps = Object.fromEntries(['readiness', 'gonogo', 'cutover', 'golive', 'hypercare', 'handover'].map((k, i) => [k, { by: 'nikhil', at: t(-120 + i * 4) }]));
  A1.adopt.improvements = ['Show source sentence for each summary point'];
  const A2 = newWave({ projectId: A.id, num: 2, name: 'Clinician review and triage suggestion', scope: 'Suggest a triage category with reasons; clinician accepts or overrides; every override is logged.', phase: 'gate', effort: 160, milestone: d(10) });
  A2.completedPhases = ['design', 'build', 'prove', 'deploy', 'adopt'];
  A2.phaseLog = [{ phase: 'design', at: t(-82) }, { phase: 'build', at: t(-70) }, { phase: 'prove', at: t(-40) }, { phase: 'deploy', at: t(-22) }, { phase: 'adopt', at: t(-12) }, { phase: 'gate', at: t(-2) }];
  A2.design.areas = Object.fromEntries(['architecture', 'data', 'integration', 'security', 'ai', 'acceptance'].map((k) => [k, { status: 'complete', notes: 'Signed in design pack v2.0', by: 'munir', at: t(-71) }]));
  A2.prove.model = { name: 'Triage category agreement with senior clinician', unit: '%', baseline: '78', target: '90', actual: '92.4', higherBetter: true, source: 'Back-test on 4,812 historical referrals, accuracy report v1.1' };
  A2.deploy = { version: '2.0.3', window: d(-18), prereqs: { rollback: { by: 'nikhil', at: t(-21) }, runbook: { by: 'sheryaar', at: t(-21) }, monitoring: { by: 'subha', at: t(-21) }, support: { by: 'tabs', at: t(-21) }, infraSec: { by: 'munir', at: t(-21) } }, steps: Object.fromEntries(['readiness', 'gonogo', 'cutover', 'golive', 'hypercare', 'handover'].map((k, i) => [k, { by: i < 4 ? 'nikhil' : 'sheryaar', at: t(-20 + i * 2) }])) };
  A2.adopt = { training: [{ id: uid('tr'), title: 'Clinician review workflow', date: d(-17), attendees: 34 }, { id: uid('tr'), title: 'Triage champions session', date: d(-14), attendees: 8 }], improvements: ['Bulk accept for routine referrals', 'Override reason picklist'], remediation: '' };
  A2.gate.lessons = 'Clinician champions doubled week-2 adoption. Involve them from Design next wave.';
  s.waves.push(A1, A2);
  const reqA = [
    ['REQ-01', 'Suggest a triage category for each referral with the reasons shown', 'Suggestion and three supporting reasons shown for 100% of processed referrals'],
    ['REQ-02', 'Clinician can accept or override every suggestion', 'Accept and override both available; override needs a reason'],
    ['REQ-03', 'Every override is logged for audit', 'Audit log contains user, time, original and final category for every override'],
    ['REQ-04', 'Suggestion appears within 5 seconds of the referral arriving', '95th percentile under 5 seconds at 500 referrals per hour'],
  ];
  reqA.forEach(([code, title, criteria], i) => {
    const id = 'ra' + i;
    s.requirements.push({ id, projectId: A.id, waveId: A2.id, code, title, type: i === 3 ? 'Non-functional' : 'Functional', priority: 'Must', status: 'approved', approvedBy: 'helen', criteria, designArea: i === 3 ? 'architecture' : i === 2 ? 'security' : 'ai' });
    s.tests.push({ id: uid('t'), waveId: A2.id, reqId: id, layer: i === 3 ? 'security' : 'functional', title: `Verify ${code}`, expected: criteria, actual: 'As expected', status: 'Pass', tester: 'mariam', runAt: t(-30), evidence: 'Test results v1.2' });
    s.tests.push({ id: uid('t'), waveId: A2.id, reqId: id, layer: 'uat', title: `UAT ${code}`, expected: criteria, actual: 'Accepted by clinicians', status: 'Pass', tester: 'helen', runAt: t(-25), evidence: 'Signed UAT scripts' });
  });
  s.tests.push({ id: uid('t'), waveId: A2.id, reqId: 'ra0', layer: 'model', title: 'Back-test triage suggestion on history', expected: '90% agreement', actual: '92.4% agreement', status: 'Pass', tester: 'areesha', runAt: t(-32), evidence: 'Model accuracy report v1.1' });
  const spA = [1, 2, 3].map((n) => ({ id: uid('sp'), waveId: A2.id, num: n, start: d(-70 + (n - 1) * 14), status: 'closed', goal: `Sprint ${n} of wave 2`, demo: { notes: 'Demo of review screen and suggestions', acceptedBy: 'helen', at: t(-58 + (n - 1) * 14) }, retro: '' }));
  s.sprints.push(...spA);
  [['Suggestion service', 'anusha', 'ra0'], ['Review screen', 'sheryaar', 'ra1'], ['Override audit log', 'muskaan', 'ra2'], ['Latency tuning', 'nabeel', 'ra3']].forEach(([title, owner, reqId], i) => s.workItems.push({ id: uid('wi'), waveId: A2.id, sprintId: spA[i % 3].id, code: `NWH-${101 + i}`, title, status: 'Done', owner, priority: 'High', estimate: 5, reqId, dod: { built: true, reviewed: true, meetsDesign: true }, pr: `PR #${212 + i}`, blocked: false, blockReason: '', notes: '' }));
  s.defects.push({ id: uid('d'), waveId: A2.id, code: 'DEF-031', title: 'Override reason not saved when tab changes', severity: 'High', status: 'Closed', owner: 'sheryaar', raisedBy: 'mariam', at: t(-28), history: [{ at: t(-27), by: 'sheryaar', text: 'Fixed' }, { at: t(-26), by: 'mariam', text: 'Retested and closed' }] });
  so(A2.id, 'design.business', 'helen', t(-71)); so(A2.id, 'design.itsec', 'munir', t(-71)); so(A2.id, 'prove.uat', 'helen', t(-23)); so(A2.id, 'deploy.tech', 'munir', t(-21)); so(A2.id, 'deploy.golive', 'helen', t(-21)); so(A2.id, 'adopt.value', 'helen', t(-3), 'Accepted. Time saving above target.');
  [['adoption', 'Weekly active clinicians', '', 0, 40, 46, true, 'Usage analytics export, week 3'], ['adoption', 'Referrals triaged in the tool', '%', 0, 80, 87, true, 'Referral system report'], ['value', 'Median triage time', 'min', 14, 8.4, 7.9, false, 'Time-and-motion study, 220 referrals'], ['value', 'Triage accuracy (audit sample)', '%', 91, 91, 93, true, 'Clinical audit, 150 referrals']].forEach(([kind, name, unit, baseline, target, actual, higherBetter, source]) => s.metrics.push({ id: uid('m'), waveId: A2.id, kind, name, unit, baseline, target, actual, higherBetter, source }));
  ev(A.id, A1.id, 'discovery', 'Discovery Report', 'Discovery report and delivery plan', '1.2', 'misbah', 'Approved', t(-150));
  ev(A.id, A2.id, 'design', 'Solution Design Pack', 'Design pack, wave 2', '2.0', 'munir', 'Approved', t(-71));
  ev(A.id, A2.id, 'prove', 'Model Accuracy Report', 'Triage back-test accuracy report', '1.1', 'anusha', 'Approved', t(-31));
  ev(A.id, A2.id, 'prove', 'UAT Evidence', 'Signed UAT scripts', '1.0', 'tabs', 'Approved', t(-23));
  ev(A.id, A2.id, 'deploy', 'Operational Runbook', 'Triage assistant runbook', '1.3', 'sheryaar', 'Approved', t(-21));
  ev(A.id, A2.id, 'deploy', 'Go-Live Report', 'Wave 2 go-live report', '1.0', 'misbah', 'Approved', t(-12));
  ev(A.id, A2.id, 'adopt', 'Value Report', 'Adoption and value report, wave 2', '1.0', 'misbah', 'Approved', t(-3));
  s.raid.push({ id: uid('r'), projectId: A.id, waveId: A2.id, kind: 'Risk', code: 'R-07', title: 'Model drift as referral templates change', owner: 'anusha', probability: 3, impact: 4, status: 'Open', due: d(30), mitigation: 'Monthly drift report against the back-test set', history: [] });
  s.raid.push({ id: uid('r'), projectId: A.id, waveId: A2.id, kind: 'Risk', code: 'R-08', title: 'Clinicians over-trust suggestions', owner: 'helen', probability: 2, impact: 5, status: 'Open', due: d(45), mitigation: 'Reasons always shown; override audit reviewed monthly', history: [] });
  s.raid.push({ id: uid('r'), projectId: A.id, waveId: A2.id, kind: 'Decision', code: 'D-04', title: 'Suggestions are advisory; clinician decision is final', owner: 'james', probability: 0, impact: 0, status: 'Closed', due: '', mitigation: '', history: [] });

  // ============ Example B: internal BTL feature, in Build ============
  const B = { id: 'pb', code: 'BTL-INT-04', name: 'BTL Insight: evidence summariser', clientId: null, kind: 'internal', classes: ['AI or ML', 'Software development'], industry: 'Internal product', description: 'New feature for the BTL platform that summarises research evidence packs with citations.', objective: 'Release a market-ready summariser feature to existing customers this quarter.', budget: 85000, actual: 41200, start: d(-40), end: d(55), commercial: 'Internal investment', plannedWaves: 2, demo: true,
    team: { partner: 'munir', deliveryLead: 'misbah', architect: 'munir', engLead: 'anusha', qaLead: 'tabs', infraLead: 'subha', supportLead: 'sheryaar', businessOwner: 'rizwan', sponsor: '' },
    members: ['areesha', 'nabeel', 'sheryaar', 'muskaan', 'mariam', 'nikhil', 'dayim', 'talha'], createdAt: t(-40) };
  s.projects.push(B);
  const B1 = newWave({ projectId: B.id, num: 1, name: 'Summariser with citations', scope: 'Upload an evidence pack, get a cited summary, export it.', phase: 'build', effort: 60, milestone: d(30) });
  B1.completedPhases = ['design'];
  B1.phaseLog = [{ phase: 'design', at: t(-40) }, { phase: 'build', at: t(-30) }];
  B1.design.areas = Object.fromEntries(['architecture', 'data', 'integration', 'security', 'ai', 'acceptance'].map((k) => [k, { status: 'complete', notes: 'Fit check against the existing platform', by: 'munir', at: t(-31) }]));
  B1.prove.model = { name: 'Citation precision', unit: '%', baseline: '', target: '95', actual: '', higherBetter: true, source: '' };
  s.waves.push(B1);
  [['REQ-01', 'Summarise an uploaded evidence pack', 'Summary produced for packs up to 200 pages in under 60 seconds'], ['REQ-02', 'Every summary sentence cites its source', '95% citation precision on the gold set'], ['REQ-03', 'Export the summary to Word and PDF', 'Export opens without errors in Word and Acrobat']].forEach(([code, title, criteria], i) => s.requirements.push({ id: 'rb' + i, projectId: B.id, waveId: B1.id, code, title, type: 'Functional', priority: 'Must', status: 'approved', approvedBy: 'rizwan', criteria, designArea: 'ai' }));
  so(B1.id, 'design.arch', 'munir', t(-31)); so(B1.id, 'design.testplan', 'tabs', t(-31)); so(B1.id, 'design.market', 'rizwan', t(-31));
  const spB1 = { id: 'spb1', waveId: B1.id, num: 1, start: d(-30), status: 'closed', goal: 'Upload and chunking pipeline', demo: { notes: 'Upload, chunking and first summaries shown.', acceptedBy: 'rizwan', at: t(-17) }, retro: 'Pair AI and platform work earlier.' };
  const spB2 = { id: 'spb2', waveId: B1.id, num: 2, start: d(-5), status: 'active', goal: 'Citations and export', demo: { notes: '', acceptedBy: null, at: null }, retro: '' };
  s.sprints.push(spB1, spB2);
  const wiB = [
    ['Upload and chunking pipeline', 'Done', 'nabeel', 'rb0', spB1.id, { built: true, reviewed: true, meetsDesign: true }],
    ['Summary prompt and evaluation harness', 'Done', 'anusha', 'rb0', spB1.id, { built: true, reviewed: true, meetsDesign: true }],
    ['Sentence-level citation linking', 'In Progress', 'areesha', 'rb1', spB2.id, { built: false, reviewed: false, meetsDesign: false }],
    ['Citation gold set (200 items)', 'Testing', 'muskaan', 'rb1', spB2.id, { built: true, reviewed: true, meetsDesign: false }],
    ['Word and PDF export', 'Code Review', 'sheryaar', 'rb2', spB2.id, { built: true, reviewed: false, meetsDesign: false }],
    ['Staging environment for summariser', 'Ready', 'subha', 'rb0', spB2.id, { built: false, reviewed: false, meetsDesign: false }],
    ['Usage telemetry for the feature', 'Backlog', 'nikhil', 'rb0', null, { built: false, reviewed: false, meetsDesign: false }],
  ];
  wiB.forEach(([title, status, owner, reqId, sprintId, dod], i) => s.workItems.push({ id: uid('wi'), waveId: B1.id, sprintId, code: `INS-${11 + i}`, title, status, owner, priority: i < 3 ? 'High' : 'Medium', estimate: [5, 3, 8, 3, 5, 2, 3][i], reqId, dod, pr: status === 'Done' ? `PR #${80 + i}` : '', blocked: i === 5, blockReason: i === 5 ? 'Waiting for GPU quota increase' : '', notes: '' }));
  s.raid.push({ id: uid('r'), projectId: B.id, waveId: B1.id, kind: 'Dependency', code: 'DP-02', title: 'GPU quota increase from cloud provider', owner: 'subha', probability: 0, impact: 0, status: 'Open', due: d(-2), mitigation: 'Use CPU staging for functional tests meanwhile', history: [] });
  s.raid.push({ id: uid('r'), projectId: B.id, waveId: B1.id, kind: 'Change request', code: 'CR-03', title: 'Add PowerPoint export', owner: 'rizwan', probability: 0, impact: 0, status: 'Proposed', due: d(7), mitigation: '', costImpact: 6000, daysImpact: 5, history: [] });
  ev(B.id, B1.id, 'design', 'Solution Design Pack', 'Summariser fit check', '1.0', 'munir', 'Approved', t(-31));
  ev(B.id, B1.id, 'build', 'Sprint Demo Notes', 'Sprint 1 demo notes', '1.0', 'misbah', 'Approved', t(-17));

  // ============ Example C: at-risk integration programme, in Prove ============
  const C = { id: 'pc', code: 'MRL-002', name: 'ERP to warehouse integration', clientId: 'meridian', kind: 'external', classes: ['Data and integration', 'Cloud and infrastructure'], industry: 'Logistics', description: 'Real-time order and stock integration between the ERP and the new warehouse management system.', objective: 'Remove manual order re-keying and reach 99.5% stock accuracy.', budget: 260000, actual: 236800, start: d(-120), end: d(12), commercial: 'Time and materials, capped', plannedWaves: 2, demo: true,
    team: { partner: 'rizwan', deliveryLead: 'misbah', architect: 'munir', engLead: 'sheryaar', qaLead: 'tabs', infraLead: 'nikhil', supportLead: 'sheryaar', businessOwner: 'priya', sponsor: 'owen' },
    members: ['mariam', 'muskaan', 'subha'], createdAt: t(-120) };
  s.projects.push(C);
  const C1 = newWave({ projectId: C.id, num: 1, name: 'Orders and stock sync', scope: 'Orders flow ERP to WMS; stock levels flow back every 5 minutes.', phase: 'prove', effort: 110, milestone: d(12) });
  C1.completedPhases = ['discovery', 'design', 'build'];
  C1.phaseLog = [{ phase: 'discovery', at: t(-120) }, { phase: 'design', at: t(-96) }, { phase: 'build', at: t(-84) }, { phase: 'prove', at: t(-14) }];
  C1.discovery = { stakeholders: [{ name: 'Owen Price', role: 'Client sponsor', org: 'Meridian' }, { name: 'Priya Shah', role: 'Business owner', org: 'Meridian' }], systems: [{ name: 'SAP ERP', owner: 'Meridian IT', access: 'Granted' }, { name: 'Warehouse management system', owner: 'WMS vendor', access: 'Sandbox only' }], dataFindings: [{ dataset: 'SKU master', finding: '3% of SKUs lack unit-of-measure mapping', severity: 'High' }], exclusions: 'Returns processing is out of scope for wave 1.', plan: 'Two waves: orders and stock, then returns and carriers.', cost: 260000, workshops: [] };
  C1.design.areas = Object.fromEntries(['architecture', 'data', 'integration', 'security', 'acceptance'].map((k) => [k, { status: 'complete', notes: '', by: 'munir', at: t(-85) }]));
  s.waves.push(C1);
  const reqC = [['REQ-01', 'Orders created in ERP appear in WMS within 2 minutes', '99% of orders in WMS within 2 minutes over a 24-hour test'], ['REQ-02', 'Stock levels sync back every 5 minutes', 'Stock reconciles to ERP within 5 minutes, 0 unexplained variances'], ['REQ-03', 'Failed messages are retried and alerted', 'Retry 3 times, then alert the support queue within 1 minute'], ['REQ-04', 'Unit-of-measure conversion for all SKUs', 'All active SKUs convert correctly against the mapping table'], ['REQ-05', 'Handle 3,000 orders per hour at peak', 'Sustained 3,000 orders/hour for 2 hours, no message loss']];
  reqC.forEach(([code, title, criteria], i) => s.requirements.push({ id: 'rc' + i, projectId: C.id, waveId: C1.id, code, title, type: i === 4 ? 'Non-functional' : 'Functional', priority: 'Must', status: 'approved', approvedBy: 'priya', criteria, designArea: 'integration' }));
  so(C1.id, 'discovery.report', 'owen', t(-97)); so(C1.id, 'design.business', 'priya', t(-85)); so(C1.id, 'design.itsec', 'munir', t(-85));
  [['rc0', 'functional', 'Order flow end to end', 'Pass', 'mariam'], ['rc1', 'data', 'Stock reconciliation after 24h', 'Pass', 'mariam'], ['rc2', 'integration', 'Retry and alert on WMS outage', 'Fail', 'muskaan'], ['rc3', 'data', 'UoM conversion, all SKUs', 'Not run', 'mariam'], ['rc0', 'uat', 'Warehouse team order scenarios', 'Not run', 'priya']].forEach(([reqId, layer, title, status, tester]) => s.tests.push({ id: uid('t'), waveId: C1.id, reqId, layer, title, expected: (reqC[+reqId.slice(2)] || [])[2], actual: status === 'Pass' ? 'As expected' : status === 'Fail' ? 'No alert raised after third retry' : '', status, tester, runAt: status === 'Not run' ? null : t(-6), evidence: status === 'Pass' ? 'Test run log' : '' }));
  const spC = [1, 2, 3, 4, 5].map((n) => ({ id: uid('sp'), waveId: C1.id, num: n, start: d(-84 + (n - 1) * 14), status: 'closed', goal: '', demo: { notes: 'Demo held', acceptedBy: 'priya', at: t(-72 + (n - 1) * 14) }, retro: '' }));
  s.sprints.push(...spC);
  ['Order adapter', 'Stock adapter', 'Retry and dead-letter queue', 'UoM mapping service', 'Load test harness'].forEach((title, i) => s.workItems.push({ id: uid('wi'), waveId: C1.id, sprintId: spC[i].id, code: `MRL-${40 + i}`, title, status: 'Done', owner: ['sheryaar', 'sheryaar', 'muskaan', 'sheryaar', 'nikhil'][i], priority: 'High', estimate: 5, reqId: 'rc' + i, dod: { built: true, reviewed: true, meetsDesign: true }, pr: `PR #${300 + i}`, blocked: false, blockReason: '', notes: '' }));
  s.defects.push({ id: uid('d'), waveId: C1.id, code: 'DEF-112', title: 'No alert after third failed retry', severity: 'High', status: 'Open', owner: 'muskaan', raisedBy: 'mariam', at: t(-6), history: [] });
  s.defects.push({ id: uid('d'), waveId: C1.id, code: 'DEF-114', title: 'Duplicate orders when WMS times out mid-commit', severity: 'High', status: 'Open', owner: 'sheryaar', raisedBy: 'mariam', at: t(-4), history: [] });
  s.defects.push({ id: uid('d'), waveId: C1.id, code: 'DEF-115', title: 'Stock sync log timestamps in UTC not local', severity: 'Low', status: 'Fixed', owner: 'sheryaar', raisedBy: 'mariam', at: t(-3), history: [{ at: t(-2), by: 'sheryaar', text: 'Fixed, awaiting retest' }] });
  s.raid.push({ id: uid('r'), projectId: C.id, waveId: C1.id, kind: 'Risk', code: 'R-03', title: 'Go-live date at risk from open high defects', owner: '', probability: 4, impact: 4, status: 'Open', due: d(5), mitigation: '', history: [] });
  s.raid.push({ id: uid('r'), projectId: C.id, waveId: C1.id, kind: 'Dependency', code: 'DP-01', title: 'WMS vendor production credentials', owner: 'owen', probability: 0, impact: 0, status: 'Open', due: d(-4), mitigation: 'Escalated to vendor account manager', history: [] });
  s.raid.push({ id: uid('r'), projectId: C.id, waveId: C1.id, kind: 'Change request', code: 'CR-05', title: 'Add carrier label printing to wave 1', owner: 'priya', probability: 0, impact: 0, status: 'Proposed', due: d(3), mitigation: '', costImpact: 18000, daysImpact: 10, history: [] });
  ev(C.id, C1.id, 'discovery', 'Discovery Report', 'Discovery report and plan', '1.0', 'misbah', 'Approved', t(-97));
  ev(C.id, C1.id, 'design', 'Solution Design Pack', 'Integration design pack', '1.1', 'munir', 'Approved', t(-85));
  ev(C.id, C1.id, 'prove', 'Test Plan', 'Wave 1 test plan', '1.0', 'tabs', 'Approved', t(-14));
  ev(C.id, C1.id, 'prove', 'Test Results', 'Interim test results', '0.3', 'mariam', 'In review', t(-3));

  // ============ Extra: external project still in Discovery ============
  const D = { id: 'pd', code: 'HLD-001', name: 'Records digitisation and search', clientId: 'halden', kind: 'external', classes: ['AI or ML', 'Data and integration'], industry: 'Public sector', description: 'Digitise planning records and make them searchable for case officers.', objective: 'Case officers find a planning record in under 2 minutes.', budget: 180000, actual: 9600, start: d(-9), end: d(150), commercial: 'Discovery fixed fee, then per wave', plannedWaves: 3, demo: true,
    team: { partner: 'tabs', deliveryLead: 'misbah', architect: 'munir', engLead: 'anusha', qaLead: 'tabs', infraLead: 'subha', supportLead: 'sheryaar', businessOwner: 'grace', sponsor: 'grace' },
    members: ['areesha', 'nikhil'], createdAt: t(-9) };
  s.projects.push(D);
  const D1 = newWave({ projectId: D.id, num: 1, name: 'Discovery and first search pilot', scope: 'Confirm record sources, data quality and the pilot scope.', phase: 'discovery', effort: 20, milestone: d(12) });
  D1.phaseLog = [{ phase: 'discovery', at: t(-9) }];
  D1.discovery.stakeholders = [{ name: 'Grace Lindqvist', role: 'Client sponsor and business owner', org: 'Halden' }, { name: 'Records team lead', role: 'Data owner', org: 'Halden' }];
  D1.discovery.systems = [{ name: 'Planning document store', owner: 'Halden IT', access: 'Requested' }];
  D1.discovery.workshops = [{ id: uid('ws'), title: 'Requirements workshop 2', date: d(3) }];
  s.waves.push(D1);
  [['REQ-01', 'Search planning records by address and reference', 'approved'], ['REQ-02', 'Show the original scanned document beside the extracted text', 'draft'], ['REQ-03', 'Keep records in UK data centres', 'draft']].forEach(([code, title, status], i) => s.requirements.push({ id: 'rd' + i, projectId: D.id, waveId: D1.id, code, title, type: i === 2 ? 'Non-functional' : 'Functional', priority: 'Must', status, approvedBy: status === 'approved' ? 'grace' : null, criteria: '', designArea: '' }));

  // Resource allocations (% of the person's week)
  [['anusha', 'pa', 30], ['anusha', 'pb', 50], ['anusha', 'pd', 10], ['areesha', 'pb', 70], ['areesha', 'pa', 20], ['nabeel', 'pb', 60], ['nabeel', 'pa', 20], ['sheryaar', 'pc', 50], ['sheryaar', 'pb', 30], ['sheryaar', 'pa', 30], ['mariam', 'pc', 60], ['mariam', 'pa', 20], ['muskaan', 'pc', 40], ['muskaan', 'pb', 40], ['nikhil', 'pc', 40], ['nikhil', 'pa', 20], ['subha', 'pb', 40], ['subha', 'pd', 20], ['misbah', 'pa', 25], ['misbah', 'pb', 25], ['misbah', 'pc', 35], ['misbah', 'pd', 15], ['munir', 'pa', 20], ['munir', 'pb', 30], ['munir', 'pc', 15], ['tabs', 'pc', 30], ['tabs', 'pa', 15], ['rizwan', 'pa', 15], ['rizwan', 'pb', 20], ['dayim', 'pb', 30], ['talha', 'pb', 30]].forEach(([userId, projectId, pct]) => s.allocations.push({ id: uid('al'), userId, projectId, pct }));

  s.audit.push({ id: uid('a'), at: new Date().toISOString(), userId: 'admin', projectId: null, action: 'Demonstration data loaded', detail: 'Four labelled demo projects created' });
  return s;
}
