import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRightIcon, CalendarIcon, DownloadIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/ui/Panel';
import { Metric, MetricRow } from '../../components/ui/Metric';
import { Badge, StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/DataTable';
import { ColumnChart } from '../../components/charts/ColumnChart';
import { TrendChart } from '../../components/charts/TrendChart';
import { DistributionBars } from '../../components/charts/DistributionBars';
import { ActivityTimeline } from '../../components/ActivityTimeline';
import { companies, group } from '../../data/organization';
import { departmentSplit, groupKpis, headcountTrend, revenueTrend } from '../../data/finance';
import { activity, alerts } from '../../data/system';
import { purchaseRequests } from '../../data/operations';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';
import type { Company } from '../../types';

export function GroupDashboard() {
  const navigate = useNavigate();
  const { density, can } = useApp();

  const columns: Array<Column<Company>> = [
  {
    key: 'name',
    header: 'Company',
    sortable: true,
    value: (c) => c.name,
    render: (c) =>
    <div className="min-w-0">
          <p className="truncate font-medium text-ink">{c.name}</p>
          <p className="text-sm text-muted">{c.sector}</p>
        </div>

  },
  { key: 'revenue', header: 'Revenue', align: 'right', mono: true, sortable: true, value: (c) => c.revenue, render: (c) => `৳${(c.revenue / 100).toFixed(2)} Cr` },
  { key: 'expense', header: 'Expense', align: 'right', mono: true, sortable: true, value: (c) => c.expense, render: (c) => `৳${(c.expense / 100).toFixed(2)} Cr` },
  {
    key: 'margin',
    header: 'Margin',
    align: 'right',
    sortable: true,
    value: (c) => c.margin,
    render: (c) =>
    <span className={cn('font-mono tabular', c.margin < 8 ? 'text-danger' : c.margin < 15 ? 'text-warning' : 'text-success')}>
          {c.margin.toFixed(1)}%
        </span>

  },
  { key: 'employees', header: 'Headcount', align: 'right', mono: true, sortable: true, value: (c) => c.employees, render: (c) => c.employees.toLocaleString('en-IN') },
  { key: 'status', header: 'Status', value: (c) => c.status, render: (c) => <StatusBadge status={c.status} /> }];


  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name }, { label: 'Group Overview' }]}
        title="Group Overview"
        description="Consolidated performance across 24 operating companies, FY2026 to date."
        meta={
        <>
            <Badge tone="accent">Group scope</Badge>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <CalendarIcon className="h-3 w-3" aria-hidden /> As of 21 Sep 2026, 11:04
            </span>
          </>
        }
        actions={
        <>
            <Button icon={DownloadIcon}>Export</Button>
            <Button variant="primary" onClick={() => navigate('/reports')}>
              Open group reports
            </Button>
          </>
        } />
      

      <div className="space-y-4 p-6">
        <MetricRow>
          {groupKpis.map((k, i) =>
          <Metric key={k.label} {...k} emphasis={i === 2} />
          )}
        </MetricRow>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Company performance</h2>
                  <p className="text-sm text-muted">Top 6 contributors by revenue. Select a company to drill into its dashboard.</p>
                </div>
                <Button variant="ghost" size="xs" onClick={() => navigate('/companies')}>
                  All 24 companies
                </Button>
              </div>
              <DataTable
                rows={companies}
                columns={columns}
                getId={(c) => c.id}
                density={density}
                pageSize={6}
                searchPlaceholder="Search companies..."
                searchIn={(c) => `${c.name} ${c.sector}`}
                filters={[
                { key: 'sector', label: 'Sector', options: ['Manufacturing', 'Logistics', 'Retail', 'Software & IT', 'Healthcare'], match: (c, v) => c.sector === v }]
                }
                onRowClick={() => navigate('/company')} />
              
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Financial overview" description="Revenue vs expense, last 6 months">
                <ColumnChart data={revenueTrend} />
              </Panel>
              <Panel title="Workforce overview" description="Group headcount and distribution">
                <TrendChart data={headcountTrend} label="Group headcount trend" />
                <div className="mt-4 border-t border-line pt-3">
                  <DistributionBars data={departmentSplit} />
                </div>
              </Panel>
            </div>
          </div>

          <div className="space-y-4">
            {can('pr.approve') &&
            <Panel
              title="Pending your approval"
              actions={
              <Button variant="ghost" size="xs" onClick={() => navigate('/approvals')}>
                    View all
                  </Button>
              }
              bodyClassName="divide-y divide-line">
              
                {purchaseRequests.
              filter((p) => p.status === 'pending').
              map((p) =>
              <button
                key={p.id}
                onClick={() => navigate(`/approvals/${p.id}`)}
                className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors duration-100 ease-out hover:bg-surface">
                
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base text-ink">{p.title}</p>
                        <p className="text-sm text-muted">
                          {p.id} · {p.company}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono tabular text-base text-ink">
                        ৳{(p.amount / 1000).toFixed(0)}k
                      </span>
                      <ArrowUpRightIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
                    </button>
              )}
              </Panel>
            }

            <Panel title="Alerts" description="Threshold breaches across the group" bodyClassName="divide-y divide-line">
              {alerts.map((a) =>
              <div key={a.title} className="flex gap-2.5 px-4 py-2.5">
                  <span
                  className={cn(
                    'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                    a.tone === 'danger' ? 'bg-danger' : 'bg-warning'
                  )}
                  aria-hidden />
                
                  <div className="min-w-0">
                    <p className="text-base text-ink">{a.title}</p>
                    <p className="text-sm text-muted">{a.detail}</p>
                    <p className="mt-0.5 text-xs text-faint">{a.meta}</p>
                  </div>
                </div>
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