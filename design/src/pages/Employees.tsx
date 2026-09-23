import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, ShieldCheckIcon, AlertTriangleIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { SensitiveField } from '../components/common/SensitiveField';
import { CreateEmployeeModal } from '../components/iam/CreateEmployeeModal';
import { employees } from '../data/people';
import { group } from '../data/organization';
import { recordAuditEvent } from '../data/system';
import { useApp } from '../contexts/AppContext';
import { useEntityScope } from '../contexts/EntityScopeContext';
import type { Employee } from '../types';

export function Employees() {
  const navigate = useNavigate();
  const { can, role, density } = useApp();
  const { filterEmployees, activeCompanyName, activeBranchName } = useEntityScope();
  const [exportNotice, setExportNotice] = useState<{ message: string; tone: 'info' | 'warning' } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeList, setEmployeeList] = useState<Employee[]>(employees);

  const scoped = filterEmployees(employeeList);

  const handleEmployeeCreated = (newEmp: any) => {
    const created: Employee = {
      id: newEmp.employeeId,
      name: newEmp.name || `${newEmp.firstName} ${newEmp.lastName}`,
      position: newEmp.title || 'Specialist',
      department: newEmp.department || 'Human Resources',
      company: activeCompanyName || 'ABC Foods Ltd',
      branch: activeBranchName || 'Corporate HQ',
      status: 'active',
      email: newEmp.email,
      phone: newEmp.phone || '+880 1700-000000',
      joined: new Date().toISOString().split('T')[0],
      manager: 'Executive Office',
      grade: 'L3',
      location: 'Dhaka',
      baseSalary: newEmp.baseSalary || 65000,
      bankName: newEmp.bankName,
      bankAccount: newEmp.bankAccount,
      nid: newEmp.nationalId,
      tin: newEmp.taxId,
    };
    setEmployeeList((prev) => [created, ...prev]);
  };

  const handleExport = (listToExport: Employee[] = scoped) => {
    const hasPrivilegedExport = can('sensitive.export');
    const headers = ['ID', 'Name', 'Position', 'Department', 'Company', 'Branch', 'Status', 'Base Salary', 'NID', 'Joined'];
    const rows = listToExport.map((emp) => {
      const salaryVal = hasPrivilegedExport ? (emp.baseSalary ? `৳${emp.baseSalary}` : '') : '৳ ••••••••';
      const nidVal = hasPrivilegedExport
        ? emp.nid || ''
        : emp.nid
        ? `••••-••••-${emp.nid.split('-').pop()}`
        : '••••••••••••';
      return [
        `"${emp.id}"`,
        `"${emp.name}"`,
        `"${emp.position}"`,
        `"${emp.department}"`,
        `"${emp.company}"`,
        `"${emp.branch}"`,
        `"${emp.status}"`,
        `"${salaryVal}"`,
        `"${nidVal}"`,
        `"${emp.joined}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `employees_${activeCompanyName.replace(/\s+/g, '_')}_${hasPrivilegedExport ? 'unmasked' : 'masked'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Emit immutable audit event
    recordAuditEvent({
      user: role.user || 'Unknown User',
      action: hasPrivilegedExport ? 'EXPORT_PRIVILEGED_DATA' : 'EXPORT_MASKED_DATA',
      resource: `Employee Register (${listToExport.length} rows)`,
      company: activeCompanyName,
      before: 'Database',
      after: hasPrivilegedExport
        ? `Exported unmasked dataset with sensitive fields (permission: sensitive.export)`
        : `Exported masked dataset per GDPR/SEC-03 policy (sensitive fields masked)`,
    });

    setExportNotice({
      message: hasPrivilegedExport
        ? `Exported ${listToExport.length} employee records with unmasked privileged fields.`
        : `Exported ${listToExport.length} employee records with masked sensitive compensation & NID fields (GDPR Compliant).`,
      tone: hasPrivilegedExport ? 'warning' : 'info',
    });

    setTimeout(() => setExportNotice(null), 5000);
  };

  const columns: Array<Column<Employee>> = [
    {
      key: 'name',
      header: 'Employee',
      sortable: true,
      hideable: false,
      value: (e) => e.name,
      render: (e) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface font-mono text-xs text-muted">
            {e.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink">{e.name}</span>
            <span className="block font-mono text-sm text-muted">{e.id}</span>
          </span>
        </div>
      ),
    },
    { key: 'position', header: 'Position', sortable: true, value: (e) => e.position, render: (e) => e.position },
    { key: 'department', header: 'Department', sortable: true, value: (e) => e.department, render: (e) => e.department },
    {
      key: 'baseSalary',
      header: 'Base Salary',
      sortable: true,
      value: (e) => e.baseSalary ?? 0,
      render: (e) => (
        <SensitiveField
          value={e.baseSalary}
          permission="sensitive.salary.read"
          domain="salary"
          label="Base Salary"
          resourceName={`${e.name} (${e.id})`}
          companyName={e.company}
          format="currency"
          mono
        />
      ),
    },
    {
      key: 'nid',
      header: 'National ID',
      value: (e) => e.nid ?? '',
      render: (e) => (
        <SensitiveField
          value={e.nid}
          permission="sensitive.nid.read"
          domain="nid"
          label="National ID"
          resourceName={`${e.name} (${e.id})`}
          companyName={e.company}
          format="nid"
          mono
        />
      ),
    },
    { key: 'company', header: 'Company', sortable: true, value: (e) => e.company, render: (e) => <span className="text-muted">{e.company}</span> },
    { key: 'branch', header: 'Branch', value: (e) => e.branch, render: (e) => <span className="text-muted">{e.branch}</span> },
    { key: 'joined', header: 'Joined', align: 'right', value: (e) => e.joined, render: (e) => <span className="text-muted">{e.joined}</span> },
    { key: 'status', header: 'Status', value: (e) => e.status, render: (e) => <StatusBadge status={e.status} /> },
  ];

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[
          { label: group.name, to: '/' },
          { label: activeCompanyName, to: '/companies' },
          { label: 'Employees' },
        ]}
        title="Employees"
        description="Master employee register across every company in your scope."
        meta={<Badge tone="accent">Scope: {activeCompanyName} · {activeBranchName} ({scoped.length} people)</Badge>}
        actions={
          can('employee.update') ? (
            <Button variant="primary" icon={PlusIcon} onClick={() => setIsModalOpen(true)}>
              Add employee
            </Button>
          ) : undefined
        }
      />

      {exportNotice && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm text-ink shadow-sm">
          {exportNotice.tone === 'warning' ? (
            <AlertTriangleIcon className="h-4 w-4 text-warning shrink-0" />
          ) : (
            <ShieldCheckIcon className="h-4 w-4 text-accent shrink-0" />
          )}
          <span>{exportNotice.message}</span>
        </div>
      )}

      <div className="p-6">
        <DataTable
          rows={scoped}
          columns={columns}
          getId={(e) => e.id}
          density={density}
          pageSize={10}
          selectable={can('employee.update')}
          onCreate={can('employee.update') ? { label: 'Add Employee', onClick: () => setIsModalOpen(true) } : undefined}
          onExport={() => handleExport(scoped)}
          bulkActions={
            <>
              <Button size="xs">Assign department</Button>
              <Button size="xs" onClick={() => handleExport(scoped)}>
                Export selected
              </Button>
              <Button size="xs" variant="danger">
                Deactivate
              </Button>
            </>
          }
          searchPlaceholder="Search employees, IDs, positions..."
          searchIn={(e) => `${e.name} ${e.id} ${e.position} ${e.department}`}
          filters={[
            {
              key: 'department',
              label: 'Department',
              options: [
                'Finance',
                'Human Resources',
                'Procurement',
                'Production',
                'Sales & Distribution',
                'Information Technology',
                'Fleet',
                'Warehouse',
              ],
              match: (e, v) => e.department === v,
            },
            {
              key: 'status',
              label: 'Status',
              options: ['active', 'on-leave', 'inactive', 'suspended'],
              match: (e, v) => e.status === v,
            },
            {
              key: 'branch',
              label: 'Branch',
              options: ['Corporate HQ', 'Savar Plant', 'Gazipur Plant II', 'Chattogram DC', 'Sylhet Sales Office'],
              match: (e, v) => e.branch === v,
            },
          ]}
          onRowClick={(e) => navigate(`/employees/${e.id}`)}
        />
      </div>

      <CreateEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleEmployeeCreated}
      />
    </div>
  );
}