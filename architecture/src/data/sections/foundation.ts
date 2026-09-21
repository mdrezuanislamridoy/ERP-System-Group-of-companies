import type { DocSection } from '../../types/doc';

export const foundationSections: DocSection[] = [
{
  id: 'executive-summary',
  number: 1,
  title: 'Executive Summary',
  summary:
  'One ERP platform, many organizational contexts. A modular monolith on a shared PostgreSQL database with organization-scoped authorization as the primary security boundary.',
  blocks: [
  {
    kind: 'p',
    text: 'The group operates 20+ sister concerns across unrelated industries and expects to exceed 50. The failure mode to avoid is twenty parallel ERPs with twenty identity stores, twenty chart-of-accounts conventions, and no consolidated view. The recommended target is a single platform whose core — identity, organization, authorization, workflow, audit, configuration — is shared by every company, and whose business capability is delivered as pluggable modules each company activates independently.'
  },
  {
    kind: 'cards',
    items: [
    {
      title: 'Shared platform core',
      meta: 'Non-negotiable',
      body: 'One identity system, one organization tree, one permission vocabulary, one workflow engine, one audit log. These are never forked per company.'
    },
    {
      title: 'Pluggable business modules',
      meta: 'Per-company',
      body: 'HR, Finance, Procurement, Inventory, Sales plus vertical modules (Fleet, Manufacturing, POS, Healthcare). Activation is data, not deployment.'
    },
    {
      title: 'Scope-based authorization',
      meta: 'Security boundary',
      body: 'Every permission is granted at an organization node and inherited downward. Company isolation is enforced in the data layer, never in the UI.'
    },
    {
      title: 'Configuration over code',
      meta: 'Scalability of change',
      body: 'Approval chains, limits, numbering, leave and payroll policies resolve through group to company to department precedence.'
    }]

  },
  {
    kind: 'decision',
    title: 'Headline decision',
    decision:
    'Modular monolith (NestJS + TypeScript + Prisma) on a single PostgreSQL cluster with a shared schema, organization-scoped rows, and an analytics replica for reporting.',
    why: 'A group ERP is dominated by cross-module transactions (a goods receipt moves inventory, accrues a liability, and posts a journal). Distributed transactions across microservices would dominate the engineering budget before a single company went live. One database also makes consolidation and inter-company settlement natural.',
    tradeoffs:
    'A single deployable means one blast radius and one release train. Noisy modules (reporting, notifications, document processing) can starve request threads unless they are pushed to workers early.',
    alternatives:
    'Microservices per domain (premature: no independent scaling need yet, high coordination cost). Database-per-company (defensible isolation, but 50 migration targets and impossible cheap consolidation).',
    changeWhen:
    'Extract a module into its own service when it has an independent scaling profile or availability requirement — realistically Reporting, Notification, and Document Processing first, and only after the module boundary has been clean for two or more releases.'
  },
  {
    kind: 'tree',
    caption: 'Platform shape',
    root: {
      label: 'GROUP ERP PLATFORM',
      children: [
      {
        label: 'Platform core (shared, always on)',
        children: [
        { label: 'IAM', note: 'users, sessions, roles, assignments, delegation' },
        { label: 'Organization', note: 'org tree, types, relations, module activation' },
        { label: 'Workflow', note: 'definitions, versions, instances, approvals' },
        { label: 'Audit', note: 'append-only, hash-chained' },
        { label: 'Configuration', note: 'group / company / department precedence' },
        { label: 'Notification', note: 'events, channels, preferences' }]

      },
      {
        label: 'Business modules (activated per company)',
        children: [
        { label: 'HR, Payroll, Attendance, Leave, Recruitment, Performance' },
        { label: 'Finance, Budget, Assets, Inter-company' },
        { label: 'Procurement, Suppliers' },
        { label: 'Inventory, Warehouse' },
        { label: 'Sales, CRM, Projects, Documents' }]

      },
      {
        label: 'Vertical modules (activated per company)',
        children: [
        { label: 'Manufacturing, Fleet, POS, Retail, Construction' },
        { label: 'Healthcare, Education, Hospitality, Agriculture, E-commerce' }]

      }]

    }
  },
  {
    kind: 'callout',
    tone: 'rule',
    title: 'The one rule that governs everything else',
    text: 'A company is not a tenant in a separate silo, and it is not a column you filter in the frontend. It is a node in one organization tree, and every query in the system is constrained by the caller resolved scope set at the repository layer.'
  }]

},
{
  id: 'business-requirements',
  number: 2,
  title: 'Business Requirements',
  summary:
  'Functional, non-functional, and governance requirements derived from a multi-industry holding structure of 20 to 50+ operating companies.',
  blocks: [
  { kind: 'h', text: 'Functional requirements' },
  {
    kind: 'table',
    columns: ['ID', 'Requirement', 'Drives'],
    rows: [
    ['FR-01', 'One identity per human being across the whole group, regardless of how many companies they serve', 'IAM, employee transfer, multi-assignment'],
    ['FR-02', 'Each company defines its own departments, branches, warehouses and reporting lines', 'Flexible organization model, no fixed hierarchy'],
    ['FR-03', 'Each company enables only the modules it needs', 'Module activation, navigation, API guards'],
    ['FR-04', 'Approval chains differ per company, department, category and amount', 'Workflow engine, configuration resolution'],
    ['FR-05', 'Group executives see consolidated and company-comparative reporting', 'Scope inheritance, analytics replica, consolidation'],
    ['FR-06', 'Companies trade with one another and must settle internally', 'Inter-company transactions, elimination entries'],
    ['FR-07', 'Employees move between companies without losing history', 'Employment records separate from person identity'],
    ['FR-08', 'Temporary delegation of approval authority during absence', 'Delegation with time bounds and audit'],
    ['FR-09', 'Every sensitive action is attributable and immutable after the fact', 'Append-only audit with hash chaining'],
    ['FR-10', 'Document numbering is unique, per company, per fiscal year, collision free', 'Sequence allocator with database-level locking']]

  },
  { kind: 'h', text: 'Non-functional requirements' },
  {
    kind: 'table',
    columns: ['Dimension', 'Target', 'Notes'],
    rows: [
    ['Scale', '50+ companies, 100k employees, low millions of rows per transactional table per year', 'Partition audit, attendance, journal lines by time'],
    ['Concurrency', '3,000–5,000 concurrent sessions, 300–800 req/s steady', 'Horizontal API scaling behind a load balancer'],
    ['Latency', 'p95 under 300ms for transactional reads, under 800ms for writes', 'Dashboards served from cache or pre-aggregates'],
    ['Availability', '99.9% business hours, planned maintenance windows outside', 'Multi-AZ database, two or more app nodes'],
    ['RPO / RTO', 'RPO 5 minutes, RTO 1 hour', 'WAL archiving with point-in-time recovery'],
    ['Auditability', '7-year retention for financial records, tamper evident', 'Append-only, off-cluster export, legal hold'],
    ['Isolation', 'Zero cross-company data disclosure', 'Defense in depth: guard, service, repository, optional RLS']]

  },
  {
    kind: 'callout',
    tone: 'warn',
    title: 'Requirement that most often gets designed wrong',
    text: 'FR-01 and FR-07. Teams model an employee as the identity. Then a transfer from ABC Foods to ABC Grocery creates a second login, orphans leave balances, and breaks group headcount. Person, user account, and employment must be three separate records from day one.'
  },
  { kind: 'h', text: 'Governance requirements' },
  {
    kind: 'ul',
    items: [
    'Group finance defines the chart of accounts template; companies may extend leaf accounts but not restructure the top levels.',
    'Separation of duties is mandatory for payments, payroll runs, journal postings, and role grants.',
    'Any grant of group-level scope requires a second approver and produces a security alert.',
    'Data exports above a configurable row threshold are approved, watermarked, and logged.',
    'Company archival must preserve financial history in a queryable, read-only state for the statutory retention period.']

  }]

},
{
  id: 'principles',
  number: 3,
  title: 'Architectural Principles',
  summary:
  'Twelve principles that resolve future design arguments without reopening the architecture.',
  blocks: [
  {
    kind: 'cards',
    items: [
    { title: '1. One platform, many contexts', meta: 'Structural', body: 'Company is a data dimension, not a deployment unit. There is exactly one codebase, one identity store, one permission vocabulary.' },
    { title: '2. Scope is the security boundary', meta: 'Security', body: 'Authorization answers permission plus scope plus resource ownership. Never role string comparison.' },
    { title: '3. Enforce at the lowest layer', meta: 'Security', body: 'The repository refuses to build a query without a resolved scope filter. Controllers and UI are convenience, not protection.' },
    { title: '4. Configuration beats code', meta: 'Change cost', body: 'Approval limits, workflows, numbering, policies, module activation are rows. Adding company 51 is data entry, not a release.' },
    { title: '5. Explicit organizational ownership', meta: 'Data model', body: 'Every business row names the organization node that owns it. Ownership is assigned deliberately, not by copying companyId everywhere.' },
    { title: '6. Append-only for anything financial', meta: 'Correctness', body: 'Ledgers, audit logs, and approvals are never updated in place. Corrections are reversing entries.' },
    { title: '7. Separate reads that report from reads that transact', meta: 'Performance', body: 'Dashboards and BI never touch hot OLTP tables directly.' },
    { title: '8. Events for propagation, transactions for invariants', meta: 'Consistency', body: 'Anything that must be true atomically stays in one database transaction. Everything else is an event via the outbox.' },
    { title: '9. Position is not role', meta: 'Modeling', body: 'HR org facts and application authority are separate lifecycles with separate approval paths.' },
    { title: '10. Deny by default', meta: 'Security', body: 'No permission implies no access and no discoverability. Search must not reveal object existence.' },
    { title: '11. Modules own their tables', meta: 'Boundaries', body: 'Cross-module access goes through the owning module service, never a foreign SELECT. This is what makes later extraction possible.' },
    { title: '12. Operational simplicity is a feature', meta: 'Pragmatism', body: 'No technology enters the stack without a specific failure it prevents. Kafka, RLS, and microservices all have entry conditions defined in this document.' }]

  },
  {
    kind: 'callout',
    tone: 'rule',
    title: 'Principle 11 in practice',
    text: 'Procurement must not join to hr.employees. It calls the HR module facade for the requester record. The join is cheap today and the discipline is what lets Procurement become a service later without a data archaeology project.'
  }]

}];