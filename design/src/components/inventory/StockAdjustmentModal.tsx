import React, { useState } from 'react';
import { XIcon, AlertTriangleIcon, CheckCircle2Icon, ShieldAlertIcon, FileTextIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { adjustStockAndWriteOff, getItemBatches } from '../../data/operations';
import { formatCurrency } from '../../data/finance';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';
import type { StockItem, JournalEntry } from '../../types';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  stockItems: StockItem[];
  initialStockId?: string;
  onClose: () => void;
  onSuccess?: (stock: StockItem, jv?: JournalEntry) => void;
}

export function StockAdjustmentModal({
  isOpen,
  stockItems,
  initialStockId,
  onClose,
  onSuccess
}: StockAdjustmentModalProps) {
  const { role } = useApp();

  const [selectedStockId, setSelectedStockId] = useState(
    initialStockId || stockItems[0]?.id || ''
  );
  const [adjustmentType, setAdjustmentType] = useState<
    'scrap_writeoff' | 'to_quarantine' | 'from_quarantine' | 'cycle_count'
  >('scrap_writeoff');
  const [qty, setQty] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [costCenter, setCostCenter] = useState('cc-foods-prod-001');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [postedJv, setPostedJv] = useState<JournalEntry | null>(null);

  if (!isOpen) return null;

  const currentItem = stockItems.find((s) => s.id === selectedStockId) || stockItems[0];
  const itemBatches = getItemBatches().filter((b) => b.sku === currentItem?.sku && b.warehouse === currentItem?.warehouse);
  const parsedQty = parseFloat(qty) || 0;
  const writeOffValue = Math.round(parsedQty * (currentItem?.unitCost || 0));

  const maxAllowed =
    adjustmentType === 'scrap_writeoff'
      ? currentItem?.onHand || 0
      : adjustmentType === 'to_quarantine'
      ? currentItem?.atp || 0
      : adjustmentType === 'from_quarantine'
      ? currentItem?.quarantineQty || 0
      : 999999;

  const isInvalidQty = parsedQty <= 0 || (adjustmentType !== 'cycle_count' && parsedQty > maxAllowed);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem || isInvalidQty || !reason.trim()) return;

    try {
      const { updatedStock, journalEntry } = adjustStockAndWriteOff({
        stockId: currentItem.id,
        adjustmentType,
        qty: parsedQty,
        reason: reason.trim(),
        costCenterId: costCenter,
        costCenterCode: costCenter === 'cc-foods-prod-001' ? 'CC-FOODS-PROD-001' : 'CC-FOODS-PROD-002',
        expenseAccountCode: '5140',
        assetAccountCode: '1130',
        performedBy: role.user || 'Inventory Controller',
        batchId: selectedBatchId || undefined
      });

      if (journalEntry) {
        setPostedJv(journalEntry);
      }

      if (onSuccess) {
        onSuccess(updatedStock, journalEntry);
      }

      if (!journalEntry) {
        handleClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Adjustment failed.');
    }
  };

  const handleClose = () => {
    setQty('');
    setReason('');
    setError(null);
    setPostedJv(null);
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
              <h2 className="text-lg font-bold text-ink">Stock Adjustment & Scrap Voucher</h2>
              <p className="text-xs text-muted">Reclassify inventory states or write off damaged stock with automated GL posting.</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {postedJv ? (
          <div className="mt-5 space-y-4 text-center py-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success mb-2">
              <CheckCircle2Icon className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-ink">Scrap Write-Off Voucher Posted Successfully</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              The damaged stock has been deducted from On-Hand and an immutable double-entry journal voucher has been posted to the General Ledger.
            </p>

            <div className="rounded-xl border border-line bg-canvas p-4 text-left font-mono text-xs max-w-md mx-auto space-y-2">
              <div className="flex justify-between border-b border-line pb-1.5 font-bold text-accent">
                <span>VOUCHER #{postedJv.entryNumber}</span>
                <span>{postedJv.date}</span>
              </div>
              <div className="flex justify-between text-ink">
                <span>Dr. 5140 Write-Off Expense</span>
                <span className="text-danger">+{formatCurrency(postedJv.totalDebit)}</span>
              </div>
              <div className="flex justify-between text-ink">
                <span>Cr. 1130 Inventory — Raw Materials</span>
                <span className="text-muted">-{formatCurrency(postedJv.totalCredit)}</span>
              </div>
              <div className="text-2xs text-muted pt-1 border-t border-line truncate">
                Memo: {postedJv.memo}
              </div>
            </div>

            <div className="pt-4">
              <Button variant="primary" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-canvas p-4 rounded-xl border border-line">
              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                  Product / SKU
                </label>
                <select
                  value={selectedStockId}
                  onChange={(e) => {
                    setSelectedStockId(e.target.value);
                    setSelectedBatchId('');
                  }}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-xs text-ink focus:border-accent focus:outline-none"
                >
                  {stockItems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.product} ({s.sku}) — {s.warehouse}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                  Adjustment Type
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as any)}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-xs text-ink focus:border-accent focus:outline-none"
                >
                  <option value="scrap_writeoff">Write-Off Damaged Stock to Scrap (GL Posting)</option>
                  <option value="to_quarantine">Move On-Hand to Quarantine (Damage Pending QC)</option>
                  <option value="from_quarantine">Release Quarantined to On-Hand (QC Passed)</option>
                  <option value="cycle_count">Cycle Count Inventory Variance Adjustment</option>
                </select>
              </div>

              {/* Current Stock State Summary Card */}
              {currentItem && (
                <div className="col-span-1 md:col-span-2 grid grid-cols-4 gap-2 bg-surface p-3 rounded-lg border border-line/60 text-center">
                  <div>
                    <span className="block text-2xs text-muted">Physical On-Hand</span>
                    <span className="font-mono text-sm font-semibold text-ink">
                      {currentItem.onHand.toLocaleString('en-IN')} {currentItem.unit}
                    </span>
                  </div>
                  <div>
                    <span className="block text-2xs text-muted">Allocated / Reserved</span>
                    <span className="font-mono text-sm font-semibold text-muted">
                      {currentItem.reserved.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-2xs text-muted">Quarantine / Damaged</span>
                    <span className="font-mono text-sm font-semibold text-danger">
                      {currentItem.quarantineQty.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-2xs text-muted">Available to Promise</span>
                    <span className="font-mono text-sm font-bold text-success">
                      {currentItem.atp.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                  Quantity ({currentItem?.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  max={maxAllowed}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder={`Max: ${maxAllowed}`}
                  required
                  className={cn(
                    'h-9 w-full rounded-lg border bg-surface px-3 font-mono text-xs text-ink focus:outline-none',
                    isInvalidQty && qty ? 'border-danger' : 'border-line focus:border-accent'
                  )}
                />
                {isInvalidQty && qty && (
                  <span className="text-2xs text-danger mt-1 block">Quantity cannot exceed {maxAllowed} {currentItem?.unit}</span>
                )}
              </div>

              {itemBatches.length > 0 && (
                <div>
                  <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                    Specific Batch / Lot (Optional)
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-xs text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="">General Stock (No specific batch)</option>
                    {itemBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} (Bin: {b.binLocation}, Avail: {b.quantityAvailable}, Exp: {b.expiryDate})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {adjustmentType === 'scrap_writeoff' && (
                <div>
                  <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                    Charge Cost Center
                  </label>
                  <select
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-xs text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="cc-foods-prod-001">CC-FOODS-PROD-001 — Savar Production</option>
                    <option value="cc-foods-prod-002">CC-FOODS-PROD-002 — Packaging & Assembly</option>
                    <option value="cc-groc-retail-001">CC-GROC-RETAIL-001 — Retail Distribution</option>
                  </select>
                </div>
              )}

              <div className="col-span-1 md:col-span-2">
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                  Reason & Audit Justification <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Torn bags during pallet forklift transit; water damage detected during weekly inspection"
                  required
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Live Automated GL Preview for Write-Offs */}
            {adjustmentType === 'scrap_writeoff' && parsedQty > 0 && !isInvalidQty && (
              <div className="rounded-xl border border-line bg-accent-soft/20 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                  <FileTextIcon className="h-4 w-4" />
                  <span>Automated General Ledger Impact Preview</span>
                </div>
                <div className="font-mono text-2xs space-y-1 text-ink bg-surface/80 p-2.5 rounded-lg border border-line/60">
                  <div className="flex justify-between">
                    <span>Debit 5140 (Inventory Write-Off & Scrap Expense):</span>
                    <span className="font-bold text-danger">+{formatCurrency(writeOffValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Credit 1130 (Inventory — Raw Materials):</span>
                    <span className="font-bold text-muted">-{formatCurrency(writeOffValue)}</span>
                  </div>
                  <div className="flex justify-between text-faint pt-1 border-t border-line/40">
                    <span>Valuation Basis:</span>
                    <span>{parsedQty} × {formatCurrency(currentItem?.unitCost || 0)}</span>
                  </div>
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
              <Button
                type="submit"
                variant={adjustmentType === 'scrap_writeoff' ? 'danger' : 'primary'}
                disabled={isInvalidQty || !reason.trim()}
              >
                {adjustmentType === 'scrap_writeoff' ? 'Confirm Write-Off Voucher' : 'Apply Adjustment'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
