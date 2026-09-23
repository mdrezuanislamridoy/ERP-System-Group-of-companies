import React from 'react';
import { TrophyIcon, StarIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/StatusBadge';
import { suppliers } from '../../data/operations';
import { formatCurrency, formatCurrencyFull } from '../../data/finance';
import { cn } from '../../utils/cn';
import type { RFQ, SupplierQuote } from '../../types';

interface QuotationComparisonMatrixProps {
  rfq: RFQ;
  canAward: boolean;
  onSelectWinner: (quote: SupplierQuote) => void;
}

export function QuotationComparisonMatrix({ rfq, canAward, onSelectWinner }: QuotationComparisonMatrixProps) {
  const { quotes, items } = rfq;

  if (quotes.length === 0) {
    return <p className="px-4 py-6 text-center text-xs text-muted">No supplier quotations recorded yet.</p>;
  }

  const lowestTotal = Math.min(...quotes.map((q) => q.totalAmount));
  const shortestDelivery = Math.min(...quotes.map((q) => q.deliveryDays));
  const longestWarranty = Math.max(...quotes.map((q) => q.warrantyMonths));
  const highestRating = Math.max(...quotes.map((q) => suppliers.find((s) => s.name === q.supplierName)?.rating ?? 0));

  const lowestUnitPriceByItem: Record<string, number> = {};
  for (const item of items) {
    const prices = quotes.map((q) => q.items.find((qi) => qi.rfqItemId === item.id)?.unitPrice).filter((p): p is number => typeof p === 'number');
    lowestUnitPriceByItem[item.id] = prices.length > 0 ? Math.min(...prices) : NaN;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-line">
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-faint text-2xs sticky left-0 bg-surface">
              Item / Metric
            </th>
            {quotes.map((q) => {
              const isWinner = rfq.winningQuoteId === q.id;
              return (
                <th key={q.id} className="px-3 py-2 text-right min-w-[160px]">
                  <div className="flex items-center justify-end gap-1.5">
                    {isWinner && <TrophyIcon className="h-3.5 w-3.5 text-warning" />}
                    <span className="font-semibold text-ink normal-case">{q.supplierName}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-end gap-1 text-2xs text-muted">
                    <StarIcon className="h-2.5 w-2.5 fill-current text-warning" />
                    {(suppliers.find((s) => s.name === q.supplierName)?.rating ?? 0).toFixed(1)}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-line/70">
              <td className="px-3 py-2 text-ink sticky left-0 bg-surface">
                {item.product}
                <span className="block text-2xs text-muted">
                  {item.qty} {item.unit}
                </span>
              </td>
              {quotes.map((q) => {
                const qi = q.items.find((x) => x.rfqItemId === item.id);
                const isLowest = qi && qi.unitPrice === lowestUnitPriceByItem[item.id];
                return (
                  <td
                    key={q.id}
                    className={cn('px-3 py-2 text-right font-mono tabular', isLowest && 'bg-success-soft/40 font-semibold text-success')}
                  >
                    {qi ? formatCurrencyFull(qi.unitPrice) : '—'}
                  </td>
                );
              })}
            </tr>
          ))}

          <tr className="border-b border-line/70 bg-subtle/40">
            <td className="px-3 py-2 font-semibold text-ink sticky left-0 bg-subtle/40">Total Cost</td>
            {quotes.map((q) => (
              <td
                key={q.id}
                className={cn(
                  'px-3 py-2 text-right font-mono tabular font-semibold',
                  q.totalAmount === lowestTotal && 'bg-success-soft/40 text-success'
                )}
              >
                {formatCurrency(q.totalAmount)}
              </td>
            ))}
          </tr>

          <tr className="border-b border-line/70">
            <td className="px-3 py-2 text-ink sticky left-0 bg-surface">Delivery Days</td>
            {quotes.map((q) => (
              <td
                key={q.id}
                className={cn('px-3 py-2 text-right font-mono tabular', q.deliveryDays === shortestDelivery && 'bg-success-soft/40 font-semibold text-success')}
              >
                {q.deliveryDays}d
              </td>
            ))}
          </tr>

          <tr className="border-b border-line/70">
            <td className="px-3 py-2 text-ink sticky left-0 bg-surface">Warranty</td>
            {quotes.map((q) => (
              <td
                key={q.id}
                className={cn('px-3 py-2 text-right font-mono tabular', q.warrantyMonths === longestWarranty && 'bg-success-soft/40 font-semibold text-success')}
              >
                {q.warrantyMonths}mo
              </td>
            ))}
          </tr>

          <tr className="border-b border-line/70">
            <td className="px-3 py-2 text-ink sticky left-0 bg-surface">Payment Terms</td>
            {quotes.map((q) => (
              <td key={q.id} className="px-3 py-2 text-right text-muted">
                {q.paymentTerms}
              </td>
            ))}
          </tr>

          <tr>
            <td className="px-3 py-2 text-ink sticky left-0 bg-surface">Vendor Rating</td>
            {quotes.map((q) => {
              const rating = suppliers.find((s) => s.name === q.supplierName)?.rating ?? 0;
              return (
                <td key={q.id} className={cn('px-3 py-2 text-right font-mono tabular', rating === highestRating && 'bg-success-soft/40 font-semibold text-success')}>
                  {rating.toFixed(1)}★
                </td>
              );
            })}
          </tr>

          {canAward && (
            <tr>
              <td className="px-3 py-3 sticky left-0 bg-surface" />
              {quotes.map((q) => (
                <td key={q.id} className="px-3 py-3 text-right">
                  {rfq.status === 'awarded' ? (
                    rfq.winningQuoteId === q.id ? (
                      <Badge tone="success">Awarded</Badge>
                    ) : (
                      <Badge tone="neutral">Not selected</Badge>
                    )
                  ) : (
                    <Button size="xs" variant="primary" onClick={() => onSelectWinner(q)}>
                      Select Winner
                    </Button>
                  )}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
