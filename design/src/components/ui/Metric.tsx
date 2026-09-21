import React from 'react';
import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface MetricProps {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  emphasis?: boolean;
}

const TONES: Record<string, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  neutral: 'text-muted'
};

export function Metric({ label, value, sub, delta, tone = 'neutral', emphasis = false }: MetricProps) {
  const trimmed = delta?.trim() ?? '';
  const directional = trimmed.startsWith('+') || trimmed.startsWith('-');
  const Trend = trimmed.startsWith('-') ? TrendingDownIcon : TrendingUpIcon;
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col justify-between gap-2 px-4 py-3',
        emphasis && 'bg-surface'
      )}>
      
      <p className="truncate text-sm font-medium text-muted">{label}</p>
      <p
        className={cn(
          'font-mono tabular font-semibold leading-none text-ink',
          emphasis ? 'text-2xl' : 'text-xl'
        )}>
        
        {value}
      </p>
      <div className="flex items-center gap-2 text-sm">
        {delta &&
        <span className={cn('inline-flex items-center gap-1 font-medium', TONES[tone])}>
            {directional && <Trend className="h-3 w-3" aria-hidden />}
            {delta}
          </span>
        }
        {sub && <span className="truncate text-muted">{sub}</span>}
      </div>
    </div>);

}

export function MetricRow({ children, columns = 4 }: {children: React.ReactNode;columns?: number;}) {
  return (
    <div
      className={cn(
        'grid divide-y divide-line rounded-lg border border-line bg-subtle sm:grid-cols-2 sm:divide-y-0',
        columns === 4 ? 'lg:grid-cols-4' : columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-6',
        'sm:divide-x'
      )}>
      
      {children}
    </div>);

}