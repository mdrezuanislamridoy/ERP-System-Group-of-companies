import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BuildingIcon, CheckIcon, ChevronsUpDownIcon, SearchIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useApp } from '../../contexts/AppContext';
import { companies, group } from '../../data/organization';
import { roleTemplates } from '../../data/roles';

export function ContextSwitcher() {
  const { companyId, setCompanyId, can, role, assignments, activeAssignmentId, switchAssignment } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const groupScoped = can('group.read');
  const allowed = groupScoped ? companies : [];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = companyId ? companies.find((c) => c.id === companyId)?.name : group.name;
  const filtered = allowed.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex h-7 items-center gap-2 rounded border border-line bg-subtle px-2 text-base transition-colors duration-100 ease-out hover:border-line-strong',
          open && 'border-line-strong bg-surface'
        )}>
        
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
        <span className="max-w-[180px] truncate font-medium text-ink">{current}</span>
        <ChevronsUpDownIcon className="h-3 w-3 text-faint" aria-hidden />
      </button>

      {open &&
      <div
        role="dialog"
        aria-label="Switch organization context"
        className="absolute left-0 top-9 z-50 w-[320px] rounded-lg border border-line bg-surface shadow-pop">
        
          <div className="border-b border-line px-3 py-2">
            <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">Current context</p>
            <p className="mt-1 text-md font-semibold text-ink">{current}</p>
            <p className="text-sm text-muted">{role.scopeLabel}</p>
          </div>

          {assignments.length > 1 &&
          <div className="max-h-[220px] overflow-y-auto border-b border-line p-1.5">
              <p className="px-2 pb-1 pt-1 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
                Your workspaces
              </p>
              {assignments.map((a) => {
              const template = roleTemplates[a.roleKey];
              const active = a.id === activeAssignmentId;
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    switchAssignment(a.id);
                    setOpen(false);
                    navigate('/');
                  }}
                  disabled={active}
                  className={cn(
                    'flex w-full items-start gap-2 rounded px-2 py-1.5 text-left transition-colors duration-100 ease-out',
                    active ? 'bg-accent-soft' : 'hover:bg-elevated'
                  )}>

                    <BuildingIcon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', active ? 'text-accent' : 'text-muted')} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-base', active ? 'font-medium text-accent' : 'text-ink')}>
                        {a.title ?? template.label}
                      </span>
                      <span className="block truncate text-xs text-faint">{a.orgLabel}</span>
                    </span>
                  </button>);

            })}
            </div>
          }

          {groupScoped &&
          <>
              <div className="border-b border-line p-2">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
                  <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find company..."
                  aria-label="Find company"
                  className="h-7 w-full rounded border border-line bg-canvas pl-7 pr-2 text-base text-ink placeholder:text-faint focus:border-accent focus:outline-none" />

                </div>
              </div>

              <div className="max-h-[280px] overflow-y-auto p-1.5">
                <button
                onClick={() => {
                  setCompanyId(null);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-base text-ink transition-colors duration-100 ease-out hover:bg-elevated">

                  <span className="flex h-4 w-4 items-center justify-center">
                    {companyId === null && <CheckIcon className="h-3.5 w-3.5 text-accent" aria-hidden />}
                  </span>
                  <span className="font-medium">{group.name}</span>
                  <span className="ml-auto text-sm text-faint">Group level</span>
                </button>

                <p className="px-2 pb-1 pt-2 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
                  Browse company ({allowed.length})
                </p>
                {filtered.map((c) =>
              <button
                key={c.id}
                onClick={() => {
                  setCompanyId(c.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-base text-ink transition-colors duration-100 ease-out hover:bg-elevated">

                    <span className="flex h-4 w-4 items-center justify-center">
                      {companyId === c.id && <CheckIcon className="h-3.5 w-3.5 text-accent" aria-hidden />}
                    </span>
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto shrink-0 text-sm text-faint">{c.sector}</span>
                  </button>
              )}
                {filtered.length === 0 &&
              <p className="px-2 py-4 text-center text-sm text-muted">No companies match “{query}”.</p>
              }
              </div>
            </>
          }

          {!groupScoped &&
          <p className="px-3 py-2.5 text-sm text-muted">
              Your access is limited to the workspace{assignments.length > 1 ? 's' : ''} assigned to your account.
            </p>
          }
        </div>
      }
    </div>);

}