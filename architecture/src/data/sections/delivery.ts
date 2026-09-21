import type { DocSection } from '../../types/doc';

export const deliverySections: DocSection[] = [
{
  id: 'roadmap',
  number: 32,
  title: 'Development Roadmap',
  summary:
  'Eight phases with explicit dependencies. Phase 1 is non-negotiable and everything else is sequenced by what it cannot function without.',
  blocks: [
  {
    kind: 'table',
    columns: ['Phase', 'Scope', 'Depends on', 'Indicative duration', 'Exit criteria'],
    rows: [
    ['1. Foundation', 'IAM, organization tree, users, roles, permissions, scopes, audit, configuration, numbering, module activation', '—', '3–4 months', 'Two real companies onboarded with real org charts; isolation test suite green; audit chain verifying'],
    ['2. HR', 'Persons, employments, positions, departments, attendance, leave', 'Phase 1', '3 months', 'One company running attendance and leave in production'],
    ['3. Finance', 'CoA, GL, journals, AP, AR, invoices, payments, budgets, periods', 'Phase 1 (2 for cost allocation)', '4 months', 'One company closes a month end in the system'],
    ['4. Procurement & Inventory', 'Suppliers, PR, RFQ, PO, GRN, items, stock ledger, warehouses', 'Phases 1, 3, and 6 for real chains', '4 months', 'Procure-to-pay completes end to end with three-way match'],
    ['5. Sales & CRM', 'Customers, quotations, orders, deliveries, invoicing, receipts, pipeline', 'Phases 3, 4', '3 months', 'Order to cash completes with revenue posted'],
    ['6. Workflow', 'Approval engine, delegation, escalation, SLA, notifications', 'Phase 1', '2–3 months, started in parallel from phase 2', 'Leave and PR approvals run on the engine, not on bespoke code'],
    ['7. Specialised modules', 'Fleet, Manufacturing, POS, Retail, Construction, Healthcare', 'Phases 1–6 for the relevant base modules', '2–3 months each, parallelisable', 'Each vertical activated for its company without core changes'],
    ['8. Group intelligence', 'Consolidation, BI, warehouse, forecasting, cross-company reporting', 'Phases 3, 4, 5 with real data volume', '3–4 months', 'Consolidated P&L and balance sheet with eliminations, reproducible']]

  },
  { kind: 'h', text: 'Dependency logic' },
  {
    kind: 'ul',
    items: [
    'Payroll cannot start before Attendance and Leave, because gross pay depends on both, and it cannot post before Finance exists.',
    'Procurement without the Workflow engine means hard-coded approval chains — exactly rule 3 of the architectural rules. Start phase 6 in parallel with phase 2 so the engine is ready when procurement needs it.',
    'Inventory before Finance produces stock movements with no accounting effect, and back-posting valuation history later is expensive. Finance first.',
    'Group consolidation needs at least two companies posting real transactions for two or more periods; building it earlier means building against synthetic data and discovering the mapping problems in production.',
    'Vertical modules must never require a core change. If a vertical needs a core change, that change belongs in the core and must be justified for every company.']

  },
  {
    kind: 'callout',
    tone: 'warn',
    title: 'Rollout sequencing across 20 companies',
    text: 'Do not onboard twenty companies at once. Pick two pilots with different shapes — for example ABC Foods (manufacturing, complex) and ABC Technologies (services, simple). Their differences flush out hard-coded assumptions while the cost of fixing them is still low. Then roll out in waves of three to five, with each wave onboarded purely through configuration. The day a wave requires a code change is the day the configuration model has a gap worth fixing before the next wave.'
  }]

},
{
  id: 'risks',
  number: 33,
  title: 'Risks, Trade-offs & Critical Questions',
  summary:
  'Every question from the brief, answered with a recommendation and the condition that would change it.',
  blocks: [
  {
    kind: 'table',
    columns: ['Question', 'Recommendation', 'Trade-off / change trigger'],
    rows: [
    ['Should this be multi-tenant?', 'Yes — single tenant (the group) with many companies as organizational contexts, not as isolated tenants', 'Isolation becomes a code-discipline problem; mitigated by scoped repositories, RLS and contract tests'],
    ['Should companies share one database?', 'Yes. Shared schema, company_id on every owned row', 'Consolidation and transfers stay cheap; a scope bug becomes a disclosure'],
    ['When is database-per-company justified?', 'Regulatory data residency, divestment, a company dominating cluster load, or a contractual isolation requirement', 'Lose cheap consolidation; gain physical isolation and independent restore'],
    ['Where is companyId required?', 'Every table queried directly that is owned by one company. Not on child rows reachable only through an owned parent', 'Over-adding it creates drift between parent and child; under-adding it forces joins on hot paths'],
    ['Where is organizationId used?', 'Where the owner is finer than a company: departments, branches, warehouses, projects, cost centres — and on every role assignment', 'A second column, but it is what makes department and warehouse scoped roles free'],
    ['Should PostgreSQL RLS be used?', 'Yes, but only on the eight highest-risk tables, as a second net behind scoped repositories', 'Predicate overhead and plan complexity; ELT and jobs need BYPASSRLS with explicit scope'],
    ['How should cross-company access work?', 'Only through an explicit assignment at a shared ancestor or a CROSS-scope assignment listing named companies. Never implicit', 'Users with many assignments must switch context explicitly, which is friction — and that friction is the security control'],
    ['How do group permissions inherit?', 'Downward only, through the closure table, from the node where the role is assigned', 'A group grant is powerful, so it requires dual approval and raises an alert'],
    ['How are permissions revoked?', 'Set valid_to, bump permissions_version, publish PermissionsChanged, bust cache, re-route pending tasks. Effective within seconds', 'One cache read per request is the price of instant revocation — worth it'],
    ['How does temporary delegation work?', 'Time-bounded, non-re-delegatable subset of the delegator permissions, evaluated live, audited on both identities', 'Complex approval attribution; solved by recording acting and on-behalf-of on every action'],
    ['How are approval conflicts prevented?', 'Engine-level separation of duties: no self-approval, no dual-step occupancy, override requires dual authorisation and an alert', 'Small companies may have too few people; handled by a documented exception role, not by disabling the rule'],
    ['How does inter-company accounting work?', 'Both legs posted in one transaction with partner_org_id, netted settlement, eliminated at consolidation', 'Requires both periods open; queued otherwise'],
    ['How does consolidated reporting work?', 'Group mapping codes on the CoA, translation by rate type, ownership adjustment, elimination by partner key — run on the replica or warehouse as an immutable snapshot', 'Freshness lags by minutes; correctness and reproducibility matter more'],
    ['How do employee transfers work?', 'One person, one user, two employments. Assignments revoked and re-granted; balances carried by policy', 'Requires HR discipline at the effective date; automated by the transfer workflow'],
    ['How are mergers and splits handled?', 'Re-parent nodes with effective dating, add CONSOLIDATES_INTO relations, transfer open balances by journal. Never rewrite posted history', 'Historical reports must be run as-of a date, which the effective dating supports'],
    ['How is a company archived?', 'status=ARCHIVED cascades read-only, modules revoked, assignments expired, data retained and queryable by group audit', 'Storage cost for the retention period, which is far cheaper than a failed audit'],
    ['How are modules enabled and disabled?', 'A company_modules row plus a guard returning 404, permission stripping, navigation filtering and dependency validation', 'Disabling hides but never deletes; re-enabling restores state'],
    ['How does configuration inherit?', 'Group default → company override → department override, resolved at read and cached by scope hash', 'Debugging an effective value needs a resolution trace, so the UI must show where a value came from'],
    ['How are audit logs protected?', 'Insert-only grants, hash chaining, daily WORM anchoring, off-cluster shipping, nightly verification, access separation', 'Cannot correct an erroneous audit row — by design; corrections are new rows'],
    ['How do background jobs keep authorization context?', 'Principal snapshot in the job payload, rebuilt into a context, revalidated at execution, same scoped repositories', 'A revoked permission fails the job rather than running with stale authority — the correct failure'],
    ['How do caches avoid cross-company leakage?', 'Keys include company, user, scope hash and permissions_version; payloads embed the scope they were computed for and are re-validated on read', 'Lower hit rate, no shared cache across companies — an acceptable cost'],
    ['How does reporting scale without hurting OLTP?', 'Separate pool to a replica, materialized aggregates, widget cache, warehouse when history or BI demands it', 'Reports are seconds stale and labelled as such'],
    ['When should modules become microservices?', 'When a module has an independent scaling or availability profile sustained over releases — Reporting, Notification, Document Processing first', 'Each extraction adds a network boundary, a deployment, and an eventual-consistency seam']]

  },
  { kind: 'h', text: 'Top risks and mitigations' },
  {
    kind: 'cards',
    items: [
    { title: 'Cross-company data leak', meta: 'Severity: critical', body: 'A single missed scope filter. Mitigation: unscoped queries are impossible by construction, RLS on critical tables, and an automated isolation suite that calls every endpoint cross-company and asserts 404.' },
    { title: 'Scope creep into 25 modules at once', meta: 'Severity: high', body: 'The most common cause of group ERP failure. Mitigation: phase gates with exit criteria, two pilot companies, and a rule that no wave may require a code change.' },
    { title: 'Configuration explosion', meta: 'Severity: medium', body: 'Fifty companies times many overrides becomes unreviewable. Mitigation: settings registry with typed keys, an effective-value resolution trace in the UI, and a diff view against the group default.' },
    { title: 'Modular monolith decaying into a big ball of mud', meta: 'Severity: high', body: 'Mitigation: module ownership of tables enforced by lint and schema review, cross-module access only via facades, and an architecture test that fails the build on illegal imports.' },
    { title: 'Consolidation correctness', meta: 'Severity: high', body: 'Mitigation: group mapping codes locked at the top three CoA levels, partner keys mandatory on inter-company lines, and blocked runs on unmatched balances.' },
    { title: 'Audit credibility', meta: 'Severity: critical', body: 'Mitigation: in-transaction writes, insert-only grants, hash chaining, WORM anchoring off-cluster, and nightly verification with alerting.' },
    { title: 'Reporting load on the primary', meta: 'Severity: medium', body: 'Mitigation: physically separate pools and replicas from day one, with statement timeouts on the reporting pool.' },
    { title: 'Change management across 20 businesses', meta: 'Severity: high', body: 'Not a technical risk but the most likely cause of failure. Mitigation: per-company configuration autonomy within a locked group core, wave rollouts, and named company owners.' }]

  }]

},
{
  id: 'final',
  number: 34,
  title: 'Recommended Final Architecture',
  summary:
  'The complete recommendation in one page, with the conditions under which each decision should be revisited.',
  blocks: [
  {
    kind: 'code',
    title: 'The stack',
    code: `Frontend     Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
             TanStack Query + Zustand + TanStack Table + react-hook-form/zod
Backend      NestJS + TypeScript, modular monolith, 25 modules with enforced boundaries
Data         PostgreSQL 16 primary (multi-AZ) + logical read replica
             Prisma, PgBouncer, partitioning on audit/attendance/stock/journal lines
Cache/Queue  Redis: sessions, principal and scope cache, config, rate limiting,
             distributed locks, idempotency, BullMQ job queues, WebSocket pub/sub
Storage      S3-compatible object storage (R2/MinIO) with versioning, object lock,
             virus scanning, signed short-lived URLs, retention classes
Events       Transactional outbox -> relay -> BullMQ. No broker until justified
Edge         Cloudflare (WAF, DDoS, TLS, CDN) -> load balancer -> reverse proxy
Runtime      Docker containers, blue/green deploys, expand-and-contract migrations
Observability OpenTelemetry tracing, structured JSON logs, Prometheus metrics,
             Sentry-class error tracking, all carrying correlation + org context`
  },
  {
    kind: 'tree',
    caption: 'Application composition',
    root: {
      label: 'API Gateway / Reverse proxy',
      children: [
      {
        label: 'NestJS application (single deployable, 3+ replicas)',
        children: [
        { label: 'Cross-cutting', note: 'auth guard, module guard, scope resolver, policy evaluator, audit interceptor, correlation middleware' },
        { label: 'Platform modules', note: 'IAM, Organization, Workflow, Notification, Audit, Configuration, Document, Search' },
        { label: 'Business modules', note: 'HR, Payroll, Finance, Budget, Procurement, Inventory, Sales, CRM, Asset, Project' },
        { label: 'Vertical modules', note: 'Manufacturing, Fleet, POS, Retail, Construction, Healthcare — pluggable' },
        { label: 'Reporting module', note: 'replica-bound pool, first extraction candidate' }]

      },
      {
        label: 'Worker fleet (same image, queue consumers)',
        children: [
        { label: 'Payroll runs, report generation, ELT, document processing' },
        { label: 'Notification dispatch, outbox relay, SLA escalation scheduler' }]

      }]

    }
  },
  { kind: 'h', text: 'The ten decisions that define this architecture' },
  {
    kind: 'table',
    columns: ['Decision', 'Revisit when'],
    rows: [
    ['One platform, companies as organization nodes', 'Never — this is the reason the system exists'],
    ['Modular monolith, not microservices', 'A module shows a sustained independent scaling or availability profile'],
    ['Shared PostgreSQL with explicit company ownership', 'Regulatory residency, divestment, or one company dominating load'],
    ['Scope-based authorization enforced at the repository', 'Never weaken it; only strengthen with RLS coverage'],
    ['RBAC + scope with a small ABAC policy layer', 'Policy authorship moves to non-engineers, or external services need the decisions'],
    ['Configuration-driven workflows, limits and modules', 'Never — this is what makes 50 companies feasible'],
    ['Append-only ledgers and hash-chained audit', 'Never for financial or audit data'],
    ['Reporting on a replica with pre-aggregates', 'Add the warehouse when history or BI tooling demands it'],
    ['Outbox + Redis queues, no broker', 'CDC streaming, external replayable consumers, or very high event throughput'],
    ['Person / user / employment / assignment separated', 'Never — merging them breaks transfers, audits and delegation']]

  },
  {
    kind: 'callout',
    tone: 'rule',
    title: 'The test this architecture must pass',
    text: 'Onboarding company number 51 — a business line nobody has thought of yet — must require: one organization node, a module activation set, a chart-of-accounts instantiation, approval rules, workflow versions, numbering sequences, and role assignments. All of it data entry, all of it audited, none of it a deployment. If any future request breaks that property, the correct response is to make the behaviour configurable, not to add a branch for that company.'
  },
  {
    kind: 'cards',
    items: [
    { title: 'Security', meta: 'Priority 1', body: 'Company isolation enforced in four layers; deny by default; sensitive actions dual-controlled, MFA-stepped and alerted.' },
    { title: 'Correctness', meta: 'Priority 2', body: 'Balanced, immutable ledgers; append-only stock; invariants inside transactions; events only for propagation.' },
    { title: 'Auditability', meta: 'Priority 3', body: 'In-transaction, hash-chained, WORM-anchored, verifiable on demand, with delegation attribution.' },
    { title: 'Configurability', meta: 'Priority 4', body: 'Hierarchy, workflows, limits, numbering, policies and modules are all data with defined precedence.' },
    { title: 'Maintainability', meta: 'Priority 5', body: 'Module-owned tables, facade access, architecture tests, one deployable, one migration path.' },
    { title: 'Operational simplicity', meta: 'Priority 6', body: 'Five infrastructure components at launch. Every addition has a written entry condition in this document.' }]

  }]

}];