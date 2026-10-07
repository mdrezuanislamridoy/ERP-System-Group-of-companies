import React from 'react';
import { useApp } from '../contexts/AppContext';
import { SuperAdminDashboard } from './dashboards/SuperAdminDashboard';
import { GroupDashboard } from './dashboards/GroupDashboard';
import { CompanyDashboard } from './dashboards/CompanyDashboard';
import { DepartmentDashboard } from './dashboards/DepartmentDashboard';
import { MyWorkspace } from './MyWorkspace';
import type { RoleKey } from '../types';

export function Dashboard({ force }: {force?: RoleKey;}) {
  const { roleKey, role } = useApp();
  const effective = force ?? roleKey;

  // Super Admin gets its own exclusive, non-business-data dashboard — never shared with
  // any other role, even other group-level ones (CEO/CFO/Audit all render GroupDashboard).
  if (!force && role.key === 'group-super-admin') return <SuperAdminDashboard />;

  if (effective === 'group-exec') return <GroupDashboard />;
  if (effective === 'company-exec') return <CompanyDashboard />;
  if (effective === 'department-head') return <DepartmentDashboard />;
  return <MyWorkspace />;
}