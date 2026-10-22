-- BTL Delivery Command Centre: initial schema (PostgreSQL 15+)
-- Mirrors the domain model in src/engine.js and src/seed.js.
-- Traceability: business objective -> requirement -> design -> work item -> test -> evidence -> approval -> gate.
-- Tenant separation: every client-scoped row carries organisation_id and is protected by row-level security.

create extension if not exists pgcrypto;

-- ---------- enums ----------
create type project_kind     as enum ('external', 'internal');
create type phase_code       as enum ('discovery', 'design', 'build', 'prove', 'deploy', 'adopt', 'gate');
create type wave_status      as enum ('planned', 'active', 'replan', 'closed');
create type req_status       as enum ('draft', 'approved');
create type work_status      as enum ('Backlog', 'Ready', 'In Progress', 'Code Review', 'Testing', 'Done');
create type test_layer       as enum ('functional', 'integration', 'data', 'security', 'model', 'uat');
create type test_result      as enum ('Not run', 'Pass', 'Fail');
create type severity         as enum ('Critical', 'High', 'Medium', 'Low');
create type defect_status    as enum ('Open', 'Fixed', 'Closed');
create type raid_kind        as enum ('Risk', 'Assumption', 'Issue', 'Dependency', 'Decision', 'Change request');
create type gate_outcome     as enum ('proceed', 'conditions', 'stop');
create type approval_choice  as enum ('approve', 'reject');
create type evidence_status  as enum ('Draft', 'In review', 'Approved');
create type team_slot        as enum ('partner', 'deliveryLead', 'architect', 'engLead', 'qaLead', 'infraLead', 'supportLead', 'businessOwner', 'sponsor');

-- ---------- organisation, people, roles ----------
create table organisation (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  is_btl boolean not null default false,           -- exactly one row: Business Technique Limited
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index one_btl_org on organisation (is_btl) where is_btl;

create table team (
  id uuid primary key default gen_random_uuid(),
  name text not null,                               -- AI Engineering, Quality and Software, Infrastructure, Project and Marketing, Partners
  partner_user_id uuid                              -- equal-partner leadership; set after app_user exists
);

create table app_user (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation(id),
  team_id uuid references team(id),
  reports_to uuid references app_user(id),         -- line leadership (partners); project updates go to the PM hub
  name text not null,
  title text,
  email text unique,
  external_identity text unique,                    -- Microsoft Entra ID object id when connected
  weekly_hours numeric(5,2) not null default 37.5,
  skills text[] not null default '{}',
  admin_note text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table team add constraint team_partner_fk foreign key (partner_user_id) references app_user(id);

create table role (
  code text primary key,                            -- Platform Administrator, Accountable Partner, ... Read-Only Stakeholder
  description text not null
);
create table user_role (                            -- platform-wide roles
  user_id uuid references app_user(id),
  role_code text references role(code),
  primary key (user_id, role_code)
);

-- ---------- projects and waves ----------
create table project (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  organisation_id uuid not null references organisation(id),  -- the client; BTL org for internal work
  kind project_kind not null,
  name text not null,
  description text not null default '',
  industry text,
  objective text not null,                          -- the measurable business objective (traceability root)
  classifications text[] not null default '{}',
  commercial text,
  budget numeric(14,2) not null check (budget > 0),
  actual_cost numeric(14,2) not null default 0,
  start_date date not null,
  end_date date not null check (end_date > start_date),
  planned_waves int not null default 1 check (planned_waves > 0),
  is_demo boolean not null default false,
  created_by uuid references app_user(id),
  created_at timestamptz not null default now()
);

create table project_baseline (                    -- version history created by approved change requests
  project_id uuid references project(id) on delete cascade,
  version int not null,
  budget numeric(14,2) not null,
  end_date date not null,
  reason text not null,
  approved_by uuid not null references app_user(id),
  approved_at timestamptz not null default now(),
  primary key (project_id, version)
);

create table project_member (                       -- accountable slots plus delivery team members
  project_id uuid references project(id) on delete cascade,
  user_id uuid references app_user(id),
  slot team_slot,                                   -- null = delivery team member
  allocation_pct int check (allocation_pct between 0 and 200),
  primary key (project_id, user_id, slot)
);
create unique index one_holder_per_slot on project_member (project_id, slot) where slot is not null;

create table delivery_wave (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references project(id) on delete cascade,
  num int not null,
  name text not null,
  scope text not null,
  status wave_status not null default 'active',
  current_phase phase_code not null,
  milestone date,
  effort_days numeric(7,1),
  lessons text not null default '',
  next_wave_plan text not null default '',
  remediation_plan text not null default '',
  compliance_confirmed_by uuid references app_user(id),
  compliance_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, num)
);
-- Only one wave per project can be in flight.
create unique index one_open_wave on delivery_wave (project_id) where status in ('active', 'replan');

create table delivery_phase (                       -- phase log: entry/exit per wave
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references delivery_wave(id) on delete cascade,
  phase phase_code not null,
  entered_at timestamptz not null default now(),
  exited_at timestamptz,
  advanced_by uuid references app_user(id),
  note text
);

-- ---------- discovery ----------
create table stakeholder (id uuid primary key default gen_random_uuid(), wave_id uuid not null references delivery_wave(id) on delete cascade, name text not null, role text not null, org text);
create table workshop (id uuid primary key default gen_random_uuid(), wave_id uuid not null references delivery_wave(id) on delete cascade, title text not null, held_on date);
create table source_system (id uuid primary key default gen_random_uuid(), wave_id uuid not null references delivery_wave(id) on delete cascade, name text not null, owner text, access text not null);
create table data_finding (id uuid primary key default gen_random_uuid(), wave_id uuid not null references delivery_wave(id) on delete cascade, dataset text not null, finding text not null, severity text not null);
create table discovery_plan (wave_id uuid primary key references delivery_wave(id) on delete cascade, exclusions text not null default '', plan text not null default '', cost numeric(14,2) not null default 0);

-- ---------- requirements and design ----------
create table requirement (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references project(id),
  wave_id uuid not null references delivery_wave(id) on delete cascade,
  code text not null,
  title text not null,
  type text not null,
  priority text not null,
  status req_status not null default 'draft',
  approved_by uuid references app_user(id),
  approved_at timestamptz,
  design_area text,
  unique (wave_id, code)
);
create table acceptance_criterion (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references requirement(id) on delete cascade,
  text text not null,                               -- the measurable pass mark
  reviewer_id uuid references app_user(id)
);
create table architecture_artifact (               -- design sections and reference-architecture components
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references delivery_wave(id) on delete cascade,
  area text not null,                               -- architecture | data | integration | security | ai | acceptance | component
  layer text,                                       -- for components: Experience, AI and analytics, Data platform, Integration, Sources
  name text,
  notes text not null default '',
  complete boolean not null default false,
  updated_by uuid references app_user(id),
  updated_at timestamptz not null default now()
);

-- ---------- build ----------
create table sprint (
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references delivery_wave(id) on delete cascade,
  num int not null,
  start_date date not null,
  goal text,
  status text not null check (status in ('active', 'closed')),
  demo_notes text,
  demo_accepted_by uuid references app_user(id),
  demo_accepted_at timestamptz,
  retrospective text,
  unique (wave_id, num)
);
create table work_item (
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references delivery_wave(id) on delete cascade,
  sprint_id uuid references sprint(id),
  requirement_id uuid references requirement(id),
  code text not null,
  title text not null,
  status work_status not null default 'Backlog',
  owner_id uuid references app_user(id),
  priority text not null,
  estimate numeric(5,1),
  dod_built boolean not null default false,
  dod_reviewed boolean not null default false,
  dod_meets_design boolean not null default false,
  pull_request text,
  blocked boolean not null default false,
  block_reason text,
  notes text,
  -- Definition of done is enforced by the database as well as the UI.
  constraint dod_before_done check (status <> 'Done' or (dod_built and dod_reviewed and dod_meets_design and not blocked))
);

-- ---------- prove ----------
create table test_case (
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references delivery_wave(id) on delete cascade,
  requirement_id uuid not null references requirement(id),
  layer test_layer not null,
  title text not null,
  expected text not null
);
create table test_execution (
  id uuid primary key default gen_random_uuid(),
  test_case_id uuid not null references test_case(id) on delete cascade,
  result test_result not null,
  actual text not null,
  evidence_ref text,
  tester_id uuid not null references app_user(id),
  run_at timestamptz not null default now(),
  constraint pass_needs_evidence check (result <> 'Pass' or coalesce(evidence_ref, '') <> '')
);
create table model_evaluation (
  wave_id uuid primary key references delivery_wave(id) on delete cascade,
  measure text not null, unit text, baseline numeric, target numeric, actual numeric,
  higher_is_better boolean not null default true,
  evidence text,
  constraint result_needs_evidence check (actual is null or coalesce(evidence, '') <> '')
);
create table defect (
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references delivery_wave(id) on delete cascade,
  test_case_id uuid references test_case(id),
  code text not null,
  title text not null,
  severity severity not null,
  status defect_status not null default 'Open',
  owner_id uuid references app_user(id),
  raised_by uuid not null references app_user(id),
  raised_at timestamptz not null default now()
);
create table defect_event (id uuid primary key default gen_random_uuid(), defect_id uuid not null references defect(id) on delete cascade, by_user uuid not null references app_user(id), text text not null, at timestamptz not null default now());

-- ---------- deploy and adopt ----------
create table deployment (
  wave_id uuid primary key references delivery_wave(id) on delete cascade,
  version text, deploy_window date
);
create table deployment_check (                     -- prerequisites and the go-live sequence, each with who and when
  wave_id uuid references delivery_wave(id) on delete cascade,
  item text not null,                               -- rollback | runbook | monitoring | support | infraSec | readiness | gonogo | cutover | golive | hypercare | handover
  confirmed_by uuid not null references app_user(id),
  confirmed_at timestamptz not null default now(),
  primary key (wave_id, item)
);
create table adoption_metric (                      -- adoption and value measures (BusinessBenefit = kind 'value')
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references delivery_wave(id) on delete cascade,
  kind text not null check (kind in ('adoption', 'value')),
  name text not null, unit text, baseline numeric, target numeric, actual numeric,
  higher_is_better boolean not null default true,
  source_evidence text,
  constraint actual_needs_source check (actual is null or coalesce(source_evidence, '') <> '')
);
create table training_session (id uuid primary key default gen_random_uuid(), wave_id uuid not null references delivery_wave(id) on delete cascade, title text not null, held_on date, attendees int);
create table improvement (id uuid primary key default gen_random_uuid(), wave_id uuid not null references delivery_wave(id) on delete cascade, text text not null, carried_to_wave uuid references delivery_wave(id));

-- ---------- governance ----------
create table raid_item (                            -- Risk, Issue, Dependency, Assumption, Decision, ChangeRequest
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references project(id) on delete cascade,
  wave_id uuid references delivery_wave(id),
  kind raid_kind not null,
  code text not null,
  title text not null,
  owner_id uuid not null references app_user(id),   -- every entry has an accountable owner
  probability int check (probability between 0 and 5),
  impact int check (impact between 0 and 5),
  mitigation text not null default '',
  due_date date,
  status text not null,
  cost_impact numeric(14,2),
  days_impact int,
  decided_by uuid references app_user(id),
  unique (project_id, code)
);
create table raid_event (id uuid primary key default gen_random_uuid(), raid_id uuid not null references raid_item(id) on delete cascade, by_user uuid not null references app_user(id), text text not null, at timestamptz not null default now());

create table document (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references project(id),
  wave_id uuid references delivery_wave(id),
  phase phase_code not null,
  doc_type text not null,
  title text not null,
  owner_id uuid not null references app_user(id),
  created_at timestamptz not null default now()
);
create table evidence (                             -- one row per document version
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references document(id) on delete cascade,
  version text not null,
  status evidence_status not null default 'In review',
  location_ref text,
  storage_key text,                                 -- object storage key once document storage is connected
  file_name text, file_size bigint, mime_type text,
  approved_by uuid references app_user(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

-- Phase sign-offs (discovery.report, design.business, prove.uat, ...). One per key per wave, never edited.
create table approval (
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references delivery_wave(id) on delete cascade,
  approval_key text not null,
  approver_id uuid not null references app_user(id),
  comment text,
  signed_at timestamptz not null default now(),
  unique (wave_id, approval_key)
);

-- Gate approvals by the gate signers, and the recorded decision.
create table gate_approval (
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references delivery_wave(id) on delete cascade,
  signer_spec text not null,                        -- team slot (external) or named partner (internal)
  approver_id uuid not null references app_user(id),
  choice approval_choice not null,
  comment text,
  signed_at timestamptz not null default now(),
  round int not null default 1,                     -- increments after a stop and re-plan
  constraint rejection_needs_reason check (choice = 'approve' or coalesce(comment, '') <> ''),
  unique (wave_id, signer_spec, round)
);
create table gate_decision (
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references delivery_wave(id) on delete cascade,
  round int not null default 1,
  outcome gate_outcome not null,
  recorded_by uuid not null references app_user(id),
  recorded_at timestamptz not null default now(),
  comment text,
  risk_accepted boolean not null default false,
  checklist_snapshot jsonb not null,                -- the 8 checks as they stood at the moment of decision
  constraint stop_needs_reason check (outcome <> 'stop' or coalesce(comment, '') <> ''),
  constraint conditions_need_acceptance check (outcome <> 'conditions' or risk_accepted),
  unique (wave_id, round)
);
create table gate_condition (
  id uuid primary key default gen_random_uuid(),
  gate_decision_id uuid not null references gate_decision(id) on delete cascade,
  text text not null,
  owner_id uuid not null references app_user(id),
  due_date date not null,
  raid_item_id uuid references raid_item(id)        -- each condition is tracked in the register
);

-- ---------- audit and notifications ----------
create table audit_event (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid not null references app_user(id),
  project_id uuid references project(id),
  action text not null,
  detail text not null default ''
);
-- Audit history is append-only.
create rule audit_no_update as on update to audit_event do instead nothing;
create rule audit_no_delete as on delete to audit_event do instead nothing;

create table notification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id),
  project_id uuid references project(id),
  text text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- the core rule: no next wave without an authorising gate decision ----------
create function enforce_wave_gate() returns trigger language plpgsql as $$
declare prev record; dec record;
begin
  if new.num = 1 then return new; end if;
  select * into prev from delivery_wave where project_id = new.project_id and num = new.num - 1;
  if prev is null then raise exception 'Wave % has no preceding wave', new.num; end if;
  select * into dec from gate_decision where wave_id = prev.id order by round desc limit 1;
  if dec is null or dec.outcome = 'stop' then
    raise exception 'Wave % cannot start: wave % has no Proceed or Proceed-with-conditions gate decision', new.num, prev.num;
  end if;
  if new.current_phase = 'discovery' then
    raise exception 'Discovery runs once per project; wave % must start at Design', new.num;
  end if;
  return new;
end $$;
create trigger wave_gate before insert on delivery_wave for each row execute function enforce_wave_gate();

-- Internal projects never enter Discovery.
create function enforce_internal_lifecycle() returns trigger language plpgsql as $$
begin
  if new.current_phase = 'discovery' and (select kind from project where id = new.project_id) = 'internal' then
    raise exception 'Internal BTL projects start at Design';
  end if;
  return new;
end $$;
create trigger internal_lifecycle before insert or update on delivery_wave for each row execute function enforce_internal_lifecycle();

-- ---------- tenant separation (Supabase-style RLS) ----------
-- current_app_user() resolves the signed-in user from the JWT; client users only see their organisation's projects.
create function current_app_user() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.app_user_id', true), '')::uuid
$$;
create function can_view_project(pid uuid) returns boolean language sql stable as $$
  select exists (
    select 1 from app_user u join project p on p.id = pid
    where u.id = current_app_user()
      and (u.organisation_id = p.organisation_id or (select is_btl from organisation where id = u.organisation_id))
  )
$$;
alter table project enable row level security;
create policy project_read on project for select using (can_view_project(id));
alter table delivery_wave enable row level security;
create policy wave_read on delivery_wave for select using (can_view_project(project_id));
alter table requirement enable row level security;
create policy req_read on requirement for select using (can_view_project(project_id));
alter table document enable row level security;
create policy doc_read on document for select using (can_view_project(project_id));
alter table raid_item enable row level security;
create policy raid_read on raid_item for select using (can_view_project(project_id) and (select is_btl from organisation o join app_user u on u.organisation_id = o.id where u.id = current_app_user()));
-- Approvals may only be inserted by the person signing.
alter table approval enable row level security;
create policy approval_self on approval for insert with check (approver_id = current_app_user());
alter table gate_approval enable row level security;
create policy gate_approval_self on gate_approval for insert with check (approver_id = current_app_user());

-- ---------- reference data ----------
insert into role (code, description) values
 ('Platform Administrator', 'Configures the platform; cannot sign on behalf of others'),
 ('Accountable Partner', 'Makes the final gate call'),
 ('Delivery Lead', 'Runs the wave, advances phases, records gate decisions'),
 ('Solution Architect', 'Owns architecture; approves technical readiness'),
 ('Engineering Lead', 'Leads build'),
 ('Engineer', 'Builds and unit tests'),
 ('Test Lead', 'Owns test plan and quality evidence'),
 ('Tester', 'Runs tests and logs defects'),
 ('Infrastructure Engineer', 'Environments, pipelines, deployment'),
 ('Support Lead', 'Takes over the run after handover'),
 ('Business Owner', 'Signs design pack, UAT and value report'),
 ('Client Sponsor', 'Approves the discovery plan'),
 ('Client Reviewer', 'Reviews documents and takes part in UAT'),
 ('Read-Only Stakeholder', 'Views authorised projects');
