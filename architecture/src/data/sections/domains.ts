import type { DocSection } from '../../types/doc';

export const domainSections: DocSection[] = [
{
  id: 'modules',
  number: 8,
  title: 'Module Architecture',
  summary:
  'Twenty-five core modules plus pluggable verticals. Activation is a row per company, enforced by a guard, a navigation filter, and a data-access precondition.',
  blocks: [
  {
    kind: 'table',
    columns: ['#', 'Core module', 'Owns', 'Depends on'],
    rows: [
    ['1', 'Identity & Access', 'users, roles, permissions, assignments, delegations, sessions', '—'],
    ['2', 'Organization', 'org tree, types, relations, module activation', 'IAM'],
    ['3', 'Employee / HR', 'persons, employments, positions, reporting lines', 'Org'],
    ['4', 'Payroll', 'salary structures, runs, payslips, statutory deductions', 'HR, Attendance, Finance'],
    ['5', 'Attendance', 'shifts, punches, timesheets, overtime', 'HR'],
    ['6', 'Leave', 'policies, entitlements, balances, requests', 'HR, Workflow'],
    ['7', 'Recruitment', 'requisitions, candidates, interviews, offers', 'HR, Workflow'],
    ['8', 'Performance', 'cycles, goals, reviews, ratings', 'HR'],
    ['9', 'Finance & Accounting', 'CoA, journals, GL, AP, AR, banks, tax', 'Org'],
    ['10', 'Budget', 'budget versions, lines, commitments, variance', 'Finance'],
    ['11', 'Procurement', 'PR, RFQ, quotes, PO, GRN matching', 'Workflow, Finance, Inventory'],
    ['12', 'Supplier', 'vendors, contracts, evaluation, compliance docs', 'Procurement'],
    ['13', 'Inventory', 'items, stock ledger, valuation, movements', 'Org'],
    ['14', 'Warehouse', 'locations, bins, transfers, stock counts', 'Inventory'],
    ['15', 'Sales', 'quotations, orders, deliveries, invoicing', 'Inventory, Finance, CRM'],
    ['16', 'Customer / CRM', 'accounts, contacts, pipeline, activities', 'Sales'],
    ['17', 'Asset', 'register, assignment, depreciation, disposal', 'Finance, HR'],
    ['18', 'Project', 'projects, WBS, tasks, timesheets, costing', 'HR, Finance'],
    ['19', 'Document', 'metadata, versions, ACL, retention', 'Object storage'],
    ['20', 'Workflow & Approval', 'definitions, versions, instances, tasks', 'IAM, Notification'],
    ['21', 'Notification', 'events, templates, channels, preferences', 'Workflow'],
    ['22', 'Audit & Compliance', 'append-only log, legal hold, evidence export', 'All'],
    ['23', 'Reporting & BI', 'report registry, pre-aggregates, exports', 'Analytics replica'],
    ['24', 'Administration', 'company onboarding, module activation, user admin', 'Org, IAM'],
    ['25', 'System Configuration', 'settings, sequences, currencies, fiscal calendars', '—']]

  },
  {
    kind: 'cards',
    items: [
    { title: 'Manufacturing', meta: 'Vertical', body: 'BOM, routings, work orders, production output, scrap, WIP valuation into Finance.' },
    { title: 'Fleet & Transport', meta: 'Vertical', body: 'Vehicles, drivers, trips, fuel logs, maintenance schedules, route costing.' },
    { title: 'POS & Retail', meta: 'Vertical', body: 'Registers, shifts, offline-tolerant sales capture, store stock, end-of-day settlement.' },
    { title: 'Food Production & QC', meta: 'Vertical', body: 'Batches, lot traceability, expiry, quality checkpoints, recall reporting.' },
    { title: 'Construction & Real Estate', meta: 'Vertical', body: 'Project budgets, subcontractors, progress billing, units, leases.' },
    { title: 'Healthcare / Education / Hospitality / Agriculture / E-commerce', meta: 'Vertical', body: 'Each ships as an isolated module with its own tables, events and permission namespace.' }]

  },
  { kind: 'h', text: 'Module activation' },
  {
    kind: 'code',
    title: 'Representation and enforcement',
    code: `company_modules
  id             uuid pk
  company_id     uuid fk -> organizations(id)   -- must be type=COMPANY
  module_key     varchar(64)                     -- 'hr', 'payroll', 'fleet', 'pos'
  status         enum(ENABLED, DISABLED, TRIAL, SUSPENDED)
  settings       jsonb                           -- module-specific configuration
  enabled_at, disabled_at, enabled_by
  unique (company_id, module_key)

Enforcement, in order:
  1. ModuleGuard        every controller declares @RequiresModule('procurement');
                        the guard checks activation for the active context company
                        -> 404, not 403, so a disabled module is undiscoverable
  2. Permission registry  permissions for a disabled module are stripped from the
                          effective set at resolution time, so stale grants cannot fire
  3. Navigation           the /me/navigation endpoint returns only enabled modules
                          the user has at least one read permission for
  4. Data access          module tables carry company_id; disabling stops writes but
                          never deletes data
  5. Events               subscribers no-op for companies where the module is disabled

Dependency rule: enabling 'payroll' requires 'hr' and 'finance'; the activation
service validates the dependency graph and refuses partial activation.`
  },
  {
    kind: 'decision',
    title: '404 instead of 403 for disabled modules',
    decision: 'A request to a module that is not activated for the active company returns 404 Not Found.',
    why: 'A 403 confirms the endpoint exists and is a reconnaissance signal. It also confuses support: users read 403 as a permission problem and file access tickets for features their company never bought.',
    tradeoffs: 'Slightly harder to debug internally. Mitigated by logging the real reason with the correlation ID while returning a generic body.',
    alternatives: '403 with a clear message (better DX, worse security posture and worse support load).',
    changeWhen: 'If the group later sells module upsell in-product, return 402/upgrade metadata for modules explicitly marked as purchasable.'
  },
  {
    kind: 'callout',
    tone: 'info',
    title: 'Why this beats per-company deployments',
    text: 'ABC Foods runs HR, Payroll, Finance, Procurement, Inventory, Manufacturing, Warehouse, Sales. ABC Transport runs HR, Payroll, Finance, Fleet, Maintenance, Fuel, Logistics. That difference is 15 rows in company_modules — not two codebases, two release trains, and two on-call rotations.'
  }]

},
{
  id: 'finance',
  number: 9,
  title: 'Finance Architecture',
  summary:
  'Double-entry general ledger per company, a group chart-of-accounts template, and consolidation with inter-company elimination.',
  blocks: [
  {
    kind: 'p',
    text: 'Each company is its own accounting entity with its own fiscal calendar, functional currency, and ledger. The group defines a chart of accounts template; companies instantiate it and may add leaf accounts, but the top three levels and the group mapping code are locked so consolidation never depends on name matching.'
  },
  {
    kind: 'flow',
    caption: 'Posting pipeline — every financial event ends here',
    steps: [
    { label: 'Business event', note: 'invoice, GRN, payroll run' },
    { label: 'Posting rule', note: 'configurable per company + category' },
    { label: 'Journal entry', note: 'draft, balanced check' },
    { label: 'Approval', note: 'if required by threshold' },
    { label: 'Posted to GL', note: 'immutable' },
    { label: 'Period close', note: 'locks the period' }]

  },
  {
    kind: 'code',
    title: 'Core finance entities',
    code: `chart_of_accounts     company_id, code, name, type(ASSET|LIABILITY|EQUITY|REVENUE|EXPENSE),
                      parent_id, group_mapping_code, is_postable, currency, status
fiscal_years          company_id, code, start_date, end_date, status
fiscal_periods        fiscal_year_id, period_no, start, end, status(OPEN|CLOSED|LOCKED)
journal_entries       company_id, entry_no, period_id, date, source_module, source_ref,
                      description, status(DRAFT|POSTED|REVERSED), posted_by, posted_at,
                      reversal_of_id, version
journal_lines         entry_id, line_no, account_id, debit, credit, currency, fx_rate,
                      base_debit, base_credit, cost_center_id, profit_center_id,
                      department_id, project_id, partner_org_id  -- partner = inter-company
invoices (AR/AP)      company_id, type, party_id, number, date, due_date, currency,
                      subtotal, tax_total, total, balance, status
payments              company_id, direction, party_id, bank_account_id, amount, date,
                      allocation[] -> invoice ids
budgets               company_id, fiscal_year_id, version, status, owner_org_id
budget_lines          budget_id, account_id, org_id, period_no, amount, committed, actual

Constraints
  - CHECK (debit = 0 OR credit = 0) per line
  - deferred constraint: sum(debit) = sum(credit) per entry, enforced at commit
  - no UPDATE or DELETE on posted entries; corrections create a reversing entry
  - unique (company_id, entry_no); unique (company_id, type, number) on invoices`
  },
  { kind: 'h', text: 'Consolidation' },
  {
    kind: 'ul',
    items: [
    'Each company posts in its functional currency; every line also stores a base amount in the group reporting currency at the applicable rate (transaction rate for P&L, closing rate for balance sheet, historical rate for equity).',
    'Consolidation runs against the analytics replica, not the OLTP primary: trial balance per company, currency translation, ownership-percentage adjustment from organization_relations, then elimination of inter-company balances.',
    'Elimination pairs are found by partner_org_id on journal lines — the reason that column exists. Matching by description or account code is a reconciliation nightmare and is not permitted.',
    'A consolidation run is a snapshot: immutable, versioned, reproducible, with the exchange rate set and the elimination list attached as evidence.',
    'Unmatched inter-company balances above a threshold block the run and raise a settlement exception task to both companies.']

  },
  {
    kind: 'decision',
    title: 'One ledger schema shared by all companies',
    decision: 'All companies post into the same journal tables, partitioned by company and period, rather than per-company schemas.',
    why: 'Consolidation, inter-company matching, and group-wide reporting become ordinary queries. Fifty schemas would mean fifty migration targets and dynamic SQL for every group report.',
    tradeoffs: 'Company isolation now depends on query discipline rather than physical separation. Countered with mandatory repository-level filters and optional PostgreSQL RLS on financial tables.',
    alternatives: 'Schema-per-company (strong isolation, painful consolidation). Database-per-company (see section 18 entry conditions).',
    changeWhen: 'Move a single company to its own database only if a regulator demands physical data residency or a company is being divested.'
  },
  { kind: 'h', text: 'Inter-company transactions' },
  {
    kind: 'code',
    title: 'ABC IT bills ABC Foods for software services',
    code: `InterCompanyTransaction  id, initiating_company_id, counterparty_company_id,
                         type(SERVICE|GOODS|LOAN|ALLOCATION|RECHARGE),
                         amount, currency, status, settlement_id

Generated atomically, in one database transaction:

  ABC IT    (seller)                         ABC Foods (buyer)
  AR - Intercompany (ABC Foods)  Dr 100,000  Service Expense        Dr 100,000
    Service Revenue - IC           Cr 100,000   AP - Intercompany (ABC IT) Cr 100,000
  partner_org_id = ABC Foods                 partner_org_id = ABC IT

Settlement (net or gross):
  ABC Foods  AP - Intercompany Dr 100,000 / Bank Cr 100,000
  ABC IT     Bank Dr 100,000 / AR - Intercompany Cr 100,000

Consolidation eliminates: IC Revenue vs IC Expense, IC AR vs IC AP.

Rules
  - Both legs are created by one service call in one transaction. A half-posted
    inter-company transaction is the single most common source of consolidation drift.
  - Transfer pricing rules per pair are configuration, not code.
  - Periodic netting settles many transactions with one payment per company pair.
  - Both companies must have an OPEN period, or the transaction is queued.`
  },
  {
    kind: 'callout',
    tone: 'warn',
    title: 'Never hard-delete financial records',
    text: 'Posted journals, invoices, and payments have no delete path in the API. Cancellation is a status transition plus a reversing entry. Soft delete columns exist on master data (accounts, parties) but not on transactional postings, where they would create ambiguity about whether a balance includes the row.'
  }]

},
{
  id: 'hr',
  number: 10,
  title: 'HR Architecture',
  summary:
  'Person and employment are separate so a transfer between sister concerns preserves identity, history, and service length.',
  blocks: [
  {
    kind: 'code',
    title: 'Core HR model',
    code: `persons        id, national_id (unique), full_name, dob, gender, contacts, emergency
users          id, person_id (unique), email (unique), status        -- IAM owns this
employments    id, person_id, company_id, employee_no (unique per company),
               position_id, department_org_id, branch_org_id, manager_employment_id,
               employment_type(PERMANENT|CONTRACT|PROBATION|INTERN),
               grade, start_date, end_date, status, prior_employment_id
positions      id, company_id, org_id, title, job_title, grade, salary_band,
               headcount, reports_to_position_id
employee_transfers  person_id, from_employment_id, to_employment_id, type,
                    effective_date, balance_carry(jsonb), approved_by
attendance     employment_id, date, shift_id, in_at, out_at, source, status
leave_types / leave_policies / leave_entitlements / leave_requests
payroll_runs / payslips / payslip_lines / salary_structures
performance_cycles / goals / reviews
documents      linked via Document module with retention class EMPLOYEE`
  },
  { kind: 'h', text: 'Employee transfer between sister concerns' },
  {
    kind: 'flow',
    steps: [
    { label: 'Transfer request', note: 'raised by receiving company HR' },
    { label: 'Releasing approval', note: 'current company head + HR' },
    { label: 'Receiving approval', note: 'position confirmed and budgeted' },
    { label: 'Effective date', note: 'old employment ends, new one starts' },
    { label: 'Balance carry', note: 'leave, gratuity, service length per policy' },
    { label: 'Access rebind', note: 'assignments revoked and re-granted' }]

  },
  {
    kind: 'ul',
    items: [
    'The person row and the user account are untouched. Same login, same MFA enrolment, same document vault, same service length.',
    'Two employment rows now exist, linked by prior_employment_id. Group headcount counts distinct active employments; group tenure reads the person timeline.',
    'Role assignments are not carried over automatically. They are revoked at end of the old employment and granted fresh for the new one — a transfer is a privilege review point, not a privilege carry-over.',
    'Leave balance carry is policy-driven: carried, encashed, or forfeited, decided per company pair in configuration.',
    'Payroll splits the month between the two companies so each entity bears its own cost — this is also an inter-company allocation if the group nets payroll centrally.',
    'The old company retains read access to historical payroll and attendance for statutory reporting; the new company cannot see them.']

  },
  {
    kind: 'callout',
    tone: 'rule',
    title: 'Manager is a reporting line, not a permission',
    text: 'manager_employment_id drives workflow routing (the default first approver) and the "my team" view. It does not itself grant read access to subordinate records — that comes from a role assignment scoped to the department. Keeping them separate is what stops a reorg from silently changing who can see salaries.'
  }]

},
{
  id: 'procurement',
  number: 11,
  title: 'Procurement Architecture',
  summary:
  'Purchase request to payment, with approval chains resolved from configuration by company, department, category and amount.',
  blocks: [
  {
    kind: 'flow',
    caption: 'Procure to pay',
    steps: [
    { label: 'Purchase Request' },
    { label: 'Approval chain' },
    { label: 'RFQ' },
    { label: 'Supplier quotes' },
    { label: 'Purchase Order' },
    { label: 'Goods Receipt' },
    { label: 'Invoice (3-way match)' },
    { label: 'Payment' }]

  },
  {
    kind: 'code',
    title: 'Configurable approval matrix — never hard-coded',
    code: `approval_rules
  id, company_id, org_id null, module_key, document_type,
  category_id null, cost_center_id null,
  min_amount numeric, max_amount numeric null, currency,
  chain jsonb, priority int, effective_from, effective_to, status

Example rows for ABC Foods / PURCHASE_REQUEST:
  0        - 50,000     chain: [DEPT_MANAGER]
  50,001   - 500,000    chain: [DEPT_MANAGER, COMPANY_FINANCE]
  500,001  - null       chain: [DEPT_MANAGER, COMPANY_CFO, GROUP_CFO]

Chain steps reference ROLES AT A SCOPE, resolved to people at runtime:
  { "step": 1, "resolver": "REPORTING_MANAGER", "sla_hours": 24 }
  { "step": 2, "resolver": "ROLE_AT_SCOPE", "role": "Finance Approver",
    "scope": "COMPANY", "sla_hours": 48, "escalate_to": "ROLE:CFO" }
  { "step": 3, "resolver": "ROLE_AT_SCOPE", "role": "CFO", "scope": "GROUP",
    "quorum": 1, "sla_hours": 72 }

Resolution: most specific match wins (org > category > amount band),
ties broken by priority. A company with no rule inherits the group default.`
  },
  {
    kind: 'ul',
    items: [
    'Three-way match (PO, GRN, invoice) with configurable tolerance per company; an out-of-tolerance invoice creates an exception task instead of blocking silently.',
    'PO approval creates a budget commitment; GRN converts commitment to accrual; invoice posts the payable. Budget availability is checked at PR approval, not at payment, when it is too late to matter.',
    'Supplier master is group-level with per-company enablement, so vendor compliance documents and blacklisting are shared while payment terms stay local.',
    'Partial receipts, over-receipt tolerance, returns, and debit notes are first-class states, not free-text notes.']

  },
  {
    kind: 'callout',
    tone: 'danger',
    title: 'Separation of duties in procurement',
    text: 'The requester cannot approve. The approver cannot receive goods. The receiver cannot enter the invoice. The invoice entrant cannot release the payment. Each rule is a policy row with a named exception path that requires group compliance approval and raises an alert.'
  }]

},
{
  id: 'inventory',
  number: 12,
  title: 'Inventory & Warehouse Architecture',
  summary:
  'An append-only stock ledger per company and location, with valuation derived rather than stored as a mutable balance.',
  blocks: [
  {
    kind: 'code',
    title: 'Stock model',
    code: `items            company_id null  -- null = group catalogue item, shared
                 sku, name, uom, item_type, tracking(NONE|LOT|SERIAL|LOT_EXPIRY),
                 valuation_method(FIFO|WEIGHTED_AVG|STANDARD)
stock_locations  org_id (WAREHOUSE|STORE|FACTORY), zone, bin, is_virtual
stock_ledger     id, company_id, item_id, location_id, lot_id null, serial_id null,
                 movement_type(RECEIPT|ISSUE|TRANSFER|ADJUST|PRODUCE|CONSUME|RETURN),
                 qty (signed), unit_cost, value, ref_module, ref_id,
                 posted_at, posted_by            -- append-only, never updated
stock_balances   materialized: company_id, item_id, location_id, qty, value
                 refreshed incrementally on ledger insert inside the same transaction
lots / serials   traceability, expiry, supplier reference
stock_counts     cycle and full counts, variance approval before adjustment posts`
  },
  {
    kind: 'decision',
    title: 'Ledger plus maintained balance, not a mutable quantity column',
    decision: 'Quantity on hand is an append-only ledger; a balance table is maintained in the same transaction as a read optimisation.',
    why: 'A mutable qty column cannot answer "what was on hand on 31 March" and turns every concurrency bug into permanently wrong stock. The ledger makes valuation, audit, and recall traceability queries possible.',
    tradeoffs: 'Two writes per movement and a hot row per item and location. Handled with row-level locking in a deterministic order and, for very high-volume POS companies, a queued balance updater with the ledger as source of truth.',
    alternatives: 'Balance-only (fast, unauditable). Event sourcing the whole domain (over-engineered here; the ledger already is the event log for the one aggregate that needs it).',
    changeWhen: 'Move balance maintenance out of the write path when a single item and location exceeds roughly 50 movements per second — realistically only a POS or e-commerce company.'
  },
  {
    kind: 'ul',
    items: [
    'Inter-company stock transfer creates an issue in the sending company, a receipt in the receiving company, and an inter-company transaction at transfer price — never a single movement across companies.',
    'Negative stock is configurable per company and denied by default.',
    'Goods in transit is a virtual location, so the two legs of a transfer always balance.',
    'Every ledger row carries company_id and location org_id, making warehouse-scoped roles (a storekeeper who sees exactly one warehouse) a NODE-scope assignment with no special code.']

  }]

},
{
  id: 'sales',
  number: 13,
  title: 'Sales & CRM Architecture',
  summary:
  'Order to cash sharing the same party, tax, numbering, and posting infrastructure as procurement, with per-company customer enablement.',
  blocks: [
  {
    kind: 'flow',
    steps: [
    { label: 'Lead / Opportunity' },
    { label: 'Quotation' },
    { label: 'Sales Order' },
    { label: 'Reservation' },
    { label: 'Delivery' },
    { label: 'Invoice' },
    { label: 'Receipt' },
    { label: 'Revenue posted' }]

  },
  {
    kind: 'ul',
    items: [
    'Parties (customers and suppliers) live in one group-level master with a per-company enablement row holding credit limit, payment terms, price list and tax profile. A customer trading with three sister concerns is one record with three enablements — this is what makes group credit exposure reportable.',
    'Pricing is a resolved chain: contract price, customer price list, company price list, group list price. Same precedence pattern as configuration in section 32.',
    'Credit limit is checked against group exposure when the customer is flagged as a group account, otherwise against company exposure. The choice is configuration.',
    'Delivery reserves stock; invoicing posts AR and revenue; receipt allocates against invoices. Every step emits a domain event.',
    'A sale to a sister concern is routed through the inter-company pipeline automatically when the customer party is linked to a group company.']

  },
  {
    kind: 'callout',
    tone: 'info',
    title: 'Why one party master and not one per company',
    text: 'Without it, the group cannot answer "what is our total exposure to this distributor" — the question that justifies a group ERP in the first place. Per-company duplication of customers is the most common reason consolidated receivables reporting is abandoned after go-live.'
  }]

}];