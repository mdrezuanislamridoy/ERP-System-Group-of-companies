import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2Icon, SparklesIcon, LinkIcon, Undo2Icon, AlertTriangleIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Metric, MetricRow } from '../components/ui/Metric';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/StatusBadge';
import {
  getBankStatements,
  subscribeBankStatements,
  getReconcilableLedgerLines,
  getBankReconciliationSummary,
  autoReconcileStatement,
  unmatchBankTransaction,
  formatCurrencyFull
} from '../data/finance';
import { group } from '../data/organization';
import { recordAuditEvent } from '../data/system';
import { useApp } from '../contexts/AppContext';
import { BankTransactionActionModal } from '../components/finance/BankTransactionActionModal';
import type { BankTransaction } from '../types';

export function BankReconciliation() {
  const { companyId, companyName, role, can } = useApp();
  const [statements, setStatements] = useState(getBankStatements());
  const [selectedStatementId, setSelectedStatementId] = useState<string>('');
  const [actionTxn, setActionTxn] = useState<BankTransaction | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => subscribeBankStatements(() => setStatements(getBankStatements())), []);

  const scopedStatements = useMemo(
    () =>
      can('group.read') || !companyId || companyId === '*' || companyId === 'all'
        ? statements
        : statements.filter(
            (s) => s.companyId === companyId || s.companyId === companyId.replace(/^c-/, 'le-') || s.companyId === companyId.replace(/^le-/, 'c-')
          ),
    [statements, companyId, can]
  );

  useEffect(() => {
    if (scopedStatements.length === 0) {
      setSelectedStatementId('');
      return;
    }
    if (!scopedStatements.some((s) => s.id === selectedStatementId)) {
      setSelectedStatementId(scopedStatements[0].id);
    }
  }, [scopedStatements, selectedStatementId]);

  const statement = scopedStatements.find((s) => s.id === selectedStatementId) || null;
  const summary = statement ? getBankReconciliationSummary(statement.id) : null;
  const ledgerLines = statement ? getReconcilableLedgerLines(statement.companyId, statement.glAccountCode) : [];
  const matchedLedgerKeys = new Set(
    statement ? statement.transactions.filter((t) => t.status === 'matched').map((t) => t.matchedLineKey) : []
  );

  const showStatusMsg = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleAutoReconcile = () => {
    if (!statement) return;
    const { matchedCount } = autoReconcileStatement(statement.id, role.user || 'Treasury Specialist');
    recordAuditEvent({
      user: role.user || 'Treasury Specialist',
      action: 'AUTO_RECONCILE_BANK_STATEMENT',
      resource: `${statement.bankName} ${statement.accountNumberMasked} — ${statement.periodLabel}`,
      company: statement.companyName,
      before: `${statement.transactions.filter((t) => t.status === 'unmatched').length} unmatched lines`,
      after: `${matchedCount} line(s) auto-matched on date/reference/amount`
    });
    showStatusMsg(matchedCount > 0 ? `Auto-reconcile matched ${matchedCount} line(s).` : 'Auto-reconcile found no new matches.');
  };

  const handleUnmatch = (txn: BankTransaction) => {
    if (!statement) return;
    unmatchBankTransaction(statement.id, txn.id);
    recordAuditEvent({
      user: role.user || 'Treasury Specialist',
      action: 'UNMATCH_BANK_TRANSACTION',
      resource: `${txn.description} [${statement.bankName}]`,
      company: statement.companyName,
      before: `Matched to ${txn.matchedJournalEntryNumber}`,
      after: 'Unmatched'
    });
    showStatusMsg(`${txn.description} unmatched.`);
  };

  const candidateLinesFor = (txn: BankTransaction) =>
    ledgerLines.filter((line) => {
      if (matchedLedgerKeys.has(line.key)) return false;
      const relevantAmount = txn.direction === 'credit' ? line.debit : line.credit;
      return relevantAmount > 0;
    });

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: companyName }, { label: 'Finance', to: '/finance' }, { label: 'Bank Reconciliation' }]}
        title="Bank Reconciliation"
        description="Match internal Cash & Bank GL postings against imported bank statement lines — cleared vs outstanding."
        meta={<Badge tone="accent">Context: {companyName}</Badge>}
        actions={
          statement && (
            <Button variant="primary" icon={SparklesIcon} onClick={handleAutoReconcile}>
              Run Auto-Reconcile
            </Button>
          )
        }
      />

      {statusMsg && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-4 py-2.5 text-xs font-medium text-success shadow-sm">
          <CheckCircle2Icon className="h-4 w-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="space-y-4 p-6">
        {scopedStatements.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-2xs font-semibold uppercase tracking-wider text-faint">Statement</label>
            <select
              value={selectedStatementId}
              onChange={(e) => setSelectedStatementId(e.target.value)}
              className="h-8 rounded border border-line bg-surface px-2.5 text-xs font-medium text-ink focus:border-accent focus:outline-none"
            >
              {scopedStatements.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.companyName} — {s.bankName} {s.accountNumberMasked} · {s.periodLabel}
                </option>
              ))}
            </select>
          </div>
        )}

        {!statement || !summary ? (
          <Panel bodyClassName="p-8">
            <p className="text-center text-sm text-muted">No bank statement is available for the current scope.</p>
          </Panel>
        ) : (
          <>
            <Panel title={`${statement.bankName} ${statement.accountNumberMasked}`} description={`${statement.periodLabel} · Imported ${statement.importedAt.slice(0, 10)} by ${statement.importedBy}`}>
              <MetricRow>
                <Metric label="Statement Balance" value={formatCurrencyFull(summary.statementBalance)} sub="As reported by bank" />
                <Metric label="Ledger (GL) Balance" value={formatCurrencyFull(summary.ledgerBalance)} sub={`Account ${statement.glAccountCode} · books`} />
                <Metric
                  label="Reconciled Balance"
                  value={formatCurrencyFull(summary.reconciledBalance)}
                  sub={`${summary.matchedCount} line(s) confirmed`}
                  delta="✓ Matched"
                  tone="success"
                />
                <Metric
                  label="Unmatched Difference"
                  value={formatCurrencyFull(summary.unmatchedDifference)}
                  sub={`${summary.unmatchedStatementCount} statement · ${summary.unmatchedLedgerCount} GL outstanding`}
                  delta={Math.abs(summary.unmatchedDifference) < 0.01 ? '✓ Balanced' : '⚠ Review'}
                  tone={Math.abs(summary.unmatchedDifference) < 0.01 ? 'success' : 'danger'}
                />
              </MetricRow>
            </Panel>

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="Bank Statement Lines" description="As imported from the bank" bodyClassName="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-surface/40">
                        {['Date', 'Description', 'Ref', 'Amount', 'Status', ''].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-faint">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {statement.transactions.map((txn) => (
                        <tr key={txn.id} className="border-b border-line/70 last:border-b-0 hover:bg-surface/60">
                          <td className="px-3 py-2 font-mono text-xs text-muted whitespace-nowrap">{txn.date}</td>
                          <td className="px-3 py-2 text-xs text-ink max-w-[220px] truncate" title={txn.description}>
                            {txn.description}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-muted whitespace-nowrap">{txn.reference || '—'}</td>
                          <td className="px-3 py-2 text-right font-mono tabular text-xs whitespace-nowrap">
                            <span className={txn.direction === 'credit' ? 'text-success font-medium' : 'text-ink'}>
                              {txn.direction === 'credit' ? '+' : '−'}
                              {formatCurrencyFull(txn.amount)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {txn.status === 'matched' ? (
                              <Badge tone="success">Matched</Badge>
                            ) : (
                              <Badge tone="warning">Unmatched</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {txn.status === 'matched' ? (
                              <Button size="xs" variant="ghost" icon={Undo2Icon} onClick={() => handleUnmatch(txn)}>
                                Unmatch
                              </Button>
                            ) : (
                              <Button size="xs" variant="secondary" icon={LinkIcon} onClick={() => setActionTxn(txn)}>
                                Reconcile
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel
                title="General Ledger — Cash & Bank Postings"
                description={`Account ${statement.glAccountCode} · Cash & Cash Equivalents`}
                bodyClassName="p-0"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-surface/40">
                        {['Date', 'Voucher', 'Description', 'Debit', 'Credit', 'Status'].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-faint">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerLines.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-xs text-muted">
                            No GL postings to this account for the current scope.
                          </td>
                        </tr>
                      )}
                      {ledgerLines.map((line) => {
                        const isMatched = matchedLedgerKeys.has(line.key);
                        return (
                          <tr key={line.key} className="border-b border-line/70 last:border-b-0 hover:bg-surface/60">
                            <td className="px-3 py-2 font-mono text-xs text-muted whitespace-nowrap">{line.date}</td>
                            <td className="px-3 py-2 font-mono text-xs font-medium text-accent whitespace-nowrap">{line.journalEntryNumber}</td>
                            <td className="px-3 py-2 text-xs text-ink max-w-[200px] truncate" title={line.description}>
                              {line.description}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular text-xs text-ink">
                              {line.debit > 0 ? formatCurrencyFull(line.debit) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular text-xs text-ink">
                              {line.credit > 0 ? formatCurrencyFull(line.credit) : '—'}
                            </td>
                            <td className="px-3 py-2">
                              {isMatched ? <Badge tone="success">Matched</Badge> : <Badge tone="warning">Outstanding</Badge>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>

            {Math.abs(summary.unmatchedDifference) >= 0.01 && (
              <div className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-soft/30 p-3.5">
                <AlertTriangleIcon className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                <p className="text-xs text-ink">
                  Statement and Ledger balances differ by{' '}
                  <strong>{formatCurrencyFull(Math.abs(summary.unmatchedDifference))}</strong>. Match or post an
                  adjustment for every outstanding line above to bring this to zero.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <BankTransactionActionModal
        isOpen={Boolean(actionTxn)}
        statement={statement}
        transaction={actionTxn}
        candidateLedgerLines={actionTxn ? candidateLinesFor(actionTxn) : []}
        onClose={() => setActionTxn(null)}
        onSuccess={() => {
          setStatements(getBankStatements());
          setActionTxn(null);
        }}
      />
    </div>
  );
}
