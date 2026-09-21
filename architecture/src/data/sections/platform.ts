import type { DocSection } from '../../types/doc';

export const platformSections: DocSection[] = [
{
  id: 'workflow',
  number: 14,
  title: 'Workflow Engine',
  summary:
  'One versioned, configuration-driven engine serving every approval in the platform. No module implements its own approval logic.',
  blocks: [
  {
    kind: 'code',
    title: 'Engine model',
    code: `workflow_definitions   id, company_id null, module_key, document_type, name,
                       status, current_version_id
workflow_versions      id, definition_id, version_no, graph jsonb, published_at,
                       published_by, status(DRAFT|PUBLISHED|RETIRED)
workflow_steps         version_id, step_no, name, type(APPROVAL|TASK|CONDITION|
                       PARALLEL|NOTIFY|SYSTEM), resolver jsonb, quorum,
                       sla_hours, escalation jsonb, on_reject(STOP|RETURN|SKIP)
workflow_instances     id, version_id, document_type, document_id, company_id,
                       status, current_step_no, started_by, started_at, completed_at,
                       correlation_id, version (optimistic lock)
workflow_tasks         instance_id, step_no, assignee_user_id, candidate_role,
                       candidate_org_id, status(PENDING|APPROVED|REJECTED|
                       DELEGATED|ESCALATED|EXPIRED), acted_by, on_behalf_of,
                       comment, acted_at, due_at
workflow_events        append-only trace of every transition, for audit`
  },
  {
    kind: 'p',
    text: 'Running instances are pinned to the workflow version they started on. Publishing a new version never mutates in-flight approvals, which is the difference between an auditable approval history and an unexplainable one.'
  },
  { kind: 'h', text: 'Step resolvers' },
  {
    kind: 'table',
    columns: ['Resolver', 'Resolves to', 'Used for'],
    rows: [
    ['REPORTING_MANAGER', 'The requester manager from HR, walking up N levels', 'First-line approval'],
    ['ROLE_AT_SCOPE', 'All users holding a role at a resolved org node', 'Finance, CFO, group approvals'],
    ['ORG_HEAD', 'The head of a named org node type', 'Department or division heads'],
    ['SPECIFIC_USER', 'A named user, discouraged outside exceptions', 'Statutory signatories'],
    ['DYNAMIC', 'Attribute on the document, e.g. project manager', 'Project and cost-centre approvals']]

  },
  {
    kind: 'ul',
    items: [
    'Parallel steps with quorum: "any 2 of 3 directors" is a step property, not three sequential steps.',
    'SLA per step drives reminders, then escalation to a named role, then optional auto-approval — which is disabled by default and requires group compliance sign-off to enable.',
    'Delegation is resolved at task assignment time and re-resolved if a delegation starts mid-flight.',
    'Conditions are the same declarative expressions as ABAC policies, so amount, category, and budget-availability branching share one evaluator.',
    'Rejection behaviour is per step: stop, return to requester, or return to a named earlier step for rework.',
    'Every transition is idempotent and keyed by task id plus action, so a double-clicked approve button cannot double-approve.']

  },
  {
    kind: 'decision',
    title: 'Custom engine rather than a BPMN product',
    decision: 'Build a constrained internal engine covering approval graphs, conditions, SLA, escalation and delegation.',
    why: 'ERP approvals are a narrow subset of BPMN. A full engine (Camunda, Temporal) adds an operational component, a second data store, and a modelling discipline for behaviour that is ninety percent linear chains with amount branching.',
    tradeoffs: 'We own the scheduler, the retry semantics, and the version migration story. Keep the graph vocabulary deliberately small to stop it drifting into a general-purpose orchestrator.',
    alternatives: 'Camunda (right when business analysts author diagrams directly). Temporal (right for long-running technical orchestration, not human approvals).',
    changeWhen: 'Adopt a real engine when workflows need compensation logic, multi-day technical sagas, or analyst-authored BPMN diagrams.'
  },
  {
    kind: 'callout',
    tone: 'danger',
    title: 'Approval security — maker, checker, approver, auditor',
    text: 'Enforced in the engine, not per module: an actor may not approve a document they created or last modified; an actor may not occupy two steps of the same instance unless the step is explicitly marked reusable; delegated approvals evaluate separation of duties against both the acting and the delegating identity; any override requires a documented reason, dual authorisation, and a compliance alert.'
  }]

},
{
  id: 'audit',
  number: 15,
  title: 'Audit Architecture',
  summary:
  'Append-only, hash-chained, partitioned by month, written in the same transaction as the change it describes.',
  blocks: [
  {
    kind: 'code',
    title: 'Audit record',
    code: `audit_logs  (PARTITION BY RANGE (occurred_at), monthly)
  id              uuid
  occurred_at     timestamptz
  actor_user_id   uuid null            -- null for system actions
  on_behalf_of    uuid null            -- delegation
  organization_id uuid                 -- context at the time of the action
  company_id      uuid                 -- denormalized for scoped audit reads
  action          varchar(64)          -- employee.update, role.grant, invoice.approve
  resource        varchar(64)
  resource_id     uuid
  old_value       jsonb null           -- changed fields only, sensitive fields masked
  new_value       jsonb null
  ip_address      inet
  user_agent      text
  correlation_id  uuid                 -- ties every row of one request together
  session_id      uuid
  prev_hash       bytea
  row_hash        bytea                -- sha256(prev_hash || canonical(row))

Indexes: (company_id, occurred_at desc), (resource, resource_id),
         (actor_user_id, occurred_at desc), (correlation_id)
Grants:  INSERT only for the application role. No UPDATE, no DELETE, ever.`
  },
  { kind: 'h', text: 'Tamper protection, in layers' },
  {
    kind: 'ul',
    items: [
    'Database grants: the application role holds INSERT only. A REVOKE UPDATE, DELETE on audit_logs is part of the migration, not an operational afterthought.',
    'Hash chain: each row includes the previous row hash per partition, so removal or edit of any row breaks verification from that point forward.',
    'Daily anchor: the last hash of each day is written to append-only object storage with object lock (WORM) in a separate cloud account, and optionally to a third-party timestamping service. This is what makes tampering detectable even by someone with database superuser rights.',
    'Shipping: rows stream to a write-once log store, so the operational database is not the only copy.',
    'Verification job: nightly re-computation of the chain over the previous partition with an alert on mismatch, plus an on-demand verify endpoint for auditors.',
    'Separation: nobody with production write access also has audit infrastructure access.']

  },
  {
    kind: 'table',
    columns: ['Audited action class', 'Examples', 'Retention'],
    rows: [
    ['Authentication', 'Login, logout, failed attempt, MFA change, lockout', '2 years'],
    ['Authorization', 'Role grant and revoke, permission change, delegation, scope change', '7 years'],
    ['HR', 'Employment create, salary change, transfer, termination', '7 years after exit'],
    ['Financial', 'Journal post, invoice modify, payment release, payroll run', '7–10 years, statutory'],
    ['Workflow', 'Approve, reject, escalate, override', 'With the parent document'],
    ['Configuration', 'Approval limits, workflow publish, module activation, sequence change', '7 years'],
    ['Data access', 'Export, bulk download, report generation over threshold', '3 years']]

  },
  {
    kind: 'callout',
    tone: 'rule',
    title: 'Written inside the transaction',
    text: 'The audit row is inserted in the same database transaction as the change. An audit pipeline that can drop events is not an audit trail. Notification and analytics fan-out happen afterwards via the outbox, where at-least-once delivery is acceptable.'
  }]

},
{
  id: 'notifications',
  number: 16,
  title: 'Notification Architecture',
  summary:
  'One event-driven service, five channels, preference resolution with group and company policy floors.',
  blocks: [
  {
    kind: 'flow',
    steps: [
    { label: 'Domain event', note: 'via outbox' },
    { label: 'Rule match', note: 'event + company policy' },
    { label: 'Audience resolve', note: 'scoped, permission-checked' },
    { label: 'Preference filter', note: 'per user, per channel' },
    { label: 'Template render', note: 'locale + timezone' },
    { label: 'Channel dispatch', note: 'with retry and dedupe' }]

  },
  {
    kind: 'table',
    columns: ['Channel', 'Use', 'Delivery guarantee'],
    rows: [
    ['In-app', 'Everything; the durable record of what a user was told', 'Persisted, at-least-once'],
    ['WebSocket', 'Live badge counts, approval queue updates, dashboard refresh', 'Best effort, reconciled on reconnect'],
    ['Email', 'Approvals, payslips, statements, digests', 'Queued with retry and bounce handling'],
    ['SMS', 'Security alerts, high-value approvals, OTP', 'Rate limited and cost capped per company'],
    ['Push', 'Mobile approvals and field operations', 'Token lifecycle managed per device']]

  },
  {
    kind: 'ul',
    items: [
    'Notification audiences are resolved through the same scope engine as data access. A notification must never reveal a document the recipient cannot open — the payload is a reference plus a permission-safe summary, not the document body.',
    'Preferences resolve as group policy floor, then company policy, then user preference. Security alerts and statutory notices are marked mandatory and cannot be disabled by a user.',
    'Digest and quiet hours are per user with company-level defaults and timezone awareness, so a group CFO in another timezone is not paged at 03:00 for a routine approval.',
    'Deduplication key is event id plus recipient plus channel, so retries and multi-subscriber fan-out cannot double-send.',
    'Templates are versioned per locale; a template change is a configuration change and is audited.']

  }]

},
{
  id: 'reporting',
  number: 17,
  title: 'Reporting & BI Architecture',
  summary:
  'Three tiers: cached widgets, pre-aggregated operational reports on a read replica, and a warehouse for group analytics. Transactional tables are never queried directly by a dashboard.',
  blocks: [
  {
    kind: 'flow',
    caption: 'Read path separation',
    steps: [
    { label: 'OLTP primary', note: 'writes only + point reads' },
    { label: 'Logical replica', note: 'operational reporting' },
    { label: 'Materialized views', note: 'refreshed on schedule/event' },
    { label: 'Warehouse', note: 'group analytics, history' },
    { label: 'Widget cache', note: 'Redis, scope-keyed' }]

  },
  {
    kind: 'table',
    columns: ['Tier', 'Serves', 'Freshness', 'Introduce when'],
    rows: [
    ['Redis widget cache', 'Dashboard tiles', '1–15 min TTL', 'Day one'],
    ['Materialized views on replica', 'Trial balance, stock valuation, headcount, ageing', '5–60 min', 'Day one — cheap and decisive'],
    ['Read replica', 'Ad-hoc operational reports, exports', 'Seconds behind', 'Day one'],
    ['Warehouse (columnar) + ELT', 'Group consolidation, trends, forecasting, BI tools', 'Nightly or hourly', 'When group reporting spans years of data or BI tooling arrives'],
    ['Event-driven aggregates', 'Live KPIs that cannot wait for a refresh', 'Near real time', 'Only for the few tiles that genuinely need it']]

  },
  {
    kind: 'code',
    title: 'Reporting levels',
    code: `GROUP      consolidated P&L, balance sheet, cash flow, group revenue and expense,
           company comparison, budget vs actual, headcount, cost per department,
           inter-company exposure, approval cycle time
COMPANY    revenue, expense, profit, AR/AP ageing, inventory valuation,
           sales pipeline, purchasing spend, headcount, attrition
DEPARTMENT expense vs budget, employees, open approvals, task throughput,
           performance ratings, requests raised`
  },
  {
    kind: 'decision',
    title: 'Keeping reporting off the transactional path',
    decision: 'All reporting reads go to a replica or a pre-aggregate. The API layer routes read-only report queries to a separate connection pool pointed at the replica, with a statement timeout.',
    why: 'One unindexed group-wide report over a partitioned journal table can consume the primary connection pool and stall order entry for every company. Physical separation makes that impossible rather than unlikely.',
    tradeoffs: 'Replica lag means a report may not include a transaction posted seconds ago. Acceptable and expected for reporting; explicitly labelled with an as-of timestamp in the UI.',
    alternatives: 'Same-database reporting with query governor (simpler, still shares buffer cache and connections). Full CQRS with projections (more machinery than justified before the warehouse exists).',
    changeWhen: 'Add the warehouse when consolidation runtime exceeds a few minutes, when analysts need SQL access, or when history beyond the online retention window must stay queryable.'
  },
  { kind: 'h', text: 'Permission-aware dashboards' },
  {
    kind: 'ul',
    items: [
    'A dashboard is a layout of widgets; each widget declares required_permission, required_module, and a scope level.',
    'The server composes the dashboard: widgets the user cannot satisfy are never sent, so the client cannot leak their existence by rendering a locked tile.',
    'Every widget query is parameterised by the resolved scope set — a group CFO and a company CFO run the same widget definition against different scope inputs.',
    'The cache key includes user scope hash, company, role version, and widget version so two users can never share a cached figure across companies.',
    'Widgets carry a data-as-of timestamp and the tier they were served from, which removes most "the numbers do not match" support tickets.']

  },
  {
    kind: 'cards',
    items: [
    { title: 'Group CEO', meta: 'Scope: GROUP', body: 'Group overview, company performance comparison, financial and HR KPIs, operational exceptions, alerts. No transaction-level entry screens.' },
    { title: 'Company CEO', meta: 'Scope: COMPANY', body: 'Company overview, finance, operations, HR, sales, inventory, approvals awaiting them, alerts for their company only.' },
    { title: 'Department Manager', meta: 'Scope: DEPARTMENT', body: 'Department KPIs, team roster, pending approvals, budget vs actual, requests, performance status.' },
    { title: 'Employee', meta: 'Scope: SELF', body: 'My tasks, attendance, leave balance, payslips, requests, documents, notifications.' }]

  }]

}];