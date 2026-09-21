export type RoleKey = 'group-exec' | 'company-exec' | 'department-head' | 'employee';

export type StatusKey =
'draft' |
'pending' |
'approved' |
'rejected' |
'cancelled' |
'completed' |
'processing' |
'failed' |
'archived' |
'active' |
'inactive' |
'suspended' |
'on-leave' |
'low-stock' |
'out-of-stock';

export interface Company {
  id: string;
  name: string;
  short: string;
  sector: string;
  employees: number;
  revenue: number;
  expense: number;
  margin: number;
  status: StatusKey;
  modules: string[];
  enabledModules: ModuleKey[];
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  company: string;
  branch: string;
  status: StatusKey;
  email: string;
  phone: string;
  joined: string;
  manager: string;
  grade: string;
  location: string;
  baseSalary?: number;
  bankName?: string;
  bankAccount?: string;
  nid?: string;
  tin?: string;
}

export interface Invoice {
  id: string;
  party: string;
  company: string;
  type: 'Payable' | 'Receivable';
  issued: string;
  due: string;
  amount: number;
  balance: number;
  status: StatusKey;
}

export interface PurchaseRequest {
  id: string;
  title: string;
  requester: string;
  department: string;
  company: string;
  amount: number;
  created: string;
  stage: string;
  status: StatusKey;
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
}

export interface StockItem {
  id: string;
  product: string;
  sku: string;
  warehouse: string;
  available: number;
  reserved: number;
  incoming: number;
  reorder: number;
  value: number;
  status: StatusKey;
}

export interface AuditEvent {
  id: string;
  time: string;
  user: string;
  action: string;
  resource: string;
  company: string;
  ip: string;
  device: string;
  correlation: string;
  before?: string;
  after?: string;
}

export interface NotificationItem {
  id: string;
  category: 'Approvals' | 'HR' | 'Finance' | 'Operations' | 'System' | 'Security';
  title: string;
  meta: string;
  time: string;
  unread: boolean;
  tone: 'info' | 'success' | 'warning' | 'danger';
}

export interface ApprovalStep {
  label: string;
  actor: string;
  state: 'done' | 'current' | 'waiting' | 'rejected';
  time?: string;
  note?: string;
}

// ─── Issue #01: Multi-Level Organizational Hierarchy ──────────────────────────
// Represents the full ownership tree:
//   Group → LegalEntity → BusinessUnit → BranchPlant → Department → CostCenter

/** Top-level holding group that owns all legal entities. */
export interface OrgGroup {
  id: string;
  name: string;
  legalName: string;
  currency: string;
  incorporatedYear: number;
  companiesCount: number;
  countriesCount: number;
  employeesTotal: number;
}

/** A legally registered operating company (sister concern) within the group. */
export interface LegalEntity {
  id: string;
  groupId: string;
  name: string;
  short: string;
  legalRegNumber: string;
  sector: string;
  country: string;
  currency: string;
  employees: number;
  revenue: number;
  expense: number;
  margin: number;
  status: StatusKey;
  enabledModules: ModuleKey[];
  isSisterConcern: boolean;
  /** ID of the internal supplier/customer record used for inter-company transactions. */
  interCompanyCode?: string;
}

/** A logical business division within a legal entity (e.g. FMCG Division). */
export interface BusinessUnit {
  id: string;
  companyId: string;
  name: string;
  head: string;
  type: 'division' | 'segment' | 'vertical';
  employees: number;
  revenueShare: number; // percentage of company revenue
  status: StatusKey;
}

/** A physical or operational location of a company (Plant, Warehouse, Office, Sales Office). */
export interface BranchPlant {
  id: string;
  companyId: string;
  businessUnitId?: string;
  name: string;
  type: 'head-office' | 'plant' | 'warehouse' | 'sales-office' | 'depot' | 'branch';
  address: string;
  city: string;
  employees: number;
  status: StatusKey;
}

/** An administrative grouping of employees within a branch/company. */
export interface Department {
  id: string;
  companyId: string;
  branchId?: string;
  name: string;
  head: string;
  employees: number;
  parentDepartmentId?: string;
  status: StatusKey;
}

/** A financial tracking unit that collects costs and revenues.
 *  Every transaction should be tagged with a CostCenter. */
export interface CostCenter {
  id: string;
  companyId: string;
  departmentId?: string;
  branchId?: string;
  code: string;           // e.g. "CC-FOODS-PROC-001"
  name: string;
  type: 'operating' | 'administrative' | 'production' | 'shared-service';
  manager: string;
  annualBudget: number;
  consumedBudget: number;
  encumberedBudget: number; // committed in pending POs
  status: StatusKey;
}

/** A revenue-tracking unit (mirrors a CostCenter but tracks income). */
export interface ProfitCenter {
  id: string;
  companyId: string;
  businessUnitId?: string;
  code: string;           // e.g. "PC-FOODS-FMCG-001"
  name: string;
  manager: string;
  targetRevenue: number;
  actualRevenue: number;
  status: StatusKey;
}

/** All ERP module keys that can be toggled per legal entity. */
export type ModuleKey =
  | 'finance'
  | 'hr'
  | 'payroll'
  | 'procurement'
  | 'inventory'
  | 'manufacturing'
  | 'quality'
  | 'sales'
  | 'crm'
  | 'projects'
  | 'fleet'
  | 'assets'
  | 'maintenance'
  | 'retail-pos';

export const MODULE_METADATA: Record<
  ModuleKey,
  { label: string; description: string; category: 'Operations' | 'Finance' | 'People' | 'Commerce' }
> = {
  finance: { label: 'Finance & Accounting', description: 'General ledger, charts of accounts, financial reports, tax', category: 'Finance' },
  hr: { label: 'Human Resources', description: 'Employee lifecycle, attendance, leave management, shifts', category: 'People' },
  payroll: { label: 'Payroll & Compensation', description: 'Salary disbursements, deductions, tax withholding, payslips', category: 'Finance' },
  procurement: { label: 'Procurement & Purchasing', description: 'Purchase requisitions, vendor POs, RFQs, goods receipt', category: 'Operations' },
  inventory: { label: 'Inventory & Warehousing', description: 'Multi-warehouse stock, lot tracking, stock transfers, valuations', category: 'Operations' },
  manufacturing: { label: 'Manufacturing & Production', description: 'BOMs, work orders, routing, plant floor management', category: 'Operations' },
  quality: { label: 'Quality Assurance & QC', description: 'Inspection plans, quality certificates, non-conformance logs', category: 'Operations' },
  sales: { label: 'Sales & Distribution', description: 'Customer orders, delivery orders, invoicing, channel sales', category: 'Commerce' },
  crm: { label: 'CRM & Client Pipeline', description: 'Lead tracking, deal pipeline, client accounts, communications', category: 'Commerce' },
  projects: { label: 'Projects & Timesheets', description: 'Project milestones, task tracking, billable timesheets, deliverables', category: 'Operations' },
  fleet: { label: 'Fleet & Logistics', description: 'Vehicle register, route dispatch, fuel logs, driver tracking', category: 'Operations' },
  assets: { label: 'Fixed Assets Management', description: 'Asset register, depreciation schedules, maintenance logs', category: 'Operations' },
  maintenance: { label: 'Plant Maintenance', description: 'Preventative maintenance schedules, breakdown logs, work orders', category: 'Operations' },
  'retail-pos': { label: 'Retail Point-of-Sale (POS)', description: 'Store billing, cash drawer, retail barcode checkout, daily register', category: 'Commerce' },
};

// ─── Issue #02: ABAC Scoping & Company-Level Data Isolation ──────────────────

/**
 * Attribute-Based Access Control (ABAC) scope definition.
 * Restricts the entities, physical branches, departments, and financial
 * commitments a user is permitted to interact with.
 */
export interface UserScope {
  /** Array of permitted Company / LegalEntity IDs (e.g. ['c-foods', 'c-transport'] or ['*'] for Group-wide) */
  allowedCompanyIds: string[];
  /** Array of permitted Branch/Plant IDs (e.g. ['bp-foods-hq', 'bp-foods-savar'] or ['*'] for all branches) */
  allowedBranchIds: string[];
  /** Array of permitted Department IDs/Names (e.g. ['d-foods-fin', 'Finance'] or ['*'] for all departments) */
  allowedDepartmentIds: string[];
  /** Maximum financial approval authorization amount in BDT (0 for none, Infinity for Group CEO) */
  financialApprovalLimit: number;
}