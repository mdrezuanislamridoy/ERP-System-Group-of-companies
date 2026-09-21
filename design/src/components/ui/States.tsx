import React from 'react';
import { AlertTriangleIcon, InboxIcon, LockIcon, SearchXIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export function Skeleton({ className }: {className?: string;}) {
  return <div className={cn('animate-pulse rounded bg-surface', className)} />;
}

export function TableSkeleton({ rows = 6 }: {rows?: number;}) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) =>
      <div key={i} className="flex items-center gap-4 px-3 py-2.5">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="ml-auto h-3 w-16" />
        </div>
      )}
    </div>);

}

interface StateProps {
  title: string;
  description: string;
  primary?: {label: string;onClick: () => void;};
  secondary?: {label: string;onClick: () => void;};
  variant?: 'empty' | 'no-results' | 'error' | 'denied';
}

const ICONS = {
  empty: InboxIcon,
  'no-results': SearchXIcon,
  error: AlertTriangleIcon,
  denied: LockIcon
};

export function StateBlock({ title, description, primary, secondary, variant = 'empty' }: StateProps) {
  const Icon = ICONS[variant];
  const tone =
  variant === 'error' ? 'text-danger' : variant === 'denied' ? 'text-warning' : 'text-faint';
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded border border-line bg-surface', tone)}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className="text-md font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-md text-base text-muted">{description}</p>
      {(primary || secondary) &&
      <div className="mt-4 flex items-center gap-2">
          {secondary &&
        <Button variant="secondary" onClick={secondary.onClick}>
              {secondary.label}
            </Button>
        }
          {primary &&
        <Button variant="primary" onClick={primary.onClick}>
              {primary.label}
            </Button>
        }
        </div>
      }
    </div>);

}