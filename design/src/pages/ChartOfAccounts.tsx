import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import {
  initialChartOfAccounts,
  journalVouchers,
  calculateAccountBalances,
  calculateGeneralLedger,
  calculateTrialBalance,
  formatCurrency,
  formatCurrencyFull
} from '../data/finance';
import { group, companies, costCenters } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import { JournalEntryModal } from '../components/finance/JournalEntryModal';
import { ReverseJournalModal } from '../components/finance/ReverseJournalModal';
import type { JournalEntry } from '../types';

export function ChartOfAccounts() {
  const { companyId, companyName, can } = useApp();

  const [activeTab, setActiveTab] = useState<'accounts' | 'gl' | 'trial' | 'vouchers'>('accounts');
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<JournalEntry | null>(null);
  const [vouchers, setVouchers] = useState(journalVouchers);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>('all');
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all');
  const [expandedVoucherId, setExpandedVoucherId] = useState<string | null>(null);

  // Calculate live account balances based on active company context and vouchers
  const liveAccounts = useMemo(() => {
    return calculateAccountBalances(initialChartOfAccounts, vouchers, companyId);
  }, [vouchers, companyId]);

  // Calculate live trial balance
  const trialBalance = useMemo(() => {
    return calculateTrialBalance(initialChartOfAccounts, vouchers, companyId);
  }, [vouchers, companyId]);

  // Calculate live General Ledger postings
  const glPostings = useMemo(() => {
    const accountCode = selectedAccountCode === 'all' ? undefined : selectedAccountCode;
    const postings = calculateGeneralLedger(vouchers, companyId, accountCode);
    if (selectedCostCenter === 'all') return postings;
    return postings.filter((p) => p.costCenterId === selectedCostCenter);
  }, [vouchers, companyId, selectedAccountCode, selectedCostCenter]);

  // Scoped vouchers
  const scopedVouchers = useMemo(() => {
    return can('group.read') || !companyId || companyId === '*' || companyId === 'all'
      ? vouchers
      : vouchers.filter((v) => v.companyId === companyId || v.companyId === companyId.replace(/^c-/, 'le-') || v.companyId === companyId.replace(/^le-/, 'c-'));
  }, [vouchers, companyId, can]);

  // Leaf accounts for GL dropdown
  const leafAccounts = useMemo(() => {
    return liveAccounts.filter((a) => a.level === 2);
  }, [liveAccounts]);

  // Filtered accounts for Chart of Accounts tab
  const filteredAccounts = useMemo(() => {
    return liveAccounts.filter((acc) => {
      if (typeFilter !== 'all' && acc.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return acc.code.toLowerCase().includes(q) || acc.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [liveAccounts, typeFilter, searchQuery]);

  // Selected account detail for GL card
  const selectedAccount = useMemo(() => {
    if (selectedAccountCode === 'all') return null;
    return liveAccounts.find((a) => a.code === selectedAccountCode) || null;
  }, [liveAccounts, selectedAccountCode]);

  // Account types list
  const accountTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Cost of Goods Sold', 'Expense'];

  // Handle drilldown from COA to GL
  const handleDrilldownGL = (code: string) => {
    setSelectedAccountCode(code);
    setActiveTab('gl');
  };

  // Export CSV handler
  const handleExport = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (activeTab === 'trial') {
      csvContent += 'Code,Account Name,Type,Opening Balance,Debit Movement,Credit Movement,Closing Balance,Net Debit,Net Credit\n';
      trialBalance.rows.forEach((r) => {
        csvContent += `"${r.accountCode}","${r.accountName}","${r.accountType}",${r.openingBalance},${r.debitMovement},${r.creditMovement},${r.closingBalance},${r.netDebit},${r.netCredit}\n`;
      });
      csvContent += `Total,,,,,,,"${trialBalance.totalDebit}","${trialBalance.totalCredit}"\n`;
    } else if (activeTab === 'gl') {
      csvContent += 'Posting Date,Voucher Number,Account Code,Account Name,Cost Center,Debit,Credit,Running Balance,Description,Reference\n';
      glPostings.forEach((p) => {
        csvContent += `"${p.date}","${p.journalEntryNumber}","${p.accountCode}","${p.accountName}","${p.costCenterCode || ''}",${p.debit},${p.credit},${p.runningBalance},"${p.description}","${p.reference || ''}"\n`;
      });
    } else {
      csvContent += 'Code,Account Name,Type,Level,Normal Balance,Opening Balance,Debit Movement,Credit Movement,Closing Balance\n';
      filteredAccounts.forEach((a) => {
        csvContent += `"${a.code}","${a.name}","${a.type}",${a.level},"${a.normalBalance || ''}",${a.openingBalance},${a.debitMovement || 0},${a.creditMovement || 0},${a.closingBalance || a.openingBalance}\n`;
      });
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTab}-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[
          { label: group.name, to: '/' },
          { label: companyName },
          { label: 'Finance', to: '/finance' },
          { label: 'General Ledger & Accounts' }
        ]}
        title="General Ledger & Double-Entry Accounting"
        description="Real-time multi-entity General Ledger, live Trial Balance, and strictly balanced journal entry engine."
        meta={
          <div className="flex items-center gap-2">
            <Badge tone="accent">Context: {companyName}</Badge>
            <Badge tone={trialBalance.isBalanced ? 'success' : 'danger'}>
              {trialBalance.isBalanced ? '✓ Books Balanced' : '⚠ Out of Balance'}
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleExport}>
              Export {activeTab.toUpperCase()}
            </Button>
            <Button variant="primary" onClick={() => setIsJournalModalOpen(true)}>
              + New Journal Voucher
            </Button>
          </div>
        }
      />

      <div className="space-y-4 p-6">
        {/* Navigation Tabs */}
        <Tabs
          tabs={[
            { id: 'accounts', label: 'Chart of Accounts', count: liveAccounts.length },
            { id: 'gl', label: 'General Ledger (GL)', count: glPostings.length },
            { id: 'trial', label: 'Trial Balance' },
            { id: 'vouchers', label: 'Journal Vouchers', count: scopedVouchers.length }
          ]}
          active={activeTab}
          onChange={(tab) => setActiveTab(tab as any)}
        />

        {/* ─── TAB 1: CHART OF ACCOUNTS ──────────────────────────────────────── */}
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-line bg-surface/50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">Total Assets</div>
                <div className="mt-1 font-mono text-xl font-semibold text-ink">
                  {formatCurrency(liveAccounts.find((a) => a.code === '1000')?.closingBalance ?? 0)}
                </div>
                <div className="mt-0.5 text-xs text-muted">Current & Non-Current</div>
              </div>
              <div className="rounded-lg border border-line bg-surface/50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">Total Liabilities</div>
                <div className="mt-1 font-mono text-xl font-semibold text-ink">
                  {formatCurrency(liveAccounts.find((a) => a.code === '2000')?.closingBalance ?? 0)}
                </div>
                <div className="mt-0.5 text-xs text-muted">Trade, tax & credit lines</div>
              </div>
              <div className="rounded-lg border border-line bg-surface/50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">Total Equity</div>
                <div className="mt-1 font-mono text-xl font-semibold text-ink">
                  {formatCurrency(liveAccounts.find((a) => a.code === '3000')?.closingBalance ?? 0)}
                </div>
                <div className="mt-0.5 text-xs text-muted">Paid-up capital & reserves</div>
              </div>
              <div className="rounded-lg border border-line bg-surface/50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">Revenue & Income</div>
                <div className="mt-1 font-mono text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(liveAccounts.find((a) => a.code === '4000')?.closingBalance ?? 0)}
                </div>
                <div className="mt-0.5 text-xs text-muted">Operating and commercial sales</div>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search by code or account name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder-muted focus:border-accent focus:outline-none w-72"
                />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value="all">All Types</option>
                  {accountTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-muted">
                Showing <span className="font-mono text-ink font-semibold">{filteredAccounts.length}</span> accounts · Click any account to drill down into General Ledger
              </div>
            </div>

            {/* Chart of accounts table */}
            <Panel bodyClassName="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-line bg-surface/40">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-faint">Code</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-faint">Account Title</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-faint">Type</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-faint">Normal</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-faint">Opening Balance</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-faint">Debit Movement</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-faint">Credit Movement</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-faint">Closing Balance</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-faint">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((a) => {
                      const isHeader = a.level === 0;
                      const isSubHeader = a.level === 1;
                      const isLeaf = a.level === 2;
                      const closing = a.closingBalance ?? a.openingBalance;

                      return (
                        <tr
                          key={a.code}
                          className={`border-b border-line/70 transition-colors duration-100 ease-out last:border-b-0 hover:bg-surface/80 ${
                            isHeader ? 'bg-surface/30 font-semibold' : ''
                          }`}
                        >
                          <td className="px-4 py-2.5 font-mono text-sm tabular text-muted">
                            <span className={isHeader ? 'font-bold text-ink' : isSubHeader ? 'font-medium text-ink' : ''}>
                              {a.code}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-ink" style={{ paddingLeft: 16 + a.level * 22 }}>
                            <div className="flex items-center gap-2">
                              {isHeader && <span className="h-2 w-2 rounded-full bg-accent" />}
                              {isSubHeader && <span className="h-1.5 w-1.5 rounded-full bg-muted" />}
                              <span className={isHeader ? 'font-bold text-ink text-sm' : isSubHeader ? 'font-medium text-ink text-sm' : 'text-sm'}>
                                {a.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted">
                            <span className="inline-block px-1.5 py-0.5 rounded border border-line bg-subtle text-[11px] font-medium text-muted">
                              {a.type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted uppercase">
                            {a.normalBalance || (['Asset', 'Expense'].includes(a.type) ? 'debit' : 'credit')}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular text-sm text-muted">
                            {formatCurrencyFull(a.openingBalance)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular text-sm text-ink">
                            {a.debitMovement && a.debitMovement > 0 ? (
                              <span className="font-medium text-ink">
                                +{formatCurrencyFull(a.debitMovement)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular text-sm text-ink">
                            {a.creditMovement && a.creditMovement > 0 ? (
                              <span className="font-medium text-ink">
                                +{formatCurrencyFull(a.creditMovement)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular text-sm font-semibold text-ink">
                            {formatCurrencyFull(closing)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {isLeaf && (
                              <button
                                onClick={() => handleDrilldownGL(a.code)}
                                className="text-xs text-accent hover:underline font-medium"
                                title="View General Ledger transactions for this account"
                              >
                                View GL →
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}

        {/* ─── TAB 2: GENERAL LEDGER (GL) ─────────────────────────────────────── */}
        {activeTab === 'gl' && (
          <div className="space-y-4">
            {/* GL Filters and Selectors */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface/40 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Filter by Account</label>
                  <select
                    value={selectedAccountCode}
                    onChange={(e) => setSelectedAccountCode(e.target.value)}
                    className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none min-w-64"
                  >
                    <option value="all">All Accounts (Consolidated GL)</option>
                    {leafAccounts.map((acc) => (
                      <option key={acc.code} value={acc.code}>
                        {acc.code} — {acc.name} ({acc.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Cost Center</label>
                  <select
                    value={selectedCostCenter}
                    onChange={(e) => setSelectedCostCenter(e.target.value)}
                    className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="all">All Cost Centers</option>
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.code} — {cc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedAccount && (
                <div className="flex items-center gap-6 border-l border-line pl-6">
                  <div>
                    <div className="text-xs text-muted">Opening Balance</div>
                    <div className="font-mono text-sm font-semibold text-ink">
                      {formatCurrencyFull(selectedAccount.openingBalance)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Debits</div>
                    <div className="font-mono text-sm font-semibold text-ink">
                      +{formatCurrencyFull(selectedAccount.debitMovement ?? 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Credits</div>
                    <div className="font-mono text-sm font-semibold text-ink">
                      +{formatCurrencyFull(selectedAccount.creditMovement ?? 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted font-bold">Closing Balance</div>
                    <div className="font-mono text-base font-bold text-accent">
                      {formatCurrencyFull(selectedAccount.closingBalance ?? selectedAccount.openingBalance)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* General Ledger Postings Table */}
            <Panel
              title={
                selectedAccount
                  ? `General Ledger: ${selectedAccount.code} — ${selectedAccount.name}`
                  : 'General Ledger: Consolidated Postings'
              }
              description="Chronological double-entry postings with sequential running balance"
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-line bg-surface/40">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-faint">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-faint">Voucher #</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-faint">Account</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-faint">Cost Center</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-faint">Description</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-faint">Ref</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-faint">Debit (৳)</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-faint">Credit (৳)</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-faint">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {glPostings.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted">
                          No ledger postings recorded for the selected account and filters.
                        </td>
                      </tr>
                    ) : (
                      glPostings.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-line/70 transition-colors duration-100 ease-out last:border-b-0 hover:bg-surface"
                        >
                          <td className="px-4 py-2.5 font-mono text-xs text-muted whitespace-nowrap">
                            {p.date}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs font-medium text-accent whitespace-nowrap">
                            {p.journalEntryNumber}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-ink whitespace-nowrap">
                            <span className="font-mono text-muted mr-1.5">{p.accountCode}</span>
                            <span>{p.accountName}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted whitespace-nowrap">
                            {p.costCenterCode || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-ink max-w-xs truncate">
                            {p.description}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted whitespace-nowrap">
                            {p.reference || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular text-sm text-ink">
                            {p.debit > 0 ? (
                              <span className="font-medium text-ink">
                                {formatCurrencyFull(p.debit)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular text-sm text-ink">
                            {p.credit > 0 ? (
                              <span className="font-medium text-ink">
                                {formatCurrencyFull(p.credit)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular text-sm font-semibold text-ink">
                            {formatCurrencyFull(p.runningBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}

        {/* ─── TAB 3: TRIAL BALANCE ─────────────────────────────────────────── */}
        {activeTab === 'trial' && (
          <div className="space-y-4">
            {/* Double-Entry Verification Alert Banner */}
            <div
              className={`rounded-lg border p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                trialBalance.isBalanced
                  ? 'border-success/30 bg-success-soft/30 text-ink'
                  : 'border-danger/30 bg-danger-soft/30 text-ink'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${
                    trialBalance.isBalanced ? 'bg-success text-white' : 'bg-danger text-white'
                  }`}
                >
                  {trialBalance.isBalanced ? '✓' : '!'}
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {trialBalance.isBalanced
                      ? 'Trial Balance Mathematically Verified'
                      : 'Trial Balance Out of Balance'}
                  </h4>
                  <p className="text-xs opacity-90 mt-0.5">
                    {trialBalance.isBalanced
                      ? 'Double-entry rule enforced: Total Debits equal Total Credits across all leaf ledger accounts.'
                      : 'Discrepancy detected: Sum of Debits does not equal Sum of Credits.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 font-mono text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider opacity-75">Sum of Debits</div>
                  <div className="text-base font-bold">{formatCurrencyFull(trialBalance.totalDebit)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider opacity-75">Sum of Credits</div>
                  <div className="text-base font-bold">{formatCurrencyFull(trialBalance.totalCredit)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider opacity-75">Variance</div>
                  <div className="text-base font-bold">
                    ৳{Math.abs(trialBalance.totalDebit - trialBalance.totalCredit).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Trial Balance Table */}
            <Panel
              title="Consolidated Trial Balance"
              description="Summarized leaf-level ledger accounts for double-entry verification"
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-line bg-surface/40">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-faint">Code</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-faint">Account Name</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-faint">Type</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-faint">Opening Balance</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-faint">Debit Mvt</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-faint">Credit Mvt</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-faint">Closing Balance</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-faint">
                        Net Debit (৳)
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-faint">
                        Net Credit (৳)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalance.rows.map((row) => (
                      <tr
                        key={row.accountCode}
                        className="border-b border-line/70 transition-colors duration-100 ease-out last:border-b-0 hover:bg-surface"
                      >
                        <td className="px-4 py-2 font-mono text-sm font-medium text-muted">
                          {row.accountCode}
                        </td>
                        <td className="px-4 py-2 text-sm text-ink font-medium">
                          {row.accountName}
                        </td>
                        <td className="px-4 py-2 text-xs text-muted">
                          <span className="inline-block px-1.5 py-0.5 rounded border border-line bg-subtle text-[11px] font-medium text-muted">
                            {row.accountType}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular text-sm text-muted">
                          {formatCurrencyFull(row.openingBalance)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular text-sm text-ink">
                          {row.debitMovement > 0 ? formatCurrencyFull(row.debitMovement) : '—'}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular text-sm text-ink">
                          {row.creditMovement > 0 ? formatCurrencyFull(row.creditMovement) : '—'}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular text-sm font-medium text-ink">
                          {formatCurrencyFull(row.closingBalance)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular text-sm font-medium text-ink">
                          {row.netDebit > 0 ? formatCurrencyFull(row.netDebit) : '—'}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular text-sm font-medium text-ink">
                          {row.netCredit > 0 ? formatCurrencyFull(row.netCredit) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Row */}
                  <tfoot>
                    <tr className="border-t-2 border-line bg-surface/80 font-semibold">
                      <td colSpan={7} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-ink font-bold">
                        Total Balance Verification:
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular text-base font-bold text-ink">
                        {formatCurrencyFull(trialBalance.totalDebit)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular text-base font-bold text-ink">
                        {formatCurrencyFull(trialBalance.totalCredit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Panel>
          </div>
        )}

        {/* ─── TAB 4: JOURNAL VOUCHERS ───────────────────────────────────────── */}
        {activeTab === 'vouchers' && (
          <div className="space-y-4">
            <Panel
              title="Double-Entry Journal Vouchers"
              description="Audited journal vouchers posted to the General Ledger"
              actions={
                <Button variant="primary" size="xs" onClick={() => setIsJournalModalOpen(true)}>
                  + New Journal Voucher
                </Button>
              }
              bodyClassName="p-0"
            >
              <div className="divide-y divide-line">
                {scopedVouchers.map((voucher) => {
                  const isExpanded = expandedVoucherId === voucher.id;

                  return (
                    <div key={voucher.id} className="p-4 transition-colors hover:bg-surface/50">
                      <div
                        className="flex flex-wrap items-center justify-between gap-4 cursor-pointer"
                        onClick={() => setExpandedVoucherId(isExpanded ? null : voucher.id)}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center rounded bg-surface border border-line text-xs font-bold text-muted hover:text-ink"
                          >
                            {isExpanded ? '▼' : '►'}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-accent">
                                {voucher.entryNumber}
                              </span>
                              <Badge
                                tone={
                                  voucher.status === 'posted'
                                    ? 'success'
                                    : voucher.status === 'reversed'
                                    ? 'danger'
                                    : 'warning'
                                }
                              >
                                {voucher.status.toUpperCase()}
                              </Badge>
                              {voucher.isPosted && (
                                <span
                                  className="inline-flex items-center gap-1 text-2xs text-faint"
                                  title={`Locked at ${voucher.lockedAt}. Posted vouchers cannot be edited or deleted.`}
                                >
                                  🔒 Locked
                                </span>
                              )}
                              <span className="text-xs text-muted">
                                {voucher.companyName}
                              </span>
                            </div>
                            <div className="text-sm text-ink mt-0.5 font-medium">
                              {voucher.memo}
                            </div>
                            {voucher.reversalOfEntryId && (
                              <div className="mt-1 text-2xs text-danger">
                                Reverses <span className="font-mono">{voucher.reversalOfEntryNumber}</span>
                                {voucher.reversalReason && <> — “{voucher.reversalReason}”</>}
                              </div>
                            )}
                            {voucher.reversedByEntryId && (
                              <div className="mt-1 text-2xs text-danger">
                                Reversed by <span className="font-mono">{voucher.reversedByEntryNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right font-mono text-xs text-muted">
                            <div>Date: <span className="text-ink font-medium">{voucher.date}</span></div>
                            {voucher.reference && (
                              <div>Ref: <span className="text-ink">{voucher.reference}</span></div>
                            )}
                          </div>
                          <div className="text-right font-mono">
                            <div className="text-xs text-muted uppercase">Total Balance</div>
                            <div className="text-sm font-bold text-ink">
                              {formatCurrencyFull(voucher.totalDebit)}
                            </div>
                          </div>
                          {voucher.status === 'posted' && can('finance.approve') && (
                            <Button
                              variant="danger"
                              size="xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReversalTarget(voucher);
                              }}
                              title="Posted vouchers are immutable — corrections must go through a Reverse Journal Entry"
                            >
                              Reverse
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Expandable line items */}
                      {isExpanded && (
                        <div className="mt-4 rounded-md border border-line bg-surface/60 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                            Journal Line Items ({voucher.lines.length} items)
                          </div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-line text-muted">
                                <th className="px-3 py-1.5 text-left font-semibold">Account</th>
                                <th className="px-3 py-1.5 text-left font-semibold">Cost Center</th>
                                <th className="px-3 py-1.5 text-left font-semibold">Line Description</th>
                                <th className="px-3 py-1.5 text-right font-semibold">Debit (৳)</th>
                                <th className="px-3 py-1.5 text-right font-semibold">Credit (৳)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {voucher.lines.map((line) => (
                                <tr key={line.id} className="border-b border-line/50 last:border-b-0">
                                  <td className="px-3 py-1.5 font-mono text-ink">
                                    <span className="text-muted mr-1.5">{line.accountCode}</span>
                                    <span>{line.accountName}</span>
                                  </td>
                                  <td className="px-3 py-1.5 font-mono text-muted">
                                    {line.costCenterCode || '—'}
                                  </td>
                                  <td className="px-3 py-1.5 text-ink">
                                    {line.description}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono tabular text-ink">
                                    {line.debit > 0 ? (
                                      <span className="font-medium text-ink">
                                        {formatCurrencyFull(line.debit)}
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono tabular text-ink">
                                    {line.credit > 0 ? (
                                      <span className="font-medium text-ink">
                                        {formatCurrencyFull(line.credit)}
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-line font-bold">
                                <td colSpan={3} className="px-3 py-2 text-right uppercase text-muted">
                                  Balanced Totals:
                                </td>
                                <td className="px-3 py-2 text-right font-mono tabular text-ink">
                                  {formatCurrencyFull(voucher.totalDebit)}
                                </td>
                                <td className="px-3 py-2 text-right font-mono tabular text-ink">
                                  {formatCurrencyFull(voucher.totalCredit)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                          <div className="mt-2 text-[11px] text-muted flex items-center justify-between">
                            <span>Created by: <strong className="text-ink">{voucher.createdBy}</strong></span>
                            <span>Posted at: <strong className="text-ink">{voucher.postedAt}</strong></span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}
      </div>

      {/* Manual Journal Entry Modal */}
      <JournalEntryModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
        onSuccess={() => {
          setVouchers([...journalVouchers]);
        }}
      />

      {/* Reverse Journal Voucher Modal */}
      <ReverseJournalModal
        isOpen={Boolean(reversalTarget)}
        voucher={reversalTarget}
        onClose={() => setReversalTarget(null)}
        onSuccess={() => {
          setVouchers([...journalVouchers]);
          setReversalTarget(null);
        }}
      />
    </div>
  );
}