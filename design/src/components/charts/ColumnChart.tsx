import React from 'react';

interface Series {
  month: string;
  revenue: number;
  expense: number;
}

export function ColumnChart({ data, unit = '৳ Cr' }: {data: Series[];unit?: string;}) {
  const max = Math.max(...data.map((d) => Math.max(d.revenue, d.expense))) * 1.15;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-accent" aria-hidden /> Revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-line-strong" aria-hidden /> Expense
        </span>
        <span className="ml-auto font-mono">{unit}</span>
      </div>
      <div className="flex h-40 items-end gap-3" role="img" aria-label="Monthly revenue versus expense">
        {data.map((d) =>
        <div key={d.month} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div
              className="w-1/3 rounded-t-sm bg-accent"
              style={{ height: `${d.revenue / max * 100}%` }}
              title={`Revenue ${d.revenue}`} />
            
              <div
              className="w-1/3 rounded-t-sm bg-line-strong"
              style={{ height: `${d.expense / max * 100}%` }}
              title={`Expense ${d.expense}`} />
            
            </div>
            <span className="text-xs text-faint">{d.month}</span>
          </div>
        )}
      </div>
    </div>);

}