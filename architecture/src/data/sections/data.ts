import type { DocSection } from '../../types/doc';

export const dataSections: DocSection[] = [
{
  id: 'database',
  number: 18,
  title: 'Database Architecture',
  summary:
  'One PostgreSQL cluster, one shared schema, organization-scoped rows, module-namespaced tables, partitioning where volume demands it.',
  blocks: [
  {
    kind: 'decision',
    title: 'Shared database with organizational isolation',
    decision: 'All companies share one PostgreSQL database. Isolation is enforced by mandatory scope filters at the repository layer, backed by row-level security on the highest-risk tables.',
    why: 'Consolidation, inter-company transactions, group search, shared master data, and cross-company employee transfer are all first-class requirements. Each of them is a distributed join under database-per-company. One database also means one migration, one backup policy, one connection pool.',
    tradeoffs: 'A bug in scope resolution is a cross-company disclosure rather than a query error. Mitigated by making unscoped queries structurally impossible, plus RLS as a second net and a contract test suite that asserts isolation per endpoint.',
    alternatives: 'Schema-per-company (isolation by search_path; 50 migration targets, awkward group queries). Database-per-company (strongest isolation; no cheap consolidation, heavy operations). Both are available later per company without a rewrite because company_id is already explicit everywhere.',
    changeWhen: 'Move one company out when a regulator demands physical residency, a company is divested, or a single company grows to dominate cluster load. The migration is a filtered export because ownership is explicit.'
  },
  { kind: 'h', text: 'Where organizational ownership lives' },
  {
    kind: 'table',
    columns: ['Table class', 'Ownership column', 'Rationale'],
    rows: [
    ['Platform registry (permissions, module_keys, currencies, countries)', 'none', 'Global reference data, identical for every company'],
    ['Organization tree', 'parent_id + company_id', 'company_id is the nearest COMPANY ancestor, null on the group node'],
    ['Person and user', 'none', 'Identity is group-level by design; access comes from assignments'],
    ['Assignments, delegations', 'organization_id', 'The grant point in the tree; scope mode decides expansion'],
    ['Company-owned transactions (invoice, PO, journal, stock)', 'company_id required, plus finer org ids where they carry meaning', 'company_id is the isolation predicate and the index leader'],
    ['Department-level operational rows (expense claim, leave, task)', 'company_id + department_org_id', 'Needed for department-scoped roles and cost reporting'],
    ['Location-bound rows (stock ledger, POS sale, attendance punch)', 'company_id + location org_id', 'Warehouse and branch scoped roles resolve with one predicate'],
    ['Group master data (party, item catalogue, supplier)', 'nullable company_id + enablement table', 'Null means group-owned and shared; the enablement row carries local terms'],
    ['Audit', 'company_id + organization_id', 'Denormalized so scoped audit reads never join the org tree']]

  },
  {
    kind: 'callout',
    tone: 'warn',
    title: 'Do not add companyId everywhere by reflex',
    text: 'Child rows of an owned aggregate (journal_lines under journal_entries, payslip_lines under payslips) do not need their own company_id — they are reachable only through the parent and the extra column invites drift between parent and child. The exception is a table queried directly at volume: stock_ledger and audit_logs carry company_id specifically because they are scanned without their parent.'
  },
  { kind: 'h', text: 'Row-level security' },
  {
    kind: 'code',
    title: 'RLS as the second net, not the first',
    code: `-- Applied to the highest-risk tables only:
--   journal_entries, journal_lines, invoices, payments, payslips,
--   employments, audit_logs, documents
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_company_isolation ON invoices
  USING (company_id = ANY (
    string_to_array(current_setting('app.scope_companies', true), ',')::uuid[]
  ));

-- The request pipeline sets it per transaction, from the SERVER-resolved scope:
SET LOCAL app.scope_companies = '...';
SET LOCAL app.actor_user_id  = '...';

Why only some tables: RLS costs a predicate on every query and complicates
query plans and bulk jobs. Applying it to 400 tables buys little beyond what
the repository guard already gives, and makes migrations and ETL painful.
Applying it to the 8 tables where a leak would be catastrophic is high value.

Background jobs and ELT connect as roles with BYPASSRLS and must instead pass
an explicit scope argument - see section 22 on background job isolation.`
  },
  { kind: 'h', text: 'Conventions applied to every table' },
  {
    kind: 'ul',
    items: [
    'Primary key: uuid v7 (time-ordered) — globally unique for merges and exports, without the index fragmentation of v4.',
    'Audit fields: created_at, created_by, updated_at, updated_by on every table; deleted_at and deleted_by only where soft delete is permitted.',
    'Soft delete: allowed on master and configuration data, forbidden on posted financial and audit rows. Unique indexes are partial: WHERE deleted_at IS NULL.',
    'Status: explicit enum per entity with a documented state machine. No boolean is_active plus is_approved combinations that permit impossible states.',
    'Concurrency: an integer version column on any entity a human edits in a form, checked with If-Match / optimistic locking.',
    'Money: numeric(19,4) plus a currency code and, for anything consolidated, the base-currency amount and the rate used. Never floating point.',
    'Timestamps: timestamptz everywhere, stored in UTC, rendered in the company timezone.',
    'Indexes: every foreign key indexed; composite indexes lead with company_id for scoped tables; partial indexes for hot status filters such as pending approvals.',
    'Partitioning: monthly range partitions on audit_logs, attendance, stock_ledger, journal_lines, notifications once each exceeds roughly 50 million rows.']

  }]

},
{
  id: 'erd',
  number: 19,
  title: 'ERD — Core Platform',
  summary:
  'Entity clusters with keys, cardinality and the indexes that matter. Platform core first, domain tables second.',
  blocks: [
  {
    kind: 'erd',
    cluster: 'Organization & Access',
    entities: [
    {
      name: 'organizations',
      purpose: 'Every node of the group tree, typed.',
      pk: 'id uuid',
      columns: [
      { name: 'parent_id', type: 'uuid FK -> organizations', note: 'null on group root' },
      { name: 'company_id', type: 'uuid FK -> organizations', note: 'nearest COMPANY ancestor' },
      { name: 'type', type: 'org_type enum' },
      { name: 'code', type: 'varchar(32)', note: 'unique (parent_id, code)' },
      { name: 'name', type: 'varchar(160)' },
      { name: 'path', type: 'ltree', note: 'GiST index' },
      { name: 'status', type: 'enum' },
      { name: 'effective_from / to', type: 'date' }],

      indexes: ['(company_id, type)', 'GiST (path)', '(parent_id)']
    },
    {
      name: 'organization_closure',
      purpose: 'Pre-expanded ancestor/descendant pairs for scope resolution.',
      pk: '(ancestor_id, descendant_id)',
      columns: [
      { name: 'ancestor_id', type: 'uuid FK -> organizations' },
      { name: 'descendant_id', type: 'uuid FK -> organizations' },
      { name: 'depth', type: 'smallint' }],

      indexes: ['(descendant_id)']
    },
    {
      name: 'company_modules',
      purpose: 'Which modules a company has activated.',
      pk: 'id uuid',
      columns: [
      { name: 'company_id', type: 'uuid FK -> organizations' },
      { name: 'module_key', type: 'varchar(64)' },
      { name: 'status', type: 'enum' },
      { name: 'settings', type: 'jsonb' }],

      indexes: ['unique (company_id, module_key)']
    },
    {
      name: 'users',
      purpose: 'One login per person for the whole group.',
      pk: 'id uuid',
      columns: [
      { name: 'person_id', type: 'uuid FK -> persons', note: 'unique' },
      { name: 'email', type: 'citext', note: 'unique' },
      { name: 'password_hash', type: 'text' },
      { name: 'mfa_enrolled', type: 'boolean' },
      { name: 'permissions_version', type: 'int' },
      { name: 'status', type: 'enum(ACTIVE, DISABLED, LOCKED)' }],

      indexes: ['unique (email)', '(status)']
    },
    {
      name: 'roles',
      purpose: 'Configurable bundles of permissions, optionally inherited.',
      pk: 'id uuid',
      columns: [
      { name: 'owner_org_id', type: 'uuid FK -> organizations', note: 'group node = shared' },
      { name: 'parent_role_id', type: 'uuid FK -> roles' },
      { name: 'key / name', type: 'varchar' },
      { name: 'level', type: 'enum(GROUP, COMPANY, DEPARTMENT, EMPLOYEE)' },
      { name: 'attributes', type: 'jsonb', note: 'approval_limit etc.' },
      { name: 'is_system', type: 'boolean' },
      { name: 'version', type: 'int' }],

      indexes: ['unique (owner_org_id, key)']
    },
    {
      name: 'permissions',
      purpose: 'Global registry of resource.action capabilities.',
      pk: 'id uuid',
      columns: [
      { name: 'key', type: 'varchar(96)', note: 'unique, e.g. invoice.approve' },
      { name: 'module_key', type: 'varchar(64)' },
      { name: 'resource / action', type: 'varchar' },
      { name: 'is_sensitive', type: 'boolean' }],

      indexes: ['unique (key)', '(module_key)']
    },
    {
      name: 'role_permissions',
      purpose: 'Role to permission with optional ABAC conditions.',
      pk: '(role_id, permission_id)',
      columns: [
      { name: 'role_id', type: 'uuid FK -> roles' },
      { name: 'permission_id', type: 'uuid FK -> permissions' },
      { name: 'conditions', type: 'jsonb null' },
      { name: 'effect', type: 'enum(ALLOW, DENY)' }]

    },
    {
      name: 'user_role_assignments',
      purpose: 'The binding of authority to a place in the tree.',
      pk: 'id uuid',
      columns: [
      { name: 'user_id', type: 'uuid FK -> users' },
      { name: 'role_id', type: 'uuid FK -> roles' },
      { name: 'organization_id', type: 'uuid FK -> organizations' },
      { name: 'scope_mode', type: 'enum(SELF, NODE, SUBTREE, SUBTREE_EXCEPT, CROSS)' },
      { name: 'excluded_org_ids', type: 'uuid[]' },
      { name: 'valid_from / valid_to', type: 'timestamptz' },
      { name: 'granted_by / revoked_by', type: 'uuid' }],

      indexes: ['(user_id) WHERE valid_to IS NULL', '(organization_id, role_id)', 'unique (user_id, role_id, organization_id) WHERE valid_to IS NULL']
    },
    {
      name: 'delegations',
      purpose: 'Time-boxed transfer of a permission subset.',
      pk: 'id uuid',
      columns: [
      { name: 'from_user_id / to_user_id', type: 'uuid FK -> users' },
      { name: 'organization_id', type: 'uuid FK -> organizations' },
      { name: 'permission_keys', type: 'text[]' },
      { name: 'start_at / end_at', type: 'timestamptz', note: 'both mandatory' },
      { name: 'reason', type: 'text' },
      { name: 'status', type: 'enum' }],

      indexes: ['(to_user_id, start_at, end_at)']
    },
    {
      name: 'sessions',
      purpose: 'Refresh token family with revocation.',
      pk: 'id uuid',
      columns: [
      { name: 'user_id', type: 'uuid FK -> users' },
      { name: 'active_org_id', type: 'uuid FK -> organizations' },
      { name: 'refresh_token_hash', type: 'bytea' },
      { name: 'device / ip / user_agent', type: 'text' },
      { name: 'expires_at / revoked_at', type: 'timestamptz' }],

      indexes: ['(user_id) WHERE revoked_at IS NULL']
    }]

  },
  {
    kind: 'erd',
    cluster: 'Workflow, Audit & Configuration',
    entities: [
    {
      name: 'workflow_definitions / versions / steps',
      purpose: 'Versioned approval graphs per company and document type.',
      pk: 'id uuid',
      columns: [
      { name: 'company_id', type: 'uuid null', note: 'null = group default' },
      { name: 'document_type', type: 'varchar(64)' },
      { name: 'version_no', type: 'int' },
      { name: 'graph', type: 'jsonb' },
      { name: 'status', type: 'enum(DRAFT, PUBLISHED, RETIRED)' }],

      indexes: ['unique (company_id, document_type, version_no)']
    },
    {
      name: 'workflow_instances / tasks',
      purpose: 'Running approvals and the individual human tasks.',
      pk: 'id uuid',
      columns: [
      { name: 'version_id', type: 'uuid FK', note: 'pinned at start' },
      { name: 'document_type / document_id', type: 'varchar / uuid' },
      { name: 'company_id', type: 'uuid FK -> organizations' },
      { name: 'assignee_user_id', type: 'uuid FK -> users' },
      { name: 'status / due_at', type: 'enum / timestamptz' },
      { name: 'version', type: 'int', note: 'optimistic lock' }],

      indexes: ['(assignee_user_id, status) WHERE status = PENDING', '(document_type, document_id)', '(company_id, status)']
    },
    {
      name: 'approval_rules',
      purpose: 'Amount and category driven chain selection.',
      pk: 'id uuid',
      columns: [
      { name: 'company_id / org_id', type: 'uuid' },
      { name: 'document_type / category_id', type: 'varchar / uuid' },
      { name: 'min_amount / max_amount', type: 'numeric(19,4)' },
      { name: 'chain', type: 'jsonb' },
      { name: 'priority', type: 'int' }],

      indexes: ['(company_id, document_type, min_amount)']
    },
    {
      name: 'audit_logs',
      purpose: 'Append-only, hash-chained, monthly partitions.',
      pk: 'id uuid',
      columns: [
      { name: 'actor_user_id / on_behalf_of', type: 'uuid' },
      { name: 'company_id / organization_id', type: 'uuid' },
      { name: 'action / resource / resource_id', type: 'varchar / uuid' },
      { name: 'old_value / new_value', type: 'jsonb' },
      { name: 'correlation_id', type: 'uuid' },
      { name: 'prev_hash / row_hash', type: 'bytea' }],

      indexes: ['(company_id, occurred_at desc)', '(resource, resource_id)', '(correlation_id)']
    },
    {
      name: 'settings',
      purpose: 'Configuration with group / company / department precedence.',
      pk: 'id uuid',
      columns: [
      { name: 'scope_org_id', type: 'uuid FK -> organizations' },
      { name: 'key', type: 'varchar(128)' },
      { name: 'value', type: 'jsonb' },
      { name: 'data_type / is_overridable', type: 'varchar / boolean' }],

      indexes: ['unique (scope_org_id, key)']
    },
    {
      name: 'number_sequences',
      purpose: 'Per company, document type and fiscal year counters.',
      pk: 'id uuid',
      columns: [
      { name: 'company_id / document_type / fiscal_year', type: 'uuid / varchar / int' },
      { name: 'prefix / pattern', type: 'varchar' },
      { name: 'next_value', type: 'bigint' },
      { name: 'padding', type: 'smallint' }],

      indexes: ['unique (company_id, document_type, fiscal_year)']
    },
    {
      name: 'outbox_events',
      purpose: 'Transactional event publication.',
      pk: 'id uuid',
      columns: [
      { name: 'aggregate_type / aggregate_id', type: 'varchar / uuid' },
      { name: 'event_type / payload', type: 'varchar / jsonb' },
      { name: 'company_id / correlation_id', type: 'uuid' },
      { name: 'published_at / attempts', type: 'timestamptz / int' }],

      indexes: ['(published_at) WHERE published_at IS NULL']
    }]

  },
  {
    kind: 'erd',
    cluster: 'Domain anchors — HR, Finance, Procurement, Inventory, Sales',
    entities: [
    {
      name: 'employments',
      purpose: 'One engagement of a person with a company.',
      pk: 'id uuid',
      columns: [
      { name: 'person_id', type: 'uuid FK -> persons' },
      { name: 'company_id', type: 'uuid FK -> organizations' },
      { name: 'department_org_id / branch_org_id', type: 'uuid FK -> organizations' },
      { name: 'position_id', type: 'uuid FK -> positions' },
      { name: 'manager_employment_id', type: 'uuid FK -> employments' },
      { name: 'employee_no', type: 'varchar', note: 'unique per company' },
      { name: 'start_date / end_date / status', type: 'date / enum' }],

      indexes: ['unique (company_id, employee_no)', '(person_id)', '(department_org_id, status)']
    },
    {
      name: 'journal_entries / journal_lines',
      purpose: 'Double-entry general ledger, immutable once posted.',
      pk: 'id uuid',
      columns: [
      { name: 'company_id / period_id', type: 'uuid FK' },
      { name: 'entry_no', type: 'varchar', note: 'unique per company' },
      { name: 'account_id', type: 'uuid FK -> chart_of_accounts' },
      { name: 'debit / credit / base_debit / base_credit', type: 'numeric(19,4)' },
      { name: 'cost_center_id / department_id / project_id', type: 'uuid' },
      { name: 'partner_org_id', type: 'uuid null', note: 'inter-company elimination key' }],

      indexes: ['(company_id, period_id)', '(account_id, posted_at)', '(partner_org_id) WHERE partner_org_id IS NOT NULL']
    },
    {
      name: 'purchase_requests / purchase_orders',
      purpose: 'Procurement documents with workflow linkage.',
      pk: 'id uuid',
      columns: [
      { name: 'company_id / department_org_id', type: 'uuid FK' },
      { name: 'number', type: 'varchar', note: 'unique per company' },
      { name: 'supplier_id', type: 'uuid FK -> parties' },
      { name: 'total_amount / currency', type: 'numeric / char(3)' },
      { name: 'status / workflow_instance_id', type: 'enum / uuid' },
      { name: 'version', type: 'int' }],

      indexes: ['(company_id, status)', 'unique (company_id, number)']
    },
    {
      name: 'stock_ledger',
      purpose: 'Append-only inventory movements, partitioned monthly.',
      pk: 'id uuid',
      columns: [
      { name: 'company_id / item_id / location_id', type: 'uuid FK' },
      { name: 'lot_id / serial_id', type: 'uuid null' },
      { name: 'qty / unit_cost / value', type: 'numeric(19,4)' },
      { name: 'ref_module / ref_id', type: 'varchar / uuid' }],

      indexes: ['(company_id, item_id, location_id, posted_at)', '(ref_module, ref_id)']
    },
    {
      name: 'parties / party_company_enablements',
      purpose: 'Group-level customers and suppliers, locally enabled.',
      pk: 'id uuid',
      columns: [
      { name: 'type', type: 'enum(CUSTOMER, SUPPLIER, BOTH)' },
      { name: 'legal_name / tax_id', type: 'varchar', note: 'unique tax_id per country' },
      { name: 'company_id', type: 'uuid FK', note: 'on the enablement row' },
      { name: 'credit_limit / payment_terms / price_list_id', type: 'numeric / varchar / uuid' }],

      indexes: ['unique (party_id, company_id)', '(tax_id, country)']
    }]

  }]

},
{
  id: 'schema',
  number: 20,
  title: 'Core Database Schema',
  summary:
  'Representative Prisma and SQL for the foundational entities. Domain tables follow the same conventions.',
  blocks: [
  {
    kind: 'code',
    title: 'schema.prisma — platform core (abbreviated to the load-bearing parts)',
    code: `model Organization {
  id            String    @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  parentId      String?   @map("parent_id") @db.Uuid
  companyId     String?   @map("company_id") @db.Uuid
  type          OrgType
  code          String    @db.VarChar(32)
  name          String    @db.VarChar(160)
  path          String
  depth         Int       @db.SmallInt
  status        OrgStatus @default(ACTIVE)
  effectiveFrom DateTime  @map("effective_from") @db.Date
  effectiveTo   DateTime? @map("effective_to") @db.Date
  createdAt     DateTime  @default(now()) @map("created_at")
  createdBy     String?   @map("created_by") @db.Uuid
  updatedAt     DateTime  @updatedAt @map("updated_at")
  updatedBy     String?   @map("updated_by") @db.Uuid
  deletedAt     DateTime? @map("deleted_at")
  version       Int       @default(0)

  parent        Organization?  @relation("OrgTree", fields: [parentId], references: [id])
  children      Organization[] @relation("OrgTree")
  modules       CompanyModule[]
  assignments   UserRoleAssignment[]

  @@unique([parentId, code])
  @@index([companyId, type])
  @@index([parentId])
  @@map("organizations")
}

enum OrgType {
  GROUP COMPANY DIVISION DEPARTMENT TEAM BRANCH
  WAREHOUSE FACTORY STORE PROJECT COST_CENTER PROFIT_CENTER
}

model User {
  id                 String   @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  personId           String   @unique @map("person_id") @db.Uuid
  email              String   @unique
  passwordHash       String?  @map("password_hash")
  mfaEnrolled        Boolean  @default(false) @map("mfa_enrolled")
  permissionsVersion Int      @default(1) @map("permissions_version")
  status             UserStatus @default(ACTIVE)
  lastLoginAt        DateTime? @map("last_login_at")
  failedAttempts     Int      @default(0) @map("failed_attempts")
  lockedUntil        DateTime? @map("locked_until")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  person             Person   @relation(fields: [personId], references: [id])
  assignments        UserRoleAssignment[]
  sessions           Session[]

  @@index([status])
  @@map("users")
}

model Role {
  id           String   @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  ownerOrgId   String   @map("owner_org_id") @db.Uuid
  parentRoleId String?  @map("parent_role_id") @db.Uuid
  key          String   @db.VarChar(64)
  name         String   @db.VarChar(120)
  level        RoleLevel
  attributes   Json     @default("{}")   // approval_limit, export_limit, flags
  isSystem     Boolean  @default(false) @map("is_system")
  version      Int      @default(1)
  deletedAt    DateTime? @map("deleted_at")

  permissions  RolePermission[]
  assignments  UserRoleAssignment[]

  @@unique([ownerOrgId, key])
  @@map("roles")
}

model UserRoleAssignment {
  id             String    @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  userId         String    @map("user_id") @db.Uuid
  roleId         String    @map("role_id") @db.Uuid
  organizationId String    @map("organization_id") @db.Uuid
  scopeMode      ScopeMode @default(SUBTREE) @map("scope_mode")
  excludedOrgIds String[]  @map("excluded_org_ids") @db.Uuid
  validFrom      DateTime  @default(now()) @map("valid_from")
  validTo        DateTime? @map("valid_to")
  grantedBy      String    @map("granted_by") @db.Uuid
  revokedBy      String?   @map("revoked_by") @db.Uuid
  reason         String?

  user           User         @relation(fields: [userId], references: [id])
  role           Role         @relation(fields: [roleId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])

  @@index([userId, validTo])
  @@index([organizationId, roleId])
  @@map("user_role_assignments")
}

enum ScopeMode { SELF NODE SUBTREE SUBTREE_EXCEPT CROSS }`
  },
  {
    kind: 'code',
    title: 'SQL that Prisma cannot express — the parts that actually protect the data',
    code: `-- 1. Active-assignment uniqueness (partial unique index)
CREATE UNIQUE INDEX uq_active_assignment
  ON user_role_assignments (user_id, role_id, organization_id)
  WHERE valid_to IS NULL;

-- 2. Balanced journal entries, checked at commit rather than per statement
ALTER TABLE journal_entries
  ADD CONSTRAINT je_balanced CHECK (total_debit = total_credit) DEFERRABLE INITIALLY DEFERRED;

-- 3. Posted entries are immutable
CREATE RULE je_no_update AS ON UPDATE TO journal_entries
  WHERE old.status = 'POSTED' DO INSTEAD NOTHING;
REVOKE DELETE ON journal_entries FROM app_rw;

-- 4. Audit is insert-only
REVOKE UPDATE, DELETE ON audit_logs FROM app_rw;

-- 5. Monthly partitioning for the high-volume tables
CREATE TABLE audit_logs (...) PARTITION BY RANGE (occurred_at);
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- 6. Collision-free document numbering under concurrency
CREATE OR REPLACE FUNCTION next_document_number(
  p_company uuid, p_doc_type text, p_fiscal_year int
) RETURNS text LANGUAGE plpgsql AS $$
DECLARE seq record;
BEGIN
  UPDATE number_sequences
     SET next_value = next_value + 1
   WHERE company_id = p_company
     AND document_type = p_doc_type
     AND fiscal_year = p_fiscal_year
  RETURNING * INTO seq;                      -- row lock held to commit
  IF NOT FOUND THEN RAISE EXCEPTION 'no sequence configured'; END IF;
  RETURN seq.prefix || '-' || p_fiscal_year || '-' ||
         lpad((seq.next_value - 1)::text, seq.padding, '0');
END $$;
-- INV-FOOD-2026-000001 / PO-FOOD-2026-000001 / INV-TRANS-2026-000001
-- Row lock, not a sequence object: numbers must be gapless for tax authorities,
-- and a PostgreSQL sequence leaks numbers on rollback.`
  },
  {
    kind: 'callout',
    tone: 'info',
    title: 'Gapless versus fast',
    text: 'Gapless numbering serializes concurrent document creation per company and document type. That is the correct trade: at realistic volumes it is a few hundred documents a minute per company, and a tax authority that finds a gap in invoice numbers does not accept a concurrency explanation. Non-statutory documents (internal requisitions) may use a plain sequence.'
  }]

},
{
  id: 'api',
  number: 21,
  title: 'API Architecture',
  summary:
  'Versioned REST with mandatory context resolution, cursor pagination, idempotency, optimistic concurrency, and a uniform error envelope.',
  blocks: [
  {
    kind: 'code',
    title: 'Surface',
    code: `/api/v1/auth          login, refresh, logout, mfa, context-switch, me
/api/v1/users         lifecycle, assignments, sessions, delegations
/api/v1/organizations tree, nodes, moves, relations, closure
/api/v1/companies     onboarding, modules, settings, fiscal calendar
/api/v1/roles         roles, permissions, role-permissions, matrix preview
/api/v1/employees     persons, employments, positions, transfers
/api/v1/hr            attendance, leave, performance, recruitment
/api/v1/payroll       structures, runs, payslips
/api/v1/finance       accounts, journals, invoices, payments, budgets, periods
/api/v1/procurement   requests, rfqs, quotes, orders, receipts
/api/v1/inventory     items, stock, movements, transfers, counts
/api/v1/sales         quotations, orders, deliveries, invoices, customers
/api/v1/workflows     definitions, versions, instances, tasks, actions
/api/v1/approvals     my queue, act, delegate, history
/api/v1/audit         query, verify, export
/api/v1/reports       registry, run, schedule, export
/api/v1/search        global, permission-filtered
/api/v1/notifications feed, preferences, mark-read`
  },
  {
    kind: 'code',
    title: 'Request and response contract',
    code: `Required headers
  Authorization: Bearer <access token>
  X-Organization-Id: <active context>      -- must be within the caller assignments
  X-Correlation-Id: <uuid>                 -- generated if absent, echoed everywhere
  Idempotency-Key: <uuid>                  -- required on POST that creates money or stock
  If-Match: "<version>"                    -- required on PUT/PATCH of versioned entities

List contract
  GET /api/v1/procurement/orders
    ?cursor=<opaque>&limit=50
    &filter[status]=PENDING_APPROVAL&filter[total][gte]=50000
    &sort=-created_at&q=cement&include=supplier,lines

  { "data": [...],
    "page": { "cursor": "...", "hasMore": true, "limit": 50 },
    "meta": { "asOf": "2026-09-20T09:12:00Z", "scope": "ABC Foods" } }

Error envelope
  { "error": { "code": "APPROVAL_LIMIT_EXCEEDED",
               "message": "Amount exceeds your approval limit",
               "details": [{ "field": "totalAmount", "limit": 500000 }],
               "correlationId": "..." } }

Status usage
  400 validation  401 unauthenticated  403 authorized-but-denied
  404 not found OR module disabled OR outside scope (never distinguish)
  409 version conflict  412 If-Match failed  422 business rule violated
  429 rate limited  503 dependency unavailable`
  },
  {
    kind: 'table',
    columns: ['Concern', 'Approach', 'Why not the obvious alternative'],
    rows: [
    ['Pagination', 'Cursor (keyset) on an indexed sort key', 'OFFSET degrades badly past a few thousand rows on partitioned tables'],
    ['Idempotency', 'Key stored in Redis with the response for 24h, scoped by user and endpoint', 'Retries on payments and stock movements must not duplicate'],
    ['Concurrency', 'Integer version + If-Match, returning 409 with the current state', 'Last-write-wins silently destroys a colleague edit on a long ERP form'],
    ['Bulk operations', 'POST /bulk with per-item results and partial success, async job over 500 items', 'All-or-nothing bulk fails the whole import for one bad row'],
    ['Versioning', 'URI major version, additive changes within a version, 12-month deprecation with Sunset header', 'Header negotiation is invisible to integrators in a multi-vendor group'],
    ['Rate limiting', 'Redis token bucket per user, per IP, per company, with separate export and report budgets', 'A single report loop should not exhaust a company API budget'],
    ['Search', 'Dedicated endpoint, permission-filtered at index query time', 'Filtering after retrieval leaks existence through result counts']]

  },
  {
    kind: 'callout',
    tone: 'rule',
    title: 'No business logic in controllers',
    text: 'Controllers validate the DTO, resolve the context, and call a service. Services own the transaction, the policy evaluation, the domain invariants, and the event emission. Repositories own the scope filter and the SQL. A controller that touches Prisma directly fails code review.'
  }]

},
{
  id: 'events',
  number: 22,
  title: 'Event Architecture',
  summary:
  'Transactional outbox, in-process synchronous handlers for invariants, Redis-backed queues for everything else. No broker until a broker earns its place.',
  blocks: [
  {
    kind: 'table',
    columns: ['Event', 'Mode', 'Reason'],
    rows: [
    ['PurchaseRequestCreated', 'Async', 'Starts a workflow instance; nothing else must be true at commit'],
    ['PurchaseApproved / Rejected', 'Sync for state, async for effects', 'Document state and audit are transactional; notifications are not'],
    ['PurchaseOrderCreated', 'Sync', 'Must create the budget commitment atomically or budget control is fiction'],
    ['GoodsReceived', 'Sync', 'Stock ledger and accrual must post in the same transaction'],
    ['InvoiceCreated / InvoicePaid', 'Sync ledger, async downstream', 'GL must balance immediately; ageing refresh and alerts can lag'],
    ['EmployeeCreated', 'Async', 'Provisioning proposals, welcome mail, asset requests'],
    ['EmployeeTransferred', 'Sync for assignment revocation, async for the rest', 'Access must be cut at the effective moment, not eventually'],
    ['LeaveApproved', 'Sync balance, async calendar and payroll signal', 'Two approvals must not both consume the last day of balance'],
    ['PayrollProcessed', 'Async', 'Long running, batch, retryable; payslip mail and GL posting follow'],
    ['AssetAssigned', 'Async', 'Acknowledgement request and depreciation cost-centre update'],
    ['PermissionsChanged', 'Sync cache bust, async alert', 'Revocation must be immediate everywhere']]

  },
  {
    kind: 'code',
    title: 'Outbox pattern',
    code: `BEGIN;
  INSERT INTO purchase_orders (...);
  INSERT INTO budget_commitments (...);          -- same-transaction invariant
  INSERT INTO audit_logs (...);                  -- same-transaction evidence
  INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type,
                             payload, company_id, correlation_id);
COMMIT;

A relay polls unpublished rows (FOR UPDATE SKIP LOCKED, batched) and pushes to
the queue. Consumers are idempotent on event id. This removes the dual-write
problem entirely: either the business change and the event both exist, or neither.`
  },
  {
    kind: 'decision',
    title: 'Redis queue (BullMQ) first, broker later',
    decision: 'Use Redis-backed queues for background work and pub/sub for WebSocket fan-out. Do not introduce Kafka or RabbitMQ in phase one.',
    why: 'The workload is job execution — payroll runs, report generation, notification dispatch, document processing — not high-throughput event streaming between independent teams. Redis is already present for sessions and cache, and BullMQ gives retries, backoff, scheduling, and dead-letter handling with no new operational surface.',
    tradeoffs: 'No long event retention, no replay from an offset, weaker ordering guarantees. Acceptable because the outbox table is the durable record and can be replayed from the database.',
    alternatives: 'RabbitMQ (better routing and per-message ack semantics; justified when third-party systems consume our events). Kafka (justified for event sourcing, stream analytics, or many independent consumer groups replaying history).',
    changeWhen: 'Move to Kafka when the warehouse is fed by CDC streams, when external systems need replayable history, or when a single event type exceeds a few thousand per second. Move to RabbitMQ when complex routing to external integrations appears first.'
  },
  {
    kind: 'callout',
    tone: 'danger',
    title: 'Background jobs must carry authorization context',
    text: 'Every queued job payload carries actor_user_id, organization_id, company_id, scope snapshot, and correlation_id. Workers rebuild a principal from that context and use the same scoped repositories as a request. A worker that connects with an unrestricted database role and filters in application code is how cross-company leaks reach a scheduled report. Jobs also revalidate authority at execution time: if the requester lost the permission between enqueue and run, the job fails and notifies.'
  }]

},
{
  id: 'security',
  number: 23,
  title: 'Security Architecture',
  summary:
  'Defense in depth from edge to row, with company isolation treated as the primary threat model rather than an afterthought.',
  blocks: [
  {
    kind: 'flow',
    caption: 'Every request passes all six',
    steps: [
    { label: 'Authentication' },
    { label: 'Authorization' },
    { label: 'Scope resolution' },
    { label: 'Service validation' },
    { label: 'Scoped repository' },
    { label: 'Database (RLS on critical tables)' }]

  },
  { kind: 'h', text: 'Authentication and session' },
  {
    kind: 'ul',
    items: [
    'Access token: 10 minutes, signed, carries user, session, active organization and permissions_version only.',
    'Refresh token: 7 days, rotating, stored hashed, in an HttpOnly + Secure + SameSite=Strict cookie, with reuse detection that revokes the whole token family and alerts.',
    'CSRF: double-submit token on cookie-authenticated state-changing requests, plus strict origin checking.',
    'MFA: mandatory for any user holding a sensitive permission (approvals, role grants, payroll, payments, exports) and for all group-scope assignments. TOTP and WebAuthn; SMS only as fallback.',
    'Password policy: length-first with breach-list checking, Argon2id hashing, no forced rotation without cause.',
    'Lockout and brute force: exponential backoff per account and per IP, CAPTCHA escalation, alert on distributed attempts against many accounts.',
    'Session management: device list, per-session revoke, global revoke, forced re-auth on privilege change, idle and absolute timeouts configurable per company.',
    'Step-up authentication: re-verify MFA for payment release, payroll approval, role grants, and bulk exports, regardless of session age.']

  },
  { kind: 'h', text: 'Isolation and OWASP mapping' },
  {
    kind: 'table',
    columns: ['Threat', 'Control', 'Where enforced'],
    rows: [
    ['Broken access control', 'Scope resolution on every request; deny by default; contract tests per endpoint', 'Guard + service + repository'],
    ['IDOR', 'Never trust a path id: every fetch is scoped, and a miss returns 404, not 403', 'Repository'],
    ['Cross-company leakage', 'Mandatory company predicate; RLS on critical tables; scope-hashed cache keys', 'Repository + PostgreSQL + Redis'],
    ['Privilege escalation', 'Users cannot grant a permission they do not hold; sensitive grants need dual approval; group scope alerts', 'IAM service'],
    ['SQL injection', 'Parameterised queries only; raw SQL reviewed and never string-built from user input', 'Data layer'],
    ['Mass assignment', 'Explicit DTOs with allow-lists; unknown properties rejected, not stripped', 'Validation pipe'],
    ['Sensitive data exposure', 'Field-level masking by permission; salary, national ID, bank details encrypted at rest', 'Serializer + database'],
    ['Injection via reports and exports', 'Formula-escaping on CSV, row limits, approval above threshold, watermarked with actor', 'Report service'],
    ['Insecure background execution', 'Jobs carry and revalidate principal context', 'Worker runtime'],
    ['Cryptographic and secret failures', 'TLS 1.3, envelope encryption with a KMS, no secrets in environment files or images', 'Infrastructure']]

  },
  {
    kind: 'code',
    title: 'The scoped repository — the single most important security component',
    code: `// Scope is not optional. There is no API to query without it.
abstract class ScopedRepository<T> {
  protected abstract table: string;

  protected scopeFilter(ctx: RequestContext) {
    if (!ctx.scope) throw new UnscopedQueryError();     // fails closed
    switch (ctx.scope.mode) {
      case 'SELF':    return { personId: ctx.personId };
      case 'NODE':    return { orgId: ctx.scope.nodeId };
      case 'SUBTREE': return { orgId: { in: ctx.scope.descendantIds } };
      case 'CROSS':   return { companyId: { in: ctx.scope.companyIds } };
    }
  }

  async findMany(ctx: RequestContext, where: Where<T>) {
    return this.prisma[this.table].findMany({
      where: { AND: [where, this.scopeFilter(ctx), { deletedAt: null }] },
    });
  }
}

// A lint rule bans direct prisma access outside repositories.
// A test suite calls every endpoint as a user from company A with an id
// belonging to company B and asserts 404 - no exceptions, no allow-list.`
  },
  {
    kind: 'callout',
    tone: 'warn',
    title: 'Cache isolation',
    text: 'Every cache key is namespaced: env:tenant-group:company_id:user_id:scope_hash:permissions_version:resource. Nothing derived from scoped data is ever cached under a key that omits the scope hash. Cached report payloads additionally embed the scope they were computed for and are re-validated on read — a cheap check that makes a key-collision bug non-exploitable.'
  }]

}];