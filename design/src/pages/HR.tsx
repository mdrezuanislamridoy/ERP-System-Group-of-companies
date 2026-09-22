import React, { useState } from 'react';
import { ClockIcon, SearchIcon, UserIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Tabs } from '../components/ui/Tabs';
import { Metric, MetricRow } from '../components/ui/Metric';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { StateBlock } from '../components/ui/States';
import { AttendanceCalendar } from '../components/hr/AttendanceCalendar';
import { attendanceToday, employees, leaveRequests } from '../data/people';
import { getViewableEmployees } from '../data/attendance';
import { branches, group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

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
  const [tab, setTab] = useState('attendance');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Managing other people's attendance/leave requires employee.read — a plain Staff/Employee
  // role never holds it, so they only ever get their own record, never the company roster.
  const canManageWorkforce = can('employee.read');
  const groupScoped = can('group.read');

  const companyBranches = branches.filter((b) => groupScoped || b.companyId === companyId);

  // Resolve current user's employee ID
  const myEmployeeId = user?.employeeId || 'EMP-10241';

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
          { id: 'leave', label: 'Leave', count: canManageWorkforce ? scopedLeaveRequests.length : myLeaveRequests.length }]
          }
          active={tab}
          onChange={setTab} />

      </div>

      <div className="space-y-4 p-6">
        {tab === 'attendance' ?
        canManageWorkforce ?
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
                    <p className="mt-1 font-mono text-3xl font-semibold leading-none text-ink">09:12 AM</p>
                    <p className="mt-1.5 text-base text-muted">Checked in · Corporate HQ — Gulshan</p>
                  </div>
                  <Button variant="danger" icon={ClockIcon}>
                    Check out
                  </Button>
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
          </div> :


        canManageWorkforce ?
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
          </Panel>
        }
      </div>
    </div>);

}
