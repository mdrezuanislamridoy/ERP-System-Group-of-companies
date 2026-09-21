import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, ChevronDownIcon, PencilIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel, KeyValue } from '../components/ui/Panel';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { StateBlock } from '../components/ui/States';
import { SensitiveField } from '../components/common/SensitiveField';
import { employees } from '../data/people';
import { activity } from '../data/system';
import { group } from '../data/organization';
import { recordAuditEvent } from '../data/system';
import { useApp } from '../contexts/AppContext';
import { useEntityScope } from '../contexts/EntityScopeContext';
import { NotFound } from './NotFound';
import { Unauthorized } from './Unauthorized';

const TABS = [
{ id: 'overview', label: 'Overview' },
{ id: 'employment', label: 'Employment' },
{ id: 'attendance', label: 'Attendance' },
{ id: 'payroll', label: 'Payroll' },
{ id: 'documents', label: 'Documents' }];


export function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can, role } = useApp();
  const { canAccessCompany } = useEntityScope();
  const [tab, setTab] = useState('overview');

  const employee = employees.find((e) => e.id === id);
  if (!employee) return <NotFound />;

  // ABAC Scope Enforcement: check if employee belongs to an authorized company
  if (!canAccessCompany(employee.company)) {
    const audit = recordAuditEvent({
      user: role.user || 'Unknown User',
      action: 'SECURITY_ABAC_DENIAL',
      resource: `EMP:${employee.id} (${employee.name})`,
      company: employee.company,
      before: `Attempted direct access to employee in ${employee.company}`,
      after: 'Blocked: ERR_ABAC_COMPANY_ISOLATION (403 Forbidden)',
    });

    return (
      <Unauthorized
        reasonCode="ERR_ABAC_COMPANY_ISOLATION"
        attemptedResource={`${employee.name} (${employee.id})`}
        entityName={employee.company}
        correlationId={audit.correlation}
      />
    );
  }

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[
        { label: group.name, to: '/' },
        { label: employee.company, to: '/companies' },
        { label: 'Employees', to: '/employees' },
        { label: employee.name }]
        }
        title={employee.name}
        description={`${employee.position} · ${employee.department} · ${employee.branch}`}
        meta={
        <>
            <StatusBadge status={employee.status} />
            <span className="font-mono text-sm text-muted">{employee.id}</span>
            <span className="text-sm text-muted">Grade {employee.grade}</span>
          </>
        }
        actions={
        <>
            <Button icon={ArrowLeftIcon} onClick={() => navigate('/employees')}>
              Employees
            </Button>
            {can('employee.update') && <Button icon={PencilIcon}>Edit</Button>}
            {can('employee.update') &&
          <Button variant="primary">
                Actions
                <ChevronDownIcon className="h-3 w-3" aria-hidden />
              </Button>
          }
          </>
        } />
      

      <div className="px-6">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="p-6">
        {tab === 'overview' &&
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Personal information">
                <dl>
                  <KeyValue label="Full name" value={employee.name} />
                  <KeyValue label="Work email" value={employee.email} />
                  <KeyValue label="Phone" value={employee.phone} mono />
                  <KeyValue
                    label="National ID (NID)"
                    value={
                      <SensitiveField
                        value={employee.nid}
                        permission="sensitive.nid.read"
                        domain="nid"
                        label="National ID"
                        resourceName={`${employee.name} (${employee.id})`}
                        companyName={employee.company}
                        format="nid"
                        mono
                      />
                    }
                  />
                  <KeyValue
                    label="Tax ID (TIN)"
                    value={
                      <SensitiveField
                        value={employee.tin}
                        permission="sensitive.nid.read"
                        domain="tin"
                        label="Tax ID (TIN)"
                        resourceName={`${employee.name} (${employee.id})`}
                        companyName={employee.company}
                        format="tin"
                        mono
                      />
                    }
                  />
                  <KeyValue label="Location" value={employee.location} />
                </dl>
              </Panel>
              <Panel title="Employment information">
                <dl>
                  <KeyValue label="Employee ID" value={employee.id} mono />
                  <KeyValue label="Position" value={employee.position} />
                  <KeyValue label="Grade" value={employee.grade} mono />
                  <KeyValue label="Joined" value={employee.joined} />
                  <KeyValue
                    label="Base Salary"
                    value={
                      <SensitiveField
                        value={employee.baseSalary}
                        permission="sensitive.salary.read"
                        domain="salary"
                        label="Base Salary"
                        resourceName={`${employee.name} (${employee.id})`}
                        companyName={employee.company}
                        format="currency"
                        mono
                      />
                    }
                  />
                  <KeyValue
                    label="Disbursement Bank"
                    value={employee.bankName || 'Standard Chartered Bank'}
                  />
                  <KeyValue
                    label="Bank Account"
                    value={
                      <SensitiveField
                        value={employee.bankAccount}
                        permission="sensitive.bank.read"
                        domain="bank"
                        label="Bank Account"
                        resourceName={`${employee.name} (${employee.id})`}
                        companyName={employee.company}
                        format="bank"
                        mono
                      />
                    }
                  />
                </dl>
              </Panel>
              <Panel title="Organization">
                <dl>
                  <KeyValue label="Company" value={employee.company} />
                  <KeyValue label="Department" value={employee.department} />
                  <KeyValue label="Branch" value={employee.branch} />
                  <KeyValue label="Cost center" value="CC-FIN-001" mono />
                </dl>
              </Panel>
              <Panel title="Reporting">
                <dl>
                  <KeyValue label="Reporting manager" value={employee.manager} />
                  <KeyValue label="Approval delegate" value="Sabina Yasmin" />
                  <KeyValue label="Direct reports" value="4" mono />
                  <KeyValue label="Workflow roles" value="Finance Approver (≤ ৳5,00,000)" />
                </dl>
              </Panel>
            </div>
            <Panel title="Activity">
              <ActivityTimeline groups={activity} />
            </Panel>
          </div>
        }

        {tab === 'employment' &&
        <Panel title="Employment history" bodyClassName="p-0">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-line">
                  {['Effective', 'Position', 'Department', 'Grade', 'Change'].map((h) =>
                <th key={h} className="px-4 py-2 text-left text-sm font-semibold uppercase tracking-wide text-faint">
                      {h}
                    </th>
                )}
                </tr>
              </thead>
              <tbody>
                {[
              ['01 Jan 2025', 'Senior Accountant', 'Finance', 'G-07', 'Promotion'],
              ['01 Jan 2023', 'Accountant', 'Finance', 'G-06', 'Annual review'],
              ['12 Mar 2019', 'Junior Accountant', 'Finance', 'G-04', 'Joined']].
              map((row) =>
              <tr key={row[0]} className="border-b border-line/70 last:border-b-0">
                    {row.map((cell, i) =>
                <td key={i} className={i === 0 ? 'px-4 py-2 font-mono tabular text-muted' : 'px-4 py-2 text-ink'}>
                        {cell}
                      </td>
                )}
                  </tr>
              )}
              </tbody>
            </table>
          </Panel>
        }

        {tab === 'attendance' &&
        <Panel title="Attendance — September 2026" bodyClassName="p-4">
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 21 }).map((_, i) => {
              const state = i % 7 === 5 || i % 7 === 6 ? 'off' : i === 12 ? 'leave' : i % 9 === 4 ? 'late' : 'present';
              const cls =
              state === 'off' ?
              'bg-canvas text-faint' :
              state === 'leave' ?
              'bg-info-soft text-info' :
              state === 'late' ?
              'bg-warning-soft text-warning' :
              'bg-success-soft text-success';
              return (
                <div key={i} className={`rounded border border-line px-2 py-2 text-center ${cls}`}>
                    <p className="font-mono text-sm">{i + 1}</p>
                    <p className="text-2xs uppercase">{state}</p>
                  </div>);

            })}
            </div>
          </Panel>
        }

        {tab === 'payroll' && (
        can('payroll.read') ?
        <Panel title="Payroll history" bodyClassName="p-0">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-line">
                    {['Period', 'Gross', 'Deductions', 'Net pay', 'Status'].map((h) =>
                <th key={h} className="px-4 py-2 text-left text-sm font-semibold uppercase tracking-wide text-faint">
                        {h}
                      </th>
                )}
                  </tr>
                </thead>
                <tbody>
                  {[
              ['September 2026', '118,000', '14,200', '103,800', 'processing'],
              ['August 2026', '118,000', '14,200', '103,800', 'completed'],
              ['July 2026', '112,000', '13,400', '98,600', 'completed']].
              map((row) =>
              <tr key={row[0]} className="border-b border-line/70 last:border-b-0">
                      <td className="px-4 py-2 text-ink">{row[0]}</td>
                      <td className="px-4 py-2 font-mono tabular text-ink">
                        <SensitiveField
                          value={row[1]}
                          permission="sensitive.salary.read"
                          domain="salary"
                          label={`Gross Pay (${row[0]})`}
                          resourceName={`${employee.name} (${employee.id})`}
                          companyName={employee.company}
                          format="currency"
                          mono
                        />
                      </td>
                      <td className="px-4 py-2 font-mono tabular text-muted">−৳{row[2]}</td>
                      <td className="px-4 py-2 font-mono tabular text-ink">
                        <SensitiveField
                          value={row[3]}
                          permission="sensitive.salary.read"
                          domain="salary"
                          label={`Net Pay (${row[0]})`}
                          resourceName={`${employee.name} (${employee.id})`}
                          companyName={employee.company}
                          format="currency"
                          mono
                        />
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={row[4] as 'completed'} />
                      </td>
                    </tr>
              )}
                </tbody>
              </table>
            </Panel> :

        <div className="rounded-lg border border-line bg-subtle">
              <StateBlock
            variant="denied"
            title="Payroll is restricted"
            description="Viewing payroll for other employees requires the payroll.read permission, granted by HR or Group IT." />
          
            </div>)
        }

        {tab === 'documents' &&
        <div className="rounded-lg border border-line bg-subtle">
            <StateBlock
            title="No documents uploaded"
            description="Contracts, NID copies and certifications for this employee will appear here once uploaded."
            primary={can('employee.update') ? { label: 'Upload document', onClick: () => undefined } : undefined} />
          
          </div>
        }
      </div>
    </div>);

}