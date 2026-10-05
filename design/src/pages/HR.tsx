import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClockIcon, PlayIcon, SearchIcon, UserIcon, WalletIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Tabs } from '../components/ui/Tabs';
import { Metric, MetricRow } from '../components/ui/Metric';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { StateBlock } from '../components/ui/States';
import { SensitiveField } from '../components/common/SensitiveField';
import { AttendanceCalendar } from '../components/hr/AttendanceCalendar';
import { PayslipModal } from '../components/hr/PayslipModal';
import { RunPayrollModal } from '../components/hr/RunPayrollModal';
import { attendanceToday, employees, leaveRequests } from '../data/people';
import { clockIn, clockOut, getTodayClockState, getViewableEmployees, subscribeClock } from '../data/attendance';
import {
  finalizePayrollRun,
  getPayrollRuns,
  getPayslipsForEmployee,
  getPayslipsForRun,
  getSalaryStructure,
  subscribePayroll,
  type Payslip,
} from '../data/payroll';
import { recordAuditEvent } from '../data/system';
import { branches, group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

function money(n: number): string {
  return `৳${Math.round(n).toLocaleString('en-IN')}`;
}

// Per-branch attendance detail, keyed to the branch record so it always travels with the
// company it belongs to (see data/organization.ts) instead of living as a separate literal list.
const BRANCH_ATTENDANCE: Record<string, {present: number;late: number;onLeave: number;absent: number;}> = {
  'b-hq': { present: 392, late: 18, onLeave: 6, absent: 4 },
  'b-plant1': { present: 902, late: 41, onLeave: 22, absent: 15 },
  'b-plant2': { present: 468, late: 24, onLeave: 18, absent: 10 },
  'b-dc': { present: 156, late: 9, onLeave: 9, absent: 6 },
  'b-sales': { present: 34, late: 2, onLeave: 2, absent: 2 }
};

export function HR() {
  const { role, can, companyId, companyName } = useApp();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'attendance');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Managing other people's attendance/leave requires employee.read — a plain Staff/Employee
  // role never holds it, so they only ever get their own record, never the company roster.
  const canManageWorkforce = can('employee.read');
  const groupScoped = can('group.read');

  // Payroll visibility/authority is a distinct grant — a Company CFO holds payroll.read
  // without employee.read, so the company payroll register must not be gated on the latter.
  const canViewCompanyPayroll = can('payroll.read');
  const canManagePayroll = can('payroll.manage');

  const companyBranches = branches.filter((b) => groupScoped || b.companyId === companyId);

  // Resolve current user's employee ID
  const myEmployeeId = user?.employeeId || 'EMP-10241';

  // Live clock in/out state for the self-service strip
  const [clockState, setClockState] = useState(() => getTodayClockState(myEmployeeId));
  const [clockError, setClockError] = useState<string | null>(null);
  useEffect(() => subscribeClock(() => setClockState(getTodayClockState(myEmployeeId))), [myEmployeeId]);

  const handleClockAction = () => {
    try {
      setClockError(null);
      if (!clockState?.checkInAt) {
        clockIn(myEmployeeId);
      } else if (!clockState.checkOutAt) {
        clockOut(myEmployeeId);
      }
    } catch (err) {
      setClockError(err instanceof Error ? err.message : 'Failed to record attendance.');
    }
  };

  // Payroll register state (company view) + self-service payslip state
  const [, setPayrollTick] = useState(0);
  useEffect(() => subscribePayroll(() => setPayrollTick((t) => t + 1)), []);
  const payrollRuns = getPayrollRuns(companyName, groupScoped);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const runPayslips = selectedRunId ? getPayslipsForRun(selectedRunId) : [];
  const myPayslips = getPayslipsForEmployee(myEmployeeId);
  const mySalaryStructure = getSalaryStructure(myEmployeeId);

  const handleFinalizeRun = (runId: string) => {
    try {
      const run = finalizePayrollRun(runId, role.user || 'Unknown User');
      recordAuditEvent({
        user: role.user || 'Unknown User',
        action: 'PAYROLL_RUN_FINALIZED',
        resource: `${run.id} · ${run.periodLabel}`,
        company: run.company,
        before: 'Processing',
        after: `Completed · Net ${money(run.totalNet)} disbursed to ${run.employeeCount} employees`,
      });
    } catch {
      // Already finalized by another actor — the row will simply reflect current status.
    }
  };

  // Get employees this user can view attendance for
  const viewableEmployees = getViewableEmployees(myEmployeeId, companyName, canManageWorkforce, groupScoped);
  const filteredEmployees = employeeSearch
    ? viewableEmployees.filter(
        (e) =>
          e.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
          e.id.toLowerCase().includes(employeeSearch.toLowerCase()) ||
          e.department.toLowerCase().includes(employeeSearch.toLowerCase())
      )
    : viewableEmployees;

  // Currently selected employee for the calendar
  const activeCalendarEmpId = selectedEmployeeId || (canManageWorkforce ? '' : myEmployeeId);
  const activeCalendarEmp = employees.find((e) => e.id === activeCalendarEmpId);

  const scopedLeaveRequests = groupScoped ?
  leaveRequests :
  leaveRequests.filter((l) => employees.find((e) => e.name === l.employee)?.company === companyName);

  const myLeaveRequests = leaveRequests.filter((l) => l.employee === role.user);

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: companyName }, { label: 'People' }, { label: 'Attendance & Leave' }]}
        title="Attendance & Leave"
        description={
        canManageWorkforce ?
        'Daily attendance position and the leave pipeline for your context.' :
        'Your own attendance and leave — visible only to you and your manager.'
        }
        meta={<Badge tone="accent">Context: {companyName}</Badge>}
        actions={
        <>
            {canManageWorkforce && <Button>Export register</Button>}
            <Button variant="primary">Apply for leave</Button>
          </>
        } />


      <div className="px-6">
        <Tabs
          tabs={[
          { id: 'attendance', label: 'Attendance' },
          { id: 'leave', label: 'Leave', count: canManageWorkforce ? scopedLeaveRequests.length : myLeaveRequests.length },
          { id: 'payroll', label: 'Payroll', count: canViewCompanyPayroll ? payrollRuns.length : myPayslips.length }]
          }
          active={tab}
          onChange={setTab} />

      </div>

      <div className="space-y-4 p-6">
        {tab === 'attendance' &&
        (canManageWorkforce ?
        <>
            <MetricRow>
              {attendanceToday.map((a) =>
              <Metric
                key={a.label}
                label={a.label}
                value={a.value.toLocaleString('en-IN')}
                tone={a.tone}
                sub="as of 11:04 today"
                emphasis={a.label === 'Present'} />

              )}
            </MetricRow>

            <Panel title="Attendance by branch" description={`Today, 21 September 2026 · ${companyName}`} bodyClassName="p-0">
              {companyBranches.length === 0 ?
              <StateBlock
                variant="empty"
                title="No branches configured"
                description={`${companyName} has not set up branch-level attendance tracking yet.`} /> :


              <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-line">
                      {['Branch', 'Headcount', 'Present', 'Late', 'On leave', 'Absent'].map((h, i) =>
                  <th
                    key={h}
                    className={cn(
                      'px-4 py-2 text-sm font-semibold uppercase tracking-wide text-faint',
                      i === 0 ? 'text-left' : 'text-right'
                    )}>

                          {h}
                        </th>
                  )}
                    </tr>
                  </thead>
                  <tbody>
                    {companyBranches.map((b) => {
                    const a = BRANCH_ATTENDANCE[b.id] ?? { present: 0, late: 0, onLeave: 0, absent: 0 };
                    return (
                      <tr key={b.id} className="border-b border-line/70 last:border-b-0 hover:bg-surface">
                          <td className="px-4 py-2 text-ink">{b.name}</td>
                          <td className="px-4 py-2 text-right font-mono tabular text-muted">{b.employees}</td>
                          <td className="px-4 py-2 text-right font-mono tabular text-ink">{a.present}</td>
                          <td className="px-4 py-2 text-right font-mono tabular text-ink">{a.late}</td>
                          <td className="px-4 py-2 text-right font-mono tabular text-ink">{a.onLeave}</td>
                          <td className="px-4 py-2 text-right font-mono tabular text-ink">{a.absent}</td>
                        </tr>);

                  })}
                  </tbody>
                </table>
              }
            </Panel>

            {/* Employee Day-Wise Attendance Register (Manager/HR View) */}
            <Panel
              title="Employee Day-Wise Attendance Register"
              description="Select any employee within your scope to view their detailed monthly attendance."
            >
              {/* Employee Selector */}
              <div className="mb-4">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Search employees by name, ID, or department..."
                    className="w-full rounded-lg border border-line bg-canvas pl-10 pr-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                  />
                </div>

                {!activeCalendarEmpId && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {filteredEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setSelectedEmployeeId(emp.id);
                          setEmployeeSearch('');
                        }}
                        className="flex items-center gap-2.5 rounded-lg border border-line bg-surface p-2.5 text-left hover:border-accent/40 hover:bg-accent-soft/20 transition-colors"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas border border-line text-muted">
                          <UserIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink truncate">{emp.name}</p>
                          <p className="text-2xs text-muted truncate">
                            {emp.id} · {emp.department} · {emp.company}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {activeCalendarEmpId && (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-muted">
                      Viewing: <strong className="text-ink">{activeCalendarEmp?.name}</strong> ({activeCalendarEmpId})
                    </p>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setSelectedEmployeeId('')}
                    >
                      Change employee
                    </Button>
                  </div>
                )}
              </div>

              {activeCalendarEmpId ? (
                <AttendanceCalendar
                  employeeId={activeCalendarEmpId}
                  employeeName={activeCalendarEmp?.name}
                />
              ) : (
                <div className="py-8 text-center">
                  <UserIcon className="mx-auto h-8 w-8 text-muted/40 mb-2" />
                  <p className="text-sm text-muted">Select an employee above to view their day-wise attendance register.</p>
                </div>
              )}
            </Panel>
          </> :

        /* Self-Service View: Every employee sees their own attendance */
        <div className="space-y-4">
            {/* Today's Status Strip */}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <section className="rounded-xl border border-line bg-subtle p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted">Your attendance today</p>
                    <p className="mt-1 font-mono text-3xl font-semibold leading-none text-ink">
                      {clockState?.checkOutAt ?? clockState?.checkInAt ?? '—:—'}
                    </p>
                    <p className="mt-1.5 text-base text-muted">
                      {clockState?.checkOutAt
                        ? `Checked out · in at ${clockState.checkInAt}`
                        : clockState?.checkInAt
                          ? 'Checked in · Corporate HQ — Gulshan'
                          : 'Not checked in yet'}
                    </p>
                    {clockError && <p className="mt-1 text-sm text-danger">{clockError}</p>}
                  </div>
                  {!clockState?.checkOutAt && (
                    <Button
                      variant={clockState?.checkInAt ? 'danger' : 'primary'}
                      icon={ClockIcon}
                      onClick={handleClockAction}
                    >
                      {clockState?.checkInAt ? 'Check out' : 'Check in'}
                    </Button>
                  )}
                </div>
              </section>
              <Panel title="Leave balance" bodyClassName="p-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="font-mono text-2xl font-semibold text-ink">12</p>
                    <p className="text-sm text-muted">Annual</p>
                  </div>
                  <div>
                    <p className="font-mono text-2xl font-semibold text-ink">6</p>
                    <p className="text-sm text-muted">Sick</p>
                  </div>
                  <div>
                    <p className="font-mono text-2xl font-semibold text-ink">3</p>
                    <p className="text-sm text-muted">Casual</p>
                  </div>
                </div>
              </Panel>
            </div>

            {/* Full Day-Wise Attendance Calendar */}
            <Panel title="My Monthly Attendance" description="Your day-wise attendance register for the current period">
              <AttendanceCalendar employeeId={myEmployeeId} />
            </Panel>
          </div>)
        }

        {tab === 'leave' &&
        (canManageWorkforce ?
        <Panel
          title="Leave requests"
          description={`Current and recent leave within ${companyName}`}
          bodyClassName="p-0">

            {scopedLeaveRequests.length === 0 ?
          <StateBlock variant="empty" title="No leave requests" description={`No leave has been logged for ${companyName} yet.`} /> :

          <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-line">
                    {['Request', 'Employee', 'Type', 'Period', 'Days', 'Status', ''].map((h, i) =>
              <th
                key={h + i}
                className={cn(
                  'px-4 py-2 text-sm font-semibold uppercase tracking-wide text-faint',
                  i === 4 ? 'text-right' : 'text-left'
                )}>

                        {h}
                      </th>
              )}
                  </tr>
                </thead>
                <tbody>
                  {scopedLeaveRequests.map((l) =>
            <tr key={l.id} className="border-b border-line/70 last:border-b-0 hover:bg-surface">
                      <td className="px-4 py-2 font-mono tabular text-muted">{l.id}</td>
                      <td className="px-4 py-2 text-ink">{l.employee}</td>
                      <td className="px-4 py-2 text-muted">{l.type}</td>
                      <td className="px-4 py-2 text-muted">
                        {l.from} → {l.to}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular text-ink">{l.days}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={l.status} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        {l.status === 'pending' &&
                <span className="flex justify-end gap-1">
                            <Button size="xs" variant="success">
                              Approve
                            </Button>
                            <Button size="xs" variant="danger">
                              Reject
                            </Button>
                          </span>
                }
                      </td>
                    </tr>
            )}
                </tbody>
              </table>
          }
          </Panel> :

        <Panel title="My leave requests" description="Only your own requests — nobody else's leave is visible here" bodyClassName="p-0">
            {myLeaveRequests.length === 0 ?
          <StateBlock variant="empty" title="No leave requests yet" description="Requests you submit will appear here with their live approval status." /> :

          <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-line">
                    {['Request', 'Type', 'Period', 'Days', 'Status'].map((h, i) =>
              <th
                key={h + i}
                className={cn(
                  'px-4 py-2 text-sm font-semibold uppercase tracking-wide text-faint',
                  i === 3 ? 'text-right' : 'text-left'
                )}>

                        {h}
                      </th>
              )}
                  </tr>
                </thead>
                <tbody>
                  {myLeaveRequests.map((l) =>
            <tr key={l.id} className="border-b border-line/70 last:border-b-0 hover:bg-surface">
                      <td className="px-4 py-2 font-mono tabular text-muted">{l.id}</td>
                      <td className="px-4 py-2 text-muted">{l.type}</td>
                      <td className="px-4 py-2 text-muted">
                        {l.from} → {l.to}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular text-ink">{l.days}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={l.status} />
                      </td>
                    </tr>
            )}
                </tbody>
              </table>
          }
          </Panel>)
        }

        {tab === 'payroll' &&
        (canViewCompanyPayroll ?
        <div className="space-y-4">
            <MetricRow columns={3}>
              <Metric label="Payroll runs" value={String(payrollRuns.length)} sub={groupScoped ? 'Group-wide' : companyName} />
              <Metric
                label="Total net disbursed"
                value={money(payrollRuns.reduce((s, r) => s + r.totalNet, 0))}
                sub="Across all runs"
                emphasis
              />
              <Metric
                label="Pending finalization"
                value={String(payrollRuns.filter((r) => r.status === 'processing').length)}
                tone={payrollRuns.some((r) => r.status === 'processing') ? 'warning' : 'neutral'}
                sub="Runs awaiting disbursement"
              />
            </MetricRow>

            <Panel
              title="Payroll runs"
              description={groupScoped ? 'Payroll history across the group' : `Payroll history for ${companyName}`}
              actions={canManagePayroll && <Button variant="primary" icon={PlayIcon} onClick={() => setRunModalOpen(true)}>Run payroll</Button>}
              bodyClassName="p-0"
            >
              {payrollRuns.length === 0 ?
              <StateBlock variant="empty" title="No payroll runs yet" description="Run payroll for a period to generate payslips for every salaried employee in scope." /> :
              <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-line">
                      {['Period', ...(groupScoped ? ['Company'] : []), 'Employees', 'Gross', 'Deductions', 'Net pay', 'Status', ''].map((h, i) =>
                  <th key={h + i} className="px-4 py-2 text-left text-sm font-semibold uppercase tracking-wide text-faint">
                          {h}
                        </th>
                  )}
                    </tr>
                  </thead>
                  <tbody>
                    {payrollRuns.map((run) =>
                <tr key={run.id} className="border-b border-line/70 last:border-b-0 hover:bg-surface">
                        <td className="px-4 py-2 text-ink">{run.periodLabel}</td>
                        {groupScoped && <td className="px-4 py-2 text-muted">{run.company}</td>}
                        <td className="px-4 py-2 font-mono tabular text-muted">{run.employeeCount}</td>
                        <td className="px-4 py-2 font-mono tabular text-ink">{money(run.totalGross)}</td>
                        <td className="px-4 py-2 font-mono tabular text-muted">−{money(run.totalDeductions)}</td>
                        <td className="px-4 py-2 font-mono tabular text-ink">{money(run.totalNet)}</td>
                        <td className="px-4 py-2"><StatusBadge status={run.status} /></td>
                        <td className="px-4 py-2 text-right">
                          <span className="flex justify-end gap-1.5">
                            <Button size="xs" onClick={() => setSelectedRunId(selectedRunId === run.id ? null : run.id)}>
                              {selectedRunId === run.id ? 'Hide payslips' : 'View payslips'}
                            </Button>
                            {run.status === 'processing' && canManagePayroll &&
                        <Button size="xs" variant="success" onClick={() => handleFinalizeRun(run.id)}>
                                Finalize & disburse
                              </Button>
                        }
                          </span>
                        </td>
                      </tr>
                )}
                  </tbody>
                </table>
              }
            </Panel>

            {selectedRunId &&
            <Panel title={`Payslips — ${payrollRuns.find((r) => r.id === selectedRunId)?.periodLabel ?? ''}`} bodyClassName="p-0">
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-line">
                      {['Employee', 'Department', 'Gross', 'Deductions', 'Net pay', 'Status', ''].map((h, i) =>
                  <th key={h + i} className="px-4 py-2 text-left text-sm font-semibold uppercase tracking-wide text-faint">
                          {h}
                        </th>
                  )}
                    </tr>
                  </thead>
                  <tbody>
                    {runPayslips.map((p) =>
                <tr key={p.id} className="border-b border-line/70 last:border-b-0 hover:bg-surface">
                        <td className="px-4 py-2">
                          <p className="text-ink">{p.employeeName}</p>
                          <p className="font-mono text-sm text-muted">{p.employeeId}</p>
                        </td>
                        <td className="px-4 py-2 text-muted">{p.department}</td>
                        <td className="px-4 py-2 font-mono tabular text-ink">
                          <SensitiveField value={p.grossPay} permission="sensitive.salary.read" domain="salary" label="Gross Pay" resourceName={`${p.employeeName} (${p.employeeId})`} companyName={p.company} format="currency" mono />
                        </td>
                        <td className="px-4 py-2 font-mono tabular text-muted">−{money(p.deductions.total)}</td>
                        <td className="px-4 py-2 font-mono tabular text-ink">
                          <SensitiveField value={p.netPay} permission="sensitive.salary.read" domain="salary" label="Net Pay" resourceName={`${p.employeeName} (${p.employeeId})`} companyName={p.company} format="currency" mono />
                        </td>
                        <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-2 text-right">
                          <Button size="xs" onClick={() => setSelectedPayslip(p)}>View</Button>
                        </td>
                      </tr>
                )}
                  </tbody>
                </table>
              </Panel>
            }
          </div> :

        <div className="space-y-4">
            {mySalaryStructure &&
            <Panel title="My salary structure" description="Effective monthly breakdown" bodyClassName="p-0">
                <table className="w-full text-base">
                  <tbody>
                    {[
                  ['Basic Salary', mySalaryStructure.basic],
                  ['House Rent Allowance', mySalaryStructure.houseRent],
                  ['Medical Allowance', mySalaryStructure.medical],
                  ['Conveyance Allowance', mySalaryStructure.conveyance],
                  ['Other Allowance', mySalaryStructure.other]].
                  map(([label, amount]) =>
                  <tr key={label as string} className="border-b border-line/70 last:border-b-0">
                        <td className="px-4 py-2 text-muted">{label}</td>
                        <td className="px-4 py-2 text-right font-mono tabular text-ink">{money(amount as number)}</td>
                      </tr>
                  )}
                    <tr>
                      <td className="px-4 py-2 font-semibold text-ink">Gross Monthly</td>
                      <td className="px-4 py-2 text-right font-mono tabular font-semibold text-ink">{money(mySalaryStructure.grossMonthly)}</td>
                    </tr>
                  </tbody>
                </table>
              </Panel>
            }

            <Panel title="My payslips" description="Your payroll history — visible only to you" bodyClassName="p-0">
              {myPayslips.length === 0 ?
              <StateBlock variant="empty" title="No payslips yet" description="Payslips will appear here once payroll has been run for your company." /> :
              <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-line">
                      {['Period', 'Gross', 'Deductions', 'Net pay', 'Status', ''].map((h, i) =>
                  <th key={h + i} className="px-4 py-2 text-left text-sm font-semibold uppercase tracking-wide text-faint">
                          {h}
                        </th>
                  )}
                    </tr>
                  </thead>
                  <tbody>
                    {myPayslips.map((p) =>
                <tr key={p.id} className="border-b border-line/70 last:border-b-0 hover:bg-surface">
                        <td className="px-4 py-2 text-ink">{p.periodLabel}</td>
                        <td className="px-4 py-2 font-mono tabular text-ink">{money(p.grossPay)}</td>
                        <td className="px-4 py-2 font-mono tabular text-muted">−{money(p.deductions.total)}</td>
                        <td className="px-4 py-2 font-mono tabular text-ink">{money(p.netPay)}</td>
                        <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-2 text-right">
                          <Button size="xs" icon={WalletIcon} onClick={() => setSelectedPayslip(p)}>View</Button>
                        </td>
                      </tr>
                )}
                  </tbody>
                </table>
              }
            </Panel>
          </div>)
        }
      </div>

      <RunPayrollModal
        isOpen={runModalOpen}
        onClose={() => setRunModalOpen(false)}
        lockedCompany={companyName}
        groupScoped={groupScoped}
      />
      <PayslipModal
        isOpen={Boolean(selectedPayslip)}
        payslip={selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
      />
    </div>);

}
