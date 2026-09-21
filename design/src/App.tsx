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

function Guard({ permission, children }: {permission: string;children: React.ReactElement;}) {
  const { can } = useApp();
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
            <Route path="/employees" element={<Guard permission="employee.read"><Employees /></Guard>} />
            <Route path="/employees/:id" element={<Guard permission="employee.read"><EmployeeDetail /></Guard>} />
            <Route path="/org-chart" element={<Guard permission="group.read"><OrgChart /></Guard>} />

            <Route path="/finance" element={<Guard permission="finance.read"><FinanceOverview /></Guard>} />
            <Route path="/finance/accounts" element={<Guard permission="finance.read"><ChartOfAccounts /></Guard>} />
            <Route path="/finance/invoices" element={<Guard permission="invoice.read"><Invoices /></Guard>} />
            <Route path="/reports" element={<Guard permission="reports.read"><Reports /></Guard>} />

            <Route path="/procurement" element={<Guard permission="pr.read"><Procurement /></Guard>} />
            <Route path="/procurement/requests" element={<Guard permission="pr.read"><PurchaseRequests /></Guard>} />
            <Route path="/inventory" element={<Guard permission="inventory.read"><Inventory /></Guard>} />
            <Route path="/inventory/warehouses" element={<Guard permission="inventory.read"><Inventory /></Guard>} />

            <Route path="/hr" element={<Guard permission="self.read"><HR /></Guard>} />

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