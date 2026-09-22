import React, { useEffect, useState } from 'react';
import { XIcon, BanIcon, AlertTriangleIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { cancelPurchaseOrder } from '../../data/operations';
import { recordAuditEvent } from '../../data/system';
import { useApp } from '../../contexts/AppContext';
import type { PurchaseOrder } from '../../types';

interface CancelPurchaseOrderModalProps {
  isOpen: boolean;
  po: PurchaseOrder | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CancelPurchaseOrderModal({ isOpen, po, onClose, onSuccess }: CancelPurchaseOrderModalProps) {
  const { role } = useApp();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReason('');
    setError(null);
  }, [po?.id]);

  if (!isOpen || !po) return null;

  const canSubmit = reason.trim().length >= 10;

  const handleClose = () => {
    setReason('');
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      cancelPurchaseOrder(po.id, role.user || 'Procurement Officer', reason);
      recordAuditEvent({
        user: role.user || 'Procurement Officer',
        action: 'CANCEL_PURCHASE_ORDER',
        resource: po.poNumber,
        company: po.companyName,
        before: po.status,
        after: `Cancelled — ${reason.trim()}`
      });
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel Purchase Order.');
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
              <BanIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Cancel Purchase Order</h2>
              <p className="text-xs text-muted">{po.poNumber} — {po.supplierName}</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
              Cancellation Reason <span className="text-danger">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explain why this Purchase Order is being cancelled (min. 10 characters)..."
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
              Back
            </Button>
            <Button type="submit" variant="danger" disabled={!canSubmit}>
              Cancel Purchase Order
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
