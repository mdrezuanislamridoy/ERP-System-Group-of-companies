import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/ui/Panel';
import { Metric, MetricRow } from '../../components/ui/Metric';
import { Badge, StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { ColumnChart } from '../../components/charts/ColumnChart';
import { DistributionBars } from '../../components/charts/DistributionBars';
import { ActivityTimeline } from '../../components/ActivityTimeline';
import { companies, group, departments } from '../../data/organization';
import { revenueTrend } from '../../data/finance';
import { activity } from '../../data/system';
import { procurementPipeline, purchaseRequests, stock } from '../../data/operations';
import { attendanceToday } from '../../data/people';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';

export function CompanyDashboard() {
  const navigate = useNavigate();
  const { companyId, companyName } = useApp();
  const company = companies.find((c) => c.id === companyId) ?? companies[0];
  const margin = company.revenue ? ((company.revenue - company.expense) / company.revenue * 100).toFixed(1) : '0.0';
  const scopedRequests = purchaseRequests.filter((p) => p.company === companyName);

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: companyName }, { label: 'Dashboard' }]}
        title={companyName}
        description={`${company.sector} · ${company.employees.toLocaleString('en-IN')} employees · FY2026 to date`}
        meta={
        <>
            <Badge tone="accent">Company scope</Badge>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <CalendarIcon className="h-3 w-3" aria-hidden /> As of 21 Sep 2026, 11:04
            </span>
          </>
        }
        actions={
        <>
            <Button onClick={() => navigate('/employees')}>Employees</Button>
            <Button variant="primary" onClick={() => navigate('/finance')}>
              Finance overview
            </Button>
          </>
        } />
      

      <div className="space-y-4 p-6">
        <MetricRow columns={6}>
          <Metric label="Revenue (YTD)" value={`৳${(company.revenue / 100).toFixed(1)} Cr`} tone="success" emphasis />
          <Metric label="Expenses" value={`৳${(company.expense / 100).toFixed(1)} Cr`} tone="warning" />
          <Metric label="Net Profit" value={`৳${((company.revenue - company.expense) / 100).toFixed(1)} Cr`} sub={`${margin}% margin`} tone="success" />
          <Metric label="Inventory Value" value="৳31.4 Cr" sub="4 warehouses" />
          <Metric label="Open Orders" value="164" sub="৳12.8 Cr pipeline" />
          <Metric label="Pending Approvals" value={String(scopedRequests.filter((p) => p.status === 'pending').length)} sub="in this company" tone="danger" />
        </MetricRow>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Panel title="Financial overview" description="Revenue vs expense, last 6 months">
              <ColumnChart data={revenueTrend.map((r) => ({ ...r, revenue: r.revenue * 0.31, expense: r.expense * 0.31 }))} />
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Procurement pipeline" description="Requests in flight by stage" bodyClassName="p-4">
                <ol className="space-y-1.5">
                  {procurementPipeline.map((s) =>
                  <li key={s.stage} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-base text-muted">{s.stage}</span>
                      <span className="h-1.5 flex-1 rounded-sm bg-surface" aria-hidden>
                        <span
                        className="block h-1.5 rounded-sm bg-accent/70"
                        style={{ width: `${s.count / 34 * 100}%` }} />
                      
                      </span>
                      <span className="w-8 shrink-0 text-right font-mono tabular text-base text-ink">{s.count}</span>
                    </li>
                  )}
                </ol>
              </Panel>

              <Panel title="Inventory attention" description="Items at or below reorder level" bodyClassName="divide-y divide-line">
                {stock.
                filter((s) => s.status !== 'active').
                map((s) =>
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base text-ink">{s.product}</p>
                        <p className="font-mono text-sm text-muted">
                          {s.sku} · {s.warehouse}
                        </p>
                      </div>
                      <span className="font-mono tabular text-base text-ink">{s.available}</span>
                      <StatusBadge status={s.status} />
                    </div>
                )}
                <div className="px-4 py-2.5">
                  <Button variant="ghost" size="xs" onClick={() => navigate('/inventory')}>
                    Open inventory
                  </Button>
                </div>
              </Panel>
            </div>

            <Panel title="Departments" description="Headcount and ownership" bodyClassName="p-4">
              <DistributionBars data={departments.map((d) => ({ label: d.name, value: d.employees }))} />
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Attendance today" bodyClassName="p-4">
              <div className="grid grid-cols-2 gap-3">
                {attendanceToday.map((a) =>
                <div key={a.label} className="rounded border border-line bg-canvas px-3 py-2">
                    <p className="text-sm text-muted">{a.label}</p>
                    <p
                    className={cn(
                      'font-mono tabular text-lg font-semibold',
                      a.tone === 'success' ? 'text-success' : a.tone === 'warning' ? 'text-warning' : a.tone === 'danger' ? 'text-danger' : 'text-info'
                    )}>
                    
                      {a.value.toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>
            </Panel>

            <Panel
              title="Pending approvals"
              actions={
              <Button variant="ghost" size="xs" onClick={() => navigate('/approvals')}>
                  View all
                </Button>
              }
              bodyClassName="divide-y divide-line">
              
              {scopedRequests.
              filter((p) => p.status === 'pending').
              map((p) =>
              <button
                key={p.id}
                onClick={() => navigate(`/approvals/${p.id}`)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100 ease-out hover:bg-surface">
                
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base text-ink">{p.title}</p>
                      <p className="text-sm text-muted">
                        {p.id} · {p.department} · waiting on {p.stage}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono tabular text-base text-ink">
                      ৳{(p.amount / 1000).toFixed(0)}k
                    </span>
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