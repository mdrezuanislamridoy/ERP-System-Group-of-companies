import React from 'react';
import { CheckIcon, CircleDotIcon, CircleIcon, XIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import type { ApprovalStep } from '../types';

const STATE = {
  done: { icon: CheckIcon, ring: 'border-success bg-success-soft text-success', label: 'Completed' },
  current: { icon: CircleDotIcon, ring: 'border-accent bg-accent-soft text-accent', label: 'Pending with you' },
  waiting: { icon: CircleIcon, ring: 'border-line bg-surface text-faint', label: 'Waiting' },
  rejected: { icon: XIcon, ring: 'border-danger bg-danger-soft text-danger', label: 'Rejected' }
};

export function ApprovalTimeline({ steps }: {steps: ApprovalStep[];}) {
  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const meta = STATE[step.state];
        const Icon = meta.icon;
        const last = i === steps.length - 1;
        return (
          <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span className="absolute left-[11px] top-6 h-full w-px bg-line" aria-hidden />}
            <span
              className={cn(
                'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                meta.ring
              )}>
              
              <Icon className="h-3 w-3" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className={cn('text-base font-medium', step.state === 'waiting' ? 'text-muted' : 'text-ink')}>
                  {step.label}
                </p>
                <span className="text-sm text-faint">{meta.label}</span>
                {step.time && <span className="ml-auto text-sm text-faint">{step.time}</span>}
              </div>
              <p className="text-sm text-muted">{step.actor}</p>
              {step.note &&
              <p className="mt-1.5 rounded border border-line bg-canvas px-2 py-1.5 text-sm text-muted">
                  {step.note}
                </p>
              }
            </div>
          </li>);

      })}
    </ol>);

}