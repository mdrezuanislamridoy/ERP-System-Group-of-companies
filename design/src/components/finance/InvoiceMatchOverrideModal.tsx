import React, { useEffect, useState } from 'react';
import { XIcon, ShieldAlertIcon, AlertTriangleIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { setInvoiceMatchOverride } from '../../data/finance';
import { recordAuditEvent } from '../../data/system';
import { useApp } from '../../contexts/AppContext';
import type { Invoice } from '../../types';

interface InvoiceMatchOverrideModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InvoiceMatchOverrideModal({ isOpen, invoice, onClose, onSuccess }: InvoiceMatchOverrideModalProps) {
  const { role } = useApp();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReason('');
    setError(null);
  }, [invoice?.id]);

  if (!isOpen || !invoice) return null;

  const canSubmit = reason.trim().length >= 15;

  const handleClose = () => {
    setReason('');
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setInvoiceMatchOverride(invoice.id, role.user || 'Executive Approver', reason);
      recordAuditEvent({
        user: role.user || 'Executive Approver',
        action: 'OVERRIDE_3WAY_MATCH',
        resource: invoice.id,
        company: invoice.company,
        before: invoice.matchStatus || 'Unmatched',
        after: `Bypassed — ${reason.trim()}`
      });
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record override.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
              <ShieldAlertIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Executive Override</h2>
              <p className="text-xs text-muted">{invoice.id} — {invoice.party}</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="rounded-xl border border-warning/40 bg-warning-soft/30 p-3.5 text-xs text-ink">
            This invoice failed 3-Way Match verification. Signing this override authorizes Accounts Payable to post
            it for payment despite the unresolved variance — it is permanently recorded against your name on the
            audit trail.
          </div>

          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
              Override Justification <span className="text-danger">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explain why payment should proceed despite the discrepancy (min. 15 characters)..."
              className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </div>

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
            <Button type="submit" variant="danger" disabled={!canSubmit}>
              Sign Override
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
