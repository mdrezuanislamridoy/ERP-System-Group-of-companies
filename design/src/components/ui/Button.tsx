import React from 'react';
import { Loader2Icon } from 'lucide-react';
import { cn } from '../../utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'xs' | 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ComponentType<{className?: string;}>;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white border border-accent hover:bg-accent-hover hover:border-accent-hover',
  secondary: 'bg-surface text-ink border border-line hover:bg-elevated hover:border-line-strong',
  ghost: 'bg-transparent text-muted border border-transparent hover:bg-surface hover:text-ink',
  danger: 'bg-danger-soft text-danger border border-danger/40 hover:bg-danger/20',
  success: 'bg-success-soft text-success border border-success/40 hover:bg-success/20'
};

const SIZES: Record<Size, string> = {
  xs: 'h-6 px-2 text-xs gap-1',
  sm: 'h-7 px-2.5 text-sm gap-1.5',
  md: 'h-8 px-3 text-base gap-1.5'
};

export function Button({
  variant = 'secondary',
  size = 'sm',
  loading = false,
  icon: Icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded font-medium whitespace-nowrap',
        'transition-colors duration-100 ease-out',
        'disabled:opacity-45 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}>
      
      {loading ?
      <Loader2Icon className="h-3.5 w-3.5 animate-spin" aria-hidden /> :
      Icon ?
      <Icon className="h-3.5 w-3.5" aria-hidden /> :
      null}
      {children}
    </button>);

}