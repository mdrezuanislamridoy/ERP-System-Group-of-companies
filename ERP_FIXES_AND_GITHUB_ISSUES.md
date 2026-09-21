# Okobiz Group ERP — Fixes, Architecture Roadmap & GitHub Issue Specification

> **Document Version:** 1.0.0  
> **Status:** Approved Architecture Roadmap  
> **Target System:** Okobiz Multi-Company Enterprise ERP Platform  
> **Repository:** `ERP-System-Okobiz`  

---

## Executive Summary

This document establishes the exhaustive gap analysis, architectural fixes, step-by-step implementation tasks, and copy-paste-ready GitHub issues required to transform the current prototype (`design/` & `architecture/`) into a **Tier-1 Group-Level Enterprise ERP System**.

---

## Roadmap Overview & Milestones

```
Phase 1: Foundation, Multi-Company & Org Hierarchy (Sprint 1-2)
  ├── Issue #01: Multi-Level Org Hierarchy Data Model
  ├── Issue #02: ABAC Scoping & Company Data Isolation
  ├── Issue #03: Field-Level Masking & Sensitive Data Protection
  └── Issue #04: Company-Specific Module & Feature Configuration

Phase 2: Financial Integrity & Double-Entry Ledger (Sprint 3-4)
  ├── Issue #05: General Ledger & Double-Entry Journal Engine
  ├── Issue #06: Immutability, Reversals & Fiscal Period Locking
  ├── Issue #07: Cost Center Budget Variance Control Engine
  └── Issue #08: Bank Reconciliation & Sub-Ledger Integration

Phase 3: Procurement Lifecycle & 3-Way Matching (Sprint 5-6)
  ├── Issue #09: RFQ & Supplier Quotation Comparison Matrix
  ├── Issue #10: Formal Purchase Order (PO) Lifecycle Management
  ├── Issue #11: Warehouse Goods Receipt Note (GRN) & QC Inspection
  └── Issue #12: Automated 3-Way Matching Engine (PO vs GRN vs Invoice)

Phase 4: Dynamic Workflow & Unified Approval Inbox (Sprint 7)
  ├── Issue #13: Unified Multi-Domain Approval Inbox
  ├── Issue #14: Dynamic Conditional Routing & Matrix Approvals
  └── Issue #15: Approval Delegation, SLA Escalations & Timeouts

Phase 5: Inventory States & Lot/Batch Valuation (Sprint 8)
  ├── Issue #16: Multi-Bin, Lot/Batch & Expiry Date Management
  ├── Issue #17: Granular Stock State Machine (On-Hand, Reserved, Damaged)
  └── Issue #18: Inter-Warehouse & Inter-Company Stock Transfers

Phase 6: Inter-Company Trading & Consolidation (Sprint 9)
  ├── Issue #19: Mirror Purchase/Sales Order & Inter-Company Invoicing
  └── Issue #20: Financial Consolidation & Elimination Journal Entries

Phase 7: Governance, Audit & Compliance (Sprint 10)
  ├── Issue #21: Tamper-Evident Deep State Diff Audit Trail
  └── Issue #22: Session Security, Device Management & Step-Up Auth
```

---

# Phase 1: Foundation, Multi-Company & Org Hierarchy

---

### Issue #01: Implement Multi-Level Organizational Hierarchy Data Model
- **Labels:** `epic:organization`, `backend:schema`, `frontend:ui`, `priority:critical`
- **Milestone:** Phase 1 — Foundation
- **Target Files:** `design/src/types/index.ts`, `design/src/data/organization.ts`, `design/src/pages/OrgChart.tsx`, `design/src/pages/Companies.tsx`

#### Problem Statement
Currently, `Company` in `design/src/types/index.ts` is a flat object without structural children. Sister concerns have plants, branches, business units, cost centers, and profit centers that cannot be represented.

#### Implementation Steps
1. In `types/index.ts`, define interfaces for `Group`, `LegalEntity`, `BusinessUnit`, `BranchPlant`, `Department`, `CostCenter`, and `ProfitCenter`.
2. Connect `CostCenter` and `ProfitCenter` with a foreign key to `BranchPlant` and `LegalEntity`.
3. Update `design/src/data/organization.ts` with mock data depicting Okobiz Group's tree structure (Holdings $\to$ Sister Concerns $\to$ Business Units $\to$ Factories/Branches $\to$ Departments $\to$ Cost Centers).
4. Refactor `design/src/pages/OrgChart.tsx` and `Companies.tsx` to render collapsible drill-down nodes from Group level down to Plant and Department levels.

#### GitHub Issue Card
```markdown
### Title: [ORG-01] Multi-Level Organizational Hierarchy Data Model & Drill-down UI

#### User Story
As a Group Executive / System Administrator, I want to define the full hierarchical structure of Okobiz (Holdings -> Legal Entity -> Business Unit -> Branch/Plant -> Department -> Cost Center) so all transactions and employees are scoped to exact operating entities.

#### Acceptance Criteria
- [ ] Schema defines: `Group`, `Company`, `BusinessUnit`, `BranchPlant`, `Department`, `CostCenter`, `ProfitCenter`.
- [ ] Parent-child relationships enforce entity scoping (a branch cannot exist without a company).
- [ ] Cost centers can be tagged as Operating, Administrative, or Production.
- [ ] Drill-down navigation works from Group Overview down to Branch/Department.
- [ ] Unit tests validate hierarchical integrity and prevent orphan records.
```

---

### Issue #02: Implement ABAC Scoping & Company-Level Data Isolation Engine
- **Labels:** `epic:security`, `backend:auth`, `frontend:shell`, `priority:critical`
- **Milestone:** Phase 1 — Foundation
- **Target Files:** `design/src/contexts/AuthContext.tsx`, `design/src/contexts/AppContext.tsx`, `design/src/components/shell/AppShell.tsx`

#### Problem Statement
Current security uses only 4 flat roles (`group-exec`, `company-exec`, `department-head`, `employee`). There is no data-level authorization (ABAC) preventing a company executive from reading another sister concern's financial and HR data.

#### Implementation Steps
1. Create `UserScope` interface containing `allowedCompanyIds: string[]`, `allowedBranchIds: string[]`, `allowedDepartmentIds: string[]`, `financialApprovalLimit: number`.
2. Introduce an `EntityScopeProvider` that filters any queried dataset (`employees`, `invoices`, `purchase_orders`, `reports`) based on the active user's scope.
3. Add a global Company/Branch Switcher dropdown in the Top Navigation Bar of `AppShell.tsx` for users possessing multi-company scopes.
4. If a user tries to access a URL with an entity outside their scope, display `Unauthorized.tsx` with detailed reason code.

#### GitHub Issue Card
```markdown
### Title: [SEC-02] ABAC Scoping & Company-Level Data Isolation Engine

#### User Story
As an IT Compliance Officer, I want strict company and branch-level data isolation so staff in "Okobiz Foods" cannot inspect or modify records belonging to "Okobiz Transport" unless explicitly granted Group-level cross-entity access.

#### Acceptance Criteria
- [ ] User context carries `allowedCompanyIds`, `allowedBranchIds`, and `departmentIds`.
- [ ] Global entity context switcher allows multi-entity users to switch active operating context.
- [ ] All table components and mock stores automatically filter data to match active scope.
- [ ] Direct route access to out-of-scope resources yields an 403 Forbidden with audit log.
```

---

### Issue #03: Implement Field-Level Masking for Sensitive HR & Financial Data
- **Labels:** `epic:security`, `frontend:ui`, `gdpr-compliance`, `priority:high`
- **Milestone:** Phase 1 — Foundation
- **Target Files:** `design/src/pages/EmployeeDetail.tsx`, `design/src/pages/Employees.tsx`, `design/src/components/common/SensitiveField.tsx`

#### Problem Statement
In `EmployeeDetail.tsx`, sensitive fields like base salary, personal bank account details, and National ID (NID) are rendered as plain text to anyone with `employee.read` permission.

#### Implementation Steps
1. Create a reusable component `SensitiveField.tsx` that masks text by default (e.g., `৳ ••••••••` or `••••-••••-1049`).
2. Add a permission check `sensitive.salary.read` or `sensitive.nid.read`.
3. Provide an "eye" icon button: clicking it requires confirming identity/reason, logs an audit event (`VIEW_SENSITIVE_FIELD`), and unmasks the value for 30 seconds.
4. Integrate `SensitiveField` across `EmployeeDetail.tsx`, `Employees.tsx`, and `Profile.tsx`.

#### GitHub Issue Card
```markdown
### Title: [SEC-03] Field-Level Masking & Authorization for Sensitive Data

#### User Story
As an HR Manager, I want sensitive personal data (Salary, Bank Account, NID) to be masked by default and require explicit elevated permission to view, logging every unmasking event to the audit trail.

#### Acceptance Criteria
- [ ] Sensitive compensation and identification fields render masked (`••••••••`).
- [ ] Clicking unmask verifies user permission (`sensitive.<domain>.read`).
- [ ] An immutable audit event is emitted whenever sensitive data is unmasked.
- [ ] Masking is applied in data export (CSV/PDF) unless privileged export permission is present.
```

---

### Issue #04: Implement Company-Specific Module & Feature Configuration Switcher
- **Labels:** `epic:organization`, `frontend:settings`, `priority:medium`
- **Milestone:** Phase 1 — Foundation
- **Target Files:** `design/src/pages/Settings.tsx`, `design/src/components/shell/Sidebar.tsx`, `design/src/data/directory.ts`

#### Problem Statement
Sister concerns have different business lines (e.g., Foods has Manufacturing & Quality; Transport has Fleet & Maintenance; IT has Projects & Timesheets). Currently, all sidebar links show up globally regardless of company business model.

#### Implementation Steps
1. In `types/index.ts`, add `enabledModules: ModuleKey[]` to `Company` model.
2. In `Sidebar.tsx`, filter navigation links by checking if the active company has the relevant module enabled (e.g., hiding `Manufacturing` for IT, hiding `Fleet` for Retail).
3. In `Settings.tsx`, provide a "Company Module Settings" tab where Group Admins can toggle modules on or off per legal entity.

#### GitHub Issue Card
```markdown
### Title: [ORG-04] Company-Specific Module & Feature Configuration Engine

#### User Story
As a Group IT Administrator, I want to enable or disable specific modules (e.g., Manufacturing, Fleet, Projects) per sister concern so users only see navigation and features relevant to their business model.

#### Acceptance Criteria
- [ ] Each Company record has a dynamic list of enabled modules.
- [ ] Sidebar navigation dynamically hides routes for disabled modules in the active company.
- [ ] Guarding routes returns 404/Feature Not Enabled if a URL of a disabled module is requested.
- [ ] Group Admin UI in Settings allows toggling modules per entity.
```

---

# Phase 2: Financial Integrity & Double-Entry Ledger

---

### Issue #05: Implement General Ledger (GL) & Double-Entry Journal Posting Engine
- **Labels:** `epic:finance`, `backend:ledger`, `accounting-standard`, `priority:critical`
- **Milestone:** Phase 2 — Finance & Accounting
- **Target Files:** `design/src/types/index.ts`, `design/src/pages/FinanceOverview.tsx`, `design/src/pages/ChartOfAccounts.tsx`, `design/src/data/finance.ts`

#### Problem Statement
Current finance only lists invoices and static accounts. There is no double-entry balance check (Debit = Credit), nor is there a Journal Entry entity or General Ledger calculation.

#### Implementation Steps
1. Define `JournalEntry`, `JournalLineItem` (`accountCode`, `costCenterId`, `debit`, `credit`, `description`), and `GeneralLedgerPosting`.
2. Build a balance validation rule: $\sum(\text{Debits}) == \sum(\text{Credits})$. Prevent any posting if unbalanced.
3. Add a "Create Manual Journal Entry" modal in `FinanceOverview.tsx`.
4. Connect Journal Postings to `ChartOfAccounts.tsx` to display live debit/credit movements and closing balances.

#### GitHub Issue Card
```markdown
### Title: [FIN-05] General Ledger (GL) & Double-Entry Journal Posting Engine

#### User Story
As a Chief Accountant / CFO, I want all transactions (invoices, expenses, payroll, transfers) to post as balanced double-entry journal vouchers so that financial statements remain mathematically balanced and audit-ready.

#### Acceptance Criteria
- [ ] System strictly enforces `Sum(Debits) == Sum(Credits)` before any journal voucher can be submitted.
- [ ] Line items must specify Account Code and Cost Center.
- [ ] General Ledger view displays Running Balance, Opening Balance, Debit, and Credit columns.
- [ ] Real-time Trial Balance dynamically calculates from posted journal entries.
```

---

### Issue #06: Enforce Financial Immutability, Reversals & Fiscal Period Closing
- **Labels:** `epic:finance`, `audit-compliance`, `priority:critical`
- **Milestone:** Phase 2 — Finance & Accounting
- **Target Files:** `design/src/pages/FinanceOverview.tsx`, `design/src/pages/Settings.tsx`

#### Problem Statement
Financial records can currently be modified or deleted without preserving an accounting trail, violating enterprise accounting standards (IFRS/GAAP).

#### Implementation Steps
1. Add `isPosted: boolean` and `lockedAt: string` to all financial vouchers.
2. In the UI, remove "Edit" and "Delete" buttons for any transaction with status `Posted`.
3. Introduce a "Reverse Journal Voucher" action that creates a mirror compensating entry referencing the original voucher ID.
4. Implement a "Fiscal Period Closing" screen where monthly/annual periods can be set to `Open`, `Soft Closed`, or `Hard Closed`. Disallow any posting to closed periods.

#### GitHub Issue Card
```markdown
### Title: [FIN-06] Financial Immutability, Reversal Vouchers & Period Closing

#### User Story
As a Group Financial Controller, I want posted transactions to be immutable (non-editable/non-deletable) and fiscal periods to be lockable to prevent unauthorized retro-active ledger tampering.

#### Acceptance Criteria
- [ ] Posted vouchers cannot be edited or deleted via UI or API.
- [ ] Corrections must be executed via an official Reverse Journal Entry.
- [ ] Fiscal periods (Month/Year) can be locked; transactions targeting closed periods are rejected.
- [ ] All reversal actions require a mandatory audit justification text.
```

---

### Issue #07: Implement Cost Center Budget Variance Control Engine
- **Labels:** `epic:finance`, `epic:procurement`, `priority:high`
- **Milestone:** Phase 2 — Finance & Accounting
- **Target Files:** `design/src/pages/PurchaseRequests.tsx`, `design/src/pages/FinanceOverview.tsx`

#### Problem Statement
Departments can submit purchase requests of any amount without validating whether the assigned Cost Center has sufficient remaining annual or monthly budget.

#### Implementation Steps
1. Create `Budget` model with fields: `costCenterId`, `fiscalYear`, `allocatedAmount`, `consumedAmount`, `encumberedAmount` (committed in pending POs).
2. When creating a Purchase Request in `PurchaseRequests.tsx`, calculate:
   $$\text{Available Budget} = \text{Allocated} - (\text{Consumed} + \text{Encumbered})$$
3. If requested amount exceeds available budget, display a warning card ("Budget Overrun: ৳ X") and automatically route the request to an escalation approval tier (e.g., Company CFO override).

#### GitHub Issue Card
```markdown
### Title: [FIN-07] Cost Center Budget Variance Control & Overrun Escalation

#### User Story
As a Department Head and Finance Director, I want purchase requests to be validated against active cost center budgets, automatically flagging budget overruns and escalating them for executive variance sign-off.

#### Acceptance Criteria
- [ ] Each Cost Center maintains Allocated, Committed (Encumbered), and Actual Consumed budget.
- [ ] Purchase Requests display live Cost Center budget headroom before submission.
- [ ] Requests exceeding budget trigger an automated "Budget Overrun" flag.
- [ ] Overrun requests require secondary CFO escalation approval before PO generation.
```

---

### Issue #08: Implement Bank Reconciliation & Sub-Ledger Integration
- **Labels:** `epic:finance`, `banking`, `priority:medium`
- **Milestone:** Phase 2 — Finance & Accounting
- **Target Files:** `design/src/pages/FinanceOverview.tsx`, `design/src/data/finance.ts`

#### Problem Statement
Cash & Bank ledgers are disconnected from external bank statements, making reconciliation of cleared vs outstanding checks/transfers impossible.

#### Implementation Steps
1. Create `BankStatement` and `BankTransaction` models.
2. Build a Reconciliation UI comparing internal Cash/Bank GL entries against imported bank statement lines.
3. Provide an automated matching algorithm based on date range, reference number, and amount, with a manual "Match" and "Unmatch" action.
4. Calculate and display "Reconciled Balance" vs "Ledger Balance".

#### GitHub Issue Card
```markdown
### Title: [FIN-08] Bank Reconciliation & Sub-Ledger Matching UI

#### User Story
As an Accounts Payable/Treasury Specialist, I want to import bank statements and match them against internal ledger disbursements so that outstanding checks and bank charges are reconciled promptly.

#### Acceptance Criteria
- [ ] UI allows uploading/viewing bank statement transaction lines.
- [ ] Auto-reconcile pairs GL vouchers with statement lines on exact match of reference and amount.
- [ ] Displays side-by-side reconciliation summary: Statement Balance, GL Balance, Unmatched Difference.
- [ ] Supports manual adjustment entries for bank charges and interest.
```

---

# Phase 3: Procurement Lifecycle & 3-Way Matching

---

### Issue #09: Implement RFQ & Supplier Quotation Comparison Matrix
- **Labels:** `epic:procurement`, `frontend:ui`, `priority:high`
- **Milestone:** Phase 3 — Sourcing & Supply Chain
- **Target Files:** `design/src/pages/Procurement.tsx`, `design/src/types/index.ts`

#### Problem Statement
Currently, Procurement jumps directly from a Purchase Request to approval without sourcing: Request for Quotation (RFQ), vendor bidding, and quote comparisons are missing.

#### Implementation Steps
1. Define interfaces `RFQ`, `SupplierQuote`, `QuoteItem` (unit price, delivery time, warranty, payment terms).
2. Build an "RFQ Management" tab in `Procurement.tsx`.
3. Create a "Quotation Comparison Matrix" view rendering suppliers side-by-side:
   - Green highlights for lowest bid
   - Delivery timeline comparisons
   - Supplier rating badges
4. Add a "Select Winning Supplier" action that carries winning prices forward to the Purchase Order.

#### GitHub Issue Card
```markdown
### Title: [PROC-09] RFQ & Supplier Quotation Comparison Matrix

#### User Story
As a Procurement Officer, I want to issue RFQs to multiple suppliers and compare their submitted bids in a side-by-side matrix (price, delivery terms, warranty) before awarding the purchase contract.

#### Acceptance Criteria
- [ ] Procurement can generate an RFQ linked to an approved Purchase Requisition.
- [ ] Ability to record multiple supplier quotation submissions.
- [ ] Comparison Matrix compares Unit Price, Total Cost, Delivery Days, and Vendor Rating.
- [ ] Selection of a winning vendor generates a pre-filled draft Purchase Order.
```

---

### Issue #10: Implement Formal Purchase Order (PO) Lifecycle Management
- **Labels:** `epic:procurement`, `backend:workflow`, `priority:critical`
- **Milestone:** Phase 3 — Sourcing & Supply Chain
- **Target Files:** `design/src/pages/Procurement.tsx`, `design/src/types/index.ts`

#### Problem Statement
There is no dedicated `PurchaseOrder` entity. Purchase Requests are being treated as POs, which confuses internal requisition with external legally-binding supplier contracts.

#### Implementation Steps
1. Define `PurchaseOrder` interface (`id`, `poNumber`, `supplierId`, `companyId`, `lines: POLine[]`, `subtotal`, `taxAmount`, `totalAmount`, `paymentTerms`, `status: 'Draft' | 'Issued' | 'Partially Received' | 'Completed' | 'Cancelled'`).
2. Build a "Purchase Orders" data table and printable formal PO document preview (PDF/Print ready with company logo and authorized signature blocks).
3. Connect PO status updates to warehouse goods arrival triggers.

#### GitHub Issue Card
```markdown
### Title: [PROC-10] Purchase Order (PO) Contract Generation & Lifecycle Tracking

#### User Story
As a Procurement Manager, I want to generate formal, numbered Purchase Orders from approved requisitions and track their status through supplier acknowledgment, shipment, and fulfillment.

#### Acceptance Criteria
- [ ] PO carries company legal entity header, supplier details, delivery address, and payment terms.
- [ ] PO lines include SKU, Description, Quantity, Unit Price, Tax, and Line Total.
- [ ] Formatted printable view for external supplier dispatch.
- [ ] Status transitions: `Draft` -> `Pending Approval` -> `Issued` -> `Partially Received` -> `Closed`.
```

---

### Issue #11: Implement Warehouse Goods Receipt Note (GRN) & QC Inspection
- **Labels:** `epic:inventory`, `epic:procurement`, `warehouse`, `priority:critical`
- **Milestone:** Phase 3 — Sourcing & Supply Chain
- **Target Files:** `design/src/pages/Inventory.tsx`, `design/src/types/index.ts`

#### Problem Statement
When goods arrive at a warehouse, there is no formal Goods Receipt Note (GRN) or Quality Control (QC) step. Inventory gets credited immediately without recording damaged or rejected goods.

#### Implementation Steps
1. Define `GoodsReceiptNote` and `QCInspection` models (`receivedQty`, `acceptedQty`, `rejectedQty`, `rejectionReason`, `batchNumber`, `inspectorName`).
2. Build a "Receive Goods against PO" modal in `Inventory.tsx`.
3. Enforce that only `acceptedQty` is moved to `Available` stock; `rejectedQty` is routed to `Quarantine / Return to Vendor`.
4. Emit an event updating the PO's fulfillment status.

#### GitHub Issue Card
```markdown
### Title: [INV-11] Goods Receipt Note (GRN) & Quality Control (QC) Inspection

#### User Story
As a Warehouse Receiving Specialist and Quality Inspector, I want to log physical goods arrival against a PO and record QC pass/fail quantities before stock is released for operations.

#### Acceptance Criteria
- [ ] GRN requires referencing an active issued Purchase Order.
- [ ] Line-by-line entry for Received, Passed QC, and Rejected quantities.
- [ ] Rejected stock automatically flags a Return-to-Vendor (RTV) ticket.
- [ ] Accepted stock directly updates warehouse On-Hand inventory.
```

---

### Issue #12: Implement Automated 3-Way Matching Engine (PO vs GRN vs Invoice)
- **Labels:** `epic:finance`, `epic:procurement`, `fraud-prevention`, `priority:critical`
- **Milestone:** Phase 3 — Sourcing & Supply Chain
- **Target Files:** `design/src/pages/Invoices.tsx`, `design/src/types/index.ts`, `design/src/components/finance/ThreeWayMatchCard.tsx`

#### Problem Statement
Accounts Payable can pay invoices without cross-verifying if the goods were actually ordered on a PO and received in a GRN. This is the #1 vector for duplicate or fraudulent payments.

#### Implementation Steps
1. In `types/index.ts`, update `Invoice` to include `poId`, `grnId`, and `matchStatus: 'Unmatched' | 'Matched' | 'Discrepancy' | 'Bypassed'`.
2. Create `ThreeWayMatchCard.tsx` displaying a 3-column comparative audit view:
   - Column 1: PO Line Qty & Agreed Price
   - Column 2: GRN Accepted Qty
   - Column 3: Supplier Billed Qty & Price
3. Compute variances:
   - If $\text{Billed Qty} > \text{GRN Accepted Qty}$, flag **Quantity Overbill**.
   - If $\text{Billed Unit Price} > \text{PO Unit Price}$, flag **Price Variance**.
4. In `Invoices.tsx`, restrict the "Approve for Payment" button: disabled unless status is `Matched` or an authorized override is signed.

#### GitHub Issue Card
```markdown
### Title: [FIN-12] Automated 3-Way Matching Engine (PO vs GRN vs Invoice)

#### User Story
As an Accounts Payable Controller, I want the system to automatically perform 3-Way Matching between the Purchase Order, Goods Receipt, and Supplier Invoice so that we never overpay or pay for unreceived goods.

#### Acceptance Criteria
- [ ] Invoice detail screen displays a visual 3-Way Match comparison card.
- [ ] Discrepancies in quantity or unit price (outside configurable 0.5% tolerance) trigger red warning badges.
- [ ] Mismatched invoices cannot be posted to Accounts Payable without an Executive Override.
- [ ] Matched invoices automatically calculate net payable after deductions and discounts.
```

---

# Phase 4: Dynamic Workflow & Unified Approval Inbox

---

### Issue #13: Implement Unified Multi-Domain Approval Inbox
- **Labels:** `epic:workflow`, `frontend:ui`, `priority:high`
- **Milestone:** Phase 4 — Workflow Platform
- **Target Files:** `design/src/pages/Approvals.tsx`, `design/src/data/operations.ts`

#### Problem Statement
Currently, `Approvals.tsx` only lists Purchase Requests. Approvers must navigate to separate screens for Leave approvals, Invoice sign-offs, Expense vouchers, and Budget variances.

#### Implementation Steps
1. Create a polymorphic `ApprovalItem` interface with types: `'purchase_request' | 'supplier_invoice' | 'leave_application' | 'payment_voucher' | 'budget_override' | 'journal_entry'`.
2. Add tabs in `Approvals.tsx`: "All Pending", "Procurement", "HR & Leaves", "Finance & Payments".
3. Provide one-click "Approve" and "Reject" buttons with quick comment modal.
4. Support bulk approvals for low-value requests ($< \text{৳ 20,000}$).

#### GitHub Issue Card
```markdown
### Title: [WF-13] Unified Multi-Domain Approval Inbox ("My Approvals")

#### User Story
As an Executive / Manager, I want a single unified inbox where I can review and approve all pending items across Procurement, Finance, HR, and Operations without switching modules.

#### Acceptance Criteria
- [ ] Unified inbox aggregates pending requests from all modules.
- [ ] Filterable by Domain (Procurement, HR, Finance, Operations) and Priority.
- [ ] Inline drawer shows full document preview, history, and approval notes.
- [ ] Multi-select bulk approval available for qualifying low-risk items.
```

---

### Issue #14: Implement Dynamic Conditional Workflow Routing Engine
- **Labels:** `epic:workflow`, `backend:engine`, `priority:critical`
- **Milestone:** Phase 4 — Workflow Platform
- **Target Files:** `design/src/pages/WorkflowBuilder.tsx`, `design/src/types/index.ts`

#### Problem Statement
Approval chains are currently static. There is no rule engine supporting conditional logic (e.g., routing based on amount thresholds, department heads, or company CFO).

#### Implementation Steps
1. In `types/index.ts`, define `WorkflowRule`:
   - `condition: { field: string; operator: '>' | '<' | '==' | 'in'; value: any }`
   - `approvers: { role: string; level: number; requiredSignatures: number }[]`
2. Implement workflow evaluation engine:
   - Tier 1: $\le \text{৳ 50,000} \implies \text{Department Head}$
   - Tier 2: $\text{৳ 50,000} - \text{৳ 5,00,000} \implies \text{Dept Head} \to \text{Finance Manager}$
   - Tier 3: $> \text{৳ 5,00,000} \implies \text{Dept Head} \to \text{Finance Manager} \to \text{Company CFO} \to \text{Group CFO}$
3. Update `WorkflowBuilder.tsx` to configure and preview these rule branches interactively.

#### GitHub Issue Card
```markdown
### Title: [WF-14] Dynamic Conditional Workflow Rule Engine

#### User Story
As a Systems Architect, I want configurable approval workflow rules based on amount thresholds, company, and department so that high-value transactions automatically escalate to executive management.

#### Acceptance Criteria
- [ ] Rule engine evaluates document payload against defined approval criteria.
- [ ] Supports sequential and parallel approval stages.
- [ ] Threshold-based dynamic routing escalates according to company policy.
- [ ] Workflow Builder visualizes the active path for any given simulation amount.
```

---

### Issue #15: Implement Approval Delegation, SLA Escalations & Timeouts
- **Labels:** `epic:workflow`, `background-jobs`, `priority:medium`
- **Milestone:** Phase 4 — Workflow Platform
- **Target Files:** `design/src/pages/Approvals.tsx`, `design/src/pages/ApprovalDetail.tsx`

#### Problem Statement
If an approver is on sick leave or travelling, documents get stuck indefinitely. There is no automated delegation or SLA timeout mechanism.

#### Implementation Steps
1. Add `DelegationRule` model (`originalApproverId`, `delegateeId`, `startDate`, `endDate`, `scope`).
2. Add SLA timer: if an approval sits pending for $> 48$ hours, automatically notify and escalate to the approver's direct manager.
3. In `ApprovalDetail.tsx`, display SLA countdown badge ("Expires in 18 hrs") and delegation banner if acted upon by a delegate.

#### GitHub Issue Card
```markdown
### Title: [WF-15] Approval Delegation & SLA Timeout Escalation

#### User Story
As an Employee / Manager, I want to delegate my approval authority to a colleague during absence and have pending requests escalate automatically if an approval SLA expires.

#### Acceptance Criteria
- [ ] Users can set a temporary delegation window with designated backup approver.
- [ ] Pending items display SLA timer badges based on urgency.
- [ ] System automatically escalates unhandled requests after SLA breach.
- [ ] Audit trail explicitly logs when an action was taken on behalf of another user.
```

---

# Phase 5: Inventory States & Lot/Batch Valuation

---

### Issue #16: Implement Multi-Bin, Lot/Batch & Expiry Date Management
- **Labels:** `epic:inventory`, `manufacturing`, `pharma-food`, `priority:high`
- **Milestone:** Phase 5 — Inventory & Logistics
- **Target Files:** `design/src/pages/Inventory.tsx`, `design/src/types/index.ts`

#### Problem Statement
For FMCG, Pharmaceuticals, or Food processing sister concerns (e.g., Okobiz Foods), products without lot/batch numbers and expiration dates cannot legally be distributed.

#### Implementation Steps
1. Add `ItemBatch` interface (`batchNumber`, `manufacturingDate`, `expiryDate`, `binLocation`, `quantityAvailable`, `qcReleaseNumber`).
2. Update `Inventory.tsx` with a "Batches & Expiry" sub-table.
3. Add color-coded expiry badges: Green ($> 90$ days), Amber ($30-90$ days), Red ($< 30$ days / Expired).
4. Restrict Goods Issue (GI) from dispatching expired batches (FEFO: First Expired, First Out).

#### GitHub Issue Card
```markdown
### Title: [INV-16] Multi-Bin, Lot/Batch & Expiry Date Tracking (FEFO)

#### User Story
As a Warehouse Manager in Food/Pharma concerns, I want to track goods by Lot/Batch number, Bin location, and Expiry date to maintain safety compliance and support FEFO stock rotation.

#### Acceptance Criteria
- [ ] Goods receipt prompts for Batch Number, Mfg Date, and Expiry Date for perishable items.
- [ ] Inventory dashboard highlights near-expiry and expired stock.
- [ ] System blocks dispatch of expired lots.
- [ ] Full batch recall traceability from supplier to customer dispatch.
```

---

### Issue #17: Granular Stock State Machine (On-Hand, Reserved, Damaged)
- **Labels:** `epic:inventory`, `state-machine`, `priority:high`
- **Milestone:** Phase 5 — Inventory & Logistics
- **Target Files:** `design/src/pages/Inventory.tsx`, `design/src/types/index.ts`

#### Problem Statement
`StockItem` only has three rough numbers. There is no clear segregation between stock physically on shelf vs stock committed to sales orders vs stock quarantined for damage.

#### Implementation Steps
1. Refactor inventory states:
   $$\text{Available to Promise (ATP)} = \text{Physical On-Hand} - (\text{Reserved for Orders} + \text{Quarantined/Damaged})$$
2. In `Inventory.tsx`, create interactive column breakdowns with pill badges for each state.
3. Provide a "Stock Adjustment / Scrap Voucher" modal to write off damaged stock with an automated GL posting ($\text{Dr. Inventory Write-Off Expense} / \text{Cr. Inventory}$).

#### GitHub Issue Card
```markdown
### Title: [INV-17] Granular Stock State Machine & Inventory Write-Off Vouchers

#### User Story
As an Inventory Controller, I want stock segregated into On-Hand, Allocated/Reserved, Quarantined, and In-Transit buckets to prevent double-selling and manage damaged stock write-offs.

#### Acceptance Criteria
- [ ] Distinct stock states: On Hand, Allocated, Quarantined, In Transit, and Available to Promise (ATP).
- [ ] Stock adjustment modal allows reclassifying stock (e.g., moving to Damaged/Scrap).
- [ ] Write-offs generate automatic adjustment journals to write-off expense accounts.
```

---

### Issue #18: Implement Inter-Warehouse & Inter-Company Stock Transfers
- **Labels:** `epic:inventory`, `logistics`, `priority:medium`
- **Milestone:** Phase 5 — Inventory & Logistics
- **Target Files:** `design/src/pages/Inventory.tsx`, `design/src/types/index.ts`

#### Problem Statement
Moving goods between factories or from central depot to regional branches is not currently modeled, leading to lost stock in transit.

#### Implementation Steps
1. Define `StockTransferOrder` (`sourceWarehouseId`, `destWarehouseId`, `shippedQty`, `receivedQty`, `status: 'Dispatched' | 'In-Transit' | 'Received' | 'Discrepancy'`).
2. Deduct inventory from Source immediately upon dispatch and place in `In-Transit` status.
3. Destination warehouse performs GRN; any difference is flagged as a transit shrinkage claim.

#### GitHub Issue Card
```markdown
### Title: [INV-18] Inter-Warehouse Stock Transfer Orders & Transit Tracking

#### User Story
As a Logistics Coordinator, I want to manage transfer orders between warehouses and plants with dedicated dispatch and receipt confirmation to eliminate in-transit stock leakage.

#### Acceptance Criteria
- [ ] Transfer order tracks Source Warehouse, Destination Warehouse, Carrier, and Tracking Info.
- [ ] Dispatched stock shifts to `In-Transit` state.
- [ ] Receiving warehouse confirms physical quantity; transit variances require mandatory incident notes.
```

---

# Phase 6: Inter-Company Trading & Consolidation

---

### Issue #19: Implement Inter-Company Auto-Mirroring (Sales Order <-> Purchase Order)
- **Labels:** `epic:inter-company`, `automation`, `priority:high`
- **Milestone:** Phase 6 — Inter-Company Operations
- **Target Files:** `design/src/pages/Procurement.tsx`, `design/src/pages/Invoices.tsx`

#### Problem Statement
When Okobiz Transport provides logistics services to Okobiz Foods, operators have to manually enter a Purchase Order in Foods and a Sales Order in Transport, resulting in duplicate effort and billing mismatches.

#### Implementation Steps
1. Tag companies with an `isSisterConcern: boolean` and linked Inter-Company Customer/Vendor codes.
2. When Company A issues a PO to Sister Company B:
   - System auto-generates a matched Sales Order in Company B.
3. When Company B issues a Sales Invoice:
   - System auto-generates a matching Supplier Invoice in Company A.

#### GitHub Issue Card
```markdown
### Title: [IC-19] Automated Inter-Company Order & Invoice Mirroring

#### User Story
As an Enterprise Operations Director, I want orders and invoices between sister companies to mirror automatically so that inter-company service delivery and billing require zero duplicate data entry.

#### Acceptance Criteria
- [ ] Internal PO issued to a sister concern automatically creates a Sales Order in the vendor company.
- [ ] Sales invoice generation automatically creates a draft Supplier Payable Invoice in the buying entity.
- [ ] Line items, rates, and reference numbers remain synchronized across entity boundaries.
```

---

### Issue #20: Implement Group Financial Consolidation & Elimination Journal Entries
- **Labels:** `epic:finance`, `epic:inter-company`, `reporting`, `priority:high`
- **Milestone:** Phase 6 — Inter-Company Operations
- **Target Files:** `design/src/pages/Reports.tsx`, `design/src/pages/FinanceOverview.tsx`

#### Problem Statement
Group financial reports currently aggregate sister concerns by simple sum. This falsely inflates group revenue and costs because internal sales between sister companies are counted twice.

#### Implementation Steps
1. In `Reports.tsx`, create a "Group Financial Consolidation" view.
2. Identify all inter-company receivables and payables between sister companies.
3. Automatically generate virtual **Elimination Journal Entries**:
   $$\text{Dr. Inter-Company Revenue} \quad / \quad \text{Cr. Inter-Company Cost of Goods}$$
4. Produce Consolidated Balance Sheet and Consolidated Profit & Loss statements compliant with group reporting standards.

#### GitHub Issue Card
```markdown
### Title: [IC-20] Group Financial Consolidation & Elimination Journal Entries

#### User Story
As the Group CFO, I want inter-company transactions automatically eliminated during group financial consolidation so our Consolidated P&L and Balance Sheet reflect true external performance.

#### Acceptance Criteria
- [ ] Consolidation workbench aggregates multi-company accounts into base group currency.
- [ ] Elimination rules identify and nullify internal sister company sales and purchases.
- [ ] Consolidated P&L displays: Individual Entities, Total Combined, Elimination Entries, and Consolidated Net.
```

---

# Phase 7: Governance, Audit & Compliance

---

### Issue #21: Implement Tamper-Evident Deep State Diff Audit Trail
- **Labels:** `epic:audit`, `security`, `compliance`, `priority:critical`
- **Milestone:** Phase 7 — Governance & Security
- **Target Files:** `design/src/pages/AuditLogs.tsx`, `design/src/types/index.ts`

#### Problem Statement
The current audit log records that an action occurred, but does not record what changed (the exact before-and-after payload diff), who approved it, or from what IP/device.

#### Implementation Steps
1. Update `AuditEvent` interface to include:
   - `beforeState: Record<string, any>`
   - `afterState: Record<string, any>`
   - `actor: { userId: string; role: string; ip: string; userAgent: string }`
   - `justificationReason?: string`
2. In `AuditLogs.tsx`, add an expandable JSON diff inspector (red for removed/changed values, green for new values).
3. Implement cryptographic hash chaining (each log entry contains the SHA-256 hash of the previous log entry) to detect log tampering.

#### GitHub Issue Card
```markdown
### Title: [AUD-21] Tamper-Evident Deep State Diff Audit Trail (Before vs After)

#### User Story
As an Internal Auditor / Security Officer, I want every state change on financial, HR, and procurement records to capture exact before-and-after diffs with cryptographic integrity verification.

#### Acceptance Criteria
- [ ] Audit records store complete Before and After snapshots of modified attributes.
- [ ] Audit log UI renders an interactive visual diff modal highlighting changed values.
- [ ] Logs capture User ID, Entity, IP Address, Device Fingerprint, and Timestamp.
- [ ] Audit records are read-only and protected against modification or deletion.
```

---

### Issue #22: Implement Session Security, Device Management & Step-Up Auth
- **Labels:** `epic:security`, `frontend:auth`, `priority:medium`
- **Milestone:** Phase 7 — Governance & Security
- **Target Files:** `design/src/pages/Settings.tsx`, `design/src/pages/Profile.tsx`, `design/src/contexts/AuthContext.tsx`

#### Problem Statement
Users have no visibility into active login sessions across devices, and there is no step-up verification when performing high-risk actions (such as initiating wire transfers or changing employee compensation).

#### Implementation Steps
1. Create `ActiveSession` interface (`sessionId`, `device`, `browser`, `ip`, `lastActive`, `isCurrent`).
2. Add "Active Sessions" section in `Profile.tsx` with a "Revoke All Other Sessions" action.
3. Introduce a `StepUpAuthModal` that prompts for password or OTP verification before executing sensitive actions (e.g., publishing payroll, resetting permissions).

#### GitHub Issue Card
```markdown
### Title: [SEC-22] Active Session Management & Step-Up Authentication

#### User Story
As an Enterprise User and Security Administrator, I want to manage active login sessions and be prompted for step-up authentication when performing high-risk financial and admin operations.

#### Acceptance Criteria
- [ ] Profile displays all active sessions with device name, location estimate, and last activity.
- [ ] Users can terminate individual or all other active sessions.
- [ ] High-risk operations (payroll disbursement, master permission change) trigger Step-Up Auth modal.
```

---

## Complete Implementation Schedule & Priority Matrix

| Issue # | Title | Epic | Priority | Estimated Story Points |
| :--- | :--- | :--- | :---: | :---: |
| **#01** | Multi-Level Org Hierarchy Data Model | Organization | Critical | 8 |
| **#02** | ABAC Scoping & Company Data Isolation | Security | Critical | 13 |
| **#03** | Field-Level Masking for Sensitive Data | Security | High | 5 |
| **#04** | Company-Specific Module Switcher | Organization | Medium | 5 |
| **#05** | General Ledger & Double-Entry Journal Engine | Finance | Critical | 13 |
| **#06** | Financial Immutability & Period Closing | Finance | Critical | 8 |
| **#07** | Cost Center Budget Variance Control Engine | Finance | High | 8 |
| **#08** | Bank Reconciliation & Sub-Ledger Matching | Finance | Medium | 8 |
| **#09** | RFQ & Supplier Quotation Comparison Matrix | Procurement | High | 8 |
| **#10** | Purchase Order (PO) Contract Lifecycle | Procurement | Critical | 8 |
| **#11** | Warehouse GRN & QC Inspection | Inventory | Critical | 8 |
| **#12** | Automated 3-Way Matching Engine | Finance/Procurement | Critical | 13 |
| **#13** | Unified Multi-Domain Approval Inbox | Workflow | High | 8 |
| **#14** | Dynamic Conditional Workflow Rule Engine | Workflow | Critical | 13 |
| **#15** | Approval Delegation & SLA Timeout Escalation | Workflow | Medium | 5 |
| **#16** | Multi-Bin, Lot/Batch & Expiry Tracking | Inventory | High | 8 |
| **#17** | Granular Stock State Machine & Write-Offs | Inventory | High | 8 |
| **#18** | Inter-Warehouse Stock Transfer Orders | Inventory | Medium | 5 |
| **#19** | Automated Inter-Company Order Mirroring | Inter-Company | High | 13 |
| **#20** | Group Financial Consolidation & Eliminations | Inter-Company | High | 13 |
| **#21** | Tamper-Evident Deep State Diff Audit Trail | Audit | Critical | 8 |
| **#22** | Active Session Security & Step-Up Auth | Security | Medium | 5 |
| **TOTAL** | **22 Enterprise Issues** | — | — | **184 Points** |

---

## How to Import These Issues into GitHub
1. Create a GitHub Project Board named **"Okobiz Group ERP - Enterprise Milestone"**.
2. Copy each markdown card block from Issues #01 to #22 above directly into a new GitHub Issue in the repository.
3. Assign the respective labels and milestone tags as defined in the metadata.
4. Execute sprint-by-sprint following the 7 phases outlined above.
