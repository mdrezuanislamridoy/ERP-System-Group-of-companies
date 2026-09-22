import React, { useEffect, useState } from 'react';
import { XIcon, PackageSearchIcon, AlertTriangleIcon, ShieldAlertIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { createGoodsReceiptNote, getPurchaseOrders, warehouses } from '../../data/operations';
import { recordAuditEvent } from '../../data/system';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';
import type { GoodsReceiptNote } from '../../types';

interface ReceiveGoodsModalProps {
  isOpen: boolean;
  initialPoId?: string | null;
  onClose: () => void;
  onSuccess?: (grn: GoodsReceiptNote) => void;
}

interface LineDraft {
  receivedQty: string;
  rejectedQty: string;
  rejectionReason: string;
  batchNumber: string;
}

export function ReceiveGoodsModal({ isOpen, initialPoId, onClose, onSuccess }: ReceiveGoodsModalProps) {
  const { role, companyId, can } = useApp();

  const eligiblePOs = getPurchaseOrders().filter(
    (p) =>
      (p.status === 'Issued' || p.status === 'Partially Received') &&
      (can('group.read') || !companyId || companyId === '*' || companyId === 'all' || p.companyId === companyId || p.companyId === companyId.replace(/^c-/, 'le-') || p.companyId === companyId.replace(/^le-/, 'c-'))
  );

  const [poId, setPoId] = useState(initialPoId && eligiblePOs.some((p) => p.id === initialPoId) ? initialPoId : eligiblePOs[0]?.id || '');
  const [warehouse, setWarehouse] = useState(warehouses[0]?.name || '');
  const [inspectorName, setInspectorName] = useState(role.user || 'QC Inspector');
  const [lines, setLines] = useState<Record<string, LineDraft>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const preferred = initialPoId && eligiblePOs.some((p) => p.id === initialPoId) ? initialPoId : eligiblePOs[0]?.id || '';
    setPoId(preferred);
    setLines({});
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialPoId]);

  if (!isOpen) return null;

  const po = eligiblePOs.find((p) => p.id === poId) || null;
  const outstandingLines = po ? po.lines.filter((l) => l.qty - l.qtyReceived > 0) : [];

  const handleClose = () => {
    setLines({});
    setError(null);
    onClose();
  };

  const getLine = (lineId: string): LineDraft => lines[lineId] || { receivedQty: '', rejectedQty: '0', rejectionReason: '', batchNumber: '' };
  const setLine = (lineId: string, patch: Partial<LineDraft>) => {
    setLines((prev) => ({ ...prev, [lineId]: { ...getLine(lineId), ...patch } }));
  };

  const canSubmit =
    Boolean(po) &&
    warehouse &&
    inspectorName.trim().length > 0 &&
    outstandingLines.some((l) => (parseFloat(getLine(l.id).receivedQty) || 0) > 0) &&
    outstandingLines.every((l) => {
      const draft = getLine(l.id);
      const received = parseFloat(draft.receivedQty) || 0;
      const rejected = parseFloat(draft.rejectedQty) || 0;
      if (received === 0) return true;
      if (rejected > received) return false;
      if (rejected > 0 && !draft.rejectionReason.trim()) return false;
      return true;
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!po || !canSubmit) return;

    try {
      const { grn, rtvTickets } = createGoodsReceiptNote({
        poId: po.id,
        warehouse,
        inspectorName: inspectorName.trim(),
        receivedBy: role.user || inspectorName.trim(),
        lines: outstandingLines
          .map((l) => {
            const draft = getLine(l.id);
            const received = parseFloat(draft.receivedQty) || 0;
            const rejected = parseFloat(draft.rejectedQty) || 0;
            return {
              poLineId: l.id,
              receivedQty: received,
              acceptedQty: received - rejected,
              rejectedQty: rejected,
              rejectionReason: draft.rejectionReason,
              batchNumber: draft.batchNumber
            };
          })
          .filter((l) => l.receivedQty > 0)
      });

      recordAuditEvent({
        user: role.user || inspectorName.trim(),
        action: 'RECORD_GOODS_RECEIPT_NOTE',
        resource: `${grn.grnNumber} against ${po.poNumber}`,
        company: po.companyName,
        before: po.status,
        after: `${grn.lines.length} line(s) inspected${rtvTickets.length > 0 ? ` — ${rtvTickets.length} RTV ticket(s) raised` : ''}`
      });

      if (onSuccess) onSuccess(grn);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record goods receipt.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-3xl rounded-2xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <PackageSearchIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Receive Goods Against PO</h2>
              <p className="text-xs text-muted">Log physical arrival and record QC pass/fail before stock is released.</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {eligiblePOs.length === 0 ? (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-soft/30 p-3.5">
            <AlertTriangleIcon className="h-4 w-4 shrink-0 text-warning mt-0.5" />
            <p className="text-xs text-ink">
              No active issued Purchase Orders are available to receive against in the current scope.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-subtle/70 p-3.5 rounded-xl border border-line">
              <div className="md:col-span-3">
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Purchase Order</label>
                <select
                  value={poId}
                  onChange={(e) => setPoId(e.target.value)}
                  className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                >
                  {eligiblePOs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.poNumber} — {p.supplierName} ({p.companyName}) — {p.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Receiving Warehouse</label>
                <select
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                  className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                >
                  {warehouses.map((w) => (
                    <option key={w.name} value={w.name}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">QC Inspector</label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  required
                  className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {outstandingLines.length === 0 ? (
              <p className="text-center text-xs text-muted py-6">This Purchase Order has no outstanding quantity left to receive.</p>
            ) : (
              <div className="rounded-xl border border-line overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-canvas border-b border-line text-faint uppercase font-semibold text-2xs tracking-wider">
                    <tr>
                      <th className="px-2 py-2">Item</th>
                      <th className="px-2 py-2 w-20 text-right">Outstanding</th>
                      <th className="px-2 py-2 w-24 text-right">Received</th>
                      <th className="px-2 py-2 w-24 text-right">Rejected</th>
                      <th className="px-2 py-2 w-28">Batch #</th>
                      <th className="px-2 py-2">Rejection Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-surface">
                    {outstandingLines.map((l) => {
                      const outstanding = l.qty - l.qtyReceived;
                      const draft = getLine(l.id);
                      const received = parseFloat(draft.receivedQty) || 0;
                      const rejected = parseFloat(draft.rejectedQty) || 0;
                      const accepted = Math.max(0, received - rejected);
                      const rejectedInvalid = rejected > received;
                      return (
                        <tr key={l.id}>
                          <td className="px-2 py-2 text-ink align-top">
                            {l.description}
                            <span className="block text-2xs text-muted font-mono">{l.sku}</span>
                            {received > 0 && (
                              <span className="mt-1 inline-flex items-center gap-1 text-2xs text-success">
                                Accepted: {accepted} {l.unit}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-muted align-top">{outstanding} {l.unit}</td>
                          <td className="p-1.5 align-top">
                            <input
                              type="number"
                              min="0"
                              max={outstanding}
                              value={draft.receivedQty}
                              onChange={(e) => setLine(l.id, { receivedQty: e.target.value })}
                              placeholder="0"
                              className="h-8 w-full rounded border border-line bg-canvas px-2 text-right font-mono text-xs text-ink focus:border-accent focus:outline-none"
                            />
                          </td>
                          <td className="p-1.5 align-top">
                            <input
                              type="number"
                              min="0"
                              max={received}
                              value={draft.rejectedQty}
                              onChange={(e) => setLine(l.id, { rejectedQty: e.target.value })}
                              className={cn(
                                'h-8 w-full rounded border bg-canvas px-2 text-right font-mono text-xs text-ink focus:outline-none',
                                rejectedInvalid ? 'border-danger focus:border-danger' : 'border-line focus:border-accent'
                              )}
                            />
                          </td>
                          <td className="p-1.5 align-top">
                            <input
                              type="text"
                              value={draft.batchNumber}
                              onChange={(e) => setLine(l.id, { batchNumber: e.target.value })}
                              placeholder="Optional"
                              className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                            />
                          </td>
                          <td className="p-1.5 align-top">
                            <input
                              type="text"
                              value={draft.rejectionReason}
                              onChange={(e) => setLine(l.id, { rejectionReason: e.target.value })}
                              placeholder={rejected > 0 ? 'Required...' : '—'}
                              disabled={rejected <= 0}
                              className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none disabled:opacity-40"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-start gap-2.5 rounded-xl border border-line bg-subtle/60 p-3.5">
              <ShieldAlertIcon className="h-4 w-4 shrink-0 text-muted mt-0.5" />
              <p className="text-xs text-muted">
                Only the <strong className="text-ink">Accepted</strong> quantity (Received − Rejected) is released to
                Available stock. Rejected quantity is quarantined and automatically raises a Return-to-Vendor ticket.
              </p>
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
              <Button type="submit" variant="primary" disabled={!canSubmit}>
                Record GRN
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
