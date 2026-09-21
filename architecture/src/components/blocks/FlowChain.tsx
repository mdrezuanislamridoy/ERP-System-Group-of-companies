import React from 'react';
import { ChevronRightIcon } from 'lucide-react';

interface FlowChainProps {
  steps: {label: string;note?: string;}[];
  caption?: string;
}

export function FlowChain({ steps, caption }: FlowChainProps) {
  return (
    <figure className="overflow-hidden rounded-md border border-line bg-surface">
      {caption ?
      <figcaption className="border-b border-line bg-rail px-4 py-2 font-mono text-2xs uppercase tracking-wider text-muted">
          {caption}
        </figcaption> :
      null}
      <ol className="flex flex-wrap items-stretch gap-y-2 px-3 py-3">
        {steps.map((step, i) =>
        <li key={step.label} className="flex items-stretch">
            <div className="flex min-w-[112px] max-w-[188px] flex-col justify-center rounded border border-line bg-rail px-3 py-2">
              <span className="flex items-baseline gap-1.5">
                <span className="font-mono text-2xs text-accent">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[12.5px] font-semibold leading-snug text-ink">{step.label}</span>
              </span>
              {step.note ?
            <span className="mt-0.5 text-2xs leading-snug text-faint">{step.note}</span> :
            null}
            </div>
            {i < steps.length - 1 ?
          <span className="flex items-center px-1" aria-hidden="true">
                <ChevronRightIcon className="h-3.5 w-3.5 text-line-strong" />
              </span> :
          null}
          </li>
        )}
      </ol>
    </figure>);

}