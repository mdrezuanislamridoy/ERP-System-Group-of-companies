import React from 'react';
import { CheckCircle2Icon, AlertTriangleIcon, HelpCircleIcon, ShieldCheckIcon } from 'lucide-react';
import { Badge } from '../ui/StatusBadge';
import { Panel } from '../ui/Panel';
import { computeThreeWayMatch, formatCurrencyFull } from '../../data/finance';
import { cn } from '../../utils/cn';
import type { Invoice, InvoiceMatchStatus } from '../../types';

const STATUS_META: Record<InvoiceMatchStatus, { tone: 'neutral' | 'success' | 'danger' | 'warning'; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  Unmatched: { tone: 'neutral', icon: HelpCircleIcon, label: 'Unmatched — no confirmed GRN yet' },
  Matched: { tone: 'success', icon: CheckCircle2Icon, label: 'Matched — PO, GRN and Invoice agree' },
  Discrepancy: { tone: 'danger', icon: AlertTriangleIcon, label: 'Discrepancy — variance outside tolerance' },
  Bypassed: { tone: 'warning', icon: ShieldCheckIcon, label: 'Bypassed via Executive Override' }
};

interface ThreeWayMatchCardProps {
  invoice: Invoice;
  tolerancePct?: number;
}

export function ThreeWayMatchCard({ invoice, tolerancePct }: ThreeWayMatchCardProps) {
  const result = computeThreeWayMatch(invoice, tolerancePct);
  // An override sets invoice.matchStatus to 'Bypassed' directly (persisted) — the live computation
  // only ever yields Unmatched/Matched/Discrepancy, so the override is the sole source of "Bypassed".
  const displayStatus: InvoiceMatchStatus = invoice.matchStatus === 'Bypassed' ? 'Bypassed' : result.status;
  const meta = STATUS_META[displayStatus];
  const StatusIcon = meta.icon;

  return (
    <Panel bodyClassName="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <StatusIcon className={cn('h-5 w-5', displayStatus === 'Matched' ? 'text-success' : displayStatus === 'Discrepancy' ? 'text-danger' : displayStatus === 'Bypassed' ? 'text-warning' : 'text-faint')} />
          <div>
            <p className="text-sm font-semibold text-ink">3-Way Match — PO vs GRN vs Invoice</p>
            <p className="text-xs text-muted">{meta.label} · Tolerance ±{result.tolerancePct}%</p>
          </div>
        </div>
        <Badge tone={meta.tone}>{displayStatus.toUpperCase()}</Badge>
      </div>

      {result.lines.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-muted">
          {invoice.poId ? 'The referenced Purchase Order could not be resolved.' : 'This invoice is not linked to a Purchase Order.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line bg-surface/40">
                <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-faint text-2xs" rowSpan={2}>
                  Item
                </th>
                <th className="px-3 py-2 text-center font-semibold uppercase tracking-wider text-faint text-2xs border-l border-line" colSpan={2}>
                  Purchase Order
                </th>
                <th className="px-3 py-2 text-center font-semibold uppercase tracking-wider text-faint text-2xs border-l border-line">
                  Goods Receipt
                </th>
                <th className="px-3 py-2 text-center font-semibold uppercase tracking-wider text-faint text-2xs border-l border-line" colSpan={2}>
                  Supplier Invoice
                </th>
              </tr>
              <tr className="border-b border-line bg-surface/40">
                <th className="px-3 py-1.5 text-right font-medium text-faint text-2xs border-l border-line">Qty</th>
                <th className="px-3 py-1.5 text-right font-medium text-faint text-2xs">Agreed Price</th>
                <th className="px-3 py-1.5 text-right font-medium text-faint text-2xs border-l border-line">Accepted Qty</th>
                <th className="px-3 py-1.5 text-right font-medium text-faint text-2xs border-l border-line">Billed Qty</th>
                <th className="px-3 py-1.5 text-right font-medium text-faint text-2xs">Billed Price</th>
              </tr>
            </thead>
            <tbody>
              {result.lines.map((line, idx) => (
                <React.Fragment key={line.poLineId || idx}>
                  <tr className="border-b border-line/70">
                    <td className="px-3 py-2 text-ink">
                      {line.description}
                      <span className="block text-2xs text-muted font-mono">{line.sku}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular text-muted border-l border-line">
                      {line.poQty} {line.unit}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular text-muted">{formatCurrencyFull(line.poUnitPrice)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular text-ink border-l border-line">
                      {line.grnAcceptedQty} {line.unit}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2 text-right font-mono tabular border-l border-line',
                        line.quantityOverbill ? 'bg-danger-soft/40 font-semibold text-danger' : 'text-ink'
                      )}
                    >
                      {line.billedQty} {line.unit}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2 text-right font-mono tabular',
                        line.priceVariance ? 'bg-danger-soft/40 font-semibold text-danger' : 'text-ink'
                      )}
                    >
                      {formatCurrencyFull(line.billedUnitPrice)}
                    </td>
                  </tr>
                  {(line.quantityOverbill || line.priceVariance) && (
                    <tr className="border-b border-line/70 bg-danger-soft/10">
                      <td colSpan={6} className="px-3 py-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {line.quantityOverbill && (
                            <span className="inline-flex items-center gap-1 rounded border border-danger/40 bg-danger-soft px-1.5 py-0.5 text-2xs font-semibold text-danger">
                              <AlertTriangleIcon className="h-3 w-3" /> Quantity Overbill — billed {line.billedQty} vs {line.grnAcceptedQty} accepted
                            </span>
                          )}
                          {line.priceVariance && (
                            <span className="inline-flex items-center gap-1 rounded border border-danger/40 bg-danger-soft px-1.5 py-0.5 text-2xs font-semibold text-danger">
                              <AlertTriangleIcon className="h-3 w-3" /> Price Variance — billed {formatCurrencyFull(line.billedUnitPrice)} vs PO {formatCurrencyFull(line.poUnitPrice)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-line p-4">
        <div className="ml-auto w-full max-w-xs space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted">Substantiated amount</span>
            <span className="font-mono tabular text-ink">{formatCurrencyFull(result.substantiatedAmount)}</span>
          </div>
          {(invoice.discountAmount || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">Less: discount</span>
              <span className="font-mono tabular text-ink">−{formatCurrencyFull(invoice.discountAmount || 0)}</span>
            </div>
          )}
          {(invoice.deductionAmount || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">Less: deductions</span>
              <span className="font-mono tabular text-ink">−{formatCurrencyFull(invoice.deductionAmount || 0)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
            <span className="text-ink">Net Payable</span>
            <span className="font-mono tabular text-ink">{formatCurrencyFull(result.netPayable)}</span>
          </div>
        </div>
      </div>

      {invoice.matchOverrideBy && (
        <div className="mx-4 mb-4 flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-soft/30 p-3.5">
          <ShieldCheckIcon className="h-4 w-4 shrink-0 text-warning mt-0.5" />
          <p className="text-xs text-ink">
            Executive Override signed by <strong>{invoice.matchOverrideBy}</strong> on {invoice.matchOverrideAt?.slice(0, 10)}:{' '}
            "{invoice.matchOverrideReason}"
          </p>
        </div>
      )}
    </Panel>
  );
}
