import React from 'react';
import { XIcon, PrinterIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { PurchaseOrderDocument } from './PurchaseOrderDocument';
import type { PurchaseOrder } from '../../types';

interface PurchaseOrderPrintModalProps {
  isOpen: boolean;
  po: PurchaseOrder | null;
  onClose: () => void;
}

export function PurchaseOrderPrintModal({ isOpen, po, onClose }: PurchaseOrderPrintModalProps) {
  if (!isOpen || !po) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        id="po-print-area"
        className="w-full max-w-3xl rounded-2xl border border-line bg-white shadow-pop animate-in zoom-in-95 duration-150 my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="po-no-print flex items-center justify-between border-b border-line bg-surface px-6 py-3">
          <p className="text-sm font-semibold text-ink">Purchase Order Preview — {po.poNumber}</p>
          <div className="flex items-center gap-2">
            <Button size="xs" variant="primary" icon={PrinterIcon} onClick={() => window.print()}>
              Print / Save as PDF
            </Button>
            <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <PurchaseOrderDocument po={po} />
      </div>
    </div>
  );
}
