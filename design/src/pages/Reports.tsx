import React, { useState } from 'react';
import { DownloadIcon, PlayIcon, SaveIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/States';
import { companies, group } from '../data/organization';
import { formatCurrency } from '../data/finance';
import { useEntityScope } from '../contexts/EntityScopeContext';
import { cn } from '../utils/cn';

const REPORTS = [
{ name: 'Consolidated P&L', module: 'Finance', schedule: 'Monthly · 1st, 06:00' },
{ name: 'Trial Balance', module: 'Finance', schedule: 'On demand' },
{ name: 'Receivables Ageing', module: 'Finance', schedule: 'Weekly · Mon, 07:00' },
{ name: 'Headcount & Attrition', module: 'HR', schedule: 'Monthly · 1st, 08:00' },
{ name: 'Procurement Spend by Supplier', module: 'Procurement', schedule: 'On demand' },
{ name: 'Stock Valuation', module: 'Inventory', schedule: 'Daily · 23:00' }];


export function Reports() {
  const [selected, setSelected] = useState(REPORTS[0].name);
  const [running, setRunning] = useState(false);
  const { allowedCompanies, activeCompanyId, activeCompanyName } = useEntityScope();

  const scopedCompanies = activeCompanyId
    ? allowedCompanies.filter(c => c.id === activeCompanyId)
    : allowedCompanies;

  const totalRev = scopedCompanies.reduce((s, c) => s + c.revenue, 0);
  const totalExp = scopedCompanies.reduce((s, c) => s + c.expense, 0);
  const totalProfit = totalRev - totalExp;
  const totalMargin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : '0.0';

  const run = () => {
    setRunning(true);
    window.setTimeout(() => setRunning(false), 900);
  };

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: 'Insights' }, { label: 'Reports' }, { label: selected }]}
        title="Reports"
        description="Parameterised, permission-scoped reports. Large datasets are generated server-side and delivered on completion."
        meta={<Badge tone="accent">Scope: {activeCompanyName} ({scopedCompanies.length} entities) · ৳ BDT</Badge>}
        actions={
        <>
            <Button icon={SaveIcon}>Save report</Button>
            <Button icon={DownloadIcon}>Export</Button>
            <Button variant="primary" icon={PlayIcon} onClick={run} loading={running}>
              Run report
            </Button>
          </>
        } />
      

      <div className="grid gap-4 p-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Panel title="Report library" bodyClassName="p-1.5">
          <ul className="space-y-0.5">
            {REPORTS.map((r) =>
            <li key={r.name}>
                <button
                onClick={() => setSelected(r.name)}
                className={cn(
                  'w-full rounded px-2 py-1.5 text-left transition-colors duration-100 ease-out',
                  selected === r.name ? 'bg-surface' : 'hover:bg-surface'
                )}>
                
                  <span className={cn('block text-base', selected === r.name ? 'font-medium text-ink' : 'text-muted')}>
                    {r.name}
                  </span>
                  <span className="block text-xs text-faint">
                    {r.module} · {r.schedule}
                  </span>
                </button>
              </li>
            )}
          </ul>
        </Panel>

        <div className="space-y-4">
          <Panel title="Parameters" bodyClassName="p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
              { label: 'Date range', options: ['FY2026 to date', 'Last quarter', 'Last month', 'Custom'] },
              { label: 'Company', options: ['All companies', ...companies.map((c) => c.name)] },
              { label: 'Department', options: ['All departments', 'Finance', 'Production', 'Sales & Distribution'] },
              { label: 'Currency', options: ['BDT (৳)', 'USD ($)', 'EUR (€)'] }].
              map((f) =>
              <div key={f.label}>
                  <label className="mb-1 block text-sm font-medium text-muted" htmlFor={`param-${f.label}`}>
                    {f.label}
                  </label>
                  <select
                  id={`param-${f.label}`}
                  className="h-7 w-full rounded border border-line bg-canvas px-2 text-base text-ink focus:border-accent focus:outline-none">
                  
                    {f.options.map((o) =>
                  <option key={o}>{o}</option>
                  )}
                  </select>
                </div>
              )}
            </div>
          </Panel>

          <Panel title={selected} description="Consolidated across companies in your scope" bodyClassName="p-0">
            {running ?
            <TableSkeleton rows={6} /> :

            <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-line">
                    {['Company', 'Revenue', 'Expense', 'Profit', 'Margin'].map((h, i) =>
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
                  {scopedCompanies.map((c) =>
                <tr key={c.id} className="border-b border-line/70 last:border-b-0 hover:bg-surface">
                      <td className="px-4 py-2 text-ink font-medium">{c.name}</td>
                      <td className="px-4 py-2 text-right font-mono tabular text-ink">{formatCurrency(c.revenue * 100000)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular text-muted">{formatCurrency(c.expense * 100000)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular text-ink">
                        {formatCurrency((c.revenue - c.expense) * 100000)}
                      </td>
                      <td
                    className={cn(
                      'px-4 py-2 text-right font-mono tabular',
                      c.margin < 8 ? 'text-danger' : c.margin < 15 ? 'text-warning' : 'text-success'
                    )}>
                    
                        {c.margin.toFixed(1)}%
                      </td>
                    </tr>
                )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line bg-surface">
                    <td className="px-4 py-2 font-medium text-ink">Total ({scopedCompanies.length})</td>
                    <td className="px-4 py-2 text-right font-mono tabular font-semibold text-ink">{formatCurrency(totalRev * 100000)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular text-muted">{formatCurrency(totalExp * 100000)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular font-semibold text-ink">{formatCurrency(totalProfit * 100000)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular text-success">{totalMargin}%</td>
                  </tr>
                </tfoot>
              </table>
            }
          </Panel>
        </div>
      </div>
    </div>);

}