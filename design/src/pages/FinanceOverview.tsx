import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeftIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Metric, MetricRow } from '../components/ui/Metric';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { ColumnChart } from '../components/charts/ColumnChart';
import { DistributionBars } from '../components/charts/DistributionBars';
import {
  financeKpis,
  invoices,
  revenueTrend,
  formatCurrency,
  formatCurrencyFull,
  journalVouchers,
  getFiscalPeriodForDate,
  getBankStatements,
  getBankReconciliationSummary
} from '../data/finance';
import { companies, group, getAllCostCenterBudgets } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import { JournalEntryModal } from '../components/finance/JournalEntryModal';

export function FinanceOverview() {
  const navigate = useNavigate();
  const { companyId, companyName, can } = useApp();
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [vouchers, setVouchers] = useState(journalVouchers);

  const today = new Date().toISOString().slice(0, 10);
  const currentPeriod = getFiscalPeriodForDate(today);

  const budgetSnapshots = [...getAllCostCenterBudgets(companyId)].sort((a, b) => b.utilizationPct - a.utilizationPct);
  const overBudgetCount = budgetSnapshots.filter((b) => b.utilizationPct > 100).length;

  const bankStatements = getBankStatements();
  const scopedBankStatement =
    (can('group.read') || !companyId || companyId === '*' || companyId === 'all'
      ? bankStatements
      : bankStatements.filter(
          (s) => s.companyId === companyId || s.companyId === companyId.replace(/^c-/, 'le-') || s.companyId === companyId.replace(/^le-/, 'c-')
        )
    )[0];
  const bankSummary = scopedBankStatement ? getBankReconciliationSummary(scopedBankStatement.id) : null;

  const scopeName = companyId ? companies.find((c) => c.id === companyId)?.name : null;
  const scopedInvoices = can('group.read') || !scopeName ? invoices : invoices.filter((i) => i.company === scopeName);
  const scopedVouchers = can('group.read') || !companyId || companyId === '*' || companyId === 'all'
    ? vouchers
    : vouchers.filter((v) => v.companyId === companyId || v.companyId === companyId.replace(/^c-/, 'le-') || v.companyId === companyId.replace(/^le-/, 'c-'));

  const ageing = [
  { label: 'Current', value: 1840 },
  { label: '1–30 days', value: 940 },
  { label: '31–60 days', value: 520 },
  { label: '61–90 days', value: 280 },
  { label: '90+ days', value: 610 }];


  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: companyName }, { label: 'Finance' }, { label: 'Overview' }]}
        title="Finance Overview"
        description="Cash, receivables, payables and budget consumption for the current context."
        meta={
          <div className="flex items-center gap-2">
            <Badge tone="accent">Context: {companyName}</Badge>
            {currentPeriod && currentPeriod.status !== 'open' && (
              <Badge
                tone={currentPeriod.status === 'hard-closed' ? 'danger' : 'warning'}
                className="inline-flex items-center gap-1"
              >
                🔒 {currentPeriod.label}: {currentPeriod.status === 'hard-closed' ? 'Hard Closed' : 'Soft Closed'}
              </Badge>
            )}
          </div>
        }
        actions={
          <>
            <Button onClick={() => navigate('/finance/accounts')}>General Ledger & Accounts</Button>
            <Button variant="secondary" onClick={() => navigate('/reports?report=Consolidated+P%26L')}>
              Consolidation Workbench
            </Button>
            <Button variant="secondary" onClick={() => navigate('/finance/bank-reconciliation')}>
              Bank Reconciliation
            </Button>
            <Button variant="secondary" onClick={() => setIsJournalModalOpen(true)}>
              + New Journal Voucher
            </Button>
            {can('invoice.create') &&
              <Button variant="primary" onClick={() => navigate('/finance/invoices')}>
                New invoice
              </Button>
            }
          </>
        } />
      

      <div className="space-y-4 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent-soft/20 p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
              <ArrowRightLeftIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">Group Financial Consolidation Active</span>
                <Badge tone="success" className="text-2xs">IFRS 10 Compliant</Badge>
              </div>
              <p className="text-xs text-muted">
                ৳7.10 Cr in internal sister-concern sales and procurement balances automatically eliminated from group revenue and liabilities.
              </p>
            </div>
          </div>
          <Button size="xs" variant="primary" onClick={() => navigate('/reports?report=Consolidated+P%26L')}>
            View Consolidation Workbench →
          </Button>
        </div>

        <MetricRow>
          {financeKpis.map((k, i) =>
          <Metric key={k.label} {...k} emphasis={i === 0} />
          )}
        </MetricRow>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Panel title="Revenue vs expense" description="Trailing 6 months, consolidated">
              <ColumnChart data={revenueTrend} />
            </Panel>

            <Panel
              title="Invoices needing attention"
              description="Overdue, failed or awaiting approval"
              actions={
              <Button variant="ghost" size="xs" onClick={() => navigate('/finance/invoices')}>
                  All invoices
                </Button>
              }
              bodyClassName="p-0">
              
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-line">
                    {['Invoice', 'Counterparty', 'Due', 'Balance', 'Status'].map((h) =>
                    <th key={h} className="px-4 py-2 text-left text-sm font-semibold uppercase tracking-wide text-faint">
                        {h}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {scopedInvoices.
                  filter((i) => ['pending', 'failed', 'processing'].includes(i.status)).
                  map((i) =>
                  <tr
                    key={i.id}
                    onClick={() => navigate('/finance/invoices')}
                    className="cursor-pointer border-b border-line/70 transition-colors duration-100 ease-out last:border-b-0 hover:bg-surface">
                    
                        <td className="px-4 py-2 font-mono tabular text-ink">{i.id}</td>
                        <td className="px-4 py-2 text-ink">{i.party}</td>
                        <td className="px-4 py-2 text-muted">{i.due}</td>
                        <td className="px-4 py-2 font-mono tabular text-ink">{formatCurrency(i.balance)}</td>
                        <td className="px-4 py-2">
                          <StatusBadge status={i.status} />
                        </td>
                      </tr>
                  )}
                </tbody>
              </table>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Receivables ageing" description="৳ lakh outstanding">
              <DistributionBars data={ageing} />
            </Panel>
            <Panel
              title="Budget utilization"
              description={`FY2026 by cost center · Consumed + Committed against Allocated${overBudgetCount > 0 ? ` · ${overBudgetCount} over budget` : ''}`}
              actions={
                <Button variant="ghost" size="xs" onClick={() => navigate('/procurement/requests')}>
                  Purchase Requests →
                </Button>
              }
              bodyClassName="p-4"
            >
              <ul className="space-y-3">
                {budgetSnapshots.map((b) => {
                  const used = Math.max(0, Math.min(100, b.utilizationPct));
                  const isOver = b.utilizationPct > 100;
                  return (
                    <li key={b.costCenterId}>
                      <div className="mb-1 flex items-center justify-between text-base">
                        <span className="text-muted truncate pr-2">{b.costCenterName}</span>
                        <span className={`font-mono tabular ${isOver ? 'text-danger font-semibold' : 'text-ink'}`}>
                          {b.utilizationPct.toFixed(0)}%
                        </span>
                      </div>
                      <span className="block h-1.5 rounded-sm bg-surface" aria-hidden>
                        <span
                          className={`block h-1.5 rounded-sm ${isOver ? 'bg-danger' : used > 85 ? 'bg-warning' : 'bg-accent/70'}`}
                          style={{ width: `${used}%` }}
                        />
                      </span>
                    </li>
                  );
                })}
                {budgetSnapshots.length === 0 && (
                  <li className="text-sm text-muted">No cost centers in the current scope.</li>
                )}
              </ul>
            </Panel>

            {bankSummary && scopedBankStatement && (
              <Panel
                title="Bank Reconciliation"
                description={`${scopedBankStatement.bankName} ${scopedBankStatement.accountNumberMasked} · ${scopedBankStatement.periodLabel}`}
                actions={
                  <Button variant="ghost" size="xs" onClick={() => navigate('/finance/bank-reconciliation')}>
                    Reconcile →
                  </Button>
                }
                bodyClassName="p-4"
              >
                <div className="space-y-2.5 text-base">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Statement balance</span>
                    <span className="font-mono tabular text-ink">{formatCurrencyFull(bankSummary.statementBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Ledger (GL) balance</span>
                    <span className="font-mono tabular text-ink">{formatCurrencyFull(bankSummary.ledgerBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-line pt-2.5">
                    <span className="text-muted">Unmatched difference</span>
                    <span
                      className={`font-mono tabular font-semibold ${
                        Math.abs(bankSummary.unmatchedDifference) < 0.01 ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {formatCurrencyFull(bankSummary.unmatchedDifference)}
                    </span>
                  </div>
                  <p className="text-sm text-muted">
                    {bankSummary.unmatchedStatementCount} statement line(s) and {bankSummary.unmatchedLedgerCount} GL
                    posting(s) awaiting reconciliation.
                  </p>
                </div>
              </Panel>
            )}
          </div>
        </div>

        {/* Recent Journal Vouchers Section */}
        <Panel
          title="Recent Double-Entry Journal Postings (Vouchers)"
          description="Strictly balanced transactions posted to the General Ledger"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="xs" onClick={() => navigate('/finance/accounts')}>
                View General Ledger & Trial Balance →
              </Button>
              <Button variant="secondary" size="xs" onClick={() => setIsJournalModalOpen(true)}>
                + New Journal Voucher
              </Button>
            </div>
          }
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-line bg-surface/40">
                  {['Voucher #', 'Date', 'Entity', 'Memo / Reference', 'Lines', 'Total Debit', 'Total Credit', 'Status'].map((h, idx) => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-faint ${
                        idx === 5 || idx === 6 ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scopedVouchers.slice(0, 5).map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => navigate('/finance/accounts')}
                    className="cursor-pointer border-b border-line/70 transition-colors duration-100 ease-out last:border-b-0 hover:bg-surface"
                  >
                    <td className="px-4 py-2.5 font-mono text-sm font-medium text-accent">
                      {v.entryNumber}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted">
                      {v.date}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink">
                      {v.companyName}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-ink max-w-md truncate">
                      <span>{v.memo}</span>
                      {v.reference && (
                        <span className="ml-2 font-mono text-xs text-muted">({v.reference})</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted font-mono">
                      {v.lines.length} lines
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular text-sm text-ink">
                      {formatCurrencyFull(v.totalDebit)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular text-sm text-ink">
                      {formatCurrencyFull(v.totalCredit)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={v.status === 'posted' ? 'success' : v.status === 'reversed' ? 'danger' : 'warning'}>
                        {v.status.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <JournalEntryModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
        onSuccess={() => {
          setVouchers([...journalVouchers]);
        }}
      />
    </div>
  );
}