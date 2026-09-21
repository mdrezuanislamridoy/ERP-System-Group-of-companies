import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  crumbs: Crumb[];
  title: string;
  description?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ crumbs, title, description, meta, actions }: PageHeaderProps) {
  return (
    <div className="border-b border-line bg-canvas px-6 pb-4 pt-3">
      <nav aria-label="Breadcrumb" className="mb-2">
        <ol className="flex flex-wrap items-center gap-1 text-sm">
          {crumbs.map((c, i) =>
          <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRightIcon className="h-3 w-3 text-faint" aria-hidden />}
              {c.to ?
            <Link
              to={c.to}
              className="text-muted transition-colors duration-100 ease-out hover:text-ink hover:underline">
              
                  {c.label}
                </Link> :

            <span className={i === crumbs.length - 1 ? 'text-ink' : 'text-muted'}>{c.label}</span>
            }
            </li>
          )}
        </ol>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-base text-muted">{description}</p>}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
    </div>);

}