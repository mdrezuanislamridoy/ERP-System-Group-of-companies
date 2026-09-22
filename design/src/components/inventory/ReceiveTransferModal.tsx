import React, { useState } from 'react';
import { XIcon, PackageCheckIcon, AlertTriangleIcon, ShieldAlertIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { receiveStockTransferOrder } from '../../data/operations';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';
import type { StockTransferOrder } from '../../types';

interface ReceiveTransferModalProps {
  isOpen: boolean;
  order: StockTransferOrder | null;
  onClose: () => void;
  onSuccess?: (order: StockTransferOrder) => void;
}

export function ReceiveTransferModal({
  isOpen,
  order,
  onClose,
  onSuccess
}: ReceiveTransferModalProps) {
  const { role } = useApp();

  const [receipts, setReceipts] = useState<Record<string, string>>({});
  const [incidentNotes, setIncidentNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const getReceivedQty = (lineId: string, defaultQty: number) => {
    if (receipts[lineId] !== undefined) return receipts[lineId];
    return String(defaultQty);
  };

  const totalDiscrepancy = order.lines.reduce((sum, l) => {
    const rec = parseFloat(getReceivedQty(l.id, l.shippedQty)) || 0;
    return sum + Math.max(0, l.shippedQty - rec);
  }, 0);

  const hasInvalidQty = order.lines.some((l) => {
    const rec = parseFloat(getReceivedQty(l.id, l.shippedQty));
    return isNaN(rec) || rec < 0 || rec > l.shippedQty;
  });

  const requiresIncidentNotes = totalDiscrepancy > 0;
  const canSubmit = !hasInvalidQty && (!requiresIncidentNotes || incidentNotes.trim().length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);

    try {
      const updated = receiveStockTransferOrder({
        stoId: order.id,
        receivedBy: role.user || 'Receiving Warehouse Officer',
        lineReceipts: order.lines.map((l) => ({
          lineId: l.id,
          receivedQty: parseFloat(getReceivedQty(l.id, l.shippedQty)) || 0
        })),
        incidentNotes: requiresIncidentNotes ? incidentNotes.trim() : undefined
      });

      if (onSuccess) onSuccess(updated);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Receipt confirmation failed.');
    }
  };

  const handleClose = () => {
    setReceipts({});
    setIncidentNotes('');
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
              <PackageCheckIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Confirm Inbound Transfer Receipt</h2>
              <p className="text-xs text-muted">
                {order.transferNumber}: {order.sourceWarehouseName} → {order.destWarehouseName}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Logistics Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-canvas p-3 rounded-xl border border-line text-xs">
            <div>
              <span className="block text-2xs text-muted">Carrier</span>
              <span className="font-semibold text-ink">{order.carrier || 'Internal Fleet'}</span>
            </div>
            <div>
              <span className="block text-2xs text-muted">Vehicle #</span>
              <span className="font-mono text-ink">{order.vehicleNumber || '—'}</span>
            </div>
            <div>
              <span className="block text-2xs text-muted">Tracking #</span>
              <span className="font-mono text-accent">{order.trackingNumber || '—'}</span>
            </div>
            <div>
              <span className="block text-2xs text-muted">Dispatched At</span>
              <span className="text-muted">{order.dispatchedAt ? order.dispatchedAt.slice(0, 10) : '—'}</span>
            </div>
          </div>

          {/* Lines Table */}
          <div className="rounded-xl border border-line overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas border-b border-line text-faint uppercase font-semibold text-2xs tracking-wider">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Batch / Lot</th>
                  <th className="px-3 py-2 w-24 text-right">Shipped Qty</th>
                  <th className="px-3 py-2 w-28 text-right">Received Qty</th>
                  <th className="px-3 py-2 w-24 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {order.lines.map((l) => {
                  const recStr = getReceivedQty(l.id, l.shippedQty);
                  const rec = parseFloat(recStr) || 0;
                  const variance = l.shippedQty - rec;
                  const isInvalid = rec < 0 || rec > l.shippedQty || isNaN(rec);

                  return (
                    <tr key={l.id}>
                      <td className="px-3 py-2">
                        <span className="font-medium text-ink block">{l.product}</span>
                        <span className="text-2xs font-mono text-muted">{l.sku}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted">
                        {l.batchNumber || '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-ink">
                        {l.shippedQty} {l.unit}
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          min="0"
                          max={l.shippedQty}
                          value={recStr}
                          onChange={(e) => setReceipts((prev) => ({ ...prev, [l.id]: e.target.value }))}
                          className={cn(
                            'h-8 w-full rounded border bg-canvas px-2 text-right font-mono text-xs text-ink focus:outline-none',
                            isInvalid ? 'border-danger' : 'border-line focus:border-accent'
                          )}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {variance > 0 ? (
                          <span className="font-bold text-danger">-{variance}</span>
                        ) : (
                          <span className="text-success font-medium">Match</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mandatory Discrepancy Note if variance detected */}
          {requiresIncidentNotes && (
            <div className="rounded-xl border border-warning/50 bg-warning-soft/20 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-warning">
                <AlertTriangleIcon className="h-4 w-4" />
                <span>Transit Shrinkage Claim — Discrepancy Detected ({totalDiscrepancy} Units)</span>
              </div>
              <p className="text-xs text-ink">
                Physical count is less than manifest quantity. Corporate inventory governance requires a mandatory
                incident note before recording goods arrival.
              </p>
              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                  Incident & Transit Damage Notes <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={incidentNotes}
                  onChange={(e) => setIncidentNotes(e.target.value)}
                  placeholder="e.g. Broken packaging seals during transit; carrier driver acknowledged 2 units missing."
                  required
                  className="h-9 w-full rounded-lg border border-warning/60 bg-surface px-3 text-xs text-ink focus:border-warning focus:outline-none"
                />
              </div>
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
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              {requiresIncidentNotes ? 'Accept with Discrepancy' : 'Confirm Receipt (100% Match)'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
