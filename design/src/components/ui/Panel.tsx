import React from 'react';
import { cn } from '../../utils/cn';

interface PanelProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({ title, description, actions, children, className, bodyClassName }: PanelProps) {
  return (
    <section className={cn('flex flex-col rounded-lg border border-line bg-subtle', className)}>
      {(title || actions) &&
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-2.5">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      }
      <div className={cn('flex-1', bodyClassName ?? 'p-4')}>{children}</div>
    </section>);

}

export function SectionLabel({ children }: {children: React.ReactNode;}) {
  return <h3 className="mb-2 text-sm font-semibold text-muted">{children}</h3>;
}

export function KeyValue({ label, value, mono }: {label: string;value: React.ReactNode;mono?: boolean;}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line/60 py-2 last:border-b-0">
      <dt className="text-xs uppercase tracking-wide text-faint">{label}</dt>
      <dd className={cn('text-base text-ink', mono && 'font-mono tabular')}>{value}</dd>
    </div>);

}