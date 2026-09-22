import React, { useState } from 'react';
import { AlertTriangleIcon, XIcon, Undo2Icon } from 'lucide-react';
import { Button } from '../ui/Button';
import { reverseJournalEntry, formatCurrencyFull, getFiscalPeriodForDate } from '../../data/finance';
import { recordAuditEvent } from '../../data/system';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';
import type { JournalEntry } from '../../types';

interface ReverseJournalModalProps {
  isOpen: boolean;
  voucher: JournalEntry | null;
  onClose: () => void;
  onSuccess?: (reversalEntry: JournalEntry) => void;
}

export function ReverseJournalModal({ isOpen, voucher, onClose, onSuccess }: ReverseJournalModalProps) {
  const { role } = useApp();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !voucher) return null;

  const today = new Date().toISOString().slice(0, 10);
  const currentPeriod = getFiscalPeriodForDate(today);
  const periodBlocksReversal = currentPeriod?.status === 'hard-closed';

  const canSubmit = reason.trim().length >= 10 && !periodBlocksReversal;

  const handleClose = () => {
    setReason('');
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      const reversalEntry = reverseJournalEntry({
        originalId: voucher.id,
        reason,
        createdBy: role.user || 'Finance Controller'
      });

      recordAuditEvent({
        user: role.user || 'Finance Controller',
        action: 'REVERSE_JOURNAL_VOUCHER',
        resource: `${reversalEntry.entryNumber} reverses ${voucher.entryNumber}`,
        company: voucher.companyName,
        before: `${voucher.entryNumber}: Posted`,
        after: `${voucher.entryNumber}: Reversed via ${reversalEntry.entryNumber}. Justification: ${reason.trim()}`
      });

      setReason('');
      setError(null);
      if (onSuccess) onSuccess(reversalEntry);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reverse journal voucher.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
              <Undo2Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Reverse Journal Voucher</h2>
              <p className="text-xs text-muted">
                {voucher.entryNumber} is posted and immutable. This creates a new compensating entry — it cannot
                be edited or deleted.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="rounded-xl border border-line bg-subtle/70 p-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted">Original voucher</span>
              <span className="font-mono font-semibold text-accent">{voucher.entryNumber}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted">Memo</span>
              <span className="text-ink text-right max-w-[70%] truncate">{voucher.memo}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted">Amount</span>
              <span className="font-mono text-ink">{formatCurrencyFull(voucher.totalDebit)}</span>
            </div>
            <div className="mt-2 border-t border-line pt-2 text-2xs text-muted">
              A mirror entry will be posted today ({today}) swapping every line's debit and credit, referencing{' '}
              <span className="font-mono text-ink">{voucher.entryNumber}</span>. The original stays on the books,
              flagged <span className="font-semibold text-ink">Reversed</span>.
            </div>
          </div>

          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
              Mandatory Audit Justification <span className="text-danger">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="Explain why this posted voucher must be reversed (min. 10 characters)..."
              className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-2xs text-muted">
              Recorded permanently to the audit trail alongside this reversal.
            </p>
          </div>

          {periodBlocksReversal && currentPeriod && (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-soft/30 p-3.5">
              <AlertTriangleIcon className="h-4 w-4 shrink-0 text-warning mt-0.5" />
              <p className="text-xs text-ink">
                Fiscal period <strong>{currentPeriod.label}</strong> is hard closed. Reversals cannot be posted
                until the period is reopened.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger-soft/30 p-3.5">
              <AlertTriangleIcon className="h-4 w-4 shrink-0 text-danger mt-0.5" />
              <p className="text-xs text-ink">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={!canSubmit}
              title={!canSubmit ? 'Provide a justification of at least 10 characters' : 'Post reversing entry'}
              className={cn(!canSubmit && 'opacity-60')}
            >
              Post Reversal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
