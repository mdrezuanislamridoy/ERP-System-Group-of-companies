import React, { useState } from 'react';
import { XIcon, TruckIcon, AlertTriangleIcon, PlusIcon, Trash2Icon, CalendarIcon, ShieldAlertIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { createStockTransferOrder, getItemBatches, warehouses } from '../../data/operations';
import { branchPlants } from '../../data/organization';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';
import type { StockItem, StockTransferOrder } from '../../types';

interface StockTransferModalProps {
  isOpen: boolean;
  stockItems: StockItem[];
  onClose: () => void;
  onSuccess?: (order: StockTransferOrder) => void;
}

interface TransferLineDraft {
  id: string;
  sku: string;
  product: string;
  batchNumber: string;
  shippedQty: string;
  unit: string;
}

export function StockTransferModal({
  isOpen,
  stockItems,
  onClose,
  onSuccess
}: StockTransferModalProps) {
  const { role, companyName } = useApp();

  const [sourceWarehouse, setSourceWarehouse] = useState(warehouses[0]?.name || '');
  const [destWarehouse, setDestWarehouse] = useState(warehouses[1]?.name || '');
  const [isInterCompany, setIsInterCompany] = useState(false);
  const [destCompany, setDestCompany] = useState('ABC Transport Ltd.');
  const [carrier, setCarrier] = useState('Rangs Logistics');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [lines, setLines] = useState<TransferLineDraft[]>([
    {
      id: '1',
      sku: stockItems[0]?.sku || '',
      product: stockItems[0]?.product || '',
      batchNumber: '',
      shippedQty: '10',
      unit: stockItems[0]?.unit || 'Unit'
    }
  ]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const todayStr = '2026-09-22';
  const allBatches = getItemBatches();

  // Available stock items at source warehouse
  const sourceStockItems = stockItems.filter((s) => s.warehouse === sourceWarehouse && s.atp > 0);

  const handleSourceChange = (wh: string) => {
    setSourceWarehouse(wh);
    if (destWarehouse === wh) {
      const other = warehouses.find((w) => w.name !== wh);
      if (other) setDestWarehouse(other.name);
    }
    // reset lines
    setLines([
      {
        id: '1',
        sku: '',
        product: '',
        batchNumber: '',
        shippedQty: '',
        unit: 'Unit'
      }
    ]);
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sku: '',
        product: '',
        batchNumber: '',
        shippedQty: '',
        unit: 'Unit'
      }
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length === 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, patch: Partial<TransferLineDraft>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        if (patch.sku) {
          const item = sourceStockItems.find((s) => s.sku === patch.sku);
          if (item) {
            next.product = item.product;
            next.unit = item.unit;
            // FEFO: Pick earliest expiring valid batch
            const itemBatches = allBatches
              .filter((b) => b.sku === item.sku && b.warehouse === sourceWarehouse && b.quantityAvailable > 0)
              .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
            const validBatch = itemBatches.find((b) => b.status === 'active' && b.expiryDate >= todayStr);
            next.batchNumber = validBatch ? validBatch.batchNumber : '';
          }
        }
        return next;
      })
    );
  };

  // FEFO check: check if any line has an expired batch selected
  const hasExpiredBatchSelection = lines.some((l) => {
    if (!l.batchNumber) return false;
    const batch = allBatches.find((b) => b.batchNumber === l.batchNumber);
    return batch && (batch.status === 'expired' || batch.status === 'quarantined' || batch.status === 'recalled' || batch.expiryDate < todayStr);
  });

  const canSubmit =
    sourceWarehouse &&
    destWarehouse &&
    sourceWarehouse !== destWarehouse &&
    lines.length > 0 &&
    lines.every((l) => l.sku && (parseFloat(l.shippedQty) || 0) > 0) &&
    !hasExpiredBatchSelection;

  const handleSubmit = (dispatchImmediately: boolean) => {
    if (!canSubmit) return;
    setError(null);

    try {
      const srcBranch = branchPlants.find((b) => b.name === sourceWarehouse);
      const destBranch = branchPlants.find((b) => b.name === destWarehouse);

      const order = createStockTransferOrder({
        sourceWarehouseId: srcBranch?.id || 'bp-savar',
        sourceWarehouseName: sourceWarehouse,
        destWarehouseId: destBranch?.id || 'bp-dest',
        destWarehouseName: destWarehouse,
        companyId: 'c-foods',
        companyName: companyName || 'ABC Foods Ltd.',
        destCompanyId: isInterCompany ? 'c-transport' : undefined,
        destCompanyName: isInterCompany ? destCompany : undefined,
        isInterCompany,
        carrier,
        trackingNumber,
        vehicleNumber,
        driverName,
        driverPhone,
        lines: lines.map((l) => ({
          sku: l.sku,
          product: l.product,
          batchNumber: l.batchNumber || undefined,
          shippedQty: parseFloat(l.shippedQty) || 0,
          unit: l.unit
        })),
        dispatchImmediately,
        createdBy: role.user || 'Logistics Coordinator'
      });

      if (onSuccess) {
        onSuccess(order);
      }
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transfer order.');
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
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
              <TruckIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">New Stock Transfer Order</h2>
              <p className="text-xs text-muted">
                Transfer goods between warehouses or sister concerns with FEFO batch rotation and transit tracking.
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="mt-5 space-y-4">
          {/* Facility & Logistics routing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-canvas p-3.5 rounded-xl border border-line">
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Source Warehouse
              </label>
              <select
                value={sourceWarehouse}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="h-8 w-full rounded border border-line bg-surface px-2 text-xs text-ink focus:border-accent focus:outline-none"
              >
                {warehouses.map((w) => (
                  <option key={w.name} value={w.name}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Destination Warehouse
              </label>
              <select
                value={destWarehouse}
                onChange={(e) => setDestWarehouse(e.target.value)}
                className="h-8 w-full rounded border border-line bg-surface px-2 text-xs text-ink focus:border-accent focus:outline-none"
              >
                {warehouses
                  .filter((w) => w.name !== sourceWarehouse)
                  .map((w) => (
                    <option key={w.name} value={w.name}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Transfer Type
              </label>
              <div className="flex items-center h-8 gap-2">
                <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInterCompany}
                    onChange={(e) => setIsInterCompany(e.target.checked)}
                    className="rounded border-line text-accent focus:ring-0"
                  />
                  <span>Inter-Company Transfer</span>
                </label>
              </div>
            </div>

            {isInterCompany && (
              <div className="md:col-span-3 bg-subtle/50 p-2.5 rounded-lg border border-line flex items-center justify-between">
                <span className="text-xs text-ink">Receiving Sister Concern:</span>
                <select
                  value={destCompany}
                  onChange={(e) => setDestCompany(e.target.value)}
                  className="h-7 rounded border border-line bg-surface px-2 text-xs text-ink focus:border-accent focus:outline-none"
                >
                  <option value="ABC Transport Ltd.">ABC Transport Ltd. (Logistics Concern)</option>
                  <option value="ABC Grocery Ltd.">ABC Grocery Ltd. (Retail Concern)</option>
                  <option value="ABC Textiles Ltd.">ABC Textiles Ltd. (Garments Concern)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Carrier / Fleet
              </label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g. Rangs Logistics"
                className="h-8 w-full rounded border border-line bg-surface px-2 text-xs text-ink focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Vehicle Reg Number
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. DHAKA-METRO-TA-14-8821"
                className="h-8 w-full rounded border border-line bg-surface px-2 text-xs text-ink font-mono focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Driver Contact
              </label>
              <input
                type="text"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="e.g. +880 1711-234567"
                className="h-8 w-full rounded border border-line bg-surface px-2 text-xs text-ink font-mono focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Lines Table */}
          <div className="rounded-xl border border-line overflow-hidden">
            <div className="bg-canvas px-3 py-2 border-b border-line flex items-center justify-between">
              <span className="text-2xs font-semibold uppercase tracking-wider text-faint">
                Items to Transfer (FEFO Rotation)
              </span>
              <Button size="xs" variant="ghost" icon={PlusIcon} onClick={addLine}>
                Add Item
              </Button>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-canvas/50 border-b border-line text-faint uppercase font-semibold text-2xs tracking-wider">
                <tr>
                  <th className="px-2.5 py-2">Item / SKU</th>
                  <th className="px-2.5 py-2">Batch / Lot (FEFO)</th>
                  <th className="px-2.5 py-2 w-28 text-right">Available ATP</th>
                  <th className="px-2.5 py-2 w-28 text-right">Transfer Qty</th>
                  <th className="px-2.5 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {lines.map((line) => {
                  const currentStockItem = sourceStockItems.find((s) => s.sku === line.sku);
                  const itemBatches = allBatches
                    .filter((b) => b.sku === line.sku && b.warehouse === sourceWarehouse && b.quantityAvailable > 0)
                    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

                  const selectedBatch = itemBatches.find((b) => b.batchNumber === line.batchNumber);
                  const isBatchExpired =
                    selectedBatch &&
                    (selectedBatch.status === 'expired' ||
                      selectedBatch.status === 'quarantined' ||
                      selectedBatch.status === 'recalled' ||
                      selectedBatch.expiryDate < todayStr);

                  const atpMax = selectedBatch ? selectedBatch.quantityAvailable : currentStockItem?.atp || 0;
                  const enteredQty = parseFloat(line.shippedQty) || 0;
                  const qtyInvalid = enteredQty <= 0 || enteredQty > atpMax;

                  return (
                    <tr key={line.id}>
                      <td className="p-2 align-top">
                        <select
                          value={line.sku}
                          onChange={(e) => updateLine(line.id, { sku: e.target.value })}
                          className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                        >
                          <option value="">Select an item...</option>
                          {sourceStockItems.map((s) => (
                            <option key={s.sku} value={s.sku}>
                              {s.product} ({s.sku}) — ATP: {s.atp}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-2 align-top">
                        {itemBatches.length > 0 ? (
                          <div>
                            <select
                              value={line.batchNumber}
                              onChange={(e) => updateLine(line.id, { batchNumber: e.target.value })}
                              className={cn(
                                'h-8 w-full rounded border bg-canvas px-2 text-xs text-ink focus:outline-none',
                                isBatchExpired ? 'border-danger text-danger font-semibold' : 'border-line focus:border-accent'
                              )}
                            >
                              <option value="">Select batch (FEFO recommended)...</option>
                              {itemBatches.map((b) => {
                                const isExp = b.expiryDate < todayStr || b.status === 'expired';
                                return (
                                  <option key={b.id} value={b.batchNumber} disabled={isExp}>
                                    {b.batchNumber} (Exp: {b.expiryDate} · Avail: {b.quantityAvailable}) {isExp ? '[EXPIRED - BLOCKED]' : ''}
                                  </option>
                                );
                              })}
                            </select>
                            {isBatchExpired && (
                              <span className="text-2xs text-danger font-semibold flex items-center gap-1 mt-1">
                                <AlertTriangleIcon className="h-3 w-3" />
                                FEFO Block: Batch expired on {selectedBatch?.expiryDate}. Dispatch prohibited.
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-2xs text-muted leading-8">Non-batch tracked</span>
                        )}
                      </td>

                      <td className="p-2 align-top text-right font-mono text-xs text-muted pt-3">
                        {atpMax} {currentStockItem?.unit || ''}
                      </td>

                      <td className="p-2 align-top">
                        <input
                          type="number"
                          min="1"
                          max={atpMax}
                          value={line.shippedQty}
                          onChange={(e) => updateLine(line.id, { shippedQty: e.target.value })}
                          placeholder="0"
                          className={cn(
                            'h-8 w-full rounded border bg-canvas px-2 text-right font-mono text-xs text-ink focus:outline-none',
                            qtyInvalid && line.shippedQty ? 'border-danger' : 'border-line focus:border-accent'
                          )}
                        />
                      </td>

                      <td className="p-2 align-top text-center pt-2.5">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            className="text-muted hover:text-danger p-1"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasExpiredBatchSelection && (
            <div className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger-soft/30 p-3.5">
              <ShieldAlertIcon className="h-4 w-4 shrink-0 text-danger mt-0.5" />
              <p className="text-xs text-ink font-medium">
                FEFO Compliance Rule: One or more selected batches have expired. Law and corporate policy forbid
                dispatching expired stock from warehouse locations.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger-soft/30 p-3.5">
              <AlertTriangleIcon className="h-4 w-4 shrink-0 text-danger mt-0.5" />
              <p className="text-xs text-ink">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-line pt-4">
            <div className="text-2xs text-muted">
              Dispatching immediately will reduce Source ATP and place goods into <strong className="text-ink font-semibold">In-Transit</strong> state.
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!canSubmit}
                onClick={() => handleSubmit(false)}
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!canSubmit}
                onClick={() => handleSubmit(true)}
              >
                Dispatch Transfer
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
