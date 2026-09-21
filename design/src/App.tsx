import React from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EntityScopeProvider } from './contexts/EntityScopeContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { AppShell } from './components/shell/AppShell';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { MyWorkspace } from './pages/MyWorkspace';
import { Companies } from './pages/Companies';
import { Employees } from './pages/Employees';
import { EmployeeDetail } from './pages/EmployeeDetail';
import { OrgChart } from './pages/OrgChart';
import { FinanceOverview } from './pages/FinanceOverview';
import { Invoices } from './pages/Invoices';
import { ChartOfAccounts } from './pages/ChartOfAccounts';
import { Procurement } from './pages/Procurement';
import { PurchaseRequests } from './pages/PurchaseRequests';
import { Approvals } from './pages/Approvals';
import { ApprovalDetail } from './pages/ApprovalDetail';
import { Inventory } from './pages/Inventory';
import { HR } from './pages/HR';
import { WorkflowBuilder } from './pages/WorkflowBuilder';
import { AuditLogs } from './pages/AuditLogs';
import { IAM } from './pages/IAM';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
import { Profile } from './pages/Profile';
import { NotFound } from './pages/NotFound';
import { Unauthorized } from './pages/Unauthorized';
import { Button } from './components/ui/Button';
import { Badge } from './components/ui/StatusBadge';
import { PageHeader } from './components/PageHeader';
import { BoxesIcon } from 'lucide-react';
import { type ModuleKey, MODULE_METADATA } from './types';

function FeatureNotEnabled({ module }: { module: ModuleKey }) {
  const navigate = useNavigate();
  const { companyName } = useApp();
  const meta = MODULE_METADATA[module];
  const moduleLabel = meta?.label ?? module;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-line bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-soft text-warning border border-warning/30">
          <BoxesIcon className="h-7 w-7" />
        </div>
        <span className="inline-block rounded border border-warning/30 bg-warning-soft px-2.5 py-0.5 font-mono text-2xs font-semibold text-warning mb-2 uppercase tracking-wide">
          ERR_MODULE_NOT_ENABLED (404)
        </span>
        <h2 className="text-xl font-bold text-ink">Feature Not Enabled</h2>
        <p className="mt-2 text-sm text-muted">
          The <strong className="text-ink">{moduleLabel}</strong> module is currently disabled for{' '}
          <strong className="text-ink">{companyName}</strong> under company-specific configuration policy.
        </p>
        <p className="mt-2 text-xs text-faint">
          {meta?.description}
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="primary" onClick={() => navigate('/settings')}>
            Manage Company Modules
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModuleWorkspace({ module }: { module: ModuleKey }) {
  const meta = MODULE_METADATA[module];
  const { companyName } = useApp();

  return (
    <div className="p-6 pb-12">
      <PageHeader
        crumbs={[{ label: 'ABC Group', to: '/' }, { label: companyName, to: '/companies' }, { label: meta?.label ?? module }]}
        title={meta?.label ?? module}
        description={`${meta?.description ?? 'Operational module'} — Active for ${companyName}`}
        meta={<Badge tone="accent">Enabled</Badge>}
      />
      <div className="mt-6 rounded-xl border border-line bg-surface p-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <BoxesIcon className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-ink">{meta?.label} Operational Register</h3>
        <p className="mt-1 max-w-md mx-auto text-sm text-muted">
          Active operational workflows and transactions configured for {companyName}. All records and audits are scoped to this entity.
        </p>
      </div>
    </div>
  );
}

function Guard({
  permission,
  module,
  children,
}: {
  permission: string;
  module?: ModuleKey;
  children: React.ReactElement;
}) {
  const { can, isModuleEnabled } = useApp();
  if (module && !isModuleEnabled(module)) {
    return <FeatureNotEnabled module={module} />;
  }
  return can(permission) ? children : <Unauthorized permission={permission} />;
}

/** Blocks the whole app shell behind a session. No backend here — see AuthContext for the mock login. */
function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

function RedirectIfAuthenticated({ children }: {children: React.ReactElement;}) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

interface AppProps {
  /** Row height and padding across tables and lists. */
  density?: 'comfortable' | 'compact';
}

function Shell({ density }: {density: 'comfortable' | 'compact';}) {
  return (
    <EntityScopeProvider>
      <AppProvider density={density}>
        <Outlet />
      </AppProvider>
    </EntityScopeProvider>
  );
}

export function App({ density = 'comfortable' }: AppProps) {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
            <RedirectIfAuthenticated>
                <Login />
              </RedirectIfAuthenticated>
            } />


          <Route element={<RequireAuth />}>
          <Route element={<Shell density={density} />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/company" element={<Dashboard force="company-exec" />} />
            <Route path="/department" element={<Dashboard force="department-head" />} />
            <Route path="/me" element={<MyWorkspace />} />

            <Route path="/companies" element={<Guard permission="group.read"><Companies /></Guard>} />
            <Route path="/employees" element={<Guard permission="employee.read" module="hr"><Employees /></Guard>} />
            <Route path="/employees/:id" element={<Guard permission="employee.read" module="hr"><EmployeeDetail /></Guard>} />
            <Route path="/org-chart" element={<Guard permission="group.read"><OrgChart /></Guard>} />

            <Route path="/finance" element={<Guard permission="finance.read" module="finance"><FinanceOverview /></Guard>} />
            <Route path="/finance/accounts" element={<Guard permission="finance.read" module="finance"><ChartOfAccounts /></Guard>} />
            <Route path="/finance/invoices" element={<Guard permission="invoice.read" module="finance"><Invoices /></Guard>} />
            <Route path="/reports" element={<Guard permission="reports.read" module="finance"><Reports /></Guard>} />

            <Route path="/procurement" element={<Guard permission="pr.read" module="procurement"><Procurement /></Guard>} />
            <Route path="/procurement/requests" element={<Guard permission="pr.read" module="procurement"><PurchaseRequests /></Guard>} />
            <Route path="/inventory" element={<Guard permission="inventory.read" module="inventory"><Inventory /></Guard>} />
            <Route path="/inventory/warehouses" element={<Guard permission="inventory.read" module="inventory"><Inventory /></Guard>} />
            <Route path="/manufacturing" element={<Guard permission="inventory.read" module="manufacturing"><ModuleWorkspace module="manufacturing" /></Guard>} />
            <Route path="/quality" element={<Guard permission="inventory.read" module="quality"><ModuleWorkspace module="quality" /></Guard>} />
            <Route path="/fleet" element={<Guard permission="pr.read" module="fleet"><ModuleWorkspace module="fleet" /></Guard>} />
            <Route path="/projects" element={<Guard permission="self.read" module="projects"><ModuleWorkspace module="projects" /></Guard>} />
            <Route path="/retail" element={<Guard permission="inventory.read" module="retail-pos"><ModuleWorkspace module="retail-pos" /></Guard>} />

            <Route path="/hr" element={<Guard permission="self.read" module="hr"><HR /></Guard>} />

            <Route path="/approvals" element={<Guard permission="pr.approve"><Approvals /></Guard>} />
            <Route path="/approvals/:id" element={<Guard permission="pr.read"><ApprovalDetail /></Guard>} />
            <Route path="/workflows/builder" element={<Guard permission="workflow.manage"><WorkflowBuilder /></Guard>} />

            <Route path="/admin/iam" element={<Guard permission="iam.manage"><IAM /></Guard>} />
            <Route path="/admin/audit" element={<Guard permission="audit.read"><AuditLogs /></Guard>} />
            <Route path="/settings" element={<Guard permission="settings.manage"><Settings /></Guard>} />
            <Route path="/profile" element={<Profile />} />

            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
          </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>);

}