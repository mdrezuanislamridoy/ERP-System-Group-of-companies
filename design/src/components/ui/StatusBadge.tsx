import React from 'react';
import { cn } from '../../utils/cn';
import type { StatusKey } from '../../types';

interface StatusMeta {
  label: string;
  className: string;
  dot: string;
}

// Neutral pill for every status — the dot alone carries the color, so a dense table of
// status chips reads as calm gray with scannable accents instead of a wall of tinted pills.
const NEUTRAL = 'text-muted border-line bg-subtle';

const STATUS: Record<StatusKey, StatusMeta> = {
  draft: { label: 'Draft', className: NEUTRAL, dot: 'bg-faint' },
  pending: { label: 'Pending', className: NEUTRAL, dot: 'bg-warning' },
  approved: { label: 'Approved', className: NEUTRAL, dot: 'bg-success' },
  rejected: { label: 'Rejected', className: NEUTRAL, dot: 'bg-danger' },
  cancelled: { label: 'Cancelled', className: NEUTRAL, dot: 'bg-faint' },
  completed: { label: 'Completed', className: NEUTRAL, dot: 'bg-success' },
  processing: { label: 'Processing', className: NEUTRAL, dot: 'bg-info' },
  failed: { label: 'Failed', className: NEUTRAL, dot: 'bg-danger' },
  archived: { label: 'Archived', className: NEUTRAL, dot: 'bg-faint' },
  active: { label: 'Active', className: NEUTRAL, dot: 'bg-success' },
  inactive: { label: 'Inactive', className: NEUTRAL, dot: 'bg-faint' },
  suspended: { label: 'Suspended', className: NEUTRAL, dot: 'bg-danger' },
  'on-leave': { label: 'On Leave', className: NEUTRAL, dot: 'bg-info' },
  'low-stock': { label: 'Low Stock', className: NEUTRAL, dot: 'bg-warning' },
  'out-of-stock': { label: 'Out of Stock', className: NEUTRAL, dot: 'bg-danger' }
};

export function StatusBadge({ status, className }: {status: StatusKey;className?: string;}) {
  const meta = STATUS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-xs font-medium',
        meta.className,
        className
      )}>
      
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </span>);

}

export function Badge({
  children,
  tone = 'neutral',
  className




}: {children: React.ReactNode;tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';className?: string;}) {
  // Border and background stay neutral for every tone — only the text carries color, and only
  // where the message is genuinely a warning or alert. Keeps chips legible without tinting rows.
  const tones: Record<string, string> = {
    neutral: 'text-muted',
    accent: 'text-accent',
    success: 'text-muted',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-muted'
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border border-line bg-subtle px-1.5 py-0.5 text-xs font-medium',
        tones[tone],
        className
      )}>

      {children}
    </span>);

}