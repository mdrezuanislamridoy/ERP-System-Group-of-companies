import type { DocSection } from '../../types/doc';

export const operationsSections: DocSection[] = [
{
  id: 'frontend',
  number: 24,
  title: 'Frontend Architecture',
  summary:
  'Next.js app router with a server-composed, permission-aware shell. The UI never decides access — it renders what the server says exists.',
  blocks: [
  {
    kind: 'code',
    title: 'Stack and structure',
    code: `Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
TanStack Query   server state, cache keyed by [resource, companyId, scopeHash, params]
Zustand          client state only: active context, table view state, UI preferences
react-hook-form + zod   forms and validation shared with API DTO schemas
TanStack Table   dense data grids: column pinning, resizing, grouping, virtualization

app/
  (auth)/login, mfa, select-context
  (shell)/[company]/dashboard | hr | finance | procurement | inventory | sales
  (shell)/[company]/admin/{organization,users,roles,workflows,modules,settings}
  (shell)/group/{overview,companies,consolidation,audit,security}
components/  ui (shadcn) | data-table | forms | approval | org-tree
lib/         api client, permission hooks, scope context, formatters`
  },
  { kind: 'h', text: 'Permission-aware UI' },
  {
    kind: 'ul',
    items: [
    'On login the client calls /me and receives: active context, companies available, enabled modules, effective permission keys, navigation tree, and dashboard layout. Everything the shell renders is derived from that payload.',
    'Navigation is server-composed. A module the company has not enabled, or a section the user has no read permission for, is simply absent — not hidden with CSS.',
    'Actions use a single <Can permission="invoice.approve" resource={invoice}> primitive that evaluates the same condition shape as the backend policy, so a disabled button and a 403 never disagree.',
    'Hiding a button is a usability feature, never a security control. Every action is re-authorised server side.',
    'Context switching (company or department) invalidates the entire query cache. Stale data from the previous company must never paint, even for a frame.',
    'Field-level masking arrives from the server as a masked value plus a canReveal flag; the client never receives data it must not show.']

  },
  {
    kind: 'cards',
    items: [
    { title: 'Group Admin navigation', meta: 'Scope GROUP', body: 'Dashboard, Companies, Organization, Employees, Finance, Procurement, Inventory, Reports, Audit, Settings.' },
    { title: 'Company manager', meta: 'Scope COMPANY', body: 'Dashboard, Employees, Finance, Procurement, Inventory, Reports, Approvals.' },
    { title: 'Department manager', meta: 'Scope DEPARTMENT', body: 'Dashboard, Team, Approvals, Requests, Budget, Reports.' },
    { title: 'Employee', meta: 'Scope SELF', body: 'Dashboard, My Profile, Attendance, Leave, Payroll, Tasks, Requests, Documents.' }]

  },
  { kind: 'h', text: 'UX requirements for an enterprise ERP' },
  {
    kind: 'table',
    columns: ['Requirement', 'Implementation'],
    rows: [
    ['Information density', 'Compact row height by default, 12–13px base type, a density toggle persisted per user'],
    ['Advanced tables', 'Server-side filter, sort, cursor pagination, saved views, column chooser, sticky header and first column'],
    ['Bulk actions', 'Selection model with cross-page selection, a summary bar, and a confirmation listing affected rows'],
    ['Keyboard workflows', 'Global command palette, j/k row navigation, a/r to approve or reject in the queue, / to search, all documented in a shortcut sheet'],
    ['Approval clarity', 'Every document shows the chain, who acted, when, remaining steps, SLA countdown, and delegation attribution'],
    ['Audit visibility', 'A History tab on every record with the diff of each change and the actor'],
    ['Consistent forms', 'One form shell: sticky header with document number and status, sectioned body, sticky action footer, inline validation, unsaved-change guard'],
    ['Responsiveness', 'Full grid on desktop, priority columns plus detail sheet on tablet, approve-and-view flows only on phone'],
    ['Restraint in motion', 'Transitions limited to state feedback and overlays, 120–220ms, ease-out, honouring reduced motion']]

  },
  {
    kind: 'callout',
    tone: 'info',
    title: 'The active context selector is the most important control in the product',
    text: 'A group CFO switching from ABC Foods to ABC Grocery changes navigation, dashboards, permissions, numbering, currency and fiscal calendar. It belongs in the top bar, always visible, always showing the current company, and every switch is audited.'
  }]

},
{
  id: 'infrastructure',
  number: 25,
  title: 'Infrastructure & Deployment',
  summary:
  'A deliberately small production footprint that grows by adding replicas and workers, not by adding architecture.',
  blocks: [
  {
    kind: 'flow',
    caption: 'Production request path',
    steps: [
    { label: 'Internet' },
    { label: 'Cloudflare', note: 'WAF, DDoS, TLS, CDN' },
    { label: 'Load balancer' },
    { label: 'Reverse proxy', note: 'rate limit, headers' },
    { label: 'App nodes', note: '3+ NestJS containers' },
    { label: 'PostgreSQL primary', note: 'multi-AZ' },
    { label: 'Replica + Redis + S3' },
    { label: 'Workers', note: 'queue consumers' }]

  },
  {
    kind: 'table',
    columns: ['Stage', 'Footprint', 'Trigger to move on'],
    rows: [
    ['Launch (5–10 companies)', '2 app nodes, 1 primary, 1 replica, Redis, object storage, 2 workers', 'Baseline'],
    ['Growth (20–30 companies)', '4–6 app nodes, 2 replicas (one reporting-only), worker pools per queue class, PgBouncer', 'Sustained CPU above 60% or replica lag during reports'],
    ['Scale (50+ companies)', 'Autoscaled app tier, dedicated analytics warehouse, partitioned hot tables, regional CDN, separate export cluster', 'Consolidation runtime, audit table size, export contention'],
    ['Specialisation', 'Reporting, notification and document processing extracted as services', 'A module has an independent scaling or availability profile for two or more releases']]

  },
  {
    kind: 'ul',
    items: [
    'Containers everywhere (Docker), one image promoted unchanged through environments, configuration by environment variables and a secrets manager.',
    'PgBouncer in transaction pooling mode from day one — NestJS plus Prisma plus workers will otherwise exhaust connections long before CPU.',
    'Separate connection pools for transactional traffic, reporting (replica, statement timeout), and workers, so a heavy report cannot starve order entry.',
    'Blue/green deploys with expand-and-contract migrations: add nullable, backfill, switch reads, drop later. Never a migration that locks a partitioned financial table during business hours.',
    'Environments: development, staging with anonymised production-shaped data, and production. Restores are tested into staging monthly.']

  }]

},
{
  id: 'scalability',
  number: 26,
  title: 'Scalability Strategy',
  summary:
  'Each technique has an entry condition. Applying them all at launch is the most expensive way to be slow.',
  blocks: [
  {
    kind: 'table',
    columns: ['Technique', 'Introduce when', 'Cost of doing it too early'],
    rows: [
    ['Correct indexing and query review', 'Day one', 'None — this is the highest-return work available'],
    ['Connection pooling (PgBouncer)', 'Day one', 'None'],
    ['Redis caching of principal, scope, config', 'Day one', 'None; these reads are on every request'],
    ['Background workers and queues', 'Day one for payroll, reports, notifications, documents', 'None; retro-fitting them is the painful path'],
    ['Read replica for reporting', 'Day one', 'Minor cost, removes an entire class of incident'],
    ['Horizontal API scaling', 'Sustained CPU above 60% or p95 above target', 'Requires statelessness, which must be true from the start anyway'],
    ['Table partitioning', 'A table passes roughly 50M rows or maintenance windows grow', 'Adds routing and constraint complexity with no benefit at low volume'],
    ['Materialized aggregates', 'A dashboard query exceeds a few hundred milliseconds on the replica', 'Freshness confusion and refresh scheduling overhead'],
    ['Analytics warehouse + ELT', 'Group consolidation slows, or BI tooling and multi-year history arrive', 'A second data platform to operate and reconcile'],
    ['Archival to cold storage', 'Online data exceeds the retention window, typically year three', 'Restore complexity before there is anything to archive'],
    ['Service extraction', 'A module has a distinct scaling or availability profile', 'Distributed transactions and a coordination tax across the whole team']]

  },
  {
    kind: 'ul',
    items: [
    'Volume expectations at 50 companies and 100k employees: attendance around 25M rows per year, journal lines 40–80M per year, audit logs 100M+ per year, notifications 50M+ per year. These four are the partitioning candidates; almost nothing else is.',
    'Hot paths to protect: login and scope resolution, the approval queue, dashboard tiles, document numbering, and stock movement posting.',
    'Horizontal scaling requires strict statelessness: no in-memory session, no in-process scheduler, no local file storage. All three are enforced from day one because retro-fitting them is expensive.',
    'Distributed locks (Redlock or advisory locks) guard singleton jobs such as period close, payroll run, and sequence maintenance.']

  }]

},
{
  id: 'observability',
  number: 27,
  title: 'Observability',
  summary:
  'Every log line, span and metric carries the same five identifiers, which is what makes a cross-company incident debuggable.',
  blocks: [
  {
    kind: 'code',
    title: 'Mandatory context on every emission',
    code: `correlation_id   one per inbound request, propagated to jobs and events
request_id       one per hop
user_id          actor (and on_behalf_of when delegated)
organization_id  active context
company_id       resolved company
module_key       owning module
Never logged: passwords, tokens, national IDs, bank details, salary amounts,
              full request bodies of financial documents.`
  },
  {
    kind: 'table',
    columns: ['Signal', 'Tool class', 'Alert on'],
    rows: [
    ['Structured logs', 'JSON to a central log store with 30–90 day retention', 'Error rate spike, repeated authorization failures'],
    ['Metrics', 'Prometheus-style: RED per endpoint, queue depth and age, pool saturation, cache hit rate', 'p95 latency, queue age above SLA, pool above 80%'],
    ['Tracing', 'OpenTelemetry across API, database, Redis, queue and workers', 'Slow span outliers, N+1 patterns'],
    ['Error tracking', 'Sentry-class with release and user context', 'New error signature, regression after deploy'],
    ['Database', 'pg_stat_statements, lock waits, bloat, replica lag', 'Lag above 30s, long transactions, sequential scans on partitioned tables'],
    ['Queues', 'Depth, throughput, failure rate, dead-letter size', 'Dead-letter growth, stalled worker'],
    ['Audit and security', 'Hash-chain verification, grant monitoring, export monitoring', 'Chain mismatch, group-scope grant, off-hours bulk export, impossible-travel login'],
    ['Business health', 'Approvals breaching SLA, failed payroll runs, unmatched inter-company balances', 'Operational exception dashboards per company']]

  },
  {
    kind: 'callout',
    tone: 'rule',
    title: 'Authorization denials are a security signal',
    text: 'A single 404 from a scope miss is noise. The same user generating scope misses across several companies in a short window is either a broken integration or an enumeration attempt. Both deserve an alert, and only structured, context-tagged logging makes that query possible.'
  }]

},
{
  id: 'backup-dr',
  number: 28,
  title: 'Backup & Disaster Recovery',
  summary:
  'RPO 5 minutes, RTO 1 hour, verified by restore tests that are scheduled rather than hoped for.',
  blocks: [
  {
    kind: 'table',
    columns: ['Asset', 'Mechanism', 'Retention', 'Recovery'],
    rows: [
    ['PostgreSQL', 'Nightly base backup + continuous WAL archiving (pgBackRest or managed equivalent)', '35 days PITR, monthly archives 7 years', 'Point-in-time to any second within the window'],
    ['Object storage', 'Versioning + cross-region replication + object lock on audit and statutory classes', 'Per retention class', 'Version restore, no overwrite possible on locked objects'],
    ['Redis', 'Not backed up; treated as rebuildable', 'n/a', 'Cold start rebuilds cache; sessions require re-login'],
    ['Secrets', 'Managed KMS with versioning and break-glass procedure', 'Rotating', 'Documented, dual-control recovery'],
    ['Configuration and schema', 'In version control, environments reproducible from code', 'Full history', 'Redeploy from a tag']]

  },
  {
    kind: 'ul',
    items: [
    'Backups are encrypted at rest with a key held in a separate account from the data, and copies are written off-site in a second region.',
    'The backup account is write-only from production. Ransomware that compromises production must not be able to delete history — this is the single most important DR control.',
    'Restore testing: monthly automated restore into staging with an integrity suite (row counts, trial balance parity, audit hash-chain verification). A backup that has never been restored is an assumption.',
    'Documented DR runbook with named roles, a communication tree, and a declared decision point for failover; rehearsed twice a year.',
    'Per-company logical restore: because ownership is explicit, one company can be exported and restored into a point-in-time clone without restoring the whole cluster — the answer to "ABC Grocery deleted a month of stock adjustments".',
    'Targets by class: platform RPO 5 min / RTO 1 hour; financial records must be recoverable to the second for statutory reasons; analytics warehouse RPO 24 hours because it is derived and rebuildable.']

  }]

}];