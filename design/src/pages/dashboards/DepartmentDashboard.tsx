import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/ui/Panel';
import { Metric, MetricRow } from '../../components/ui/Metric';
import { Badge, StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { TrendChart } from '../../components/charts/TrendChart';
import { ActivityTimeline } from '../../components/ActivityTimeline';
import { group } from '../../data/organization';
import { employees } from '../../data/people';
import { purchaseRequests } from '../../data/operations';
import { activity } from '../../data/system';
import { useApp } from '../../contexts/AppContext';

const expenseTrend = [
{ month: 'Apr', value: 2.1 },
{ month: 'May', value: 2.3 },
{ month: 'Jun', value: 2.0 },
{ month: 'Jul', value: 2.6 },
{ month: 'Aug', value: 2.2 },
{ month: 'Sep', value: 2.4 }];


export function DepartmentDashboard() {
  const navigate = useNavigate();
  const { role, companyName } = useApp();
  // orgLabel looks like "ABC Foods Ltd. · Finance" — the part after the separator is the department.
  const deptLabel = role.scopeLabel.includes('·') ? role.scopeLabel.split('·')[1].trim() : role.title;
  const team = employees.filter((e) => e.company === companyName && (deptLabel === role.title || e.department === deptLabel));
  const scopedRequests = purchaseRequests.filter((p) => p.company === companyName);

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[
        { label: group.name, to: '/' },
        { label: companyName, to: '/company' },
        { label: deptLabel },
        { label: 'Department Dashboard' }]
        }
        title={`${deptLabel} Department`}
        description={`Accounts payable, receivable and treasury for ${companyName}.`}
        meta={<Badge tone="accent">Department scope · {deptLabel}</Badge>}
        actions={
        <>
            <Button onClick={() => navigate('/finance/invoices')}>Invoices</Button>
            <Button variant="primary" onClick={() => navigate('/approvals')}>
              Review approvals
            </Button>
          </>
        } />
      

      <div className="space-y-4 p-6">
        <MetricRow>
          <Metric label="Pending Approvals" value="14" sub="3 breaching SLA" delta="3 late" tone="danger" emphasis />
          <Metric label="Department Employees" value="32" sub="2 on leave" />
          <Metric label="Open Requests" value="8" sub="৳4.2 L committed" />
          <Metric label="Monthly Expense" value="৳2.4 M" delta="+4.1%" tone="warning" sub="vs budget ৳2.6 M" />
        </MetricRow>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Panel
              title="Pending approvals"
              description="Items waiting on you or your team"
              actions={
              <Button variant="ghost" size="xs" onClick={() => navigate('/approvals')}>
                  Open queue
                </Button>
              }
              bodyClassName="divide-y divide-line">
              
              {scopedRequests.slice(0, 4).map((p) =>
              <button
                key={p.id}
                onClick={() => navigate(`/approvals/${p.id}`)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100 ease-out hover:bg-surface">
                
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base text-ink">{p.title}</p>
                    <p className="text-sm text-muted">
                      {p.id} · {p.requester} · {p.created}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono tabular text-base text-ink">
                    ৳{p.amount.toLocaleString('en-IN')}
                  </span>
                  <StatusBadge status={p.status} />
                </button>
              )}
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Department expense" description="Monthly spend, ৳ millions">
                <TrendChart data={expenseTrend} label="Department monthly expense" />
              </Panel>
              <Panel title="Tasks" bodyClassName="divide-y divide-line">
                {[
                { label: 'Close August GL and post accruals', due: 'Due today', tone: 'danger' as const },
                { label: 'Vendor reconciliation — Meghna Packaging', due: 'Due in 2 days', tone: 'warning' as const },
                { label: 'Prepare Q3 budget variance pack', due: 'Due 28 Sep', tone: 'muted' as const },
                { label: 'Review AR ageing above 90 days', due: 'Due 30 Sep', tone: 'muted' as const }].
                map((t) =>
                <label key={t.label} className="flex cursor-pointer items-start gap-2.5 px-4 py-2.5 hover:bg-surface">
                    <input type="checkbox" className="mt-1 h-3 w-3 accent-[#3B82F6]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base text-ink">{t.label}</span>
                      <span
                      className={
                      t.tone === 'danger' ?
                      'text-sm text-danger' :
                      t.tone === 'warning' ?
                      'text-sm text-warning' :
                      'text-sm text-muted'
                      }>
                      
                        {t.due}
                      </span>
                    </span>
                  </label>
                )}
              </Panel>
            </div>
          </div>

          <div className="space-y-4">
            <Panel
              title="Department employees"
              actions={
              <Button variant="ghost" size="xs" onClick={() => navigate('/employees')}>
                  All
                </Button>
              }
              bodyClassName="divide-y divide-line">
              
              {team.map((e) =>
              <button
                key={e.id}
                onClick={() => navigate(`/employees/${e.id}`)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-100 ease-out hover:bg-surface">
                
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface font-mono text-xs text-muted">
                    {e.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base text-ink">{e.name}</span>
                    <span className="block truncate text-sm text-muted">{e.position}</span>
                  </span>
                  <StatusBadge status={e.status} />
                </button>
              )}
            </Panel>

            <Panel title="Recent activity">
              <ActivityTimeline groups={activity} />
            </Panel>
          </div>
        </div>
      </div>
    </div>);

}