import React, { useState } from 'react';
import { XIcon, PlusIcon, Trash2Icon, FileTextIcon, AlertTriangleIcon, ArrowRightLeftIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { createPurchaseOrder, purchaseRequests, suppliers } from '../../data/operations';
import { companies } from '../../data/organization';
import { recordAuditEvent } from '../../data/system';
import { useApp } from '../../contexts/AppContext';
import type { PurchaseOrder } from '../../types';

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (po: PurchaseOrder) => void;
}

interface LineDraft {
  id: string;
  sku: string;
  description: string;
  qty: string;
  unit: string;
  unitPrice: string;
  taxRatePct: string;
}

export function CreatePurchaseOrderModal({ isOpen, onClose, onSuccess }: CreatePurchaseOrderModalProps) {
  const { role } = useApp();

  const [companyId, setCompanyId] = useState(companies[0].id);
  const [supplierId, setSupplierId] = useState(suppliers[0].id);
  const [purchaseRequestId, setPurchaseRequestId] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [lines, setLines] = useState<LineDraft[]>([
    { id: 'l-1', sku: '', description: '', qty: '1', unit: 'Unit', unitPrice: '0', taxRatePct: '15' }
  ]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetCompany = companies.find((c) => c.id === companyId) || companies[0];
  const approvedRequestsForCompany = purchaseRequests.filter((p) => p.status === 'approved' && p.company === targetCompany.name);
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const availableSuppliers = suppliers.filter((s) => !s.isSisterConcern || s.sisterCompanyId !== targetCompany.id);

  const handleAddLine = () => {
    setLines((prev) => [...prev, { id: `l-${Date.now()}`, sku: '', description: '', qty: '1', unit: 'Unit', unitPrice: '0', taxRatePct: '15' }]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleLineChange = (id: string, field: keyof LineDraft, value: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const canSubmit = lines.every((l) => l.description.trim().length > 0 && parseFloat(l.qty) > 0 && parseFloat(l.unitPrice) >= 0);

  const handleClose = () => {
    setLines([{ id: 'l-1', sku: '', description: '', qty: '1', unit: 'Unit', unitPrice: '0', taxRatePct: '15' }]);
    setPurchaseRequestId('');
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      const po = createPurchaseOrder({
        purchaseRequestId: purchaseRequestId || undefined,
        supplierId,
        companyId: targetCompany.id,
        companyName: targetCompany.name,
        paymentTerms: paymentTerms.trim() || 'Net 30',
        lines: lines.map((l) => ({
          sku: l.sku.trim(),
          description: l.description.trim(),
          qty: parseFloat(l.qty) || 0,
          unit: l.unit.trim() || 'Unit',
          unitPrice: parseFloat(l.unitPrice) || 0,
          taxRatePct: parseFloat(l.taxRatePct) || 0
        })),
        createdBy: role.user || 'Procurement Officer'
      });

      recordAuditEvent({
        user: role.user || 'Procurement Officer',
        action: 'CREATE_PURCHASE_ORDER',
        resource: po.poNumber,
        company: po.companyName,
        before: '—',
        after: `Draft raised for ${po.supplierName}, ${po.lines.length} line(s)`
      });

      if (onSuccess) onSuccess(po);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Purchase Order.');
    }
  };

  const subtotal = lines.reduce((acc, l) => acc + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0);
  const tax = lines.reduce(
    (acc, l) => acc + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0) * ((parseFloat(l.taxRatePct) || 0) / 100),
    0
  );
  const total = subtotal + tax;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-4xl rounded-2xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <h2 className="text-lg font-bold text-ink">New Purchase Order</h2>
            <p className="text-xs text-muted">
              Issue a binding procurement order to an approved supplier or sister concern entity.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-subtle/70 p-3.5 rounded-xl border border-line">
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Legal Entity (Buyer)</label>
              <select
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setPurchaseRequestId('');
                }}
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Supplier / Vendor</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
              >
                {availableSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.isSisterConcern ? `🏢 [Inter-Company] ${s.name}` : `${s.name} (${s.category})`}
                  </option>
                ))}
              </select>
            </div>

            {selectedSupplier?.isSisterConcern && (
              <div className="col-span-full flex items-start gap-2.5 rounded-lg border border-accent/40 bg-accent-soft/30 p-2.5 text-xs text-ink">
                <ArrowRightLeftIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div>
                  <span className="font-semibold text-accent">⚡ Inter-Company Auto-Mirroring Active:</span>
                  <span className="ml-1 text-muted">
                    Issuing this PO to sister concern <strong className="text-ink">{selectedSupplier.name}</strong> will automatically generate a synchronized Sales Order in their order book with identical line items and rates.
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Linked Requisition (optional)</label>
              <select
                value={purchaseRequestId}
                onChange={(e) => setPurchaseRequestId(e.target.value)}
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
              >
                <option value="">— None —</option>
                {approvedRequestsForCompany.map((pr) => (
                  <option key={pr.id} value={pr.id}>{pr.id} — {pr.title}</option>
                ))}
              </select>
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
                  <th className="px-2 py-2 w-24">SKU</th>
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2 w-16 text-right">Qty</th>
                  <th className="px-2 py-2 w-20">Unit</th>
                  <th className="px-2 py-2 w-24 text-right">Unit Price</th>
                  <th className="px-2 py-2 w-16 text-right">Tax %</th>
                  <th className="px-1 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={l.sku}
                        onChange={(e) => handleLineChange(l.id, 'sku', e.target.value)}
                        className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink font-mono focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={l.description}
                        onChange={(e) => handleLineChange(l.id, 'description', e.target.value)}
                        placeholder="Item description"
                        required
                        className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        min="1"
                        value={l.qty}
                        onChange={(e) => handleLineChange(l.id, 'qty', e.target.value)}
                        className="h-8 w-full rounded border border-line bg-canvas px-2 text-right text-xs text-ink focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={l.unit}
                        onChange={(e) => handleLineChange(l.id, 'unit', e.target.value)}
                        className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={l.unitPrice}
                        onChange={(e) => handleLineChange(l.id, 'unitPrice', e.target.value)}
                        className="h-8 w-full rounded border border-line bg-canvas px-2 text-right font-mono text-xs text-ink focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={l.taxRatePct}
                        onChange={(e) => handleLineChange(l.id, 'taxRatePct', e.target.value)}
                        className="h-8 w-full rounded border border-line bg-canvas px-2 text-right font-mono text-xs text-ink focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(l.id)}
                        disabled={lines.length <= 1}
                        className="p-1 rounded text-muted hover:text-danger hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" size="xs" variant="secondary" icon={PlusIcon} onClick={handleAddLine}>
            Add Line
          </Button>

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
              Create Draft PO
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
