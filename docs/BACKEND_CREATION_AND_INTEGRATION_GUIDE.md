# Okobiz Enterprise ERP — Backend Creation & Integration Blueprint
*Comprehensive Architecture, API Contract, Database Schema & Frontend Integration Guide for Group of Companies Multi-Entity ERP*

---

## Executive Summary & System Foundation

Okobiz Enterprise ERP is an enterprise-grade, multi-entity ERP built for conglomerates and groups of companies (modeled on **ABC Group of Companies**, Bangladesh). The system enforces:
1. **Multi-Tenancy & Deep Org Hierarchy**: Group &rarr; Legal Entity &rarr; Business Unit &rarr; Branch/Plant &rarr; Department &rarr; Cost Center.
2. **Attribute-Based Access Control (ABAC) with Cryptographic Company Isolation**: Cross-company access is blocked at the gateway with audit-logged violation codes (`ERR_ABAC_COMPANY_ISOLATION`).
3. **Unified Polymorphic Approval Engine**: Cross-domain approvals (Procurement, HR, Finance, Operations) with strict Segregation of Duties (SoD) and financial authorization limits.
4. **Double-Entry General Ledger with SHA-256 Tamper-Evident Hash Chaining**: Every financial and audit transaction is cryptographically linked.

### Technology Stack Mapping
| Layer | Technologies | Primary Path |
| :--- | :--- | :--- |
| **Backend API** | NestJS 10, TypeScript, Prisma ORM, PostgreSQL | `/backend/src/` |
| **Database** | PostgreSQL 15+, Prisma Schema | `/backend/prisma/schema.prisma` |
| **Frontend UI** | React 18, Vite, TypeScript, Tailwind CSS, Lucide | `/design/src/` |
| **API Client** | Typed Fetch Client, JWT Bearer, Context Injector | `/design/src/api/client.ts` |

---

## Cross-Cutting Core Architecture

### 1. Request Context & ABAC Security Pipeline
Every incoming API request passes through:
- **`JwtAuthGuard`**: Decodes JWT and validates expiration against revoked sessions.
- **`RequestContextInterceptor`**: Extracts `X-Organization-Id` and `X-Correlation-Id`, loading user assignments and computing active ABAC scope:
  ```typescript
  export interface UserScope {
    roleKey: string;
    level: 'GROUP' | 'COMPANY' | 'DEPARTMENT' | 'EMPLOYEE';
    activeCompanyId: string | null;
    activeOrgNodeId: string;
    allowedCompanyIds: string[];
    allowedOrgNodeIds: string[];
    maxApprovalAmount: number;
    canApproveAnyCompany: boolean;
  }
  ```
- **Standardized Response Envelope**:
  ```json
  {
    "data": { ... },
    "meta": {
      "correlationId": "req-1727181000-abc1234",
      "timestamp": "2026-09-24T12:00:00.000Z"
    }
  }
  ```
  And for errors:
  ```json
  {
    "error": {
      "code": "ERR_ABAC_COMPANY_ISOLATION",
      "message": "Access denied: You do not have permissions to action resources in ABC Transport Ltd.",
      "correlationId": "req-1727181000-abc1234"
    }
  }
  ```

---

# Section-by-Section Backend Creation & Integration

---

## SECTION 1: Organizations & Multi-Entity Hierarchy (`organizations`)

### 1.1 Overview & Purpose
Manages corporate structure for conglomerates. Allows defining legal entities (companies), operating business units, factories, branches, departments, and cost centers. Includes per-company module feature toggling and closure-table tree traversals.

### 1.2 Database Schema (`schema.prisma`)
```prisma
enum OrgType {
  GROUP
  LEGAL_ENTITY
  BUSINESS_UNIT
  BRANCH_PLANT
  DEPARTMENT
  COST_CENTER
  PROFIT_CENTER
  WAREHOUSE
  FACTORY
}

model Organization {
  id              String         @id @default(uuid())
  parentId        String?        @map("parent_id")
  companyId       String?        @map("company_id")
  type            OrgType        @default(DEPARTMENT)
  code            String         @db.VarChar(64)
  name            String         @db.VarChar(255)
  path            String         @default("")
  depth           Int            @default(0)
  status          String         @default("ACTIVE")
  currency        String?        @default("BDT") @db.VarChar(8)
  sector          String?        @db.VarChar(128)
  employeesCount  Int?           @default(0) @map("employees_count")
  revenue         Decimal?       @default(0) @db.Decimal(19, 4)
  expense         Decimal?       @default(0) @db.Decimal(19, 4)
  margin          Decimal?       @default(0) @db.Decimal(19, 4)
  metadata        Json?

  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")
  deletedAt       DateTime?      @map("deleted_at")

  parent          Organization?  @relation("OrgHierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  children        Organization[] @relation("OrgHierarchy")
  modules         CompanyModule[]
  assignments     UserRoleAssignment[]

  @@unique([parentId, code])
  @@index([companyId, type])
  @@index([parentId])
  @@map("organizations")
}

model CompanyModule {
  id          String       @id @default(uuid())
  companyId   String       @map("company_id")
  moduleKey   String       @map("module_key") @db.VarChar(64)
  status      String       @default("ACTIVE") // ACTIVE, INACTIVE
  settings    Json?
  createdAt   DateTime     @default(now()) @map("created_at")

  company     Organization @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, moduleKey])
  @@map("company_modules")
}
```

### 1.3 Backend REST Endpoints
| Verb | Endpoint | Permission Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/organizations/tree` | `org.read` | Returns full hierarchical tree with company roots and nested units |
| `GET` | `/api/v1/organizations/companies` | `org.read` | Returns legal entities with active modules & financials |
| `POST` | `/api/v1/organizations/companies` | `company.create` | Creates a new legal entity with auto-seeded modules |
| `PATCH`| `/api/v1/organizations/companies/:id` | `company.update` | Updates company details, sector, tax IDs, or status |
| `PUT`  | `/api/v1/organizations/companies/:id/modules` | `company.manage_modules` | Batch enable/disable modules per company |
| `POST` | `/api/v1/organizations/nodes` | `org.manage` | Creates a child unit (department, plant, cost center) |
| `PATCH`| `/api/v1/organizations/nodes/:id` | `org.manage` | Updates unit details or budget allocation |
| `DELETE`| `/api/v1/organizations/nodes/:id` | `org.manage` | Soft-deletes / archives an org unit |

#### Sample Request Body: Create Company
```json
{
  "name": "ABC Agro Industries Ltd.",
  "code": "ABC-AGRO",
  "legalName": "ABC Agro Industries Limited",
  "sector": "Agro Processing & Feeds",
  "currency": "BDT",
  "taxId": "91823019284",
  "binNumber": "001928374-0101",
  "incorporatedYear": 2026,
  "modules": ["procurement", "inventory", "finance", "hr"]
}
```

### 1.4 Frontend Integration
- **UI Pages & Modals**:
  - `design/src/pages/Companies.tsx`: Company directory, financial KPI cards, status chips.
  - `design/src/pages/OrgChart.tsx`: Tree visualizer of parent-child relationships.
  - `design/src/components/organization/CreateCompanyModal.tsx`: Creation modal with form validation.
  - `design/src/components/organization/ManageCompanyModal.tsx`: Module switcher and settings editor.
  - `design/src/components/organization/CreateOrgUnitModal.tsx`: Department / Plant creation modal.
- **API Client Call (`design/src/api/client.ts`)**:
  ```typescript
  import { orgApi } from '../api/client';
  
  // Fetching companies:
  const companies = await orgApi.getCompanies();
  
  // Creating company:
  const newCompany = await orgApi.createCompany({
    name: 'ABC Logistics Ltd.',
    code: 'ABC-LOG',
    sector: 'Supply Chain & Freight',
    currency: 'BDT',
    modules: ['procurement', 'inventory', 'finance']
  });
  ```

---

## SECTION 2: Identity, IAM & Authentication (`auth` & `iam`)

### 2.1 Overview & Purpose
Secures the platform using bcrypt password hashing, dual-token JWT authentication (access + refresh), session tracking, MFA readiness, and role assignment mapping with multi-level scope modes:
- `SELF`: Own profile & private tasks.
- `NODE`: Only the assigned department / unit.
- `SUBTREE`: Assigned node + all child departments / plants.
- `CROSS`: Multi-company or cross-group visibility (Executive / Auditor).

### 2.2 Database Schema (`schema.prisma`)
```prisma
model Person {
  id          String   @id @default(uuid())
  firstName   String   @map("first_name") @db.VarChar(128)
  lastName    String   @map("last_name") @db.VarChar(128)
  email       String   @unique @db.VarChar(255)
  phone       String?  @db.VarChar(32)
  nationalId  String?  @map("national_id") @db.VarChar(64)
  taxId       String?  @map("tax_id") @db.VarChar(64)
  baseSalary  Decimal? @map("base_salary") @db.Decimal(19, 4)
  bankAccount String?  @map("bank_account") @db.VarChar(64)
  bankName    String?  @map("bank_name") @db.VarChar(128)
  employeeNo  String?  @map("employee_no") @db.VarChar(64)
  user        User?
  @@map("persons")
}

model User {
  id                 String               @id @default(uuid())
  personId           String               @unique @map("person_id")
  employeeId         String?              @unique @map("employee_id") @db.VarChar(64)
  email              String               @unique @db.VarChar(255)
  passwordHash       String               @map("password_hash")
  status             String               @default("ACTIVE") // ACTIVE, SUSPENDED, INACTIVE
  person             Person               @relation(fields: [personId], references: [id], onDelete: Cascade)
  assignments        UserRoleAssignment[]
  sessions           Session[]
  @@map("users")
}

model UserRoleAssignment {
  id             String       @id @default(uuid())
  userId         String       @map("user_id")
  roleId         String       @map("role_id")
  organizationId String       @map("organization_id")
  companyId      String?      @map("company_id")
  scopeMode      ScopeMode    @default(SUBTREE) @map("scope_mode")
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  role           Role         @relation(fields: [roleId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  @@map("user_role_assignments")
}
```

### 2.3 Backend REST Endpoints
| Verb | Endpoint | Guard | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | Authenticates via `employeeId` / password; returns tokens + scope |
| `POST` | `/api/v1/auth/refresh`| Public | Exchanges valid refresh token for a fresh access token |
| `POST` | `/api/v1/auth/switch-context`| `JwtAuthGuard` | Switches active company/org node without re-login |
| `POST` | `/api/v1/auth/logout` | `JwtAuthGuard` | Revokes current session & refreshes session table |
| `GET`  | `/api/v1/auth/me` | `JwtAuthGuard` | Returns authenticated user profile, assignments, and permissions |
| `GET`  | `/api/v1/iam/users` | `RequirePermissions('iam.users.read')` | Lists users scoped to caller's allowed organizations |
| `POST` | `/api/v1/iam/users` | `RequirePermissions('iam.users.create')`| Onboards new employee + creates person, user, role assignment |
| `GET`  | `/api/v1/iam/roles` | `RequirePermissions('iam.roles.read')` | Lists defined roles and associated permission keys |

#### Sample Response: Login Payload
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "7f8b9a12-...",
  "user": {
    "id": "u-rahim-10241",
    "employeeId": "EMP-10241",
    "email": "rahim.ahmed@abcgroup.com",
    "name": "Rahim Ahmed",
    "status": "ACTIVE"
  },
  "activeAssignment": {
    "id": "ura-001",
    "roleKey": "finance-manager",
    "roleName": "Finance Manager",
    "organizationId": "org-foods-fin-hq",
    "organizationName": "Finance Department",
    "companyId": "c-foods",
    "title": "Senior Finance Manager"
  },
  "permissions": [
    "org.read",
    "finance.gl.read",
    "finance.gl.post",
    "procurement.pr.read",
    "pr.approve",
    "employee.read"
  ]
}
```

### 2.4 Frontend Integration
- **UI Pages**: `design/src/pages/Login.tsx`, `IAM.tsx`, `Employees.tsx`, `EmployeeDetail.tsx`, `Profile.tsx`.
- **State Context (`AuthContext.tsx`)**:
  - Automatically stores tokens in `localStorage`.
  - Injects `X-Organization-Id` for active context switcher in the top navigation bar.
  - Automatically redirects on `401 Unauthorized` or token expiry.

---

## SECTION 3: Human Resources & Employee Workflows (`hr`)

### 3.1 Overview & Purpose
Empowers employee self-service while enforcing structured HR governance:
1. **Leave Applications**: Balance checks (Annual, Casual, Sick), date validations, backup person handover, manager approval pipeline.
2. **Expense Claims & Reimbursements**: Multi-category claims (Travel, Entertainment, Supplies), receipt tracking, cost center encumbrance, dual manager + finance sign-offs.
3. **Attendance Regularization & Duty Travel**: Resolves missed biometric punches, on-site supplier/client visits, and remote authorization.

### 3.2 Data Contracts & State Storage (`design/src/data/employeeWorkflows.ts`)
```typescript
export interface ExpenseClaim {
  id: string;
  claimNumber: string;
  employeeId: string;
  employeeName: string;
  company: string;
  department: string;
  title: string;
  category: 'Travel & Lodging' | 'Meals & Entertainment' | 'Office Supplies' | 'Client Meeting' | 'Medical & Wellness' | 'Training & Certification';
  amount: number;
  currency: string;
  expenseDate: string;
  costCenter: string;
  description: string;
  receiptName?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
}

export interface AttendanceRegularization {
  id: string;
  employeeId: string;
  employeeName: string;
  company: string;
  department: string;
  date: string;
  requestType: 'Missed Biometric Punch' | 'Client On-Site Duty' | 'Overtime Work Pre-auth' | 'Remote / Work From Home';
  checkInTime?: string;
  checkOutTime?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  decidedBy?: string;
}
```

### 3.3 Backend REST Endpoints to Implement
| Verb | Endpoint | Permission Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/hr/leave-requests` | `employee.read` | Returns scoped leave applications |
| `POST` | `/api/v1/hr/leave-requests` | `self.read` | Submits leave application & triggers approval workflow |
| `POST` | `/api/v1/hr/leave-requests/:id/decide` | `employee.update` / `pr.approve` | Approves or rejects leave with decision note |
| `GET` | `/api/v1/hr/expense-claims` | `employee.read` | Scoped employee expense claims |
| `POST` | `/api/v1/hr/expense-claims` | `self.read` | Submits reimbursement claim with receipt |
| `POST` | `/api/v1/hr/expense-claims/:id/decide` | `invoice.approve` / `pr.approve` | Approves or rejects reimbursement claim |
| `GET` | `/api/v1/hr/regularizations` | `employee.read` | Scoped attendance regularization records |
| `POST` | `/api/v1/hr/regularizations` | `self.read` | Submits punch regularization / duty travel request |

#### Sample Leave Application Request
```json
{
  "type": "Annual Leave",
  "from": "2026-10-02",
  "to": "2026-10-06",
  "days": 4,
  "backupPerson": "Karim Chowdhury",
  "reason": "Family relocation and personal matters"
}
```

### 3.4 Frontend Integration
- **UI Pages & Modals**:
  - `design/src/pages/HR.tsx`: Attendance live overview, leave pipeline, live approve/reject buttons, filter by department.
  - `design/src/pages/MyWorkspace.tsx`: Employee self-service dashboard, live my requests, leave balance cards.
  - `design/src/components/hr/ApplyLeaveModal.tsx`: Leave application with real-time day counter & backup colleague selector.
  - `design/src/components/hr/SubmitExpenseClaimModal.tsx`: Expense claim modal with cost center selector and receipt attachment.
  - `design/src/components/hr/RegularizeAttendanceModal.tsx`: Biometric punch correction & on-duty client visit modal.

---

## SECTION 4: Unified Approvals & Workflows Engine (`workflows`)

### 4.1 Overview & Purpose
A polymorphic approval hub that centralizes pending authorization items across all company modules:
- Procurement: Purchase Requests (`purchase_request`), Budget Overrides (`budget_override`).
- Finance: Supplier Invoices (`supplier_invoice`), Payment Vouchers (`payment_voucher`), Journal Entries (`journal_entry`).
- HR & Workforce: Leave Applications (`leave_application`), Expense Claims (`expense_claim`), Regularizations (`regularization_request`).
- Governance: 48h SLA clocks, auto-escalation to supervisor, delegation rules ("Acting for"), and Segregation of Duties.

### 4.2 Database Schema (`schema.prisma`)
```prisma
model WorkflowDefinition {
  id           String             @id @default(uuid())
  companyId    String?            @map("company_id")
  documentType String             @map("document_type") @db.VarChar(64)
  name         String             @db.VarChar(128)
  status       String             @default("PUBLISHED")
  instances    WorkflowInstance[]
  @@map("workflow_definitions")
}

model WorkflowInstance {
  id           String             @id @default(uuid())
  definitionId String             @map("definition_id")
  companyId    String             @map("company_id")
  documentType String             @map("document_type") @db.VarChar(64)
  documentId   String             @map("document_id")
  status       String             @default("IN_PROGRESS") // IN_PROGRESS, APPROVED, REJECTED
  definition   WorkflowDefinition @relation(fields: [definitionId], references: [id])
  tasks        WorkflowTask[]
  @@index([companyId, status])
  @@index([documentType, documentId])
  @@map("workflow_instances")
}

model WorkflowTask {
  id             String           @id @default(uuid())
  instanceId     String           @map("instance_id")
  stepNumber     Int              @default(1) @map("step_number")
  stepName       String           @map("step_name") @db.VarChar(128)
  assigneeUserId String?          @map("assignee_user_id")
  status         String           @default("PENDING") // PENDING, APPROVED, REJECTED, SKIPPED
  comments       String?          @db.Text
  dueAt          DateTime?        @map("due_at")
  actionedAt     DateTime?        @map("actioned_at")
  instance       WorkflowInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  assignee       User?            @relation(fields: [assigneeUserId], references: [id])
  @@index([assigneeUserId, status])
  @@map("workflow_tasks")
}
```

### 4.3 Backend REST Endpoints
| Verb | Endpoint | Permission Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/approvals/inbox` | `JwtAuthGuard` | Retrieves polymorphic tasks assigned to caller with SLA status |
| `POST` | `/api/v1/approvals/tasks/:taskId/action` | `pr.approve` / `invoice.approve` | Decides task (`APPROVE` / `REJECT`) with comments |
| `POST` | `/api/v1/approvals/bulk-action` | `pr.approve` | Bulk decision on low-risk eligible items (< ৳20,000) |
| `POST` | `/api/v1/approvals/delegations` | `JwtAuthGuard` | Creates an active delegation rule for out-of-office coverage |
| `DELETE`| `/api/v1/approvals/delegations/:id` | `JwtAuthGuard` | Revokes an existing delegation rule |

#### Segregation of Duties (SoD) & Financial Enforcement in `workflows.service.ts`:
```typescript
// Enforce Segregation of Duties (SoD): Requester cannot approve their own item
this.abacPolicy.assertSegregationOfDuties(callerUserId, document.requesterId, document.number);

// Enforce Financial Threshold on Approvals
if (action === 'APPROVE') {
  this.abacPolicy.assertFinancialApprovalLimit(ctx.scope, Number(document.amount), `Document ${document.number}`);
}
```

### 4.4 Frontend Integration
- **UI Pages & Components**:
  - `design/src/pages/Approvals.tsx`: Multi-tab inbox (All, Procurement, HR, Finance, Delegated), bulk selection bar, inline slide-over drawer.
  - `design/src/pages/ApprovalDetail.tsx`: Dedicated full-page view with step-by-step history, SoD badges, SLA badge, and notes.
  - `design/src/components/ApprovalDecisionModal.tsx`: Confirmation modal with mandatory comments on rejection.
  - `design/src/components/DelegationModal.tsx`: Delegation modal setting date ranges and domain scope.
- **Frontend Projection Store**: `getApprovalInbox()` in `design/src/data/operations.ts` combines PRs, Invoices, Leaves, Claims, and Regularizations into a unified schema.

---

## SECTION 5: Procurement & Supplier Management (`procurement`)

### 5.1 Overview & Purpose
Handles the complete procure-to-pay pipeline for raw materials, machinery, packaging, and services across all factories and branches.
- Purchase Requests (PR): Departmental requisition, budget check, multi-tier approvals.
- Request for Quotation (RFQ) & Supplier Quotes: Comparing supplier pricing and lead times.
- Purchase Orders (PO): Formal contracts with versioning, delivery schedules, and payment terms.
- Three-Way Matching: Verifies PO &rarr; Goods Receipt Note (GRN) &rarr; Supplier Invoice before payment voucher disbursement.

### 5.2 Database Schema (`schema.prisma`)
```prisma
model Party {
  id          String          @id @default(uuid())
  type        String          @db.VarChar(32) // CUSTOMER, SUPPLIER, BOTH
  code        String          @unique @db.VarChar(64)
  legalName   String          @map("legal_name") @db.VarChar(255)
  taxId       String?         @map("tax_id") @db.VarChar(64)
  status      String          @default("ACTIVE")
  orders      PurchaseOrder[]
  @@map("parties")
}

model PurchaseRequest {
  id                 String    @id @default(uuid())
  number             String    @db.VarChar(64)
  companyId          String    @map("company_id")
  departmentId       String?   @map("department_id")
  title              String    @db.VarChar(255)
  requesterId        String?   @map("requester_id")
  amount             Decimal   @db.Decimal(19, 4)
  priority           String    @default("NORMAL") // LOW, NORMAL, HIGH, CRITICAL
  stage              String    @default("REVIEW")
  status             String    @default("PENDING") // PENDING, APPROVED, REJECTED
  workflowInstanceId String?   @map("workflow_instance_id")
  createdAt          DateTime  @default(now()) @map("created_at")
  @@unique([companyId, number])
  @@index([companyId, status])
  @@map("purchase_requests")
}

model PurchaseOrder {
  id          String              @id @default(uuid())
  number      String              @db.VarChar(64)
  companyId   String              @map("company_id")
  supplierId  String              @map("supplier_id")
  totalAmount Decimal             @map("total_amount") @db.Decimal(19, 4)
  currency    String              @default("BDT") @db.VarChar(8)
  status      String              @default("DRAFT") // DRAFT, ISSUED, PARTIALLY_RECEIVED, COMPLETED
  version     Int                 @default(1)
  supplier    Party               @relation(fields: [supplierId], references: [id])
  lines       PurchaseOrderLine[]
  @@unique([companyId, number])
  @@map("purchase_orders")
}

model PurchaseOrderLine {
  id              String        @id @default(uuid())
  purchaseOrderId String        @map("purchase_order_id")
  itemDescription String        @map("item_description") @db.VarChar(255)
  quantity        Decimal       @db.Decimal(19, 4)
  unitPrice       Decimal       @map("unit_price") @db.Decimal(19, 4)
  lineTotal       Decimal       @map("line_total") @db.Decimal(19, 4)
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  @@map("purchase_order_lines")
}
```

### 5.3 Backend REST Endpoints
| Verb | Endpoint | Permission Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/procurement/requests` | `pr.read` | Lists scoped purchase requests |
| `POST` | `/api/v1/procurement/requests` | `pr.create` | Submits new PR with sequential number & initiates workflow |
| `GET` | `/api/v1/procurement/orders` | `po.read` | Lists company purchase orders |
| `POST` | `/api/v1/procurement/orders` | `po.create` | Generates official PO from approved PR or direct RFQ award |
| `GET` | `/api/v1/procurement/suppliers` | `supplier.read` | Lists registered vendors & compliance standings |

#### Sample Create PR Request Body
```json
{
  "companyId": "c-foods",
  "title": "Industrial Boiler Water Treatment Chemicals — Q4",
  "amount": 420000,
  "priority": "HIGH",
  "departmentId": "org-foods-plant-savar",
  "costCenterId": "cc-foods-prod-001"
}
```

### 5.4 Frontend Integration
- **UI Pages**:
  - `design/src/pages/Procurement.tsx`: RFQs, Active POs, Supplier list, and 3-way matching view.
  - `design/src/pages/PurchaseRequests.tsx`: Requisition list with status badges and create action.
- **Data Store**: `design/src/data/operations.ts` (`purchaseRequests`, `purchaseOrders`, `rfqs`).

---

## SECTION 6: Inventory & Multi-Warehouse Stock Management (`inventory`)

### 6.1 Overview & Purpose
Controls physical and virtual goods across factories, cold stores, and central distribution centers.
- Immutable Double-Entry Stock Ledger: Every physical movement (receipt, issue, transfer, write-off) writes an append-only row to `StockLedger`.
- Real-Time Balance Aggregation: `available = sum(qty) - reserved`.
- Stock Transfer Orders (STO): Inter-warehouse and inter-company stock transfers with transit verification.

### 6.2 Database Schema (`schema.prisma`)
```prisma
model StockItem {
  id           String        @id @default(uuid())
  companyId    String        @map("company_id")
  warehouseId  String?       @map("warehouse_id")
  sku          String        @db.VarChar(64)
  product      String        @db.VarChar(255)
  available    Decimal       @default(0) @db.Decimal(19, 4)
  reserved     Decimal       @default(0) @db.Decimal(19, 4)
  incoming     Decimal       @default(0) @db.Decimal(19, 4)
  reorderPoint Decimal       @default(0) @map("reorder_point") @db.Decimal(19, 4)
  unitCost     Decimal       @default(0) @map("unit_cost") @db.Decimal(19, 4)
  totalValue   Decimal       @default(0) @map("total_value") @db.Decimal(19, 4)
  status       String        @default("ACTIVE")
  movements    StockLedger[]
  @@unique([companyId, sku])
  @@index([companyId, warehouseId])
  @@map("stock_items")
}

model StockLedger {
  id          String    @id @default(uuid())
  companyId   String    @map("company_id")
  warehouseId String    @map("warehouse_id")
  itemId      String    @map("item_id")
  qty         Decimal   @db.Decimal(19, 4) // Positive = Inward, Negative = Outward
  unitCost    Decimal   @map("unit_cost") @db.Decimal(19, 4)
  totalValue  Decimal   @map("total_value") @db.Decimal(19, 4)
  refModule   String    @map("ref_module") @db.VarChar(64) // GRN, STO, DISPATCH, ADJUSTMENT
  refId       String    @map("ref_id")
  postedAt    DateTime  @default(now()) @map("posted_at")
  item        StockItem @relation(fields: [itemId], references: [id], onDelete: Restrict)
  @@index([companyId, itemId, postedAt])
  @@map("stock_ledger")
}
```

### 6.3 Backend REST Endpoints
| Verb | Endpoint | Permission Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/inventory/stock` | `inventory.stock.read` | Scoped stock list with reorder alerts and valuation |
| `GET` | `/api/v1/inventory/ledger/:itemId` | `inventory.stock.read` | Full audit trail of ledger entries for a SKU |
| `POST` | `/api/v1/inventory/transfers` | `inventory.transfer.create` | Initiates Stock Transfer Order (STO) |
| `POST` | `/api/v1/inventory/adjustments` | `inventory.stock.adjust` | Records stock count adjustment with reason & GL post |

### 6.4 Frontend Integration
- **UI Page**: `design/src/pages/Inventory.tsx` (Stock on hand, Low stock warnings, Batch management, STO table).
- **Data Store**: `design/src/data/operations.ts` (`stockItems`, `stockTransferOrders`).

---

## SECTION 7: Financial Accounting & General Ledger (`finance`)

### 7.1 Overview & Purpose
Strict IFRS-compliant double-entry accounting engine:
- Chart of Accounts (COA): 5-level hierarchical account tree (1000 Assets, 2000 Liabilities, 3000 Equity, 4000 Revenue, 5000 Expenses).
- Double-Entry Balance Rule: Enforces $\sum \text{Debit} = \sum \text{Credit}$ with zero variance on every journal entry.
- Multi-Entity Inter-Company Mirroring: Automates `Due To / Due From` mirrored journal vouchers across group entities.
- Financial Reporting: Real-time Trial Balance, Balance Sheet, Profit & Loss, and Bank Reconciliation.

### 7.2 Database Schema (`schema.prisma`)
```prisma
model Account {
  id             String        @id @default(uuid())
  code           String        @db.VarChar(32)
  name           String        @db.VarChar(160)
  level          Int           @default(1)
  type           String        @db.VarChar(32) // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  normalBalance  String        @default("DEBIT") @map("normal_balance")
  currentBalance Decimal       @default(0) @map("current_balance") @db.Decimal(19, 4)
  companyId      String?       @map("company_id")
  journalLines   JournalLine[]
  @@unique([code, companyId])
  @@map("accounts")
}

model JournalEntry {
  id          String        @id @default(uuid())
  entryNumber String        @map("entry_number") @db.VarChar(64)
  companyId   String        @map("company_id")
  date        DateTime      @default(now())
  type        String        @default("STANDARD")
  status      String        @default("POSTED")
  totalDebit  Decimal       @default(0) @map("total_debit") @db.Decimal(19, 4)
  totalCredit Decimal       @default(0) @map("total_credit") @db.Decimal(19, 4)
  lines       JournalLine[]
  @@unique([companyId, entryNumber])
  @@map("journal_entries")
}

model JournalLine {
  id             String       @id @default(uuid())
  journalEntryId String       @map("journal_entry_id")
  accountId      String       @map("account_id")
  accountCode    String       @map("account_code") @db.VarChar(32)
  costCenterId   String?      @map("cost_center_id")
  debit          Decimal      @default(0) @db.Decimal(19, 4)
  credit         Decimal      @default(0) @db.Decimal(19, 4)
  description    String?      @db.VarChar(255)
  journalEntry   JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  account        Account      @relation(fields: [accountId], references: [id])
  @@map("journal_lines")
}
```

### 7.3 Backend REST Endpoints
| Verb | Endpoint | Permission Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/finance/accounts` | `finance.gl.read` | Scoped Chart of Accounts tree with live balances |
| `GET` | `/api/v1/finance/journals` | `finance.gl.read` | Scoped posted journal entries |
| `POST` | `/api/v1/finance/journals` | `finance.gl.post` | Posts balanced journal entry with GL account updates |
| `GET` | `/api/v1/finance/trial-balance`| `finance.gl.read` | Calculated real-time Trial Balance with Dr/Cr totals |
| `GET` | `/api/v1/finance/invoices` | `invoice.read` | Scoped Accounts Payable/Receivable invoices |
| `POST` | `/api/v1/finance/invoices/:id/approve` | `invoice.approve` | Approves supplier invoice for payment |

#### Sample Post Journal Entry Request
```json
{
  "companyId": "c-foods",
  "memo": "Monthly Office Internet & Cloud Service Expense",
  "lines": [
    {
      "accountCode": "5100",
      "debit": 35000,
      "credit": 0,
      "description": "IT & Telecom Operating Expense",
      "costCenterId": "cc-foods-it-001"
    },
    {
      "accountCode": "1010",
      "debit": 0,
      "credit": 35000,
      "description": "Payment disbursed via City Bank Current A/C"
    }
  ]
}
```

### 7.4 Frontend Integration
- **UI Pages**:
  - `design/src/pages/FinanceOverview.tsx`: Liquidity position, Cash flow, AR/AP ratios.
  - `design/src/pages/ChartOfAccounts.tsx`: Hierarchical COA tree with debit/credit drilldowns.
  - `design/src/pages/Invoices.tsx`: Supplier invoice register and payment approvals.
  - `design/src/pages/BankReconciliation.tsx`: Unmatched bank feeds vs ledger transactions.
- **Data Store**: `design/src/data/finance.ts` (`accounts`, `journalVouchers`, `invoices`).

---

## SECTION 8: Audit Trail, Cryptography & Platform Core (`audit` & `platform`)

### 8.1 Overview & Purpose
Guarantees enterprise compliance and regulatory audit readiness:
- Tamper-Evident Hash Chaining: Each audit record contains `rowHash = SHA256(prevHash + id + occurredAt + actorUserId + action + resource + newValue)`. Any manual database alteration breaks the chain.
- Cryptographic Verification Endpoint: Scans logs sequentially and reports the exact point of tampering.
- Atomic Number Sequence Generator: Prevents race conditions and gaps in financial numbers (`PR-2026-0001`, `JV-2026-0001`).

### 8.2 Database Schema (`schema.prisma`)
```prisma
model AuditLog {
  id             String        @id @default(uuid())
  occurredAt     DateTime      @default(now()) @map("occurred_at")
  actorUserId    String?       @map("actor_user_id")
  companyId      String?       @map("company_id")
  organizationId String?       @map("organization_id")
  action         String        @db.VarChar(96)
  resource       String        @db.VarChar(96)
  resourceId     String?       @map("resource_id")
  oldValue       Json?         @map("old_value")
  newValue       Json?         @map("new_value")
  ipAddress      String?       @map("ip_address") @db.VarChar(64)
  correlationId  String?       @map("correlation_id")
  prevHash       String?       @map("prev_hash") @db.VarChar(64)
  rowHash        String        @map("row_hash") @db.VarChar(64)
  @@index([companyId, occurredAt])
  @@index([correlationId])
  @@map("audit_logs")
}

model NumberSequence {
  id           String   @id @default(uuid())
  companyId    String   @map("company_id")
  documentType String   @map("document_type") @db.VarChar(64)
  fiscalYear   Int      @map("fiscal_year")
  prefix       String   @db.VarChar(32)
  nextValue    BigInt   @default(1) @map("next_value")
  padding      Int      @default(6)
  @@unique([companyId, documentType, fiscalYear])
  @@map("number_sequences")
}
```

### 8.3 Backend REST Endpoints
| Verb | Endpoint | Permission Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/audit/logs` | `audit.logs.read` | Retrieves scoped chronological audit trail |
| `GET` | `/api/v1/audit/verify` | `audit.logs.read` | Validates hash chain integrity and reports status |

### 8.4 Frontend Integration
- **UI Page**: `design/src/pages/AuditLogs.tsx` (Chronological log explorer, correlation filter, "Verify Cryptographic Chain" action).
- **Data Store**: `design/src/data/system.ts` (`auditLogs`, `recordAuditEvent`).

---

# Frontend-to-Backend Integration Master Guide

### Step 1: Centralized API Client Architecture (`design/src/api/client.ts`)
The React frontend uses an authenticated client configured with:
```typescript
const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('okobiz_erp_access_token');
  const activeOrgId = localStorage.getItem('okobiz_erp_active_org');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (activeOrgId) headers['X-Organization-Id'] = activeOrgId;
  headers['X-Correlation-Id'] = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiException(json?.error || { code: 'REQUEST_FAILED', message: response.statusText }, response.status);
  }

  return (json && 'data' in json) ? (json.data as T) : (json as T);
}
```

### Step 2: Vite Proxy Configuration (`design/vite.config.ts`)
Ensures seamless CORS-free communication during local development:
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

### Step 3: Migration Workflow from Static Data to Live API
For each module in the frontend:
1. **Define API functions** in `design/src/api/client.ts` matching backend DTOs.
2. **Replace static arrays** with React `useEffect` + `useState` fetching from the API.
3. **Handle Errors Gracefully**:
   - `ERR_ABAC_COMPANY_ISOLATION` &rarr; render the `<Unauthorized />` component.
   - `401 Unauthorized` &rarr; clear storage and redirect to `/login`.
   - Validation failures &rarr; show inline form notifications with field-level highlights.
4. **Subscribe to Real-Time Updates**: Re-fetch or update optimistic UI state upon workflow actions.

---

## Implementation Verification & Testing Checklist

| Section | Backend Unit/Integration Tests | Frontend E2E / Validation Check |
| :--- | :--- | :--- |
| **Organizations** | Hierarchy tree depth calculation, unique code per parent | Modal company creation, active module toggling |
| **IAM & Auth** | JWT signature, bcrypt verification, context switching | Login form, scope badges, permission restrictions |
| **HR & Workflows** | Leave deduction, balance limit assertion, SoD check | Leave request modal, live calendar, manager approve/reject |
| **Approvals** | SLA escalation timestamp, financial threshold check | Unified inbox, multi-domain tabs, inline drawer decision |
| **Procurement** | Atomic sequence generation for PR numbers | PR creation modal, 3-way match indicators |
| **Inventory** | Append-only ledger math, immutable stock valuation | SKU search, reorder alert pills, STO workflow |
| **Finance** | Balanced double-entry check ($\sum Dr = \sum Cr$) | Journal posting modal, Trial Balance recalculation |
| **Audit** | SHA-256 hash chaining, tamper detection algorithm | Verify chain button, correlation log filtering |
