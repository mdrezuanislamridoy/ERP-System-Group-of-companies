import type { DocSection } from '../../types/doc';

export const accessSections: DocSection[] = [
{
  id: 'org-hierarchy',
  number: 4,
  title: 'Organizational Hierarchy',
  summary:
  'One self-referencing organization tree with typed nodes and a closure table, replacing any fixed group to company to department chain.',
  blocks: [
  {
    kind: 'p',
    text: 'The hierarchy is not hard-coded. A single organizations table holds every node — group, company, division, department, team, branch, warehouse, factory, store, project, cost centre, profit centre — distinguished by organization_type. Each node has a parent, so a construction company can run Project nodes under a Division while a grocery company runs Store nodes directly under the Company, and neither requires a schema change.'
  },
  {
    kind: 'tree',
    caption: 'Same table, different shapes per company',
    root: {
      label: 'ABC GROUP',
      note: 'type=GROUP, parent=null, path=/abc',
      children: [
      {
        label: 'ABC Foods Ltd.',
        note: 'type=COMPANY',
        children: [
        { label: 'Head Office', note: 'type=BRANCH' },
        { label: 'Factory 01 / Factory 02', note: 'type=FACTORY' },
        { label: 'Production / Procurement / Sales / Distribution', note: 'type=DEPARTMENT' },
        { label: 'Finance / HR', note: 'type=DEPARTMENT' }]

      },
      {
        label: 'ABC Technologies Ltd.',
        note: 'type=COMPANY',
        children: [
        { label: 'Software / Infrastructure / Support', note: 'type=DEPARTMENT' },
        { label: 'Delivery Squad A', note: 'type=TEAM, parent=Software' },
        { label: 'Sales / Finance / HR', note: 'type=DEPARTMENT' }]

      },
      {
        label: 'ABC Transport Ltd.',
        note: 'type=COMPANY',
        children: [
        { label: 'Fleet / Drivers / Maintenance / Operations / Logistics', note: 'type=DEPARTMENT' },
        { label: 'Dhaka Depot', note: 'type=BRANCH' }]

      },
      {
        label: 'ABC Grocery Ltd.',
        note: 'type=COMPANY',
        children: [
        { label: 'Store 01 .. Store 34', note: 'type=STORE' },
        { label: 'Central Warehouse', note: 'type=WAREHOUSE' },
        { label: 'Procurement / Sales / Finance', note: 'type=DEPARTMENT' }]

      }]

    }
  },
  { kind: 'h', text: 'Database representation' },
  {
    kind: 'code',
    title: 'Adjacency list plus materialized path plus closure table',
    code: `organizations
  id                uuid pk
  parent_id         uuid fk -> organizations(id)        -- adjacency: cheap writes
  company_id        uuid fk -> organizations(id)        -- denormalized nearest COMPANY ancestor
  type              org_type enum                        -- GROUP|COMPANY|DIVISION|DEPARTMENT|TEAM|
                                                         -- BRANCH|WAREHOUSE|FACTORY|STORE|PROJECT|
                                                         -- COST_CENTER|PROFIT_CENTER
  code              varchar(32)                          -- unique within parent
  name              varchar(160)
  path              ltree                                -- /abc/foods/finance : fast subtree by prefix
  depth             smallint
  status            enum(ACTIVE, SUSPENDED, ARCHIVED)
  effective_from    date
  effective_to      date null                            -- supports restructuring history
  ...audit fields

organization_closure                                     -- ancestor/descendant, depth
  ancestor_id   uuid fk
  descendant_id uuid fk
  depth         smallint
  pk (ancestor_id, descendant_id)

organization_relations                                   -- non-tree links
  from_org_id, to_org_id, relation_type, ownership_pct
  -- LEGAL_OWNERSHIP | SHARED_SERVICE | REPORTS_TO | CONSOLIDATES_INTO`
  },
  {
    kind: 'decision',
    title: 'Why three representations of the same tree',
    decision: 'Store parent_id for writes, ltree path for subtree prefix queries, and a closure table for set-based scope expansion and joins.',
    why: 'Scope resolution runs on every request. Expanding "all descendants of ABC Foods" via recursive CTE on each call is measurable overhead at 800 req/s. The closure table turns it into one indexed join; ltree makes ad-hoc reporting filters trivial.',
    tradeoffs: 'Three structures must stay consistent. Maintain them inside one transaction in the organization service, never by direct SQL, and add a nightly consistency check.',
    alternatives: 'Recursive CTE only (simplest, slower and harder to join). Nested sets (fast reads, expensive rebalancing on every insert — wrong for an org chart that changes weekly).',
    changeWhen: 'If the tree ever exceeds roughly 100k nodes with frequent restructuring, drop the closure table and cache resolved scope sets in Redis instead.'
  },
  {
    kind: 'callout',
    tone: 'info',
    title: 'company_id is denormalized on purpose',
    text: 'Every node carries its nearest COMPANY ancestor. This makes the single most common filter in the system — "rows belonging to this company" — one indexed predicate rather than a tree walk. It is maintained by the organization service on create and move, and is the only denormalization of the tree permitted.'
  },
  { kind: 'h', text: 'Restructuring, mergers, splits and archival' },
  {
    kind: 'table',
    columns: ['Event', 'Mechanism', 'Historical integrity'],
    rows: [
    ['Department moved to another division', 'Update parent_id, rebuild closure subtree, recompute path and company_id in one transaction', 'effective_from/to keeps the prior placement; historical reports use as-of date'],
    ['Two companies merge', 'New COMPANY node, source companies re-parented under it as DIVISION with CONSOLIDATES_INTO relation', 'Never rewrite historical companyId on posted transactions'],
    ['Company split', 'New COMPANY node, departments re-parented, open balances transferred via inter-company journal', 'Opening balance entries make the discontinuity explicit in the ledger'],
    ['Company archived', 'status=ARCHIVED cascades read-only to the subtree; module activation revoked; data retained', 'Ledger and audit remain queryable to group finance for the retention period']]

  }]

},
{
  id: 'iam',
  number: 5,
  title: 'IAM Architecture',
  summary:
  'One account per person for the whole group. Person, user, employment, and role assignment are four separate records with independent lifecycles.',
  blocks: [
  {
    kind: 'flow',
    caption: 'Core identity separation',
    steps: [
    { label: 'Person', note: 'the human, one row forever' },
    { label: 'User', note: 'the login credential' },
    { label: 'Employment', note: 'one per company engagement' },
    { label: 'RoleAssignment', note: 'authority, scoped and time-bound' }]

  },
  {
    kind: 'p',
    text: 'A user authenticates once against the group identity system and then operates inside an active context: one organization node selected from their assignments. Switching context is an explicit, audited action that reissues the access token with new scope claims — never a client-side toggle.'
  },
  {
    kind: 'code',
    title: 'Multi-assignment example resolved',
    code: `User: rahim@abcgroup.com   (one account, one MFA enrolment)

  Assignment 1  org=ABC Foods > Finance   role=Finance Manager     scope=SUBTREE
  Assignment 2  org=ABC Grocery           role=Finance Auditor     scope=SUBTREE
  Assignment 3  org=ABC Group             role=Group Finance Viewer scope=SUBTREE (read perms only)

Effective permission set when active context = ABC Foods > Finance:
  union of (Assignment 1 perms) and (Assignment 3 perms intersected with this subtree)
  => invoice.read, invoice.approve, expense.approve, budget.read, gl.read
     approval_limit = 500000 BDT   (from Assignment 1 role attributes)

Effective permission set when active context = ABC Grocery:
  => invoice.read, gl.read, report.finance.read      (no approve — auditor role)`
  },
  {
    kind: 'table',
    columns: ['Entity', 'Owns', 'Lifecycle trigger'],
    rows: [
    ['persons', 'Legal name, national ID, date of birth, contact', 'Created once, never duplicated on transfer'],
    ['users', 'Email, password hash, MFA secret, status, last login', 'Created on first engagement; disabled, never deleted'],
    ['employments', 'Company, position, department, manager, grade, start and end date', 'One row per engagement; transfer ends one and starts another'],
    ['user_role_assignments', 'Role, organization node, scope mode, valid_from/to, granted_by', 'Granted and revoked independently of HR events'],
    ['sessions', 'Refresh token family, device, IP, active context, issued and expiry', 'Revocable individually or globally'],
    ['authentication_methods', 'PASSWORD, TOTP, WEBAUTHN, SAML, OIDC per user', 'Group SSO can be added without touching authorization'],
    ['delegations', 'From user, to user, permission subset, scope, window, reason', 'Time-boxed, auto-expiring, fully audited']]

  },
  { kind: 'h', text: 'Authorization flow per request' },
  {
    kind: 'flow',
    steps: [
    { label: 'Authenticate', note: 'verify access token signature and session validity' },
    { label: 'Load principal', note: 'assignments + delegations from Redis, versioned cache' },
    { label: 'Resolve scope', note: 'expand org nodes to descendant set via closure table' },
    { label: 'Check permission', note: 'resource.action present for the target org node' },
    { label: 'Evaluate policy', note: 'ABAC conditions: amount, ownership, SoD, state' },
    { label: 'Constrain query', note: 'repository injects org filter; no unfiltered access exists' }]

  },
  {
    kind: 'decision',
    title: 'JWT contents',
    decision: 'Access token (10 min) carries user id, session id, active organization id and a permissions_version integer. It does NOT carry the permission list.',
    why: 'Permission sets for a group CFO can exceed several kilobytes, and revocation must be immediate. The server loads the authoritative permission set from Redis keyed by user and version; bumping the version on any grant change invalidates every token instantly without a token blacklist.',
    tradeoffs: 'One cache read per request. Acceptable — it is sub-millisecond and it is the same read that would be needed for ABAC attributes anyway.',
    alternatives: 'Fat JWT (fast, but revocation lag of up to the token lifetime — unacceptable for a privilege escalation or termination). Opaque token with full DB lookup (safest, highest latency).',
    changeWhen: 'Never move to a fat JWT for permissions. If Redis becomes a bottleneck, add a per-node in-process LRU with a short TTL keyed by permissions_version.'
  },
  {
    kind: 'callout',
    tone: 'danger',
    title: 'Rule 8 enforced',
    text: 'Do not rely only on JWT claims for authorization. The token proves who is asking and which context they selected. What they may do is always resolved server side against current assignment state.'
  }]

},
{
  id: 'authz',
  number: 6,
  title: 'RBAC / ABAC / Scope Model',
  summary:
  'Permissions are resource.action strings. Roles bundle them. Assignments bind a role to an organization node with a scope mode. Policies add attribute conditions where roles cannot express intent.',
  blocks: [
  {
    kind: 'flow',
    caption: 'The authorization chain',
    steps: [
    { label: 'User' },
    { label: 'Role' },
    { label: 'Permission' },
    { label: 'Scope' },
    { label: 'Resource' },
    { label: 'Action' }]

  },
  { kind: 'h', text: 'Scope modes' },
  {
    kind: 'table',
    columns: ['Mode', 'Meaning', 'Typical use'],
    rows: [
    ['SELF', 'Only rows whose subject is the user', 'Employee self-service: own leave, payslip, attendance'],
    ['NODE', 'Only the exact organization node', 'Branch cashier limited to one store, no child nodes'],
    ['SUBTREE', 'The node and every descendant', 'Department manager, company CFO, group CFO — the default'],
    ['SUBTREE_EXCEPT', 'Subtree minus named exclusions', 'Group auditor excluded from a company under litigation'],
    ['CROSS', 'Named set of unrelated nodes', 'Shared services team serving four specific companies']]

  },
  {
    kind: 'code',
    title: 'Resolution examples',
    code: `permission employee.read  @ scope SUBTREE(ABC Foods)
  -> employees where org.company_id = ABC Foods

permission employee.read  @ scope SUBTREE(ABC Group)
  -> employees across every company in the group

permission employee.read  @ scope SUBTREE(ABC Foods > Production)
  -> employees whose org node is in the Production subtree only

permission leave.read     @ scope SELF
  -> leave rows where employee.person_id = principal.person_id`
  },
  { kind: 'h', text: 'When RBAC is enough, and when it is not' },
  {
    kind: 'table',
    columns: ['Question', 'Answer', 'Mechanism'],
    rows: [
    ['Can this person approve purchase orders at all?', 'RBAC', 'purchase_order.approve in the role'],
    ['For which company?', 'Scope', 'Assignment organization node and scope mode'],
    ['Up to what value?', 'ABAC', 'Policy: amount <= principal.approval_limit'],
    ['Is this their own request?', 'ABAC / SoD', 'Policy: request.created_by != principal.user_id'],
    ['Only during month-end close?', 'ABAC', 'Policy: fiscal_period.status = OPEN'],
    ['Only for their own cost centre?', 'ABAC', 'Policy: expense.cost_center_id in principal.cost_centers']]

  },
  {
    kind: 'decision',
    title: 'Policy engine',
    decision: 'RBAC plus scope handles roughly 85% of checks and is evaluated inline. A small declarative policy layer (JSON conditions stored per role-permission, evaluated by a typed evaluator) handles the attribute cases.',
    why: 'A full external policy engine (OPA/Rego) adds a language, a deployment unit, and a debugging surface for a minority of checks that are mostly numeric comparisons and ownership tests.',
    tradeoffs: 'A hand-rolled evaluator must be deliberately limited — no arbitrary expressions, a fixed set of operators and attribute paths — or it becomes an unsafe mini language.',
    alternatives: 'OPA sidecar (excellent when policy authorship is a separate discipline, and the right answer if regulators demand externally auditable policy). Casbin (fine for RBAC, awkward for scoped hierarchical ABAC).',
    changeWhen: 'Move to OPA when policies need to be authored or reviewed by non-engineers, or when policy decisions must be reused by services outside this platform.'
  },
  {
    kind: 'code',
    title: 'Stored policy condition shape',
    code: `{
  "permission": "purchase_order.approve",
  "conditions": [
    { "attr": "resource.total_amount",  "op": "lte", "ref": "principal.approval_limit" },
    { "attr": "resource.created_by",    "op": "neq", "ref": "principal.user_id" },
    { "attr": "resource.company_id",    "op": "in",  "ref": "principal.scope.companies" },
    { "attr": "resource.status",        "op": "eq",  "value": "PENDING_APPROVAL" }
  ],
  "effect": "ALLOW"
}

Evaluation order: deny rules -> scope containment -> permission -> conditions.
An explicit DENY at any level wins. Absence of ALLOW is denial.`
  },
  {
    kind: 'callout',
    tone: 'rule',
    title: 'Permission revocation',
    text: 'Revoking sets valid_to = now on the assignment (never a hard delete), bumps the user permissions_version, publishes a PermissionsChanged event, and writes an audit entry with old and new value. In-flight approvals already recorded stand; pending approval steps assigned to that user are re-routed by the workflow engine to the next eligible approver.'
  }]

},
{
  id: 'role-hierarchy',
  number: 7,
  title: 'Role Hierarchy, Position and Job Title',
  summary:
  'Roles are configurable data with optional inheritance. Job title, position, and role are three different things and merging them is the most common and most expensive modeling mistake in group ERP.',
  blocks: [
  {
    kind: 'tree',
    caption: 'Seeded role templates — starting point, not a fixed enum',
    root: {
      label: 'Role templates',
      children: [
      {
        label: 'GROUP LEVEL',
        children: [
        { label: 'Group Super Admin', note: 'platform configuration, no default business data access' },
        { label: 'Group CEO / CFO / CTO / CHRO', note: 'read-wide, approve at group thresholds' },
        { label: 'Group Audit / Compliance', note: 'read everything, write nothing, export controlled' },
        { label: 'Group IT Admin', note: 'user lifecycle, sessions, integrations' }]

      },
      {
        label: 'COMPANY LEVEL',
        children: [
        { label: 'Company Admin', note: 'company configuration and module settings' },
        { label: 'CEO / MD, CFO, HR Head, IT Head, Operations Head' },
        { label: 'Department Head', note: 'inherits Department Manager' }]

      },
      {
        label: 'DEPARTMENT LEVEL',
        children: [
        { label: 'Department Manager' },
        { label: 'Supervisor', note: 'inherits Team Lead' },
        { label: 'Team Lead', note: 'inherits Staff' },
        { label: 'Staff' }]

      },
      { label: 'EMPLOYEE LEVEL', children: [{ label: 'Employee', note: 'baseline self-service, auto-granted with employment' }] }]

    }
  },
  {
    kind: 'p',
    text: 'Roles live in a roles table with an optional parent_role_id and an is_system flag. System templates are seeded and may be cloned but not edited; every company can create custom roles by cloning a template and adding or removing permissions. Inheritance is resolved at grant time and flattened into a cached effective permission set, so a deep role chain costs nothing at request time.'
  },
  { kind: 'h', text: 'Custom roles' },
  {
    kind: 'ul',
    items: [
    'A custom role is owned by an organization node. A role created by ABC Foods is not visible to ABC Transport unless created at the group node.',
    'A role can only grant permissions that exist in the permission registry, and only for modules activated on the owning company.',
    'Roles carry attributes used by ABAC — approval_limit, requires_second_approver, allowed_export_rows — so a limit change is a role edit, not a code change.',
    'Creating or modifying a role that includes any *.approve, role.*, or user.* permission requires dual approval and raises a security notification.',
    'Roles are versioned. Changing a role creates a new version; existing assignments point at the version until explicitly migrated, so a permission sweep is never silent.']

  },
  { kind: 'h', text: 'Role vs Position vs Job Title' },
  {
    kind: 'table',
    columns: ['Concept', 'Owned by', 'Answers', 'Changes when'],
    rows: [
    ['Job Title', 'HR', 'What the business card says', 'Promotion, rebranding of grades'],
    ['Position', 'HR', 'Which seat in the org chart, with grade, salary band and headcount slot', 'Reorganisation, backfill, transfer'],
    ['Role', 'IAM', 'What the person may do in the software', 'Responsibility change, delegation, audit finding'],
    ['Permission', 'Platform', 'A single resource.action capability', 'A feature ships'],
    ['Scope', 'IAM', 'Over which part of the organization', 'Assignment change']]

  },
  {
    kind: 'code',
    title: 'Worked example',
    code: `Employee    Md. Rahim
Position    Senior Accountant (grade M2, seat FIN-004, ABC Foods > Finance)
Job Title   Senior Accountant
Role        Finance Approver        <- application authority, granted by IAM
Permissions invoice.read, invoice.approve, expense.read, expense.approve
Scope       ABC Foods > Finance (SUBTREE)
Attributes  approval_limit = 500,000 BDT`
  },
  {
    kind: 'decision',
    title: 'Why these must not be merged',
    decision: 'Never derive permissions from job title or position.',
    why: 'Three independent failures follow from merging. (1) Two Senior Accountants in different companies need different authority. (2) A promotion silently grants approval power with no security review and no audit trail of who authorised it. (3) During an absence you need to move authority without moving the seat — delegation becomes impossible to express.',
    tradeoffs: 'Two systems of record means onboarding touches both HR and IAM. Mitigate with a provisioning rule engine: a new employment proposes a default role set based on position, which an approver confirms.',
    alternatives: 'Title-driven roles (fast to build, fails the first audit). Fully manual grants with no defaults (secure, unusable at 100k employees).',
    changeWhen: 'Never merge. If onboarding friction becomes the complaint, automate the proposal step, not the separation.'
  },
  { kind: 'h', text: 'Delegation' },
  {
    kind: 'code',
    title: 'Temporary authority transfer',
    code: `delegations
  id, from_user_id, to_user_id
  organization_id        -- scope of the delegation, must be within delegator scope
  permission_subset[]    -- may not exceed the delegator effective set
  start_at, end_at       -- mandatory bounds, max window configurable per company
  reason                 -- mandatory free text, shown on every approval made under it
  status                 -- SCHEDULED | ACTIVE | EXPIRED | REVOKED
  created_by, revoked_by, ...audit

Rules
  - Delegated authority is never re-delegatable.
  - Approvals executed under delegation record both acting_user_id and on_behalf_of_user_id.
  - Separation of duties is evaluated against BOTH identities.
  - Expiry is enforced at evaluation time, not by a cron job, so a missed job cannot extend authority.
  - The delegator retains their own authority unless the delegation is marked EXCLUSIVE.`
  }]

}];