import React from 'react';
import { ScaleIcon } from 'lucide-react';

interface DecisionCardProps {
  title: string;
  decision: string;
  why: string;
  tradeoffs: string;
  alternatives: string;
  changeWhen: string;
}

export function DecisionCard({
  title,
  decision,
  why,
  tradeoffs,
  alternatives,
  changeWhen
}: DecisionCardProps) {
  const rows: {label: string;value: string;}[] = [
  { label: 'Why', value: why },
  { label: 'Trade-offs', value: tradeoffs },
  { label: 'Alternatives', value: alternatives },
  { label: 'Change when', value: changeWhen }];


  return (
    <section className="overflow-hidden rounded-md border border-line-strong bg-surface">
      <header className="flex items-center gap-2 border-b border-line bg-rail px-4 py-2.5">
        <ScaleIcon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
        <span className="font-mono text-2xs uppercase tracking-wider text-accent">Decision</span>
        <h4 className="text-[13px] font-semibold text-ink">{title}</h4>
      </header>
      <p className="border-b border-line px-4 py-3 text-[14px] font-medium leading-relaxed text-ink">
        {decision}
      </p>
      <dl className="divide-y divide-line">
        {rows.map((row) =>
        <div key={row.label} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[112px_1fr] sm:gap-4">
            <dt className="font-mono text-2xs uppercase tracking-wider text-faint sm:pt-0.5">
              {row.label}
            </dt>
            <dd className="text-[13.5px] leading-relaxed text-muted">{row.value}</dd>
          </div>
        )}
      </dl>
    </section>);

}