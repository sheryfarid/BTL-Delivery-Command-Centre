// The BTL delivery method, transcribed from BTL_Org_Delivery_Methodology.pptx.
// This file is the operating model: the state machine and every screen read from it.

export const PHASES = ['discovery', 'design', 'build', 'prove', 'deploy', 'adopt', 'gate'];

export const PHASE_META = {
  discovery: {
    label: 'Discovery',
    title: 'Confirm what the client needs',
    purpose: 'Confirm what the client needs, which systems and data we are working with, and the plan, before anyone commits to a design or a price.',
    duration: 'Typically 2 to 4 weeks, once per project',
    steps: ['Kick off with the sponsor and key stakeholders', 'Run workshops to confirm requirements and success measures', 'Review systems, access and constraints with client IT', 'Profile the data and log the gaps', 'Agree the plan, waves, team and cost'],
    output: 'Signed discovery report and plan: requirements, systems and data findings, waves, cost and risks',
    exit: 'The client has signed the requirements, the systems and data are understood, and the plan, cost and first wave are agreed.',
    internal: 'Skipped. The platform, systems and data are already known, so requirements are confirmed inside Design and each wave starts there.',
    who: [['Client sponsor', 'Sets the goals and approves the plan'], ['Business owner', 'Confirms requirements and priorities'], ['Client IT', 'Provides systems, access and constraints'], ['Data owner', 'Explains the data and confirms findings'], ['Delivery lead', 'Runs discovery and writes the plan']],
  },
  design: {
    label: 'Design',
    title: 'What we build and how',
    purpose: 'Turn the confirmed requirements into a design the client signs, so the build has no guesswork and every requirement has a pass mark.',
    duration: 'Typically 1 to 2 weeks',
    steps: ['Run design workshops with the business and data owners', 'Draft the architecture and the data model', 'Review with client IT and security', 'Write acceptance criteria and the test plan', 'Walk the client through and get sign-off'],
    output: 'Signed design pack: architecture, data model, interfaces, security assessment, acceptance criteria',
    exit: 'Every requirement has a measurable pass mark, client IT and security approve the architecture, and the business owner signs the design pack.',
    internal: 'Munir owns the architecture, Tabs writes the test plan and Rizwan agrees the wording and market-readiness criteria. The platform already exists, so the architecture is a fit check, not a new design.',
    who: [['Solution architect', 'Owns the architecture and data model'], ['Business owner', 'Confirms requirements, signs the pack'], ['Client IT and security', 'Reviews hosting, access and risk'], ['Project manager', 'Runs workshops, tracks sign-off'], ['Test lead', 'Writes acceptance criteria and test plan']],
  },
  build: {
    label: 'Build',
    title: 'Working software every two weeks',
    purpose: 'Turn the signed design into working software in short sprints, with the business owner seeing real progress every two weeks.',
    duration: 'Two-week sprints, repeated',
    steps: ['Set up environments and reuse the foundation', 'Plan each sprint from the prioritised backlog', 'Build and test against the design pack', 'Demo working software to the business owner', 'Review feedback and re-prioritise the backlog'],
    output: 'Working increments in the test environment, demo notes and an updated backlog',
    exit: 'All wave scope is built, passes developer testing, and the business owner has accepted every demo.',
    internal: 'Munir leads. Anusha, Areesha and Nabeel build the AI, Sheryaar and Muskaan the platform, Subha and Nikhil the environments, and Misbah runs the sprints.',
    who: [['Business owner', 'Prioritises the backlog, accepts demos'], ['Solution architect', 'Guards the design and technical quality'], ['Delivery lead', 'Runs sprints and tracks progress'], ['Developers and AI engineers', 'Build and unit test'], ['Infrastructure engineer', 'Environments, pipelines and security']],
  },
  prove: {
    label: 'Prove',
    title: 'Show it works, with evidence',
    purpose: 'Show with evidence that the solution does what the design pack said, is secure and fast enough, and that real users accept it.',
    duration: 'Typically 2 to 3 weeks',
    steps: ['Agree the test scope and data from the test plan', 'Run functional and integration tests', 'Run data quality, security and performance tests', 'Back-test models against the baseline', 'Run user acceptance testing and fix defects'],
    output: 'Test results, accuracy report, defect log and signed UAT',
    exit: 'No open critical or high defects, accuracy meets the agreed target, and the business owner has signed UAT.',
    internal: 'Tabs leads. Mariam tests, Anusha, Areesha and Nabeel back-test the models, Subha and Nikhil run security and speed tests, and the report is checked against the standard template.',
    who: [['Test lead', 'Owns the test plan and the results'], ['Testers', 'Run tests and log defects'], ['Business users', 'Carry out user acceptance testing'], ['Solution architect', 'Judges defects and technical risk'], ['Business owner', 'Signs off acceptance']],
  },
  deploy: {
    label: 'Deploy',
    title: 'Go live safely',
    purpose: 'Move the tested solution into production safely, with a way back if something goes wrong and support in place from day one.',
    duration: 'Typically 1 to 2 weeks, then hypercare',
    steps: ['Hold the go-live readiness review', 'Prepare production and the rollback plan', 'Cut over and go live', 'Run hypercare with daily checks', 'Hand over to the support team'],
    output: 'Live service, runbook, support process and a go-live report',
    exit: 'The service is live and stable, monitoring is working, and support has accepted the handover.',
    internal: 'Subha and Nikhil deploy. Sheryaar covers support and fixes, Tabs oversees support, and Rizwan signs market-readiness before go-live.',
    who: [['Delivery lead', 'Runs the go-live plan'], ['Solution architect', 'Approves technical readiness'], ['Infrastructure engineer', 'Deploys and monitors'], ['Support lead', 'Takes over the run'], ['Business owner', 'Approves go-live']],
  },
  adopt: {
    label: 'Adopt',
    title: 'People use it and the value shows',
    purpose: 'Make sure people use what we delivered, and prove that it delivers the value the design set out to deliver.',
    duration: 'Starts at go-live, alongside support',
    steps: ['Train users and prepare guides', 'Communicate the change and the benefits', 'Track adoption every week', 'Measure value against the baseline from Design', 'Report results and plan improvements'],
    output: 'Adoption and value report, and an improvement backlog for the next wave',
    exit: 'Adoption targets are met and the value report is accepted, or a plan to close the gap is agreed.',
    internal: 'Rizwan leads. Dayim and Talha drive visibility, Sheryaar supports users, and Misbah reports the results to the partners.',
    who: [['Business owner', 'Owns the benefit and the targets'], ['Change lead', 'Runs training and communication'], ['Support lead', 'Reports usage issues'], ['Delivery lead', 'Compiles the value report'], ['Users', 'Give feedback and request changes']],
  },
  gate: {
    label: 'Gate',
    title: 'Finished, and ready for the next wave?',
    purpose: 'Decide, with evidence, whether this wave is finished and whether the next one can start.',
    duration: 'Held at the end of every wave',
    steps: ['Collect the evidence from every phase', 'Walk the checklist with the owners', 'Review risks, issues and lessons learned', 'Decide: proceed, proceed with conditions, or stop', 'Record the decision and update the plan'],
    output: 'Gate record: decision, conditions, lessons and the next-wave plan',
    exit: 'A recorded decision exists. The next wave does not start without it.',
    internal: 'Munir signs the build, Tabs the quality and Rizwan market-readiness, and the compliance check must pass. Misbah records the decision.',
    who: [['Business owner', 'Accepts the delivered value'], ['Solution architect', 'Confirms technical readiness'], ['Test lead', 'Confirms the quality evidence'], ['Delivery lead', 'Presents evidence, records the decision'], ['Accountable partner', 'Makes the final call']],
  },
};

export const DESIGN_AREAS = [
  ['architecture', 'Solution architecture', 'Components, hosting, build or buy. Reference diagram signed off.'],
  ['data', 'Data architecture', 'Data model and source-to-target mapping. Master data and quality rules.'],
  ['integration', 'Integration design', 'Interfaces, APIs and volumes. Error handling and reconciliation.'],
  ['security', 'Security and privacy', 'Access roles, residency and audit. Privacy impact assessment.'],
  ['ai', 'AI and model design', 'Use case, baseline, accuracy target. Human approval and explanations.'],
  ['acceptance', 'Acceptance and tests', 'Measurable pass mark per requirement. UAT scope and test data.'],
];

export const ARCH_LAYERS = [
  ['Experience', 'Users, screens, reports and alerts'],
  ['AI and analytics', 'Models, business rules and assistant'],
  ['Data platform', 'Data model, master data and quality rules'],
  ['Integration', 'Interfaces, APIs, loads and reconciliation'],
  ['Sources', 'Client systems, files and documents'],
];

export const SPRINT_DAYS = [
  ['Plan', 'Day 1', 'Pick the top backlog items', 1, 1],
  ['Build', 'Days 2 to 8', 'Code, configure and unit test', 2, 8],
  ['Test', 'Days 8 to 9', 'Check against the design pack', 8, 9],
  ['Demo', 'Day 10', 'Show working software', 10, 10],
  ['Review', 'Day 10', 'Feedback and next priorities', 10, 10],
];

export const WORK_STATUSES = ['Backlog', 'Ready', 'In Progress', 'Code Review', 'Testing', 'Done'];

export const DOD_CHECKS = [
  ['built', 'Built and unit tested'],
  ['reviewed', 'Code review passed'],
  ['meetsDesign', 'Tested against the design pack'],
];

export const TEST_LAYERS = [
  ['functional', 'Functional', 'Each requirement works as designed'],
  ['integration', 'Integration', 'Interfaces and data flows work end to end'],
  ['data', 'Data quality', 'Loaded data reconciles to the source'],
  ['security', 'Security and speed', 'Access, audit, response time and load'],
  ['model', 'Model accuracy', 'Back-tested on history against the baseline'],
  ['uat', 'User acceptance', 'Real users sign off on real tasks'],
];

export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];

export const DEPLOY_STEPS = [
  ['readiness', 'Readiness review', 'All checks passed'],
  ['gonogo', 'Go or no go', 'Decision recorded'],
  ['cutover', 'Cutover', 'Production ready, data loaded'],
  ['golive', 'Go live', 'Users switched on'],
  ['hypercare', 'Hypercare', 'Daily checks, fast fixes'],
  ['handover', 'Handover', 'Support owns the run'],
];

export const DEPLOY_PREREQS = [
  ['rollback', 'Rollback plan tested', 'A tested way back to the old state'],
  ['runbook', 'Runbook written', 'How to operate and fix the service'],
  ['monitoring', 'Monitoring and alerts live', 'Alerts and dashboards configured'],
  ['support', 'Support model agreed', 'Who answers, how fast, who escalates'],
  ['infraSec', 'Infrastructure and security approval', 'Production environment approved'],
];

export const VALUE_LOOP = [
  ['Train', 'At go-live', 'Guides, sessions, champions'],
  ['Use', 'From day 1', 'Users do real work in it'],
  ['Measure', 'Every week', 'Adoption and value tracked'],
  ['Improve', 'Every wave', 'Fixes and next requests'],
];

export const GATE_DECISIONS = {
  proceed: { label: 'Proceed', text: 'Everything passed, the next wave starts' },
  conditions: { label: 'Proceed with conditions', text: 'Open items have an owner and a date' },
  stop: { label: 'Stop or re-plan', text: 'Scope, cost or risk has changed' },
};

// Who signs the gate. External waves use the five governance roles from the
// Gate slide; internal waves use the partner model from the same slide.
export const GATE_SIGNERS_EXTERNAL = [
  ['businessOwner', 'Business owner', 'Accepts the delivered value'],
  ['architect', 'Solution architect', 'Confirms technical readiness'],
  ['qaLead', 'Test lead', 'Confirms the quality evidence'],
  ['deliveryLead', 'Delivery lead', 'Presents evidence, records the decision'],
  ['partner', 'Accountable partner', 'Makes the final call'],
];
export const GATE_SIGNERS_INTERNAL = [
  ['munir', 'Build approval', 'Munir signs the build'],
  ['tabs', 'Quality approval', 'Tabs signs the quality'],
  ['rizwan', 'Market-readiness approval', 'Rizwan signs market-readiness'],
];

export const TEAM_SLOTS = [
  ['partner', 'Accountable partner'],
  ['deliveryLead', 'Delivery lead'],
  ['architect', 'Solution architect'],
  ['engLead', 'Engineering lead'],
  ['qaLead', 'Test lead'],
  ['infraLead', 'Infrastructure lead'],
  ['supportLead', 'Support lead'],
  ['businessOwner', 'Business owner'],
  ['sponsor', 'Client sponsor'],
];

export const CLASSIFICATIONS = ['AI or ML', 'Data and integration', 'Cloud and infrastructure', 'Software development', 'Healthcare technology'];

export const RAID_KINDS = ['Risk', 'Assumption', 'Issue', 'Dependency', 'Decision', 'Change request'];

export const DOC_TYPES = ['Discovery Report', 'Delivery Plan', 'Solution Design Pack', 'Data Mapping', 'Security Assessment', 'Test Plan', 'Test Results', 'Model Accuracy Report', 'UAT Evidence', 'Deployment Plan', 'Rollback Plan', 'Operational Runbook', 'Go-Live Report', 'Adoption Report', 'Value Report', 'Gate Decision Record', 'Sprint Demo Notes'];
