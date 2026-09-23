import React, { useState } from 'react';
import { XIcon, PlusIcon, Trash2Icon, FileSearchIcon, AlertTriangleIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { createRFQ, purchaseRequests, suppliers } from '../../data/operations';
import { companies } from '../../data/organization';
import { recordAuditEvent } from '../../data/system';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';
import type { RFQ } from '../../types';

interface CreateRFQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (rfq: RFQ) => void;
}

interface ItemDraft {
  id: string;
  product: string;
  sku: string;
  qty: string;
  unit: string;
}

export function CreateRFQModal({ isOpen, onClose, onSuccess }: CreateRFQModalProps) {
  const { role } = useApp();

  const approvedRequests = purchaseRequests.filter((p) => p.status === 'approved');

  const [purchaseRequestId, setPurchaseRequestId] = useState(approvedRequests[0]?.id || '');
  const [title, setTitle] = useState(approvedRequests[0]?.title || '');
  const [dueDate, setDueDate] = useState('2026-10-06');
  const [invitedSuppliers, setInvitedSuppliers] = useState<string[]>([]);
  const [items, setItems] = useState<ItemDraft[]>([{ id: 'i-1', product: '', sku: '', qty: '1', unit: 'Unit' }]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedPr = purchaseRequests.find((p) => p.id === purchaseRequestId);

  const handlePrChange = (id: string) => {
    setPurchaseRequestId(id);
    const pr = purchaseRequests.find((p) => p.id === id);
    if (pr) setTitle(pr.title);
  };

  const toggleSupplier = (name: string) => {
    setInvitedSuppliers((prev) => (prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]));
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { id: `i-${Date.now()}`, product: '', sku: '', qty: '1', unit: 'Unit' }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof ItemDraft, value: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const canSubmit =
    Boolean(selectedPr) &&
    title.trim().length > 0 &&
    invitedSuppliers.length >= 2 &&
    items.every((i) => i.product.trim().length > 0 && parseFloat(i.qty) > 0);

  const handleClose = () => {
    setInvitedSuppliers([]);
    setItems([{ id: 'i-1', product: '', sku: '', qty: '1', unit: 'Unit' }]);
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selectedPr) return;

    const company = companies.find((c) => c.name === selectedPr.company);
    if (!company) {
      setError('Could not resolve the legal entity for this purchase request.');
      return;
    }

    const rfq = createRFQ({
      title: title.trim(),
      purchaseRequest: selectedPr,
      companyId: company.id,
      dueDate,
      items: items.map((i) => ({ product: i.product.trim(), sku: i.sku.trim(), qty: parseFloat(i.qty) || 0, unit: i.unit.trim() || 'Unit' })),
      invitedSuppliers,
      createdBy: role.user || 'Procurement Officer'
    });

    recordAuditEvent({
      user: role.user || 'Procurement Officer',
      action: 'CREATE_RFQ',
      resource: `${rfq.rfqNumber} [${rfq.purchaseRequestId}]`,
      company: rfq.companyName,
      before: '—',
      after: `Issued to ${invitedSuppliers.length} supplier(s), due ${dueDate}`
    });

    if (onSuccess) onSuccess(rfq);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <FileSearchIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Create RFQ</h2>
              <p className="text-xs text-muted">Sources multiple supplier bids for an approved Purchase Requisition.</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {approvedRequests.length === 0 ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-soft/30 p-3.5">
              <AlertTriangleIcon className="h-4 w-4 shrink-0 text-warning mt-0.5" />
              <p className="text-xs text-ink">No approved Purchase Requisitions are available to source right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-subtle/70 p-3.5 rounded-xl border border-line">
              <div className="md:col-span-2">
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Approved Purchase Requisition</label>
                <select
                  value={purchaseRequestId}
                  onChange={(e) => handlePrChange(e.target.value)}
                  className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                >
                  {approvedRequests.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.id} — {pr.title} ({pr.company})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">RFQ Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Quotes Due By</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1.5">
              Invite Suppliers (min. 2, for a meaningful comparison)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {suppliers.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => toggleSupplier(s.name)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                    invitedSuppliers.includes(s.name)
                      ? 'border-accent bg-accent-soft/40 text-ink font-medium'
                      : 'border-line text-muted hover:bg-subtle/60'
                  )}
                >
                  {s.name} <span className="text-faint">· {s.rating.toFixed(1)}★</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-line overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas border-b border-line text-faint uppercase font-semibold text-2xs tracking-wider">
                <tr>
                  <th className="px-3 py-2">Product / Item</th>
                  <th className="px-3 py-2 w-28">SKU</th>
                  <th className="px-3 py-2 w-20 text-right">Qty</th>
                  <th className="px-3 py-2 w-24">Unit</th>
                  <th className="px-2 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.product}
                        onChange={(e) => handleItemChange(item.id, 'product', e.target.value)}
                        placeholder="e.g. Business Laptop — i7/16GB"
                        required
                        className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(e) => handleItemChange(item.id, 'sku', e.target.value)}
                        className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                        className="h-8 w-full rounded border border-line bg-canvas px-2 text-right text-xs text-ink focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                        className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length <= 1}
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
          <Button type="button" size="xs" variant="secondary" icon={PlusIcon} onClick={handleAddItem}>
            Add Item
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
              Issue RFQ
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
