# BTL Delivery Command Centre

Business Technique Limited's delivery management platform: one controlled wave at a time,
Discovery → Design → Build → Prove → Deploy → Adopt → Gate, as defined in
`BTL_Org_Delivery_Methodology.pptx`.

## Run it

```bash
npm install
npm test          # 10 workflow-restriction tests (node:test)
npm run build     # writes one self-contained HTML file (React bundled, logo inlined)
npm run dev       # builds, then serves the app at http://localhost:3000
```

The app is **frontend only — no database, no API server**. Every record comes from
`src/seed.js` (four labelled demonstration projects) and is then held in the browser's
`localStorage`, so it runs unchanged on a static host such as Vercel.

## Deploy to Vercel

```bash
vercel deploy --prod
```

`vercel.json` sets `npm run build` as the build command and `dist` as the output
directory. The build emits `dist/index.html` (and a copy named
`dist/btl-delivery-command-centre.html`), a single self-contained file with React,
the styles and the logo inlined. There is nothing for Vercel to run on the server and
no database to provision.

Data note: state is per browser, per person. Each visitor starts from the same seeded
demonstration data, and their own changes persist on their device only.

## Optional: PostgreSQL

The schema in `db/` is the target for a future API layer and is not used by the app
that ships today. To explore it locally:

```bash
createdb btl
psql -d btl -f db/001_initial_schema.sql
psql -d btl -f db/test_rules.sql   # shows the three guard rules rejecting bad data, then a valid wave 2
```

## Source layout

| Path | What it holds |
| --- | --- |
| `src/methodology.js` | The operating model transcribed from the deck: phases, purposes, steps, outputs, exit checks, internal-delivery notes, design sections, test layers, go-live sequence, gate signers |
| `src/engine.js` | The rules: phase exit checks (the state machine guards), the 8-point gate checklist, gate decision rules, permissions, health (RAG), notifications, attention list |
| `src/seed.js` | Org chart from the deck and four labelled demonstration projects |
| `src/store.jsx` | State, persistence and the audit trail (every change is written with the signed-in user) |
| `src/App.jsx` | Shell: navigation, search, project switcher, notifications, user switcher, themes |
| `src/pages/` | Dashboard, Portfolio and wizard, Project workspace, one workspace per phase, Gate centre, Team, Risk and change, Evidence vault, Assistant, Reports, Audit, Method |
| `db/001_initial_schema.sql` | PostgreSQL schema: 40 tables, row-level security for client separation, triggers for the wave gate and internal lifecycle, check constraints for definition of done and evidence |
| `tests/workflow.test.mjs` | Tests for the business rules below |

## Business rules enforced

| Rule (from the deck) | Where it is enforced |
| --- | --- |
| External projects start at Discovery; internal start at Design | `phasesFor`, wizard, DB trigger |
| Discovery runs once per project | `phasesFor(p, w)`, DB trigger |
| A phase cannot advance until its exit check passes; only the delivery lead or accountable partner advances | `exitChecks`, `can(…,'advance')` |
| Definition of done before Done | Board guard, DB check constraint |
| New requests go on the backlog, not into the running sprint | Sprint field locked after day 1; approved change requests land in the backlog |
| Testers are not the people who built it | Test run blocked for the builder; exit check flags conflicts |
| No open critical or high defects; accuracy meets target; UAT signed | Prove exit check |
| Rollback, runbook, monitoring and support before go-live; sequence in order | Deploy workspace |
| Value only counts with source evidence | Adopt measures, DB check constraint |
| Every wave closes with a recorded gate decision; the next wave does not start without it | `decisionBlocker`, Gate workspace, DB trigger |
| Proceed needs all 8 checks and all signers; conditions need owners, dates and risk acceptance; a rejection allows only Stop | `decisionBlocker`, DB constraints |
| Internal gate: Munir build, Tabs quality, Rizwan market-readiness, Misbah records | `gateSigners` |
| Nobody signs for someone else | `canSign`, DB row-level security |
| Client users see only their projects, never budgets or internal pages | `can`, route guard, DB RLS |

## What is complete and what depends on integrations

Complete in this release: everything in the table above, the full lifecycle for multiple
projects and waves, the gate engine and decision record, traceability from objective to
gate, the audit trail, reports, role-aware navigation, responsive light and dark layouts.

Simplified in this release:

- **Sign-in is simulated.** A "switch user" menu stands in for authentication so every role
  can be demonstrated. Production: Microsoft Entra ID or Supabase Auth, with the JWT claim
  `app_user_id` feeding the row-level security in the schema.
- **Data is stored in the browser** (per person, per browser). The schema in `db/` is the
  target for the API layer, which is not built yet.
- **Evidence files** are recorded by name, size and location; file contents need object
  storage (SharePoint or Supabase Storage).
- **The delivery assistant** uses fixed rules over the stored records and cites them. An LLM
  connection would be an optional, governed adapter.
- **PDF and Word export** of reports is not built; reports render on screen from live records.
- **Azure DevOps, GitHub, Jira, Teams and Microsoft 365** integrations are not connected.

The source deck spells one team member as both "Subha" and "Shubha". The app uses Subha and
flags the record for an administrator to confirm.
