import React from 'react';
import { legalEntities, group } from '../../data/organization';
import { formatCurrencyFull } from '../../data/finance';
import type { PurchaseOrder } from '../../types';

interface PurchaseOrderDocumentProps {
  po: PurchaseOrder;
}

export function PurchaseOrderDocument({ po }: PurchaseOrderDocumentProps) {
  const legalEntity = legalEntities.find(
    (le) => le.id === po.companyId || le.id === po.companyId.replace(/^c-/, 'le-') || le.name === po.companyName
  );
  const initials = (legalEntity?.short || po.companyName).slice(0, 2).toUpperCase();

  return (
    <div className="bg-white text-[#111] p-8 text-sm" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Letterhead */}
      <div className="flex items-start justify-between border-b-2 border-[#111] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#111] text-base font-bold text-white">
            {initials}
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">{po.companyName}</p>
            <p className="text-xs text-[#555]">{group.legal}</p>
            {legalEntity && (
              <p className="text-2xs text-[#777] mt-0.5">
                Reg. No. {legalEntity.legalRegNumber} · {legalEntity.country}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold tracking-tight">PURCHASE ORDER</p>
          <p className="mt-1 font-mono text-sm font-semibold">{po.poNumber}</p>
          <p className="text-2xs text-[#777]">Issued {po.createdAt.slice(0, 10)}</p>
        </div>
      </div>

      {/* Parties */}
      <div className="mt-5 grid grid-cols-2 gap-6">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-[#777]">Supplier</p>
          <p className="mt-1 font-semibold">{po.supplierName}</p>
          <p className="text-xs text-[#555] mt-0.5">Supplier Ref: {po.supplierId}</p>
        </div>
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-[#777]">Deliver To</p>
          <p className="mt-1 font-semibold">{po.companyName}</p>
          <p className="text-xs text-[#555] mt-0.5 max-w-xs">{po.deliveryAddress}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-4 rounded border border-[#ddd] bg-[#fafafa] p-3">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-[#777]">Payment Terms</p>
          <p className="text-xs font-medium mt-0.5">{po.paymentTerms}</p>
        </div>
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-[#777]">Delivery</p>
          <p className="text-xs font-medium mt-0.5">{po.deliveryDays ? `${po.deliveryDays} days` : '—'}</p>
        </div>
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-[#777]">Warranty</p>
          <p className="text-xs font-medium mt-0.5">{po.warrantyMonths ? `${po.warrantyMonths} months` : '—'}</p>
        </div>
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-[#777]">Reference</p>
          <p className="text-xs font-medium mt-0.5">{po.purchaseRequestId || po.rfqId || '—'}</p>
        </div>
      </div>

      {/* Lines */}
      <table className="mt-5 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-[#111]">
            <th className="py-1.5 pr-2 text-left font-semibold">SKU</th>
            <th className="py-1.5 pr-2 text-left font-semibold">Description</th>
            <th className="py-1.5 pr-2 text-right font-semibold">Qty</th>
            <th className="py-1.5 pr-2 text-right font-semibold">Unit Price</th>
            <th className="py-1.5 pr-2 text-right font-semibold">Tax</th>
            <th className="py-1.5 text-right font-semibold">Line Total</th>
          </tr>
        </thead>
        <tbody>
          {po.lines.map((line) => (
            <tr key={line.id} className="border-b border-[#ddd]">
              <td className="py-1.5 pr-2 font-mono text-[#555]">{line.sku || '—'}</td>
              <td className="py-1.5 pr-2">{line.description}</td>
              <td className="py-1.5 pr-2 text-right font-mono">
                {line.qty} {line.unit}
              </td>
              <td className="py-1.5 pr-2 text-right font-mono">{formatCurrencyFull(line.unitPrice)}</td>
              <td className="py-1.5 pr-2 text-right font-mono">
                {formatCurrencyFull(line.taxAmount)}
                <span className="block text-2xs text-[#888]">({line.taxRatePct}%)</span>
              </td>
              <td className="py-1.5 text-right font-mono font-semibold">{formatCurrencyFull(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-3 flex justify-end">
        <div className="w-64 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-[#555]">Subtotal</span>
            <span className="font-mono">{formatCurrencyFull(po.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#555]">Tax</span>
            <span className="font-mono">{formatCurrencyFull(po.taxAmount)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-[#111] pt-1 font-bold">
            <span>Total</span>
            <span className="font-mono">{formatCurrencyFull(po.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="mt-10 grid grid-cols-3 gap-6">
        {['Prepared By', 'Approved By', 'Authorized Signatory'].map((label) => (
          <div key={label}>
            <div className="h-10 border-b border-[#111]" />
            <p className="mt-1 text-2xs font-semibold uppercase tracking-wider text-[#777]">{label}</p>
            <p className="text-2xs text-[#aaa]">
              {label === 'Prepared By' ? po.createdBy : label === 'Approved By' ? po.approvedBy || '—' : ''}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-2xs text-[#aaa]">
        This is a system-generated Purchase Order from {group.name}. Status: {po.status}.
      </p>
    </div>
  );
}
