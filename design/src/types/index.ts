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

// ─── Issue #12: Automated 3-Way Matching Engine (PO vs GRN vs Invoice) ───────

export type InvoiceMatchStatus = 'Unmatched' | 'Matched' | 'Discrepancy' | 'Bypassed';

export interface InvoiceLine {
  id: string;
  /** Links this billed line back to the PO line it's being invoiced against. */
  poLineId?: string;
  sku: string;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
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
  /** Payable invoices sourced from procurement carry these for 3-way matching. */
  poId?: string;
  grnId?: string;
  matchStatus?: InvoiceMatchStatus;
  lines?: InvoiceLine[];
  discountAmount?: number;
  deductionAmount?: number;
  matchOverrideBy?: string;
  matchOverrideAt?: string;
  matchOverrideReason?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface ThreeWayMatchLine {
  poLineId: string;
  sku: string;
  description: string;
  unit: string;
  poQty: number;
  poUnitPrice: number;
  grnAcceptedQty: number;
  billedQty: number;
  billedUnitPrice: number;
  /** billedQty > grnAcceptedQty, outside tolerance. */
  quantityOverbill: boolean;
  /** billedUnitPrice > poUnitPrice, outside tolerance. */
  priceVariance: boolean;
}

export interface ThreeWayMatchResult {
  status: InvoiceMatchStatus;
  tolerancePct: number;
  lines: ThreeWayMatchLine[];
  /** Sum of min(billed, GRN-accepted) qty × min(billed, PO) unit price — what the match actually substantiates. */
  substantiatedAmount: number;
  /** substantiatedAmount − discounts − deductions. */
  netPayable: number;
}

// ─── Issue #05: General Ledger & Double-Entry Accounting Types ───────────────

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface ChartAccount {
  code: string;
  name: string;
  level: number;
  type: AccountType;
  openingBalance: number;
  debitMovement?: number;
  creditMovement?: number;
  closingBalance?: number;
  parentCode?: string;
  normalBalance?: 'debit' | 'credit';
}

export interface JournalLineItem {
  id: string;
  accountCode: string;
  accountName: string;
  costCenterId: string;
  costCenterCode: string;
  debit: number;
  credit: number;
  description: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  companyId: string;
  companyName: string;
  reference: string;
  type: 'standard' | 'adjusting' | 'closing' | 'reversing' | 'intercompany';
  status: 'posted' | 'draft' | 'reversed';
  memo: string;
  lines: JournalLineItem[];
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  createdAt: string;
  postedAt: string;
  /** Immutability flag — once true, this voucher can never be edited or deleted, only reversed. */
  isPosted: boolean;
  /** ISO timestamp the voucher became immutable. Set at the same moment it was posted. */
  lockedAt: string;
  /** Set on the ORIGINAL voucher once it has been reversed. */
  reversedByEntryId?: string;
  reversedByEntryNumber?: string;
  /** Set on the REVERSAL voucher, pointing back at the entry it compensates for. */
  reversalOfEntryId?: string;
  reversalOfEntryNumber?: string;
  /** Mandatory audit justification captured when a reversal is posted. */
  reversalReason?: string;
}

// ─── Issue #06: Fiscal Period Closing ─────────────────────────────────────────

export type FiscalPeriodStatus = 'open' | 'soft-closed' | 'hard-closed';

export interface FiscalPeriod {
  id: string;
  label: string;
  year: number;
  /** 1–12 */
  month: number;
  status: FiscalPeriodStatus;
  closedBy?: string;
  closedAt?: string;
}

export interface GeneralLedgerPosting {
  id: string;
  date: string;
  journalEntryId: string;
  journalEntryNumber: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  costCenterId: string;
  costCenterCode: string;
  companyId: string;
  companyName: string;
  debit: number;
  credit: number;
  runningBalance: number;
  description: string;
  reference: string;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  openingBalance: number;
  debitMovement: number;
  creditMovement: number;
  closingBalance: number;
  netDebit: number;
  netCredit: number;
}

// ─── Issue #08: Bank Reconciliation & Sub-Ledger Integration ─────────────────

/** From the BANK's point of view: 'credit' = money in, 'debit' = money out. */
export type BankTransactionDirection = 'credit' | 'debit';
export type BankTransactionStatus = 'unmatched' | 'matched';
export type BankMatchType = 'auto' | 'manual' | 'adjustment';

export interface BankTransaction {
  id: string;
  statementId: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
  direction: BankTransactionDirection;
  status: BankTransactionStatus;
  matchedJournalEntryId?: string;
  matchedJournalEntryNumber?: string;
  /** Stable key `${journalEntryId}::${journalLineId}` identifying the exact GL line this is matched to. */
  matchedLineKey?: string;
  matchType?: BankMatchType;
  matchedAt?: string;
  matchedBy?: string;
}

export interface BankStatement {
  id: string;
  companyId: string;
  companyName: string;
  bankName: string;
  accountNumberMasked: string;
  /** GL account this statement reconciles against, e.g. '1110' Cash & Cash Equivalents. */
  glAccountCode: string;
  periodLabel: string;
  openingBalance: number;
  /** Balance as reported by the bank — the "Statement Balance". */
  closingBalance: number;
  importedAt: string;
  importedBy: string;
  transactions: BankTransaction[];
}

/** A GL posting to the reconciled account, read directly off journalVouchers (not the display-oriented
 *  GeneralLedgerPosting, whose `id` shifts as new entries are added) — keyed stably for persistent matching. */
export interface ReconcilableLedgerLine {
  key: string;
  journalEntryId: string;
  journalEntryNumber: string;
  lineId: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  companyId: string;
  companyName: string;
}

export interface BankReconciliationSummary {
  statementBalance: number;
  ledgerBalance: number;
  reconciledBalance: number;
  unmatchedDifference: number;
  matchedCount: number;
  unmatchedStatementCount: number;
  unmatchedLedgerCount: number;
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
  /** Cost Center this request draws against — undefined for legacy/unbudgeted requests. */
  costCenterId?: string;
  costCenterCode?: string;
  /** Set true when `amount` exceeded the Cost Center's available headroom at submission time. */
  budgetOverrun?: boolean;
  /** How much `amount` exceeded available headroom by, when budgetOverrun is true. */
  overrunAmount?: number;
  /** Overrun requests are routed to an executive variance sign-off tier before a PO can be generated. */
  escalationRequired?: boolean;
  escalationApprovedBy?: string;
}

// ─── Issue #07: Cost Center Budget Variance Control ──────────────────────────
// The Budget model itself lives as annualBudget/consumedBudget/encumberedBudget
// fields directly on CostCenter (below) — this is the computed read-model used
// to render live headroom in the UI. Single-fiscal-year prototype: `fiscalYear`
// is informational only, sourced from the group's active calendar.

export interface CostCenterBudgetSnapshot {
  costCenterId: string;
  costCenterCode: string;
  costCenterName: string;
  fiscalYear: number;
  allocatedAmount: number;
  consumedAmount: number;
  encumberedAmount: number;
  /** allocatedAmount - (consumedAmount + encumberedAmount); may be negative once over budget. */
  availableAmount: number;
  utilizationPct: number;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  spend: number;
  orders: number;
  rating: number;
}

// ─── Issue #09: RFQ & Supplier Quotation Comparison Matrix ───────────────────

export interface RFQItem {
  id: string;
  product: string;
  sku: string;
  qty: number;
  unit: string;
  specification?: string;
}

export interface QuoteItem {
  rfqItemId: string;
  unitPrice: number;
  lineTotal: number;
}

export type RFQStatus = 'draft' | 'open' | 'closed' | 'awarded' | 'cancelled';
export type SupplierQuoteStatus = 'submitted' | 'selected' | 'rejected';

export interface SupplierQuote {
  id: string;
  rfqId: string;
  supplierName: string;
  submittedAt: string;
  items: QuoteItem[];
  totalAmount: number;
  deliveryDays: number;
  warrantyMonths: number;
  paymentTerms: string;
  status: SupplierQuoteStatus;
}

export interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  purchaseRequestId: string;
  companyId: string;
  companyName: string;
  department: string;
  issuedDate: string;
  dueDate: string;
  status: RFQStatus;
  items: RFQItem[];
  invitedSuppliers: string[];
  quotes: SupplierQuote[];
  winningSupplierName?: string;
  winningQuoteId?: string;
  awardedAt?: string;
  awardedBy?: string;
  generatedPurchaseOrderId?: string;
  createdBy: string;
}

// ─── Issue #10: Formal Purchase Order (PO) Lifecycle Management ──────────────
// A PurchaseOrder is a distinct, legally-binding external document — never to be
// confused with the internal PurchaseRequest that authorized it. It may be
// generated from an awarded RFQ (carrying the winning quote's prices forward)
// or raised directly against an approved Purchase Requisition.

export type POStatus = 'Draft' | 'Pending Approval' | 'Issued' | 'Partially Received' | 'Completed' | 'Cancelled';

export interface POLine {
  id: string;
  rfqItemId?: string;
  sku: string;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  taxRatePct: number;
  taxAmount: number;
  /** qty * unitPrice + taxAmount */
  lineTotal: number;
  /** Cumulative quantity received against this line so far — drives Partially Received / Completed. */
  qtyReceived: number;
}

export interface POStatusEvent {
  status: POStatus;
  at: string;
  by: string;
  note?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  rfqId?: string;
  purchaseRequestId?: string;
  supplierId: string;
  supplierName: string;
  companyId: string;
  companyName: string;
  deliveryAddress: string;
  lines: POLine[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentTerms: string;
  deliveryDays?: number;
  warrantyMonths?: number;
  status: POStatus;
  statusHistory: POStatusEvent[];
  createdAt: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  issuedAt?: string;
  closedAt?: string;
}

// ─── Issue #16: Multi-Bin, Lot/Batch & Expiry Date Management (FEFO) ──────────

export type BatchStatus = 'active' | 'quarantined' | 'recalled' | 'expired';

export interface ItemBatch {
  id: string;
  batchNumber: string;
  sku: string;
  product: string;
  warehouse: string;
  binLocation: string;
  manufacturingDate: string; // YYYY-MM-DD
  expiryDate: string;        // YYYY-MM-DD
  quantityAvailable: number;
  initialQuantity?: number;
  qcReleaseNumber: string;
  status: BatchStatus;
  companyId?: string;
  companyName?: string;
  supplierName?: string;
  poNumber?: string;
  grnNumber?: string;
}

// ─── Issue #17: Granular Stock State Machine ──────────────────────────────────
// ATP (Available to Promise) = Physical On-Hand - (Reserved for Orders + Quarantined/Damaged)

export interface StockItem {
  id: string;
  product: string;
  sku: string;
  warehouse: string;
  /** Physical units physically present in the warehouse shelves. */
  onHand: number;
  /** Committed to sales orders, active transfers, or production lines. */
  reserved: number;
  /** Received but failed QC, damaged during handling, or quarantined for audit. */
  quarantineQty: number;
  /** Dispatched and currently in transit between warehouses/plants. */
  inTransitQty: number;
  /** Available to Promise: onHand - (reserved + quarantineQty). */
  atp: number;
  /** Backwards-compatibility alias for atp. */
  available: number;
  /** Expected inbound from approved/issued purchase orders. */
  incoming: number;
  reorder: number;
  /** Unit of measure e.g. Bag, Drum, Roll, Unit */
  unit: string;
  /** Unit cost in BDT for inventory GL valuation. */
  unitCost: number;
  /** Total onHand valuation = onHand * unitCost. */
  value: number;
  status: StatusKey;
}

// ─── Issue #18: Inter-Warehouse & Inter-Company Stock Transfers ───────────────

export type TransferStatus = 'Draft' | 'Dispatched' | 'In-Transit' | 'Received' | 'Discrepancy' | 'Cancelled';

export interface StockTransferLine {
  id: string;
  sku: string;
  product: string;
  batchNumber?: string;
  shippedQty: number;
  receivedQty: number;
  unit: string;
  transitVariance: number; // shippedQty - receivedQty
}

export interface StockTransferOrder {
  id: string;
  transferNumber: string; // e.g. STO-2026-0001
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destWarehouseId: string;
  destWarehouseName: string;
  companyId: string;
  companyName: string;
  destCompanyId?: string;
  destCompanyName?: string;
  isInterCompany: boolean;
  carrier?: string;
  trackingNumber?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  lines: StockTransferLine[];
  status: TransferStatus;
  dispatchedAt?: string;
  dispatchedBy?: string;
  receivedAt?: string;
  receivedBy?: string;
  incidentNotes?: string;
  createdAt: string;
  createdBy: string;
}


// ─── Issue #11: Goods Receipt Note (GRN) & QC Inspection ─────────────────────
// A GRN records physical arrival against an issued PO; each line carries its own
// QCInspection verdict. Only `acceptedQty` ever reaches Available stock — `rejectedQty`
// is quarantined and automatically raises a Return-to-Vendor ticket.

export interface QCInspection {
  inspectorName: string;
  inspectedAt: string;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason?: string;
  batchNumber?: string;
}

export interface GRNLine {
  id: string;
  poLineId: string;
  sku: string;
  description: string;
  unit: string;
  qc: QCInspection;
}

export interface GoodsReceiptNote {
  id: string;
  grnNumber: string;
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  companyId: string;
  companyName: string;
  warehouse: string;
  lines: GRNLine[];
  receivedAt: string;
  receivedBy: string;
}

export type RTVStatus = 'open' | 'shipped-back' | 'resolved' | 'cancelled';

export interface ReturnToVendorTicket {
  id: string;
  rtvNumber: string;
  grnId: string;
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  companyId: string;
  companyName: string;
  sku: string;
  description: string;
  rejectedQty: number;
  unit: string;
  rejectionReason: string;
  batchNumber?: string;
  status: RTVStatus;
  createdAt: string;
  createdBy: string;
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

// ─── Issue #13: Unified Multi-Domain Approval Inbox ──────────────────────────

export type ApprovalItemType =
  | 'purchase_request'
  | 'supplier_invoice'
  | 'leave_application'
  | 'payment_voucher'
  | 'budget_override'
  | 'journal_entry';

export type ApprovalDomain = 'Procurement' | 'HR' | 'Finance' | 'Operations';

export interface ApprovalNote {
  author: string;
  at: string;
  text: string;
  decision?: 'approved' | 'rejected';
  /** Set when `author` acted under an active DelegationRule — who they were standing in for. */
  actingFor?: string;
}

/** A single polymorphic row in the unified inbox — a thin, read-only projection over the
 *  underlying domain record (PR, invoice, leave request, PO...), never the record itself. */
export interface ApprovalItem {
  id: string;
  type: ApprovalItemType;
  domain: ApprovalDomain;
  /** Id of the underlying domain record this item projects — what decision functions act on. */
  sourceId: string;
  title: string;
  subtitle: string;
  requester: string;
  company: string;
  companyId?: string;
  department?: string;
  amount?: number;
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  stage: string;
  /** Amount-based low-risk eligibility for multi-select bulk approval (issue's ৳20,000 threshold). */
  bulkEligible: boolean;
  history: ApprovalStep[];
  notes: ApprovalNote[];
  /** ISO timestamp the item actually entered the pending queue — the SLA clock's zero point. */
  submittedAt: string;
  /** SLA window in hours before this item auto-escalates (48h per policy). */
  slaHours: number;
  escalated: boolean;
  escalatedAt?: string;
  /** Name of the approver's direct manager this was escalated to. */
  escalatedTo?: string;
}

// ─── Issue #15: Approval Delegation, SLA Escalations & Timeouts ──────────────

export type DelegationScope = 'all' | ApprovalDomain;

export interface DelegationRule {
  id: string;
  originalApproverId: string;
  originalApproverName: string;
  delegateeId: string;
  delegateeName: string;
  /** ISO date (YYYY-MM-DD) — inclusive. */
  startDate: string;
  /** ISO date (YYYY-MM-DD) — inclusive. */
  endDate: string;
  scope: DelegationScope;
  reason?: string;
  createdAt: string;
  createdBy: string;
  /** Manually revoked before its natural end date. */
  revoked: boolean;
  revokedAt?: string;
}

// ─── Issue #14: Dynamic Conditional Workflow Routing Engine ──────────────────

export type WorkflowConditionField = 'amount' | 'company' | 'department';
export type WorkflowConditionOperator = '>' | '<' | '==' | 'in';

export interface WorkflowCondition {
  field: WorkflowConditionField;
  operator: WorkflowConditionOperator;
  value: number | string | string[];
}

export interface WorkflowApproverStage {
  role: string;
  /** Stages sharing a level run in parallel; the engine advances to the next level once every
   *  stage at the current level has collected its `requiredSignatures`. */
  level: number;
  requiredSignatures: number;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  /** ALL conditions must match (AND) for this rule to apply. */
  conditions: WorkflowCondition[];
  approvers: WorkflowApproverStage[];
  /** Lower evaluates first; the first rule whose conditions all match wins. */
  priority: number;
  enabled: boolean;
}

export interface WorkflowStageGroup {
  level: number;
  parallel: boolean;
  approvers: WorkflowApproverStage[];
}

export interface WorkflowEvaluationResult {
  matchedRule: WorkflowRule | null;
  stages: WorkflowStageGroup[];
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