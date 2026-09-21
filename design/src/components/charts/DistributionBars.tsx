import React from 'react';

interface Row {
  label: string;
  value: number;
}

export function DistributionBars({ data, suffix = '' }: {data: Row[];suffix?: string;}) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ul className="space-y-2">
      {data.map((d) =>
      <li key={d.label} className="grid grid-cols-[minmax(96px,1fr)_2fr_auto] items-center gap-3">
          <span className="truncate text-base text-muted">{d.label}</span>
          <span className="h-1.5 rounded-sm bg-surface" aria-hidden>
            <span
            className="block h-1.5 rounded-sm bg-accent/70"
            style={{ width: `${d.value / max * 100}%` }} />
          
          </span>
          <span className="font-mono tabular text-base text-ink">
            {d.value.toLocaleString('en-IN')}
            {suffix}
          </span>
        </li>
      )}
    </ul>);

}