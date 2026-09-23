import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DownloadIcon, PlayIcon, SaveIcon, ArrowRightLeftIcon, CheckCircle2Icon, FileSpreadsheetIcon, SparklesIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Metric, MetricRow } from '../components/ui/Metric';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/States';
import { companies, group, legalEntities } from '../data/organization';
import { formatCurrency, formatCurrencyFull, getConsolidatedFinancials } from '../data/finance';
import { useEntityScope } from '../contexts/EntityScopeContext';
import { cn } from '../utils/cn';

const REPORTS = [
  { name: 'Consolidated P&L', module: 'Finance', schedule: 'Monthly · 1st, 06:00' },
  { name: 'Consolidated Balance Sheet', module: 'Finance', schedule: 'Monthly · 1st, 06:00' },
  { name: 'Elimination Journal Entries', module: 'Finance', schedule: 'On demand' },
  { name: 'Trial Balance', module: 'Finance', schedule: 'On demand' },
  { name: 'Receivables Ageing', module: 'Finance', schedule: 'Weekly · Mon, 07:00' },
  { name: 'Headcount & Attrition', module: 'HR', schedule: 'Monthly · 1st, 08:00' },
  { name: 'Procurement Spend by Supplier', module: 'Procurement', schedule: 'On demand' },
  { name: 'Stock Valuation', module: 'Inventory', schedule: 'Daily · 23:00' }
];

export function Reports() {
  const [searchParams] = useSearchParams();
  const urlReport = searchParams.get('report');
  const [selected, setSelected] = useState(
    urlReport && REPORTS.some((r) => r.name === urlReport) ? urlReport : REPORTS[0].name
  );
  const [running, setRunning] = useState(false);
  const { allowedCompanies, activeCompanyId, activeCompanyName } = useEntityScope();

  const scopedCompanies = activeCompanyId
    ? allowedCompanies.filter((c) => c.id === activeCompanyId)
    : allowedCompanies;

  const totalRev = scopedCompanies.reduce((s, c) => s + c.revenue, 0);
  const totalExp = scopedCompanies.reduce((s, c) => s + c.expense, 0);
  const totalProfit = totalRev - totalExp;
  const totalMargin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : '0.0';

  const { summary, plLines, bsLines } = getConsolidatedFinancials();

  const isConsolidationView =
    selected === 'Consolidated P&L' ||
    selected === 'Consolidated Balance Sheet' ||
    selected === 'Elimination Journal Entries';

  const run = () => {
    setRunning(true);
    window.setTimeout(() => setRunning(false), 700);
  };

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: 'Insights' }, { label: 'Reports' }, { label: selected }]}
        title={isConsolidationView ? 'Group Financial Consolidation' : 'Reports'}
        description={
          isConsolidationView
            ? 'IFRS 10-compliant multi-entity financial consolidation with automated virtual elimination journal entries.'
            : 'Parameterised, permission-scoped reports. Large datasets are generated server-side and delivered on completion.'
        }
        meta={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone="accent">Scope: {activeCompanyName} ({scopedCompanies.length} entities) · ৳ BDT</Badge>
            {isConsolidationView && (
              <Badge tone="success" className="inline-flex items-center gap-1">
                <CheckCircle2Icon className="h-3 w-3" /> Elimination Engine Active
              </Badge>
            )}
          </div>
        }
        actions={
          <>
            <Button icon={SaveIcon}>Save report</Button>
            <Button icon={DownloadIcon}>Export</Button>
            <Button variant="primary" icon={PlayIcon} onClick={run} loading={running}>
              Run report
            </Button>
          </>
        }
      />

      <div className="grid gap-4 p-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Panel title="Report library" bodyClassName="p-1.5">
          <ul className="space-y-0.5">
            {REPORTS.map((r) => {
              const isIC = r.name.includes('Consolidated') || r.name.includes('Elimination');
              return (
                <li key={r.name}>
                  <button
                    onClick={() => setSelected(r.name)}
                    className={cn(
                      'w-full rounded-lg px-2.5 py-2 text-left transition-colors duration-100 ease-out',
                      selected === r.name ? 'bg-surface border border-line shadow-xs' : 'hover:bg-surface/60'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('block text-xs font-semibold', selected === r.name ? 'text-ink' : 'text-muted')}>
                        {r.name}
                      </span>
                      {isIC && (
                        <span className="text-2xs font-mono px-1 py-0.2 rounded bg-accent-soft text-accent">IC</span>
                      )}
                    </div>
                    <span className="block text-2xs text-faint mt-0.5">
                      {r.module} · {r.schedule}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="space-y-4">
          {/* Group Financial Consolidation Workbench Top Section */}
          {isConsolidationView && (
            <>
              <MetricRow columns={4}>
                <Metric
                  label="Combined Gross Turnover"
                  value={formatCurrency(summary.combinedRevenue)}
                  sub="Sum of 6 sister entities"
                  emphasis
                />
                <Metric
                  label="Inter-Company Eliminated"
                  value={`-${formatCurrency(summary.eliminatedRevenue)}`}
                  sub={`${summary.eliminationEntries.filter((e) => e.ruleId === 'RULE-IC-01').length} internal billing rules`}
                  tone="danger"
                />
                <Metric
                  label="Consolidated Net Revenue"
                  value={formatCurrency(summary.consolidatedRevenue)}
                  sub="True external group turnover"
                  tone="success"
                />
                <Metric
                  label="Consolidated Net Profit"
                  value={formatCurrency(summary.consolidatedNetProfit)}
                  sub={`Margin ${((summary.consolidatedNetProfit / summary.consolidatedRevenue) * 100).toFixed(1)}%`}
                  tone="info"
                />
              </MetricRow>

              <div className="flex items-center gap-2 border-b border-line pb-2">
                <button
                  onClick={() => setSelected('Consolidated P&L')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    selected === 'Consolidated P&L'
                      ? 'bg-ink text-surface font-semibold'
                      : 'text-muted hover:bg-surface hover:text-ink'
                  )}
                >
                  Consolidated P&L Statement
                </button>
                <button
                  onClick={() => setSelected('Consolidated Balance Sheet')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    selected === 'Consolidated Balance Sheet'
                      ? 'bg-ink text-surface font-semibold'
                      : 'text-muted hover:bg-surface hover:text-ink'
                  )}
                >
                  Consolidated Balance Sheet
                </button>
                <button
                  onClick={() => setSelected('Elimination Journal Entries')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    selected === 'Elimination Journal Entries'
                      ? 'bg-ink text-surface font-semibold'
                      : 'text-muted hover:bg-surface hover:text-ink'
                  )}
                >
                  Elimination Entries ({summary.eliminationEntries.length})
                </button>
              </div>
            </>
          )}

          {!isConsolidationView && (
            <Panel title="Parameters" bodyClassName="p-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Date range', options: ['FY2026 to date', 'Last quarter', 'Last month', 'Custom'] },
                  { label: 'Company', options: ['All companies', ...companies.map((c) => c.name)] },
                  { label: 'Department', options: ['All departments', 'Finance', 'Production', 'Sales & Distribution'] },
                  { label: 'Currency', options: ['BDT (৳)', 'USD ($)', 'EUR (€)'] }
                ].map((f) => (
                  <div key={f.label}>
                    <label className="mb-1 block text-sm font-medium text-muted" htmlFor={`param-${f.label}`}>
                      {f.label}
                    </label>
                    <select
                      id={`param-${f.label}`}
                      className="h-7 w-full rounded border border-line bg-canvas px-2 text-base text-ink focus:border-accent focus:outline-none"
                    >
                      {f.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* VIEW 1: Consolidated P&L Multi-Entity Matrix */}
          {selected === 'Consolidated P&L' && (
            <Panel
              title="Consolidated Statement of Profit & Loss (P&L)"
              description="Aggregation across 6 sister concerns with automatic inter-company revenue and expense eliminations."
              bodyClassName="p-0"
            >
              {running ? (
                <TableSkeleton rows={8} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-line bg-surface/80 text-faint uppercase tracking-wider font-semibold">
                        <th className="px-3 py-2.5 text-left min-w-[240px]">Account / Financial Line Item</th>
                        <th className="px-2 py-2.5 text-left w-20">Code</th>
                        {legalEntities.map((ent) => (
                          <th key={ent.id} className="px-2.5 py-2.5 text-right whitespace-nowrap">
                            {ent.short}
                          </th>
                        ))}
                        <th className="px-3 py-2.5 text-right font-bold text-ink bg-subtle/50 whitespace-nowrap">
                          Total Combined
                        </th>
                        <th className="px-3 py-2.5 text-right font-bold text-danger bg-danger-soft/20 whitespace-nowrap">
                          Elimination Dr/(Cr)
                        </th>
                        <th className="px-3 py-2.5 text-right font-bold text-success bg-success-soft/20 whitespace-nowrap">
                          Consolidated Net
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {plLines.map((line, idx) => {
                        if (line.isHeader) {
                          return (
                            <tr key={idx} className="bg-canvas/80">
                              <td colSpan={11} className="px-3 py-2 font-bold text-2xs uppercase tracking-wider text-accent">
                                {line.accountName}
                              </td>
                            </tr>
                          );
                        }

                        const isEliminatedLine = line.accountCode === '4150' || line.accountCode === '5150';
                        const isSub = line.isSubtotal;
                        const isTot = line.isTotal;

                        return (
                          <tr
                            key={idx}
                            className={cn(
                              'hover:bg-surface transition-colors',
                              isSub ? 'font-semibold bg-surface/30' : '',
                              isTot ? 'font-bold text-sm bg-subtle/80 border-t-2 border-b-2 border-line' : ''
                            )}
                          >
                            <td className="px-3 py-2 text-ink flex items-center gap-1.5">
                              <span>{line.accountName}</span>
                              {isEliminatedLine && (
                                <Badge tone="warning" className="text-2xs">Eliminated</Badge>
                              )}
                            </td>
                            <td className="px-2 py-2 font-mono text-muted text-2xs">{line.accountCode || '—'}</td>
                            {legalEntities.map((ent) => (
                              <td key={ent.id} className="px-2.5 py-2 text-right font-mono tabular text-ink">
                                {formatCurrency(line.entities[ent.id] || 0)}
                              </td>
                            ))}
                            <td className="px-3 py-2 text-right font-mono tabular font-bold text-ink bg-subtle/50">
                              {formatCurrency(line.combinedTotal)}
                            </td>
                            <td className={cn(
                              'px-3 py-2 text-right font-mono tabular font-semibold bg-danger-soft/10',
                              line.eliminationAdjustments < 0 ? 'text-danger' : 'text-muted'
                            )}>
                              {line.eliminationAdjustments !== 0 ? formatCurrency(line.eliminationAdjustments) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular font-bold text-success bg-success-soft/10">
                              {formatCurrency(line.consolidatedNet)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}

          {/* VIEW 2: Consolidated Balance Sheet */}
          {selected === 'Consolidated Balance Sheet' && (
            <Panel
              title="Consolidated Balance Sheet"
              description="IFRS 10 multi-entity balance sheet eliminating inter-company receivables and payables between sister entities."
              bodyClassName="p-0"
            >
              {running ? (
                <TableSkeleton rows={8} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-line bg-surface/80 text-faint uppercase tracking-wider font-semibold">
                        <th className="px-3 py-2.5 text-left min-w-[240px]">Account / Financial Position Line</th>
                        <th className="px-2 py-2.5 text-left w-20">Code</th>
                        {legalEntities.map((ent) => (
                          <th key={ent.id} className="px-2.5 py-2.5 text-right whitespace-nowrap">
                            {ent.short}
                          </th>
                        ))}
                        <th className="px-3 py-2.5 text-right font-bold text-ink bg-subtle/50 whitespace-nowrap">
                          Total Combined
                        </th>
                        <th className="px-3 py-2.5 text-right font-bold text-danger bg-danger-soft/20 whitespace-nowrap">
                          Elimination Adjustment
                        </th>
                        <th className="px-3 py-2.5 text-right font-bold text-success bg-success-soft/20 whitespace-nowrap">
                          Consolidated Net
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {bsLines.map((line, idx) => {
                        if (line.isHeader) {
                          return (
                            <tr key={idx} className="bg-canvas/80">
                              <td colSpan={11} className="px-3 py-2 font-bold text-2xs uppercase tracking-wider text-accent">
                                {line.accountName}
                              </td>
                            </tr>
                          );
                        }

                        const isEliminatedLine = line.accountCode === '1160' || line.accountCode === '2150';
                        const isTot = line.isTotal;

                        return (
                          <tr
                            key={idx}
                            className={cn(
                              'hover:bg-surface transition-colors',
                              isTot ? 'font-bold text-sm bg-subtle/80 border-t-2 border-b-2 border-line' : ''
                            )}
                          >
                            <td className="px-3 py-2 text-ink flex items-center gap-1.5">
                              <span>{line.accountName}</span>
                              {isEliminatedLine && (
                                <Badge tone="danger" className="text-2xs">Nullified Offset</Badge>
                              )}
                            </td>
                            <td className="px-2 py-2 font-mono text-muted text-2xs">{line.accountCode || '—'}</td>
                            {legalEntities.map((ent) => (
                              <td key={ent.id} className="px-2.5 py-2 text-right font-mono tabular text-ink">
                                {formatCurrency(line.entities[ent.id] || 0)}
                              </td>
                            ))}
                            <td className="px-3 py-2 text-right font-mono tabular font-bold text-ink bg-subtle/50">
                              {formatCurrency(line.combinedTotal)}
                            </td>
                            <td className={cn(
                              'px-3 py-2 text-right font-mono tabular font-semibold bg-danger-soft/10',
                              line.eliminationAdjustments < 0 ? 'text-danger' : 'text-muted'
                            )}>
                              {line.eliminationAdjustments !== 0 ? formatCurrency(line.eliminationAdjustments) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular font-bold text-success bg-success-soft/10">
                              {formatCurrency(line.consolidatedNet)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}

          {/* VIEW 3: Virtual Elimination Journal Entries Audit Trail */}
          {selected === 'Elimination Journal Entries' && (
            <div className="space-y-4">
              <div className="flex items-start justify-between rounded-xl border border-accent/40 bg-accent-soft/20 p-4">
                <div className="flex items-start gap-3">
                  <ArrowRightLeftIcon className="mt-0.5 h-5 w-5 text-accent shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-ink">Virtual Elimination Journal Entries Ledger</h3>
                    <p className="mt-0.5 text-xs text-muted">
                      Consolidation elimination entries eliminate internal sister-company revenue, expenses, receivables, and payables.
                      These adjustments do not alter local statutory books, but are applied automatically when preparing group financial statements.
                    </p>
                  </div>
                </div>
                <Badge tone="success" className="shrink-0 text-xs">
                  ✓ Double-Entry Balanced: Σ Dr = Σ Cr
                </Badge>
              </div>

              <Panel title="Elimination Journal Entries" description="Rule IC-01 & Rule IC-02 virtual vouchers" bodyClassName="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-line bg-surface/60 text-faint uppercase tracking-wider font-semibold">
                        <th className="px-3 py-2.5 text-left">Voucher #</th>
                        <th className="px-3 py-2.5 text-left">Rule</th>
                        <th className="px-3 py-2.5 text-left">Entity A ↔ Entity B</th>
                        <th className="px-3 py-2.5 text-left">Debit Account</th>
                        <th className="px-3 py-2.5 text-left">Credit Account</th>
                        <th className="px-3 py-2.5 text-left">Source Document</th>
                        <th className="px-3 py-2.5 text-right font-mono">Amount</th>
                        <th className="px-3 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {summary.eliminationEntries.map((e) => (
                        <tr key={e.id} className="hover:bg-surface transition-colors">
                          <td className="px-3 py-2.5 font-mono font-medium text-accent">{e.id}</td>
                          <td className="px-3 py-2.5">
                            <span className="font-semibold text-ink block">{e.ruleId}</span>
                            <span className="text-2xs text-muted block max-w-xs truncate">{e.ruleName}</span>
                          </td>
                          <td className="px-3 py-2.5 text-ink">
                            <span className="font-medium text-ink">{e.sourceEntityName}</span>
                            <span className="text-muted block text-2xs">↔ {e.targetEntityName}</span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs">
                            <span className="font-semibold text-danger">Dr. {e.debitAccountCode}</span>
                            <span className="block text-2xs text-muted">{e.debitAccountName}</span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs">
                            <span className="font-semibold text-success">Cr. {e.creditAccountCode}</span>
                            <span className="block text-2xs text-muted">{e.creditAccountName}</span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-2xs text-muted">{e.referenceDoc}</td>
                          <td className="px-3 py-2.5 text-right font-mono tabular font-bold text-ink">
                            {formatCurrencyFull(e.amount)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge tone="success" className="text-2xs">Applied</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          )}

          {/* VIEW 4: Generic reports fallback */}
          {!isConsolidationView && (
            <Panel title={selected} description="Consolidated across companies in your scope" bodyClassName="p-0">
              {running ? (
                <TableSkeleton rows={6} />
              ) : (
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-line">
                      {['Company', 'Revenue', 'Expense', 'Profit', 'Margin'].map((h, i) => (
                        <th
                          key={h}
                          className={cn(
                            'px-4 py-2 text-sm font-semibold uppercase tracking-wide text-faint',
                            i === 0 ? 'text-left' : 'text-right'
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scopedCompanies.map((c) => (
                      <tr key={c.id} className="border-b border-line/70 last:border-b-0 hover:bg-surface">
                        <td className="px-4 py-2 text-ink font-medium">{c.name}</td>
                        <td className="px-4 py-2 text-right font-mono tabular text-ink">
                          {formatCurrency(c.revenue * 100000)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular text-muted">
                          {formatCurrency(c.expense * 100000)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular text-ink">
                          {formatCurrency((c.revenue - c.expense) * 100000)}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-2 text-right font-mono tabular',
                            c.margin < 8 ? 'text-danger' : c.margin < 15 ? 'text-warning' : 'text-success'
                          )}
                        >
                          {c.margin.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-line bg-surface">
                      <td className="px-4 py-2 font-medium text-ink">Total ({scopedCompanies.length})</td>
                      <td className="px-4 py-2 text-right font-mono tabular font-semibold text-ink">
                        {formatCurrency(totalRev * 100000)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular text-muted">
                        {formatCurrency(totalExp * 100000)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular font-semibold text-ink">
                        {formatCurrency(totalProfit * 100000)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular text-success">{totalMargin}%</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}