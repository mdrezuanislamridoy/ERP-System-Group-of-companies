# Access Control & Multi-Tenancy — Reference & Checklist

*How company/role data isolation is enforced end to end, what was fixed in the most recent security pass, and the checklist to follow when adding a new scoped endpoint. Read `HOW_THE_ERP_WORKS.md` first if you haven't — this doc assumes you already know the request flow (middleware → `JwtAuthGuard` → `PermissionsGuard` → service) and the scope model (`Organization` tree, `OrganizationClosure`, `UserRoleAssignment.scopeMode`) described there.*

---

## 1. The enforcement points, and who's responsible for what

| Layer | File | Responsibility |
|---|---|---|
| `RequestContextMiddleware` | `backend/src/common/middleware/request-context.middleware.ts` | Correlation ID, IP/user-agent. No auth. |
| `JwtAuthGuard` | `backend/src/common/guards/jwt-auth.guard.ts` | Verifies the JWT, resolves `req.context.user` and `req.context.scope` (`UserScope`) from the caller's live `UserRoleAssignment`. |
| `PermissionsGuard` + `@RequirePermissions(...)` | `backend/src/common/guards/permissions.guard.ts` | Declarative check: does the caller's permission list contain what this route requires. |
| `ScopedRepository.buildScopeFilter()` | `backend/src/common/repositories/scoped.repository.ts` | Turns `ctx.scope` into a Prisma `where` clause. Fails closed (throws `UnscopedQueryError`) if scope is missing. |
| `AbacPolicyService` | `backend/src/modules/auth/services/abac-policy.service.ts` | Imperative assertions a service calls directly: `assertCompanyScope`, `assertOrgNodeScope`, `assertFinancialApprovalLimit`, `assertSegregationOfDuties`. |

**The critical thing to understand**: `PermissionsGuard` only checks *that you hold a permission key* — it has no idea *which company's data* you're about to touch. A permission like `org.read` is deliberately coarse (lots of roles need to read org data at all). **Company-level isolation is never the guard's job — it is the service's job**, via `ScopedRepository` or `AbacPolicyService`. A route that is permission-guarded but whose service forgets to also scope the query is a cross-tenant leak that looks completely normal in the controller.

---

## 2. What was wrong, and the fix (this session's audit)

A full audit of every module (organizations, iam, finance, hr, procurement, inventory, workflows, audit, platform) found that most services correctly call `ScopedRepository`/`AbacPolicyService`, but several did not. All of the following are now fixed:

| Endpoint | Was | Now |
|---|---|---|
| `GET /organizations/companies` | Returned every `LEGAL_ENTITY`, no filter | Filtered to `ctx.scope.allowedCompanyIds` unless the caller holds group-level (`'*'`) scope |
| `GET /organizations/tree` | Always rooted at the group | Rooted at the caller's own company node for company-scoped callers |
| `GET /organizations/nodes/:id` | No check — any node by ID | Validated via `assertCompanyAccess`/group-scope check |
| `GET /iam/users` | Listed every user in every company | Filtered to users whose assignments fall within `ctx.scope.allowedCompanyIds` |
| `GET` / `PUT /hr/payroll/salary-structure/:personId` | No company check on the target `personId` at all | Resolves the target employee's company and calls `assertCompanyScope` before reading/writing (mirrors the pre-existing correct pattern in `attendance.service.ts`) |
| `GET /finance/trial-balance?companyId=` | Trusted the query param outright | Validated via `assertCompanyScope` before use |
| `GET /finance/accounts` | Bypassed `ScopedRepository`; broken for group-scope callers | Goes through scope filtering; group callers now get the consolidated view |
| `/approvals/*` (workflows controller) | No `PermissionsGuard` at all | Added, with two new permission keys (`workflow.approvals.read`, `workflow.approvals.action`) |
| `GET /procurement/suppliers` | No permission check | Requires `procurement.suppliers.read` (data itself is intentionally group-shared — `Party` has no `companyId` — so this was a consistency fix, not a leak) |
| `JwtAuthGuard` scope resolution | An unvalidated `x-organization-id` header could end up as `effectiveOrgId` even when it failed assignment/closure validation | Only a validated org ID (direct assignment match or confirmed `SUBTREE` descendant) is used; otherwise falls back to the caller's actual assignment |
| `prisma/seed.ts` | `group-super-admin` role referenced by code but never seeded — that demo user had zero assignments and couldn't log in | Role added with full permissions, like `group-ceo` |

Everything else audited (inventory stock/ledger reads, attendance, procurement PR/PO create+read, workflow task actioning, audit log retrieval, the platform number-sequence service) was already correctly scoped and was left alone.

---

## 3. Checklist: adding a new scoped endpoint

Follow this every time a new controller method touches company- or org-scoped data:

1. **Controller**: add `@UseGuards(JwtAuthGuard, PermissionsGuard)` at the class level (copy an existing controller in the same module) and `@RequirePermissions('module.resource.action')` on the method. Add the permission key to `prisma/seed.ts` if it doesn't exist yet, and grant it to the roles that should have it.
2. **Never trust a client-supplied company/org ID.** If a query param or body field names a company/org (`?companyId=`, `dto.companyId`, a path `:personId` whose owner's company you need to check), validate it against `req.context.scope` before using it — via `AbacPolicyService.assertCompanyScope`/`assertOrgNodeScope`, or by resolving the target's actual company first (see the `hr/payroll.service.ts` pattern for "look up the owner's company, then assert").
3. **For list/read queries scoped by the caller's own context** (not a client-supplied ID), extend `ScopedRepository` and call `this.buildScopeFilter(ctx, 'companyId')` (or pass an `orgField` for node-level scoping) and spread the result into your Prisma `where`.
4. **For mutations**, call the relevant `AbacPolicyService` assertion *before* the write, inside the service method — not in the controller, so it can't be bypassed by a different route reusing the service.
5. **Audit log it.** Any create/update/delete calls `AuditService.log({ action, resource, resourceId, companyId, ctx, ... })`.
6. **Test it as two different company-scoped users**, not just as a group-level admin — a group-scoped test account (`allowedCompanyIds: ['*']`) will never surface a missing scope filter, because the `'*'` wildcard short-circuits most checks. Use the seeded `cfo@okobiz-foods.com` account (single-company scope) specifically to probe for leaks.

---

## 4. Manual test script (seeded backend accounts, all `password123`)

| Account | Role | Expect |
|---|---|---|
| `ceo@abc-group.com` | `group-ceo` | Sees all 6 sister companies on `/organizations/companies`; all employees on `/iam/users`; any company's trial balance. |
| `admin@abc-group.com` | `group-super-admin` | Same group-wide visibility as the CEO. |
| `cfo@abc-group.com` | `group-cfo` | Same group-wide visibility, scoped to finance/HR-relevant permissions. |
| `cfo@okobiz-foods.com` | `company-cfo`, scoped to `c-foods` | `/organizations/companies` returns **only** Okobiz Foods. `/iam/users` returns **only** Okobiz Foods staff. `/finance/trial-balance?companyId=c-trans` returns `403 ABAC_COMPANY_BOUNDARY_VIOLATION`. |
| `procurement@okobiz-foods.com` | `procurement-officer`, scoped to `c-foods`, `NODE` mode | Can create/read purchase requests for Okobiz Foods only; cannot read another company's data. |

Run these against a running backend (`docker-compose up -d && npm run prisma:migrate && npm run prisma:seed && npm run dev` in `backend/`) via `curl`, Postman, or the Swagger UI — log in via `POST /api/v1/auth/login` with `{ "employeeId": "<email or EMP id>", "password": "password123" }`, then use the returned `accessToken` as a bearer token on the endpoints above.

---

## 5. Known remaining gaps (not fixed in this pass, by design — see the implementation plan for sequencing)

- **Frontend permission gating is still disconnected from the real backend.** `design/src/contexts/AppContext.tsx`'s `can()` reads a static client-side table (`data/roles.ts`) regardless of login path; the real `permissions` array the backend returns at login is fetched but unused. This doesn't allow a backend data leak (every real endpoint re-checks permissions server-side), but it means the UI's own "what can I click" display can diverge from reality for a real backend session.
- **Most pages are still mock-data-only** (Finance, Procurement, Inventory, Workflows/Approvals, HR/Payroll, Audit Logs, Reports) — see `HOW_THE_ERP_WORKS.md` §4 for the current list. The isolation fixes above protect every endpoint that exists today; they don't retroactively protect endpoints that haven't been built yet for those stub modules.
- **`CROSS` scope mode** is modeled in the schema and type system but not fully resolved by `JwtAuthGuard` — it currently behaves identically to `NODE` (single company) rather than aggregating multiple explicitly-granted companies. No seeded role uses it today, so this is a latent gap rather than an active one.
- **`allowedBranchIds`/`allowedDepartmentIds`** on `UserScope` are always `['*']` from the backend — there is no sub-company (branch/department) level ABAC enforcement yet, only company-level. The frontend's `EntityScopeContext` has UI for branch-level filtering, but nothing server-side backs it yet.
