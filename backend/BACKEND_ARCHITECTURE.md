# Okobiz Group ERP — Backend Architecture Specification & Technical Guide

> **Document Version:** 1.0.0  
> **Target System:** Okobiz Multi-Company Enterprise ERP Platform  
> **Stack:** NestJS 10, TypeScript 5, Prisma ORM 5, PostgreSQL 16, Redis 7  
> **Repository Directory:** `backend/`  

---

## 1. Executive Summary & Core Decisions

Okobiz Group operates 6+ operating sister concerns across consumer goods, transport, textiles, real estate, retail, and tech services (with projections exceeding 20+). 

The primary architectural pitfall in group conglomerates is building **siloed parallel ERPs** with disparate databases and identity stores, making inter-company transactions and financial consolidation practically impossible.

### Core Architectural Decisions:
1. **Modular Monolith**: Delivered as a single cohesive NestJS application. Cross-module transactions (such as a Goods Receipt posting an inventory ledger movement, an accounts payable accrual, and a general ledger journal) occur in unified ACID database transactions without distributed saga overhead.
2. **Shared Database with Organizational Scope Isolation**: All sister concerns reside in one PostgreSQL cluster. Isolation is enforced at the repository layer (`ScopedRepository<T>`), backed by PostgreSQL Row-Level Security (RLS) on critical ledgers.
3. **Identity & Scope Hierarchy**: Identity is group-level (`User`, `Person`), whereas operational authority is contextual (`UserRoleAssignment`). Switching operating companies is an explicit, audited action.
4. **Configuration Over Code**: Approval hierarchies, document counters, and policies resolve through a Group $\to$ Legal Entity $\to$ Branch precedence hierarchy.

---

## 2. Request Processing Pipeline & Defense-in-Depth

Every inbound HTTP request to the API passes through six mandatory defense layers:

```
[ Inbound HTTP Request ]
         │
         ▼
┌────────────────────────┐
│ 1. Request Context     │  Injects X-Correlation-Id, captures client IP & user agent
└────────┬───────────────┘
         ▼
┌────────────────────────┐
│ 2. JWT Authentication  │  Validates access token & permissions version
└────────┬───────────────┘
         ▼
┌────────────────────────┐
│ 3. Scope Resolution    │  Reads X-Organization-Id, expands closure tree (SUBTREE)
└────────┬───────────────┘
         ▼
┌────────────────────────┐
│ 4. Permissions Guard   │  Asserts granular action capabilities (@RequirePermissions)
└────────┬───────────────┘
         ▼
┌────────────────────────┐
│ 5. Domain Service      │  Enforces balancing rules, limits, state machines & outbox
└────────┬───────────────┘
         ▼
┌────────────────────────┐
│ 6. Scoped Repository   │  Applies mandatory WHERE company_id / org_id filters
└────────┬───────────────┘
         ▼
[ PostgreSQL / RLS Net ]
```

---

## 3. Organizational Data Model & ABAC Scoping

### Organizational Tree (`organizations` & `organization_closure`)
The hierarchy maps real corporate entity relationships:
- **Level 0 (Group)**: `grp-abc` (ABC Group Holdings PLC)
- **Level 1 (Legal Entities)**: `c-foods`, `c-trans`, `c-text`, `c-prop`, `c-ret`, `c-tech`
- **Level 2 (Plants / Branches / Depots)**: `bp-foods-hq`, `bp-savar`, `bp-gazipur`, `bp-ctg-dc`
- **Level 3 (Departments)**: `dept-fin-foods`, `dept-proc-foods`, `dept-hr-foods`
- **Level 4 (Cost Centers / Profit Centers)**

### Scope Modes (`ScopeMode`)
When a role is assigned to a user at any organization node, the scope mode determines downward visibility:
- `SELF`: Visible only to records created by or belonging to the caller.
- `NODE`: Restricted strictly to the specific organization node (e.g. single department).
- `SUBTREE`: Automatically inherits downward access to all descendant nodes in the closure table.
- `CROSS`: Explicit multi-entity scope across allowed legal entities.

### The `ScopedRepository` Pattern
To prevent developers from accidentally writing queries that leak cross-company data:
```typescript
abstract class ScopedRepository {
  protected buildScopeFilter(ctx: RequestContext, companyField = 'companyId') {
    if (!ctx.scope) throw new UnscopedQueryError(); // Fails closed
    if (ctx.scope.allowedCompanyIds.includes('*')) {
      return ctx.scope.activeCompanyId ? { [companyField]: ctx.scope.activeCompanyId } : {};
    }
    return { [companyField]: ctx.scope.activeCompanyId };
  }
}
```

---

## 4. Financial Integrity & Double-Entry Ledger

The finance module implements strict double-entry bookkeeping:

1. **Balance Invariant**: Every `JournalEntry` requires `totalDebit === totalCredit`. Unbalanced submissions are rejected with a 400 Bad Request before database persistence.
2. **Account Classification**: Standard 5-root Chart of Accounts (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`) with automatic debit/credit normal balance resolution.
3. **Gapless Document Numbering**: Uses `NumberSequenceService` with database row locks (`SELECT FOR UPDATE`), preventing sequence gaps caused by transaction rollbacks (crucial for statutory and tax compliance).
4. **Calculated Trial Balance**: Dynamically aggregates opening balances, debit movements, and credit movements to ensure ledger equilibrium across all accounts.

---

## 5. Cryptographic Audit Log Engine

In accordance with compliance standards:
- **Append-Only**: Modifications and deletes are strictly prohibited on `audit_logs`.
- **SHA-256 Hash Chaining**: Every log entry computes `rowHash = SHA256(prevHash + timestamp + action + resource + resourceId + oldValue + newValue + actorUserId + companyId)`.
- **Tamper Verification**: Endpoint `GET /api/v1/audit/verify` verifies the chain from genesis, immediately identifying if any row has been altered or deleted.

---

## 6. API Standard Contracts

### Response Envelope (`TransformInterceptor`)
All successful API responses follow a uniform structure:
```json
{
  "data": [ ... ],
  "page": {
    "cursor": "eyJpZCI6...}",
    "hasMore": false,
    "limit": 50,
    "total": 12
  },
  "meta": {
    "asOf": "2026-09-23T15:30:00.000Z",
    "correlationId": "8f88c3a9-e317-48f5-a7b2-13e2f5b6107a",
    "scope": "c-foods"
  }
}
```

### Error Envelope (`HttpExceptionFilter`)
All application exceptions conform to:
```json
{
  "error": {
    "code": "JOURNAL_UNBALANCED",
    "message": "Journal entry is out of balance. Total debits must strictly equal total credits.",
    "details": { "totalDebit": 50000, "totalCredit": 45000, "difference": 5000 },
    "correlationId": "8f88c3a9-e317-48f5-a7b2-13e2f5b6107a"
  }
}
```

### Key Request Headers
- `Authorization: Bearer <jwt-token>`
- `X-Organization-Id: <org-or-company-id>` (Switches active context within user's allowed scope)
- `X-Correlation-Id: <uuid>` (Propagated across services, logs, and audit records)

---

## 7. Directory Structure

```
backend/
├── prisma/
│   ├── schema.prisma              # Complete multi-company enterprise schema
│   └── seed.ts                    # Seeds Okobiz Group, sister companies & COA
├── src/
│   ├── common/
│   │   ├── decorators/            # @CurrentUser, @ActiveScope, @RequirePermissions
│   │   ├── filters/               # HttpExceptionFilter
│   │   ├── guards/                # JwtAuthGuard, PermissionsGuard
│   │   ├── interceptors/          # TransformInterceptor
│   │   ├── interfaces/            # RequestContext, UserScope
│   │   ├── middleware/            # RequestContextMiddleware
│   │   └── repositories/          # ScopedRepository base class
│   ├── modules/
│   │   ├── audit/                 # Hash-chained tamper-evident audit trail
│   │   ├── auth/                  # JWT auth, sessions, context switching
│   │   ├── finance/               # Chart of accounts, journal entries, trial balance
│   │   ├── iam/                   # Users, roles, permissions, field-level masking
│   │   ├── inventory/             # Warehouses, stock items, stock ledger
│   │   ├── organizations/         # Hierarchy tree, sister concerns, modules
│   │   ├── platform/              # Gapless number sequencer, system settings
│   │   ├── prisma/                # Global Prisma ORM service
│   │   ├── procurement/           # PRs, POs, automated approval attachments
│   │   └── workflows/             # Unified approval inbox, matrix approval actions
│   ├── app.module.ts              # Root NestJS module
│   └── main.ts                    # Bootstrap with CORS, Swagger & pipes
├── .env                           # Local environment variables
├── .env.example                   # Environment template
├── docker-compose.yml             # PostgreSQL 16 + Redis 7 + pgAdmin 4
├── nest-cli.json
├── package.json
└── tsconfig.json
```

---

## 8. Setup & Getting Started

### Prerequisites
- Node.js 18+ (Node.js 20+ recommended)
- Docker & Docker Compose (optional for local PostgreSQL)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Database & Start Services
If using Docker:
```bash
docker compose up -d
```

### 3. Generate Prisma Client & Run Migrations
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Seed Enterprise Master Data
```bash
npm run prisma:seed
```

### 5. Start the Development Server
```bash
npm run start:dev
```

The server starts at `http://localhost:4000`.  
Explore interactive API documentation and test endpoints at `http://localhost:4000/api/docs`.
