import React, { useState } from 'react';
import {
  XIcon,
  ShieldAlertIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  Building2Icon,
  FileCheckIcon,
  LayersIcon,
  CalendarIcon,
  MapPinIcon
} from 'lucide-react';
import { Button } from '../ui/Button';
import { quarantineBatch } from '../../data/operations';
import { useApp } from '../../contexts/AppContext';
import type { ItemBatch } from '../../types';

interface BatchRecallModalProps {
  isOpen: boolean;
  batch: ItemBatch | null;
  onClose: () => void;
  onSuccess?: (updated: ItemBatch) => void;
}

export function BatchRecallModal({
  isOpen,
  batch,
  onClose,
  onSuccess
}: BatchRecallModalProps) {
  const { role } = useApp();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !batch) return null;

  const todayStr = '2026-09-22';
  const todayMs = new Date(todayStr).getTime();
  const expiryMs = new Date(batch.expiryDate).getTime();
  const daysRemaining = Math.ceil((expiryMs - todayMs) / (1000 * 3600 * 24));

  const handleRecall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    try {
      const updated = quarantineBatch(
        batch.id,
        reason.trim(),
        role.user || 'Quality Assurance Director'
      );
      if (onSuccess) onSuccess(updated);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate recall.');
    }
  };

  const handleClose = () => {
    setReason('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
              <ShieldAlertIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Batch Lineage & Recall Traceability</h2>
              <p className="text-xs text-muted font-mono">{batch.batchNumber} · {batch.product}</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Status & Expiry Bar */}
          <div className="flex items-center justify-between bg-canvas p-3 rounded-xl border border-line">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Status:</span>
              <span
                className={`text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
                  batch.status === 'recalled' || batch.status === 'expired'
                    ? 'bg-danger-soft text-danger'
                    : 'bg-success-soft text-success'
                }`}
              >
                {batch.status}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <CalendarIcon className="h-4 w-4 text-muted" />
              <span className="text-muted">Expiry:</span>
              <span className="font-mono text-ink font-semibold">{batch.expiryDate}</span>
              <span
                className={`text-2xs font-bold px-1.5 py-0.5 rounded ${
                  daysRemaining > 90
                    ? 'bg-success-soft text-success'
                    : daysRemaining >= 30
                    ? 'bg-warning-soft text-warning'
                    : 'bg-danger-soft text-danger'
                }`}
              >
                {daysRemaining > 0 ? `${daysRemaining} days remaining` : `Expired ${Math.abs(daysRemaining)} days ago`}
              </span>
            </div>
          </div>

          {/* Full Lineage Traceability Cards */}
          <div className="space-y-2">
            <h4 className="text-2xs font-semibold uppercase tracking-wider text-faint">
              Pedigree Traceability Chain
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-canvas rounded-xl border border-line space-y-1">
                <div className="flex items-center gap-2 text-accent font-semibold">
                  <Building2Icon className="h-4 w-4" />
                  <span>Origin Supplier</span>
                </div>
                <p className="font-medium text-ink">{batch.supplierName || 'Primary Supplier'}</p>
                <p className="text-2xs font-mono text-muted">PO: {batch.poNumber || 'PO-2026-0001'}</p>
              </div>

              <div className="p-3 bg-canvas rounded-xl border border-line space-y-1">
                <div className="flex items-center gap-2 text-accent font-semibold">
                  <FileCheckIcon className="h-4 w-4" />
                  <span>QC Release & GRN</span>
                </div>
                <p className="font-mono font-medium text-ink">{batch.qcReleaseNumber}</p>
                <p className="text-2xs font-mono text-muted">GRN: {batch.grnNumber || 'GRN-2026-0001'}</p>
              </div>

              <div className="p-3 bg-canvas rounded-xl border border-line space-y-1">
                <div className="flex items-center gap-2 text-accent font-semibold">
                  <MapPinIcon className="h-4 w-4" />
                  <span>Warehouse Storage</span>
                </div>
                <p className="font-medium text-ink">{batch.warehouse}</p>
                <p className="text-2xs font-mono text-muted">Bin Location: <strong className="text-ink">{batch.binLocation}</strong></p>
              </div>

              <div className="p-3 bg-canvas rounded-xl border border-line space-y-1">
                <div className="flex items-center gap-2 text-accent font-semibold">
                  <LayersIcon className="h-4 w-4" />
                  <span>Inventory Balance</span>
                </div>
                <p className="font-mono font-bold text-ink">{batch.quantityAvailable} units</p>
                <p className="text-2xs font-mono text-muted">Initial Received: {batch.initialQuantity || batch.quantityAvailable} units</p>
              </div>
            </div>
          </div>

          {/* Recall / Quarantine Trigger Section */}
          {batch.status === 'recalled' ? (
            <div className="rounded-xl border border-danger/40 bg-danger-soft/20 p-4 text-center space-y-1">
              <span className="text-xs font-bold text-danger uppercase tracking-wider block">
                Batch Already Recalled
              </span>
              <p className="text-xs text-ink">
                All remaining units have been transferred to Quarantine. Outbound dispatch and sales orders are blocked.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRecall} className="border-t border-line pt-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-danger">
                <AlertTriangleIcon className="h-4 w-4" />
                <span>Executive Batch Recall & Quarantine Action</span>
              </div>
              <p className="text-xs text-muted">
                Initiating a recall immediately halts all goods issues for this batch across all sister concern facilities,
                deducts quantity from Available to Promise (ATP), and logs a permanent compliance audit entry.
              </p>

              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                  Recall Reason / Regulatory Notice <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. DGDA/BSTI safety alert; customer reported contamination; moisture leakage"
                  required
                  className="h-9 w-full rounded-lg border border-danger/50 bg-canvas px-3 text-xs text-ink focus:border-danger focus:outline-none"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger-soft/30 p-3.5">
                  <AlertTriangleIcon className="h-4 w-4 shrink-0 text-danger mt-0.5" />
                  <p className="text-xs text-ink">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" disabled={!reason.trim()}>
                  Initiate Immediate Batch Recall
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
