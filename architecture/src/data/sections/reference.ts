import type { DocSection } from '../../types/doc';

export const referenceSections: DocSection[] = [
{
  id: 'scenarios',
  number: 29,
  title: 'Example User Scenarios',
  summary:
  'Ten representative principals, each with role, organization, scope, permissions, visibility and — most importantly — what they cannot see.',
  blocks: [
  {
    kind: 'table',
    columns: ['#', 'User', 'Role / Organization', 'Scope', 'Key permissions'],
    rows: [
    ['1', 'Nabila R.', 'Group Super Admin / ABC Group', 'SUBTREE (group), platform only', 'org.*, role.*, user.*, module.*, config.*, audit.read'],
    ['2', 'Tanvir A.', 'Group CEO / ABC Group', 'SUBTREE (group), read', 'report.group.read, company.read, kpi.read, approval.view'],
    ['3', 'Farhana K.', 'Group CFO / ABC Group', 'SUBTREE (group), finance', 'gl.read, invoice.approve, budget.approve, consolidation.run, po.approve (above 500k)'],
    ['4', 'Imran H.', 'Group HR Head / ABC Group', 'SUBTREE (group), HR', 'employee.read, employee.update, transfer.approve, payroll.read (aggregate)'],
    ['5', 'Sabbir M.', 'Group IT Admin / ABC Group', 'SUBTREE (group), IAM ops', 'user.create, user.disable, session.revoke, integration.manage'],
    ['6', 'Rezaul I.', 'Company CEO / ABC Foods', 'SUBTREE (ABC Foods)', 'report.company.read, po.approve, budget.approve, employee.read'],
    ['7', 'Md. Rahim', 'Company CFO / ABC Foods', 'SUBTREE (ABC Foods), finance', 'gl.*, invoice.approve, payment.approve, budget.manage, period.close'],
    ['8', 'Ayesha S.', 'Department Manager / ABC Foods > Production', 'SUBTREE (Production)', 'employee.read, leave.approve, pr.create, pr.approve (to 50k), budget.read'],
    ['9', 'Jamil U.', 'Supervisor / ABC Foods > Production > Line A', 'SUBTREE (Line A)', 'attendance.manage, task.assign, leave.recommend, employee.read (team)'],
    ['10', 'Sultana P.', 'Employee / ABC Foods > Production', 'SELF', 'profile.read, leave.create, attendance.read, payslip.read, expense.create']]

  },
  {
    kind: 'cards',
    items: [
    {
      title: '1. Group Super Admin',
      meta: 'Platform authority, not business authority',
      body: 'Sees: the whole organization tree, users, roles, module activation, configuration, audit, system health. Cannot see: salary figures, journal detail, invoice values, or any business record — those require a business role that must be granted separately, dual-approved, time-boxed and alerted. Preventing the platform admin from silently becoming a finance superuser is the point.'
    },
    {
      title: '2. Group CEO',
      meta: 'Read-wide, write-narrow',
      body: 'Sees: group KPIs, company comparison, consolidated financials, headcount, operational exceptions, and approvals routed to them. Cannot see: individual payslips, employee personal data, or transaction entry screens. Has no create or update permission anywhere outside their own approvals.'
    },
    {
      title: '3. Group CFO',
      meta: 'Cross-company finance',
      body: 'Sees: every company ledger, consolidation runs, inter-company exposure, budgets, and approvals above the company threshold. Cannot see: HR performance reviews, recruitment pipelines, or non-finance operational detail. Approval limit is unlimited but separation of duties still forbids approving anything they created.'
    },
    {
      title: '4. Group HR Head',
      meta: 'Group HR, restricted payroll',
      body: 'Sees: employees across all companies, positions, transfers, attrition, group HR policy, aggregate payroll cost. Cannot see: individual salary detail outside companies where explicitly granted, and no finance ledger. Transfers between sister concerns require their approval.'
    },
    {
      title: '5. Group IT Admin',
      meta: 'User lifecycle, no data',
      body: 'Sees: user accounts, sessions, devices, login audit, integrations, failed jobs. Cannot see: business data of any kind, or grant business roles — they can create a user and enable MFA, but role grants require the owning business approver.'
    },
    {
      title: '6. Company CEO — ABC Foods',
      meta: 'One company, full breadth',
      body: 'Sees: everything within ABC Foods across enabled modules, plus approvals above department thresholds. Cannot see: ABC Transport, ABC Grocery, or group consolidation. A direct URL to an ABC Transport purchase order returns 404.'
    },
    {
      title: '7. Company CFO — ABC Foods',
      meta: 'Company finance authority',
      body: 'Sees: ABC Foods ledger, AP/AR, budgets, payments, inter-company balances involving ABC Foods, period close. Cannot see: other companies ledgers even when they are the counterparty — only the balance owed, not the counterparty internal detail. Approval limit 5,000,000 BDT; above that the chain escalates to the Group CFO.'
    },
    {
      title: '8. Department Manager — Production',
      meta: 'One subtree',
      body: 'Sees: Production employees, attendance, leave requests, department budget versus actual, purchase requests raised in the department, team tasks. Cannot see: other departments, company-wide finance, salary detail beyond their approved band, or any other company.'
    },
    {
      title: '9. Supervisor — Line A',
      meta: 'Narrow node scope',
      body: 'Sees: Line A roster, shifts, attendance exceptions, tasks, leave recommendations. Cannot see: salaries, other lines, department budget, or any approval authority beyond recommendation. Their recommendation is a workflow step, not an approval.'
    },
    {
      title: '10. Employee',
      meta: 'SELF scope',
      body: 'Sees: own profile, attendance, leave balance and history, payslips, expense claims, assigned tasks, own documents, notifications, and the status of their own requests including who is holding them. Cannot see: any colleague record, any aggregate, or any document they did not create or receive.'
    }]

  },
  {
    kind: 'code',
    title: 'The same permission, three different results',
    code: `GET /api/v1/employees?limit=50     Header X-Organization-Id varies

Group HR Head    ctx=ABC Group           -> 41,208 employees, all companies
Company CEO      ctx=ABC Foods           ->  9,640 employees, ABC Foods only
Dept Manager     ctx=ABC Foods>Production->    312 employees, Production subtree
Supervisor       ctx=...>Production>LineA->     28 employees, Line A
Employee         ctx=ABC Foods>Production->      1 employee, themselves

Same endpoint. Same permission key. No per-role code path.
The difference is entirely the resolved scope set.`
  }]

},
{
  id: 'permission-matrix',
  number: 30,
  title: 'Permission Matrix',
  summary:
  'A resource.action vocabulary, mapped to roles with scope defaults and ABAC conditions.',
  blocks: [
  {
    kind: 'code',
    title: 'Naming convention',
    code: `<module>.<resource>.<action>       canonical form
shortened to <resource>.<action> where the resource is globally unique

actions: read create update delete approve reject cancel post void
         export assign transfer close reopen configure

examples
  employee.read        employee.create      employee.update     employee.terminate
  payslip.read         payroll.run          payroll.approve
  invoice.read         invoice.create       invoice.approve     invoice.cancel
  payment.create       payment.approve      payment.release
  journal.post         journal.reverse      period.close
  purchase_request.create   purchase_request.approve
  purchase_order.read  purchase_order.create purchase_order.approve
  stock.read           stock.adjust         stock.transfer
  role.grant           role.revoke          user.disable
  report.group.read    report.company.read  audit.read  audit.export

Sensitive permissions (require MFA step-up + dual approval to GRANT):
  *.approve  *.release  role.grant  role.revoke  user.disable
  payroll.*  period.close  audit.export  data.export`
  },
  {
    kind: 'table',
    columns: ['Permission', 'Group CFO', 'Company CFO', 'Dept Manager', 'Employee'],
    rows: [
    ['employee.read', 'Group subtree', 'Company subtree', 'Department subtree', 'SELF'],
    ['employee.create', '—', '—', '—', '—'],
    ['payslip.read', 'Aggregate only', 'Company aggregate', '—', 'SELF'],
    ['leave.approve', '—', '—', 'Department, not own', '—'],
    ['invoice.read', 'Group', 'Company', 'Own department documents', 'Own claims'],
    ['invoice.approve', 'Unlimited, not own', 'To 5,000,000, not own', '—', '—'],
    ['payment.release', 'Dual control', 'Dual control', '—', '—'],
    ['journal.post', 'Group', 'Company', '—', '—'],
    ['period.close', 'Group', 'Company, after reconciliation', '—', '—'],
    ['purchase_request.create', 'Yes', 'Yes', 'Yes', 'Yes'],
    ['purchase_request.approve', 'Above 500,000', 'To 500,000', 'To 50,000, not own', '—'],
    ['purchase_order.approve', 'Above 500,000', 'To 500,000', '—', '—'],
    ['stock.adjust', '—', '—', 'With variance approval', '—'],
    ['role.grant', '—', '—', '—', '—'],
    ['audit.read', 'Group, finance actions', 'Company', 'Department documents', 'Own records'],
    ['report.group.read', 'Yes', '—', '—', '—'],
    ['data.export', 'Approved, watermarked', 'Approved, watermarked', 'Row-capped', '—']],

    caption: 'Cells show the default scope and any ABAC condition. A dash means the permission is absent — which also means the feature is not discoverable.'
  },
  {
    kind: 'code',
    title: 'Role to permission to scope binding',
    code: `role: "Finance Approver"  (owner_org = ABC Group, cloneable per company)
  attributes: { approval_limit: 500000, currency: "BDT",
                requires_second_approver_above: 2000000 }
  permissions:
    invoice.read     ALLOW  (no conditions)
    invoice.approve  ALLOW  [ amount <= principal.approval_limit,
                              created_by != principal.user_id,
                              company_id in principal.scope.companies,
                              status == PENDING_APPROVAL ]
    expense.read     ALLOW
    expense.approve  ALLOW  [ amount <= principal.approval_limit,
                              created_by != principal.user_id ]
    journal.post     DENY                      -- explicit deny beats inheritance

assignment: user=Rahim role="Finance Approver"
            org=ABC Foods>Finance scope=SUBTREE valid_from=... valid_to=null`
  },
  {
    kind: 'callout',
    tone: 'rule',
    title: 'Two rules that keep the matrix honest',
    text: 'First, a permission may only be granted by someone who holds it themselves at an equal or wider scope — no self-elevation path exists. Second, adding a new permission key to the registry requires declaring its module, its sensitivity, and its default role mapping in the same migration, so the matrix can never silently fall out of date with the code.'
  }]

},
{
  id: 'workflow-examples',
  number: 31,
  title: 'Workflow Examples',
  summary:
  'Nine configured workflows expressed in the same engine vocabulary, differing only in data.',
  blocks: [
  {
    kind: 'flow',
    caption: 'Purchase Request — ABC Foods, above 500,000 BDT',
    steps: [
    { label: 'Requester submits', note: 'budget availability checked' },
    { label: 'Dept Manager', note: 'SLA 24h' },
    { label: 'Company Finance', note: 'SLA 48h, escalates to CFO' },
    { label: 'Company CFO', note: 'SLA 48h' },
    { label: 'Group CFO', note: 'SLA 72h' },
    { label: 'Approved -> RFQ', note: 'commitment reserved' }]

  },
  {
    kind: 'flow',
    caption: 'Payment — strict four-eyes',
    steps: [
    { label: 'Maker creates', note: 'AP clerk' },
    { label: 'Manager approves', note: 'not the maker' },
    { label: 'Finance verifies', note: 'bank detail + invoice match' },
    { label: 'CFO approves', note: 'step-up MFA' },
    { label: 'Release', note: 'second releaser, dual control' }]

  },
  {
    kind: 'table',
    columns: ['Workflow', 'Chain', 'Notable configuration'],
    rows: [
    ['Purchase Request', 'Manager → Finance → CFO → Group CFO by amount band', 'Budget check at submission; rejection returns to requester for rework'],
    ['Purchase Order', 'Procurement → Finance → CFO if variance from PR exceeds tolerance', 'Skips approval entirely when the PO matches an approved PR within tolerance'],
    ['Expense Claim', 'Manager → Finance', 'Auto-approve below a configurable limit with post-audit sampling; receipt mandatory above threshold'],
    ['Leave Request', 'Supervisor recommends → Manager approves → HR notified', 'Balance and blackout-period validation; auto-escalates after SLA; coverage check for critical roles'],
    ['Recruitment', 'Requisition → Dept Head → HR → Finance headcount budget → CEO for new positions', 'Different chain for backfill versus new headcount'],
    ['Employee Transfer', 'Releasing manager → Releasing HR → Receiving HR → Group HR Head', 'Two companies, so both org chains participate; access revocation at effective date'],
    ['Payment', 'Maker → Manager → Finance verify → CFO → Release', 'Maker-checker-approver enforced; step-up MFA; dual control on release'],
    ['Invoice Approval (AP)', 'Three-way match → exception only if out of tolerance → Finance → CFO by amount', 'Matched invoices bypass human approval entirely — the highest-value automation in the suite'],
    ['Asset Request', 'Manager → IT or Admin → Finance if capitalised', 'Assignment acknowledgement by the employee closes the instance']]

  },
  {
    kind: 'callout',
    tone: 'info',
    title: 'Same engine, different companies',
    text: 'ABC Transport may require a Fleet Head step on any vehicle-related purchase request, and ABC Technologies may skip Finance below 200,000. Neither needs code: both are rows in approval_rules and a published workflow version scoped to that company. This is the specific capability that makes company 51 an onboarding task rather than a project.'
  }]

}];