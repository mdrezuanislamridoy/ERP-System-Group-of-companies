# How the Okobiz ERP Website Actually Works

*A detailed, end-to-end walkthrough of the running system: what happens from the moment someone opens the site to the moment data appears on screen — login, roles, companies, permissions, pages, and the real backend underneath.*

This doc explains **behavior** (what happens when you click things). For *why* things are built this way, see `architecture/`. For a map of *which files* implement what, see `SYSTEM_GUIDE.md`. This file assumes neither and starts from "you open the browser."

---

## 1. The three things running

| Piece | What it is | Where |
|---|---|---|
| **The website** | React app you actually click around in | `design/` — Vite dev server, default `http://localhost:5173` |
| **The API** | The real server with a real database | `backend/` — NestJS, default `http://localhost:4000`, routes under `/api/v1/...` |
| **The database** | PostgreSQL | started via `backend/docker-compose.yml` |

The website's dev server proxies any request to `/api/*` straight through to the backend (`design/vite.config.ts`). So when the website *does* talk to the server, it's talking to the real thing, not a mock server — there's no fake API layer in between.

**The one thing that makes this repo confusing**: the website has **two completely independent ways of "logging in" and deciding what you can see**, and only one of them touches the backend at all. The next section explains both, because almost everything else in this doc depends on knowing which one you're in.

---

## 2. Logging in: two separate worlds

Open `/login`. You type an ID and password and hit submit. `AuthContext.login()` (`design/src/contexts/AuthContext.tsx`) does this, in order:

### World A — the local demo directory (no server involved)

It first checks your ID against a hardcoded list of ~15 demo people in `design/src/data/directory.ts`. Every one of them uses the password **`Demo@123`**. If your ID matches one of these, you're logged in **instantly, with zero network calls** — the "backend" for this session is just a JavaScript array sitting in the browser tab. Examples from that list: `ayesha.karim` (Group CEO), `faisal.ahmed` (Group Super Admin), `nasrin.sultana` (Company CFO), `rahim.ahmed` (Department Manager), `sabina.yasmin` (Staff), `superuser` (every role at once, for testing).

Your role/permissions for this session come from `design/src/data/roles.ts` — a hardcoded table mapping a `roleKey` (like `'group-ceo'`) to a permission list (like `'finance.read'`, `'invoice.approve'`, `'sensitive.salary.read'`). Whatever data you see on most pages (Finance, Procurement, Inventory, HR, Approvals, Reports, Audit) comes from **in-memory mock data modules** under `design/src/data/*.ts`, filtered client-side to pretend it respects your scope. Nothing you do here is persisted anywhere or touches Postgres.

This is the default/demo experience, and it's why the whole site is fully clickable without ever starting the backend.

### World B — the real backend

If your typed ID **isn't** in that local directory, `AuthContext` falls back to `authApi.login()`, a real `POST /api/v1/auth/login` call. The backend checks a real `bcrypt` password hash in Postgres, applies brute-force lockout (5 bad attempts → 15 minute lock), and — if it succeeds — returns a real JWT access token, a refresh token, your **actual** role assignment, and your **actual** permission list computed from the database.

The real demo accounts for this path live in `backend/prisma/seed.ts`, are completely different people/IDs than World A's directory, and all use the password **`password123`**:

| Login ID | Role | Company scope |
|---|---|---|
| `ceo@abc-group.com` / `EMP-10001` | `group-ceo` | Group-wide (`*`) |
| `admin@abc-group.com` / `EMP-10002` | `group-super-admin` | Group-wide (`*`) |
| `cfo@abc-group.com` / `EMP-10003` | `group-cfo` | Group-wide (`*`) |
| `cfo@okobiz-foods.com` / `EMP-20001` | `company-cfo` | Okobiz Foods only (`c-foods`) |
| `procurement@okobiz-foods.com` / `EMP-20002` | `procurement-officer` | Okobiz Foods only (`c-foods`) |

Once logged in this way, the browser stores the JWT in `localStorage` and attaches it as `Authorization: Bearer <token>` on every subsequent API call (`design/src/api/client.ts`). Only **three pages** actually make these real calls today: **Companies**, **Employees** (partially), and **IAM**. Everything else still reads from the same mock data modules as World A, *even for a real backend session* — see §5.

> **Practical effect of all this**: logging in as `rahim.ahmed` / `Demo@123` and logging in as `cfo@okobiz-foods.com` / `password123` look similar in the UI, but one never leaves your browser and the other is a real, auditable, database-backed session. If you want to test the real access-control rules described in §6, you must use the **backend** account list, not the demo directory.

---

## 3. What happens after login: role, company, and the UI shell

Three React contexts stack on top of each other (`design/src/App.tsx`):

```
AuthProvider        → who are you, are you logged in, what's your JWT (if any)
  EntityScopeProvider  → which company/branch is "active" right now, what modules are enabled
    AppProvider          → your resolved role profile + the can(permission) check used everywhere
```

- **`AuthContext`** holds `user`, `assignment` (your current role+org binding), and `scope`. If you have more than one assignment (e.g. a person who's both a department head *and* sits on a group committee), a **workspace switcher** in the top bar lets you change which one is active — this calls the real `POST /api/v1/auth/switch-context` endpoint when you have a real session, which re-signs your JWT with the new active org and returns a freshly recomputed scope.
- **`EntityScopeContext`** is the "lens" — which company/branch you're currently looking at, derived from your scope. For a group-level role this defaults to a consolidated group view; for a company-scoped role it's pinned to your one company.
- **`AppContext.can(permission)`** is the single function every page/button/nav-item checks before showing anything. **Important detail**: today this always reads from the static `roleTemplates` table in `data/roles.ts` by your `roleKey` — **even if you logged in through the real backend**. The real permission list the backend actually computed and returned at login is fetched but currently unused by the UI. This is a known gap (tracked in `ACCESS_CONTROL_AND_MULTI_TENANCY.md`); it means the page you *see* is governed by the hardcoded demo table, while any *data* that page fetches from the three real-API pages is still independently, correctly enforced server-side.

### Routing & page guards (`design/src/App.tsx`)

Every route is wrapped in a `Guard`:

```tsx
<Route path="/finance" element={<Guard permission="finance.read" module="finance"><FinanceOverview /></Guard>} />
```

A `Guard` checks two things before rendering the page:
1. **Is the module enabled for this company?** (`isModuleEnabled`, from `EntityScopeContext` — company-level feature flags, e.g. a company with the Finance module turned off gets a "Feature Not Enabled" screen instead of the page, regardless of role.)
2. **Does `can(permission)` return true?** If not, you get the `Unauthorized` page naming exactly which permission was missing.

`RequireAuth` (one level up) is simpler — it only checks "are you logged in at all"; it doesn't know about permissions. So there are two layers: "logged in" gets you past the front door, "has the permission" gets you into a specific room.

---

## 4. The page map — what you see, and where it actually comes from

| Route | Page | Data source today |
|---|---|---|
| `/` | Dashboard (routes to one of 3 views by role) | — |
| `/companies` | Companies — legal entities, branches, module toggles | **Real API** (`GET /api/v1/organizations/companies`), falls back to mock on error |
| `/employees`, `/employees/:id` | Employee directory & detail | Mostly mock; partially real |
| `/admin/iam` | Users, roles, effective permissions, sessions | **Real API** (`GET /api/v1/iam/users`, `/iam/roles`, `/iam/permissions`) |
| `/org-chart` | Hierarchy browser | Mock |
| `/finance`, `/finance/accounts`, `/finance/bank-reconciliation`, `/finance/invoices` | GL, chart of accounts, journals, trial balance, bank rec, AP/AR | Mock (backend `finance` module is fully built but **not wired** to this page yet) |
| `/procurement`, `/procurement/requests` | RFQ → quote → PO → SO pipeline | Mock (backend only has 4 basic endpoints so far) |
| `/inventory*` | Stock, GRN, RTV, batch/recall, transfers | Mock (backend only has 2 read-only endpoints so far) |
| `/hr` | Attendance, Leave, Payroll | Mock (backend `hr` module is fully built but not wired) |
| `/approvals`, `/approvals/:id` | Unified approval inbox, SLA, delegation | Mock (backend `workflows` module is a 2-endpoint stub) |
| `/reports` | Report catalog | Mock |
| `/admin/audit` | Audit trail + hash-chain verify | Mock (backend `audit` module is fully built but not wired) |
| `/settings` | Company/module config, fiscal periods, sessions | Mock |
| `/me`, `/profile` | Personal landing + profile | Mock |

**The rule of thumb**: a page is mock-only unless it imports from `design/src/api/client.ts`. Right now that's exactly `Companies.tsx`, `Employees.tsx`, and `IAM.tsx`.

Mock pages aren't fake in the sense of "broken" — they're fully interactive (you can run payroll, approve leave, create a PO) against realistic generated data that lives in browser memory for the session and resets on reload. It's how the whole product can be demoed end-to-end before every backend module exists.

---

## 5. How a *real* API request actually gets authorized (backend)

This is what happens on the three real-API pages, and on every endpoint once more modules get wired up. Five steps, in order, for every request:

1. **`RequestContextMiddleware`** runs first on literally every request. It just stamps a correlation ID and captures IP/user-agent — no auth logic yet.
2. **`JwtAuthGuard`** verifies the bearer token, loads your user record plus your *current* `UserRoleAssignment` (which role, at which organization, under which scope mode), and resolves your **scope**: which companies you're allowed to see (`allowedCompanyIds` — either a specific company, or `['*']` for group-level roles), which org nodes are "under" you (`descendantOrgIds`, precomputed via the `OrganizationClosure` table so this is a fast lookup, not a recursive query), and your financial approval limit.
3. **`PermissionsGuard`** checks the route's declared `@RequirePermissions('x.y.z')` against the permission list your role actually carries in the database. No match → `403 PERMISSION_DENIED`.
4. **The service** (e.g. `OrganizationsService`, `IamService`, `FinanceService`) does the actual query. Every service that touches company-scoped data extends `ScopedRepository`, whose `buildScopeFilter()` turns your resolved scope into a Prisma `where` clause — e.g. a company-scoped user's query gets `WHERE companyId = 'c-foods'` silently applied; a group-level user's query gets no filter (sees everything). This **fails closed**: if your scope is somehow missing, it throws instead of running an unfiltered query.
5. **Anything that changes data** writes an audit log entry (`AuditService.log(...)`), which is SHA-256 hash-chained to the previous entry — so later tampering with history is mathematically detectable (`GET /api/v1/audit/verify` walks the chain and tells you if it's intact).

### The multi-tenancy model, concretely

- `Organization` is a self-referencing tree: `GROUP` → `LEGAL_ENTITY` (a sister company, e.g. "Okobiz Foods Ltd") → `BUSINESS_UNIT`/`BRANCH_PLANT`/`FACTORY`/`WAREHOUSE` → `DEPARTMENT`/`COST_CENTER`.
- `OrganizationClosure` is a precomputed table of every ancestor→descendant pair with its depth — this is what makes "give me everything under Okobiz Foods" an indexed lookup instead of a recursive tree walk.
- A `UserRoleAssignment` is the actual grant: *this user*, *this role*, *at this organization node*, with a `scopeMode`:
  - `SELF` — only your own records
  - `NODE` — exactly this one org node, no children
  - `SUBTREE` — this node and everything under it (the common case — e.g. a company CFO sees their whole company)
  - `SUBTREE_EXCEPT` / `CROSS` — carve-outs and cross-company grants (modeled, lightly used today)

### What was actually broken until this session, and is now fixed

An audit of every module this session found that several endpoints **ignored this scoping entirely** and returned every company's data to anyone with a generically-named permission like `org.read`. Concretely, before today:
- `GET /api/v1/organizations/companies` and `/organizations/tree` returned **every** sister company's name, revenue, expense, and margin to any logged-in user, including ones scoped to a single company.
- `GET /api/v1/iam/users` listed **every employee in every company** (names, emails, phones, role assignments) to anyone with the generic users-read permission.
- `GET /api/v1/hr/payroll/salary-structure/:personId` let a company-scoped HR/Finance role read **or overwrite** another company's employee salary data just by passing a different `personId`.
- `GET /api/v1/finance/trial-balance?companyId=...` trusted whatever company ID was passed in the URL with no check against the caller's actual scope.

All four are now scope-checked the same way the rest of the correctly-built endpoints already were (see `ACCESS_CONTROL_AND_MULTI_TENANCY.md` for the full list and the exact fix per file). This is the difference between "the architecture document says data is isolated by company" and "it actually is, on every endpoint, today."

---

## 6. Try it yourself — seeing the difference a role makes

Using **backend** accounts (password `password123` for all), with the backend running:

1. Log in as `ceo@abc-group.com` → open **Companies** → you see every sister company (Okobiz Foods, Transport, Textiles, Real Estate, Retail, Tech).
2. Log out, log in as `cfo@okobiz-foods.com` → open **Companies** again → you now see **only Okobiz Foods**.
3. Same comparison on **IAM → Users**: the group CEO sees the whole company's directory across all sister concerns; the Okobiz Foods CFO sees only Okobiz Foods' people.

This is the concrete, testable version of "each role sees separate company data based on permission and role."

---

## 7. Running it locally

```bash
# Backend
cd backend
docker-compose up -d        # Postgres + Redis + pgAdmin
npm install
npm run prisma:migrate
npm run prisma:seed         # creates the group, 6 sister companies, roles, and the demo users in §2
npm run dev                 # http://localhost:4000, Swagger at /api/docs if enabled

# Frontend
cd design
npm install
npm run dev                 # http://localhost:5173, proxies /api/* to the backend above
```

You can use the site fully with **only** the frontend running (World A, §2) — the backend is only needed to exercise the real, database-backed login and the three real-API pages.

---

## 8. What's next

The backend has real, working modules for **auth, IAM, organizations, finance, and HR** that the frontend mostly doesn't call yet, and the **procurement, inventory, and workflow** backend modules are still thin stubs compared to what their frontend mock pages already simulate. The ongoing work (tracked in `ACCESS_CONTROL_AND_MULTI_TENANCY.md` and `ERP_FIXES_AND_GITHUB_ISSUES.md`) is: finish those backend modules, wire every mock page to its real endpoint the same way `Companies.tsx`/`IAM.tsx` already are, and make the frontend's `can()` check read your *real* backend-issued permissions instead of the static demo table — so logging in with a real account makes the entire UI, not just three pages, reflect your actual role and company.
