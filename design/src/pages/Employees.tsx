import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { employees } from '../data/people';
import { companies, group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import type { Employee } from '../types';

export function Employees() {
  const navigate = useNavigate();
  const { can, density, companyId } = useApp();

  const companyName = companyId ? companies.find((c) => c.id === companyId)?.name : null;
  const scoped = can('group.read') || !companyName ? employees : employees.filter((e) => e.company === companyName);

  const columns: Array<Column<Employee>> = [
  {
    key: 'name',
    header: 'Employee',
    sortable: true,
    hideable: false,
    value: (e) => e.name,
    render: (e) =>
    <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface font-mono text-xs text-muted">
            {e.name.split(' ').map((n) => n[0]).join('')}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink">{e.name}</span>
            <span className="block font-mono text-sm text-muted">{e.id}</span>
          </span>
        </div>

  },
  { key: 'position', header: 'Position', sortable: true, value: (e) => e.position, render: (e) => e.position },
  { key: 'department', header: 'Department', sortable: true, value: (e) => e.department, render: (e) => e.department },
  { key: 'company', header: 'Company', sortable: true, value: (e) => e.company, render: (e) => <span className="text-muted">{e.company}</span> },
  { key: 'branch', header: 'Branch', value: (e) => e.branch, render: (e) => <span className="text-muted">{e.branch}</span> },
  { key: 'joined', header: 'Joined', align: 'right', value: (e) => e.joined, render: (e) => <span className="text-muted">{e.joined}</span> },
  { key: 'status', header: 'Status', value: (e) => e.status, render: (e) => <StatusBadge status={e.status} /> }];


  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[
        { label: group.name, to: '/' },
        { label: companyName ?? 'All companies', to: '/companies' },
        { label: 'Employees' }]
        }
        title="Employees"
        description="Master employee register across every company in your scope."
        meta={<Badge tone="accent">Scope: {companyName ?? 'All 24 companies'}</Badge>}
        actions={
        can('employee.update') ?
        <Button variant="primary" icon={PlusIcon}>
              Add employee
            </Button> :
        undefined
        } />
      
      <div className="p-6">
        <DataTable
          rows={scoped}
          columns={columns}
          getId={(e) => e.id}
          density={density}
          pageSize={10}
          selectable={can('employee.update')}
          bulkActions={
          <>
              <Button size="xs">Assign department</Button>
              <Button size="xs">Export selected</Button>
              <Button size="xs" variant="danger">
                Deactivate
              </Button>
            </>
          }
          searchPlaceholder="Search employees, IDs, positions..."
          searchIn={(e) => `${e.name} ${e.id} ${e.position} ${e.department}`}
          filters={[
          { key: 'department', label: 'Department', options: ['Finance', 'Human Resources', 'Procurement', 'Production', 'Sales & Distribution', 'Information Technology', 'Fleet', 'Warehouse'], match: (e, v) => e.department === v },
          { key: 'status', label: 'Status', options: ['active', 'on-leave', 'inactive', 'suspended'], match: (e, v) => e.status === v },
          { key: 'branch', label: 'Branch', options: ['Corporate HQ', 'Savar Plant', 'Gazipur Plant II', 'Chattogram DC', 'Sylhet Sales Office'], match: (e, v) => e.branch === v }]
          }
          onRowClick={(e) => navigate(`/employees/${e.id}`)} />
        
      </div>
    </div>);

}