import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Metric, MetricRow } from '../components/ui/Metric';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/StatusBadge';
import { procurementPipeline, suppliers } from '../data/operations';
import { formatCurrency } from '../data/finance';
import { group } from '../data/organization';
import { useApp } from '../contexts/AppContext';

export function Procurement() {
  const navigate = useNavigate();
  const { companyName } = useApp();

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: companyName }, { label: 'Procurement' }, { label: 'Overview' }]}
        title="Procurement"
        description="From request to payment — the full source-to-pay pipeline for your context."
        meta={<Badge tone="accent">Context: {companyName}</Badge>}
        actions={
        <Button variant="primary" onClick={() => navigate('/procurement/requests')}>
            Purchase requests
          </Button>
        } />
      

      <div className="space-y-4 p-6">
        <MetricRow columns={6}>
          <Metric label="Pending Requests" value="34" sub="৳1.84 Cr" emphasis />
          <Metric label="Open RFQs" value="12" sub="4 closing this week" />
          <Metric label="Purchase Orders" value="27" sub="৳3.14 Cr committed" />
          <Metric label="Pending Approvals" value="21" delta="6 late" tone="danger" />
          <Metric label="Monthly Procurement" value="৳6.2 Cr" delta="+9.1%" tone="warning" />
          <Metric label="Active Suppliers" value="184" sub="12 under review" />
        </MetricRow>

        <Panel title="Source-to-pay pipeline" description="Documents in flight at each stage, with committed value" bodyClassName="p-4">
          <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
            {procurementPipeline.map((s, i) =>
            <React.Fragment key={s.stage}>
                <li className="flex-1 rounded border border-line bg-canvas px-3 py-2.5">
                  <p className="text-sm text-muted">{s.stage}</p>
                  <p className="mt-1 font-mono text-lg font-semibold leading-none text-ink">{s.count}</p>
                  <p className="mt-1 font-mono text-sm text-muted">{formatCurrency(s.value)}</p>
                </li>
                {i < procurementPipeline.length - 1 &&
              <li className="hidden items-center lg:flex" aria-hidden>
                    <ArrowRightIcon className="h-3.5 w-3.5 text-faint" />
                  </li>
              }
              </React.Fragment>
            )}
          </ol>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Panel title="Top suppliers" description="By spend, FY2026 to date" bodyClassName="p-0">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-line">
                  {['Supplier', 'Category', 'Orders', 'Spend', 'Rating'].map((h, i) =>
                  <th
                    key={h}
                    className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide text-faint ${i > 1 ? 'text-right' : 'text-left'}`}>
                    
                      {h}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) =>
                <tr key={s.name} className="border-b border-line/70 last:border-b-0 hover:bg-surface">
                    <td className="px-4 py-2 text-ink">{s.name}</td>
                    <td className="px-4 py-2 text-muted">{s.category}</td>
                    <td className="px-4 py-2 text-right font-mono tabular text-ink">{s.orders}</td>
                    <td className="px-4 py-2 text-right font-mono tabular text-ink">{formatCurrency(s.spend)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular text-muted">{s.rating.toFixed(1)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>

          <Panel title="Requiring action" bodyClassName="divide-y divide-line">
            {[
            { label: '6 approvals breaching 24h SLA', meta: 'Escalation triggers at 48h', tone: 'text-danger' },
            { label: '4 RFQs closing within 3 days', meta: 'No quotations received on 2', tone: 'text-warning' },
            { label: '3 goods receipts pending QC', meta: 'Savar Plant WH-01', tone: 'text-warning' },
            { label: '2 suppliers with expired trade licences', meta: 'Compliance hold applied', tone: 'text-danger' }].
            map((r) =>
            <div key={r.label} className="px-4 py-2.5">
                <p className={`text-base ${r.tone}`}>{r.label}</p>
                <p className="text-sm text-muted">{r.meta}</p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>);

}