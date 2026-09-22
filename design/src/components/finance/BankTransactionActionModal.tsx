import React, { useState } from 'react';
import { XIcon, LinkIcon, ReceiptIcon, AlertTriangleIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { matchBankTransaction, postBankAdjustment, formatCurrencyFull } from '../../data/finance';
import { costCenters } from '../../data/organization';
import { recordAuditEvent } from '../../data/system';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';
import type { BankStatement, BankTransaction, ReconcilableLedgerLine } from '../../types';

interface BankTransactionActionModalProps {
  isOpen: boolean;
  statement: BankStatement | null;
  transaction: BankTransaction | null;
  /** Unmatched GL lines on the correct side to pair against, already filtered by the caller. */
  candidateLedgerLines: ReconcilableLedgerLine[];
  onClose: () => void;
  onSuccess: () => void;
}

export function BankTransactionActionModal({
  isOpen,
  statement,
  transaction,
  candidateLedgerLines,
  onClose,
  onSuccess
}: BankTransactionActionModalProps) {
  const { role } = useApp();
  const [mode, setMode] = useState<'match' | 'adjust'>('match');
  const [selectedLineKey, setSelectedLineKey] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<'bank-charge' | 'interest-income'>('bank-charge');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !statement || !transaction) return null;

  const companyCostCenter =
    costCenters.find(
      (cc) =>
        (cc.companyId === statement.companyId ||
          cc.companyId === statement.companyId.replace(/^c-/, 'le-') ||
          cc.companyId === statement.companyId.replace(/^le-/, 'c-')) &&
        cc.type === 'administrative'
    ) ||
    costCenters.find(
      (cc) =>
        cc.companyId === statement.companyId ||
        cc.companyId === statement.companyId.replace(/^c-/, 'le-') ||
        cc.companyId === statement.companyId.replace(/^le-/, 'c-')
    );

  const handleClose = () => {
    setMode('match');
    setSelectedLineKey('');
    setError(null);
    onClose();
  };

  const handleMatch = () => {
    if (!selectedLineKey) return;
    try {
      matchBankTransaction(statement.id, transaction.id, selectedLineKey, role.user || 'Treasury Specialist');
      recordAuditEvent({
        user: role.user || 'Treasury Specialist',
        action: 'MATCH_BANK_TRANSACTION',
        resource: `${transaction.description} [${statement.bankName}]`,
        company: statement.companyName,
        before: 'Unmatched',
        after: `Manually matched to GL posting ${selectedLineKey}`
      });
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to match transaction.');
    }
  };

  const handleAdjust = () => {
    if (!companyCostCenter) {
      setError('No cost center is configured for this company — cannot post an adjustment.');
      return;
    }
    try {
      const entry = postBankAdjustment({
        statementId: statement.id,
        transactionId: transaction.id,
        type: adjustmentType,
        costCenterId: companyCostCenter.id,
        costCenterCode: companyCostCenter.code,
        createdBy: role.user || 'Treasury Specialist'
      });
      recordAuditEvent({
        user: role.user || 'Treasury Specialist',
        action: 'POST_BANK_ADJUSTMENT',
        resource: `${entry.entryNumber} [${statement.bankName}]`,
        company: statement.companyName,
        before: 'Unmatched — no GL posting',
        after: `Posted ${adjustmentType === 'bank-charge' ? 'Bank Charge' : 'Interest Income'} of ${formatCurrencyFull(transaction.amount)} and matched`
      });
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post adjustment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <h2 className="text-lg font-bold text-ink">Reconcile Statement Line</h2>
            <p className="text-xs text-muted mt-0.5">
              {transaction.date} · {transaction.description} · <span className="font-mono">{formatCurrencyFull(transaction.amount)}</span>{' '}
              ({transaction.direction === 'credit' ? 'money in' : 'money out'})
            </p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-1.5 rounded-lg border border-line bg-subtle p-1">
          <button
            type="button"
            onClick={() => setMode('match')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              mode === 'match' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            )}
          >
            <LinkIcon className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
            Match to GL Posting
          </button>
          <button
            type="button"
            onClick={() => setMode('adjust')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              mode === 'adjust' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            )}
          >
            <ReceiptIcon className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
            Post Adjustment
          </button>
        </div>

        {mode === 'match' ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-muted">
              Select the General Ledger posting this statement line corresponds to. Only unmatched postings on the
              matching side ({transaction.direction === 'credit' ? 'debits to Cash' : 'credits to Cash'}) are shown.
            </p>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-line divide-y divide-line">
              {candidateLedgerLines.length === 0 && (
                <p className="p-4 text-center text-xs text-muted">No unmatched GL postings available to pair with this line.</p>
              )}
              {candidateLedgerLines.map((line) => (
                <label
                  key={line.key}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 p-3 text-xs transition-colors hover:bg-subtle/60',
                    selectedLineKey === line.key && 'bg-accent-soft/40'
                  )}
                >
                  <input
                    type="radio"
                    name="ledger-line"
                    checked={selectedLineKey === line.key}
                    onChange={() => setSelectedLineKey(line.key)}
                    className="h-3.5 w-3.5 accent-[#3B82F6]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-accent">{line.journalEntryNumber}</span>
                      <span className="text-muted">{line.date}</span>
                      {line.reference && <span className="font-mono text-faint">({line.reference})</span>}
                    </div>
                    <p className="truncate text-ink mt-0.5">{line.description}</p>
                  </div>
                  <span className="font-mono font-semibold text-ink shrink-0">
                    {formatCurrencyFull(line.debit > 0 ? line.debit : line.credit)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-muted">
              No matching GL entry exists for this line — post it directly. This creates a real journal voucher
              through the normal posting engine (fiscal period locks still apply) and links it automatically.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('bank-charge')}
                className={cn(
                  'rounded-lg border p-3 text-left text-xs transition-colors',
                  adjustmentType === 'bank-charge' ? 'border-accent bg-accent-soft/40' : 'border-line hover:bg-subtle/60'
                )}
              >
                <p className="font-semibold text-ink">Bank Charge / Fee</p>
                <p className="text-2xs text-muted mt-0.5">Debit Bank Charges & Fees (6130) · Credit Cash</p>
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('interest-income')}
                className={cn(
                  'rounded-lg border p-3 text-left text-xs transition-colors',
                  adjustmentType === 'interest-income' ? 'border-accent bg-accent-soft/40' : 'border-line hover:bg-subtle/60'
                )}
              >
                <p className="font-semibold text-ink">Interest Income</p>
                <p className="text-2xs text-muted mt-0.5">Debit Cash · Credit Interest Income (4140)</p>
              </button>
            </div>
            {companyCostCenter && (
              <p className="text-2xs text-muted">
                Posted against cost center <span className="font-mono text-ink">{companyCostCenter.code}</span>.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger-soft/30 p-3.5">
            <AlertTriangleIcon className="h-4 w-4 shrink-0 text-danger mt-0.5" />
            <p className="text-xs text-ink">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-line pt-4 mt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          {mode === 'match' ? (
            <Button type="button" variant="primary" disabled={!selectedLineKey} onClick={handleMatch}>
              Match
            </Button>
          ) : (
            <Button type="button" variant="primary" onClick={handleAdjust}>
              Post & Match
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
