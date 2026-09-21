import React from 'react';
import { useApp } from '../contexts/AppContext';
import { GroupDashboard } from './dashboards/GroupDashboard';
import { CompanyDashboard } from './dashboards/CompanyDashboard';
import { DepartmentDashboard } from './dashboards/DepartmentDashboard';
import { MyWorkspace } from './MyWorkspace';
import type { RoleKey } from '../types';

export function Dashboard({ force }: {force?: RoleKey;}) {
  const { roleKey } = useApp();
  const effective = force ?? roleKey;

  if (effective === 'group-exec') return <GroupDashboard />;
  if (effective === 'company-exec') return <CompanyDashboard />;
  if (effective === 'department-head') return <DepartmentDashboard />;
  return <MyWorkspace />;
}