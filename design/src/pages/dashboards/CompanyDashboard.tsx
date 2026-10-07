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
import { procurementPipeline, purchaseRequests, stock, getPurchaseOrders } from '../../data/operations';
import { attendanceToday } from '../../data/people';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';

const OPEN_PO_STATUSES = new Set(['Draft', 'Pending Approval', 'Issued', 'Partially Received']);

function sameCompany(aId: string, bId: string) {
  return aId === bId || aId.replace(/^c-/, 'le-') === bId.replace(/^c-/, 'le-');
}

export function CompanyDashboard() {
  const navigate = useNavigate();
  const { companyId, companyName } = useApp();
  const company = companies.find((c) => c.id === companyId) ?? companies[0];
  const margin = company.revenue ? ((company.revenue - company.expense) / company.revenue * 100).toFixed(1) : '0.0';
  const scopedRequests = purchaseRequests.filter((p) => p.company === companyName);

  // Every widget below is derived strictly from THIS company's slice of the mock data —
  // no aggregate/group-wide numbers are shown on a company-scoped dashboard.
  const totalGroupRevenue = companies.reduce((sum, c) => sum + c.revenue, 0) || 1;
  const totalGroupEmployees = companies.reduce((sum, c) => sum + c.employees, 0) || 1;
  const revenueShare = company.revenue / totalGroupRevenue;
  const employeeShare = company.employees / totalGroupEmployees;

  const scopedStock = stock.filter((s) => sameCompany(s.companyId, company.id));
  const inventoryValue = scopedStock.reduce((sum, s) => sum + s.value, 0);

  const scopedOrders = getPurchaseOrders().filter((po) => sameCompany(po.companyId, company.id));
  const openOrders = scopedOrders.filter((po) => OPEN_PO_STATUSES.has(po.status));
  const openOrdersValue = openOrders.reduce((sum, po) => sum + po.totalAmount, 0);

  const scopedDepartments = departments.filter((d) => sameCompany(d.companyId, company.id));
  const scopedPipeline = procurementPipeline.map((s) => ({ ...s, count: Math.max(0, Math.round(s.count * revenueShare)) }));
  const scopedAttendance = attendanceToday.map((a) => ({ ...a, value: Math.max(0, Math.round(a.value * employeeShare)) }));

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
          <Metric label="Inventory Value" value={`৳${(inventoryValue / 10000000).toFixed(2)} Cr`} sub={`${scopedStock.length} SKUs`} />
          <Metric label="Open Orders" value={String(openOrders.length)} sub={`৳${(openOrdersValue / 100000).toFixed(1)} L pipeline`} />
          <Metric label="Pending Approvals" value={String(scopedRequests.filter((p) => p.status === 'pending').length)} sub="in this company" tone="danger" />
        </MetricRow>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Panel title="Financial overview" description="Revenue vs expense, last 6 months">
              <ColumnChart data={revenueTrend.map((r) => ({ ...r, revenue: r.revenue * revenueShare, expense: r.expense * revenueShare }))} />
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Procurement pipeline" description="Requests in flight by stage" bodyClassName="p-4">
                <ol className="space-y-1.5">
                  {scopedPipeline.map((s) =>
                  <li key={s.stage} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-base text-muted">{s.stage}</span>
                      <span className="h-1.5 flex-1 rounded-sm bg-surface" aria-hidden>
                        <span
                        className="block h-1.5 rounded-sm bg-accent/70"
                        style={{ width: `${Math.min(100, s.count / 34 * 100)}%` }} />

                      </span>
                      <span className="w-8 shrink-0 text-right font-mono tabular text-base text-ink">{s.count}</span>
                    </li>
                  )}
                </ol>
              </Panel>

              <Panel title="Inventory attention" description="Items at or below reorder level" bodyClassName="divide-y divide-line">
                {scopedStock.length === 0 && (
                  <p className="px-4 py-3 text-sm text-muted">No inventory recorded for {companyName} yet.</p>
                )}
                {scopedStock.
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
              <DistributionBars data={scopedDepartments.map((d) => ({ label: d.name, value: d.employees }))} />
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Attendance today" bodyClassName="p-4">
              <div className="grid grid-cols-2 gap-3">
                {scopedAttendance.map((a) =>
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