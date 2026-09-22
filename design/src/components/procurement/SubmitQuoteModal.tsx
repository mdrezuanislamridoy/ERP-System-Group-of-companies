import React, { useEffect, useState } from 'react';
import { XIcon, ClipboardCheckIcon, AlertTriangleIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { submitSupplierQuote, suppliers } from '../../data/operations';
import { formatCurrency } from '../../data/finance';
import { recordAuditEvent } from '../../data/system';
import { useApp } from '../../contexts/AppContext';
import type { RFQ } from '../../types';

interface SubmitQuoteModalProps {
  isOpen: boolean;
  rfq: RFQ | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SubmitQuoteModal({ isOpen, rfq, onClose, onSuccess }: SubmitQuoteModalProps) {
  const { role } = useApp();

  const pendingSuppliers = rfq ? rfq.invitedSuppliers.filter((s) => !rfq.quotes.some((q) => q.supplierName === s)) : [];

  const [supplierName, setSupplierName] = useState(pendingSuppliers[0] || '');
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({});
  const [deliveryDays, setDeliveryDays] = useState('14');
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [error, setError] = useState<string | null>(null);

  // This component instance persists across different RFQs being targeted (the parent never
  // unmounts it), so re-sync the supplier default whenever the RFQ identity or its pending-supplier
  // set changes — otherwise `supplierName` can point at a supplier never invited to the new RFQ.
  useEffect(() => {
    setSupplierName(pendingSuppliers[0] || '');
    setUnitPrices({});
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfq?.id, rfq?.quotes.length]);

  if (!isOpen || !rfq) return null;

  const handleClose = () => {
    setUnitPrices({});
    setDeliveryDays('14');
    setWarrantyMonths('12');
    setPaymentTerms('Net 30');
    setError(null);
    onClose();
  };

  const total = rfq.items.reduce((sum, item) => sum + (parseFloat(unitPrices[item.id]) || 0) * item.qty, 0);
  const canSubmit =
    Boolean(supplierName) &&
    rfq.items.every((item) => parseFloat(unitPrices[item.id]) > 0) &&
    parseFloat(deliveryDays) > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      const quote = submitSupplierQuote({
        rfqId: rfq.id,
        supplierName,
        itemPrices: rfq.items.map((item) => ({ rfqItemId: item.id, unitPrice: parseFloat(unitPrices[item.id]) || 0 })),
        deliveryDays: parseFloat(deliveryDays) || 0,
        warrantyMonths: parseFloat(warrantyMonths) || 0,
        paymentTerms: paymentTerms.trim() || 'Not specified'
      });

      recordAuditEvent({
        user: role.user || 'Procurement Officer',
        action: 'RECORD_SUPPLIER_QUOTE',
        resource: `${supplierName} on ${rfq.rfqNumber}`,
        company: rfq.companyName,
        before: '—',
        after: `${formatCurrency(quote.totalAmount)} · ${quote.deliveryDays}d delivery · ${quote.warrantyMonths}mo warranty`
      });

      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record quote.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <ClipboardCheckIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Record Supplier Quote</h2>
              <p className="text-xs text-muted">{rfq.rfqNumber} — {rfq.title}</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {pendingSuppliers.length === 0 ? (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-soft/30 p-3.5">
            <AlertTriangleIcon className="h-4 w-4 shrink-0 text-warning mt-0.5" />
            <p className="text-xs text-ink">Every invited supplier has already submitted a quote for this RFQ.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-subtle/70 p-3.5 rounded-xl border border-line">
              <div className="md:col-span-3">
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Supplier</label>
                <select
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                >
                  {pendingSuppliers.map((name) => {
                    const s = suppliers.find((sup) => sup.name === name);
                    return (
                      <option key={name} value={name}>
                        {name} {s ? `(${s.rating.toFixed(1)}★)` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Delivery (days)</label>
                <input
                  type="number"
                  min="1"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  required
                  className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Warranty (months)</label>
                <input
                  type="number"
                  min="0"
                  value={warrantyMonths}
                  onChange={(e) => setWarrantyMonths(e.target.value)}
                  className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. Net 30"
                  className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-xl border border-line overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas border-b border-line text-faint uppercase font-semibold text-2xs tracking-wider">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 w-16 text-right">Qty</th>
                    <th className="px-3 py-2 w-32 text-right">Unit Price (৳)</th>
                    <th className="px-3 py-2 w-32 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surface">
                  {rfq.items.map((item) => {
                    const price = parseFloat(unitPrices[item.id]) || 0;
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-ink">
                          {item.product}
                          <span className="block text-2xs text-muted font-mono">{item.sku}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-muted">
                          {item.qty} {item.unit}
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={unitPrices[item.id] || ''}
                            onChange={(e) => setUnitPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            required
                            className="h-8 w-full rounded border border-line bg-canvas px-2 text-right font-mono text-xs text-ink focus:border-accent focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular text-ink">{formatCurrency(price * item.qty)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line font-semibold">
                    <td colSpan={3} className="px-3 py-2 text-right uppercase text-muted text-2xs">
                      Total Bid
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular text-ink">{formatCurrency(total)}</td>
                  </tr>
                </tfoot>
              </table>
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
                Record Quote
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
