import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BuildingIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  LockIcon,
  MapPinIcon,
  SearchIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useApp } from '../../contexts/AppContext';
import { useEntityScope } from '../../contexts/EntityScopeContext';
import { group } from '../../data/organization';
import { roleTemplates } from '../../data/roles';

export function ContextSwitcher() {
  const { role, assignments, activeAssignmentId, switchAssignment } = useApp();
  const {
    scope,
    activeCompanyId,
    activeCompanyName,
    activeBranchId,
    activeBranchName,
    allowedCompanies,
    allowedBranches,
    isMultiCompany,
    isMultiBranch,
    setActiveCompanyId,
    setActiveBranchId,
  } = useEntityScope();

  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'entity' | 'branch' | 'workspaces'>('entity');
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const isGroupWildcard = scope.allowedCompanyIds.includes('*');

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

  const filteredCompanies = allowedCompanies.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.short.toLowerCase().includes(query.toLowerCase()) ||
    c.sector.toLowerCase().includes(query.toLowerCase())
  );

  const formatLimit = (amt: number) => {
    if (amt === Infinity) return 'Unlimited';
    if (amt <= 0) return 'None';
    if (amt >= 10_000_000) return `৳${(amt / 10_000_000).toFixed(1)} Cr`;
    if (amt >= 100_000) return `৳${(amt / 100_000).toFixed(1)} L`;
    return `৳${amt.toLocaleString('en-IN')}`;
  };

  return (
    <div className="relative" ref={ref}>
      {/* Switcher Trigger Button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex h-7 items-center gap-1.5 rounded border border-line bg-subtle px-2 text-xs transition-colors duration-100 ease-out hover:border-line-strong',
          open && 'border-line-strong bg-surface'
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" aria-hidden />
        <span className="max-w-[150px] truncate font-medium text-ink">
          {activeCompanyName}
        </span>
        <span className="text-faint">/</span>
        <span className="max-w-[120px] truncate text-muted">
          {activeBranchName}
        </span>
        <ChevronsUpDownIcon className="h-3 w-3 text-faint ml-0.5 shrink-0" aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Switch organization context"
          className="absolute left-0 top-9 z-50 w-[380px] rounded-lg border border-line bg-surface shadow-pop text-sm"
        >
          {/* Active Operating Scope Header */}
          <div className="border-b border-line px-3 py-2.5 bg-subtle/50">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
                Active Operating Context
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-line bg-subtle px-1.5 py-0.5 font-mono text-2xs font-medium text-muted">
                <ShieldCheckIcon className="h-3 w-3 text-muted" />
                ABAC Isolated
              </span>
            </div>
            <p className="mt-1 text-base font-semibold text-ink leading-tight">
              {activeCompanyName}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="h-3 w-3 text-faint" />
                {activeBranchName}
              </span>
              <span>·</span>
              <span>Limit: {formatLimit(scope.financialApprovalLimit)}</span>
            </div>
          </div>

          {/* Selector Navigation Tabs */}
          <div className="flex border-b border-line text-xs font-medium">
            <button
              onClick={() => setActiveTab('entity')}
              className={cn(
                'flex-1 py-2 text-center border-b-2 transition-colors',
                activeTab === 'entity'
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-muted hover:text-ink'
              )}
            >
              Company ({allowedCompanies.length})
            </button>
            <button
              onClick={() => setActiveTab('branch')}
              className={cn(
                'flex-1 py-2 text-center border-b-2 transition-colors',
                activeTab === 'branch'
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-muted hover:text-ink'
              )}
            >
              Branch / Plant ({allowedBranches.length})
            </button>
            {assignments.length > 1 && (
              <button
                onClick={() => setActiveTab('workspaces')}
                className={cn(
                  'flex-1 py-2 text-center border-b-2 transition-colors',
                  activeTab === 'workspaces'
                    ? 'border-accent text-accent font-semibold'
                    : 'border-transparent text-muted hover:text-ink'
                )}
              >
                Workspaces ({assignments.length})
              </button>
            )}
          </div>

          {/* Tab 1: Company Selector */}
          {activeTab === 'entity' && (
            <div>
              {isMultiCompany ? (
                <>
                  <div className="border-b border-line p-2">
                    <div className="relative">
                      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
                      <input
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Find authorized company..."
                        aria-label="Find authorized company"
                        className="h-7 w-full rounded border border-line bg-canvas pl-8 pr-2 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="max-h-[260px] overflow-y-auto p-1.5">
                    {/* Consolidated Group view for group wildcard holders */}
                    {isGroupWildcard && (
                      <button
                        onClick={() => {
                          setActiveCompanyId(null);
                          setOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-ink transition-colors hover:bg-elevated"
                      >
                        <span className="flex h-4 w-4 items-center justify-center">
                          {activeCompanyId === null && <CheckIcon className="h-3.5 w-3.5 text-accent" />}
                        </span>
                        <span className="font-semibold">{group.name}</span>
                        <span className="ml-auto text-2xs text-faint bg-line px-1.5 py-0.5 rounded">Consolidated</span>
                      </button>
                    )}

                    <p className="px-2.5 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
                      Authorized Entities ({filteredCompanies.length})
                    </p>

                    {filteredCompanies.map(c => {
                      const active = activeCompanyId === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setActiveCompanyId(c.id);
                            setOpen(false);
                          }}
                          className={cn(
                            'flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-left transition-colors',
                            active ? 'bg-accent/10 text-accent font-medium' : 'text-ink hover:bg-elevated'
                          )}
                        >
                          <span className="flex h-4 w-4 items-center justify-center">
                            {active && <CheckIcon className="h-3.5 w-3.5 text-accent" />}
                          </span>
                          <span className="truncate flex-1">{c.name}</span>
                          <span className="shrink-0 text-2xs text-faint">{c.sector}</span>
                        </button>
                      );
                    })}

                    {filteredCompanies.length === 0 && (
                      <p className="px-3 py-4 text-center text-xs text-muted">
                        No authorized companies match “{query}”.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-4 text-center">
                  <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <LockIcon className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-ink">Strict Data Isolation Active</p>
                  <p className="mt-1 text-2xs text-muted">
                    Your account is securely isolated to <strong className="text-ink">{activeCompanyName}</strong>.
                    Cross-entity access is prohibited unless delegated by Group IT.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Branch Selector */}
          {activeTab === 'branch' && (
            <div className="max-h-[280px] overflow-y-auto p-1.5">
              <button
                onClick={() => {
                  setActiveBranchId(null);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-left transition-colors',
                  activeBranchId === null ? 'bg-accent/10 text-accent font-medium' : 'text-ink hover:bg-elevated'
                )}
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  {activeBranchId === null && <CheckIcon className="h-3.5 w-3.5 text-accent" />}
                </span>
                <span className="font-semibold">All Branches & Plants</span>
                <span className="ml-auto text-2xs text-faint bg-line px-1.5 py-0.5 rounded">Aggregate</span>
              </button>

              <p className="px-2.5 pb-1 pt-2 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
                Branches for {activeCompanyName} ({allowedBranches.length})
              </p>

              {allowedBranches.map(b => {
                const active = activeBranchId === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBranchId(b.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-left transition-colors',
                      active ? 'bg-accent/10 text-accent font-medium' : 'text-ink hover:bg-elevated'
                    )}
                  >
                    <span className="flex h-4 w-4 items-center justify-center">
                      {active && <CheckIcon className="h-3.5 w-3.5 text-accent" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="truncate block">{b.name}</span>
                      {b.city && <span className="text-2xs text-faint">{b.city}</span>}
                    </div>
                    {b.type && (
                      <span className="shrink-0 text-2xs text-muted capitalize">
                        {b.type.replace('-', ' ')}
                      </span>
                    )}
                  </button>
                );
              })}

              {allowedBranches.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-muted">
                  No individual branch restrictions defined for this entity.
                </p>
              )}
            </div>
          )}

          {/* Tab 3: Workspaces */}
          {activeTab === 'workspaces' && (
            <div className="max-h-[260px] overflow-y-auto p-1.5">
              <p className="px-2.5 pb-1 pt-1 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
                Assigned Workspaces
              </p>
              {assignments.map(a => {
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
                      'flex w-full items-start gap-2.5 rounded px-2.5 py-2 text-left text-xs transition-colors',
                      active ? 'bg-accent-soft' : 'hover:bg-elevated'
                    )}
                  >
                    <BuildingIcon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', active ? 'text-accent' : 'text-muted')} />
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate', active ? 'font-medium text-accent' : 'text-ink')}>
                        {a.title ?? template?.label}
                      </p>
                      <p className="text-2xs text-faint truncate">{a.orgLabel}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer Security Policy Note */}
          <div className="border-t border-line px-3 py-2 text-2xs text-muted bg-subtle/30 flex items-center justify-between">
            <span>SEC-02 ABAC Scoping Policy</span>
            <span className="font-mono text-faint">Role: {role.key}</span>
          </div>
        </div>
      )}
    </div>
  );
}