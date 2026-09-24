import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  LayersIcon,
  NetworkIcon,
  PlusIcon,
  WarehouseIcon,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import {
  group,
  legalEntities,
  businessUnits,
  branchPlants,
  costCenters,
  orgGroup,
} from '../data/organization';
import { useApp } from '../contexts/AppContext';
import { useEntityScope } from '../contexts/EntityScopeContext';
import { cn } from '../utils/cn';
import type { LegalEntity } from '../types';

// ─── MODULE display label map ─────────────────────────────────────────────────
const MODULE_LABEL: Record<string, string> = {
  finance: 'Finance', hr: 'HR', payroll: 'Payroll',
  procurement: 'Procurement', inventory: 'Inventory',
  manufacturing: 'Manufacturing', quality: 'Quality',
  sales: 'Sales', crm: 'CRM', projects: 'Projects',
  fleet: 'Fleet', assets: 'Assets', maintenance: 'Maintenance',
  'retail-pos': 'Retail / POS',
};

// ─── Group Summary card ───────────────────────────────────────────────────────

function GroupSummary() {
  const totalRevenue = legalEntities.reduce((s, le) => s + le.revenue, 0);
  const totalExpense = legalEntities.reduce((s, le) => s + le.expense, 0);
  const groupMargin  = ((totalRevenue - totalExpense) / totalRevenue * 100).toFixed(1);

  const kpis = [
    { label: 'Legal Entities', value: orgGroup.companiesCount.toString(), mono: true },
    { label: 'Total Headcount', value: orgGroup.employeesTotal.toLocaleString('en-IN'), mono: true },
    { label: 'Countries', value: orgGroup.countriesCount.toString(), mono: true },
    { label: 'Group Revenue YTD', value: `৳ ${(totalRevenue / 100).toFixed(2)} Cr`, mono: true },
    { label: 'Group Expense YTD', value: `৳ ${(totalExpense / 100).toFixed(2)} Cr`, mono: true },
    { label: 'Consolidated Margin', value: `${groupMargin}%`, mono: true },
    { label: 'Inc. Year', value: orgGroup.incorporatedYear.toString(), mono: true },
  ];

  return (
    <div className="mb-6 rounded-lg border border-line bg-subtle px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <NetworkIcon className="h-4 w-4 text-accent" aria-hidden />
        <span className="text-base font-semibold text-ink">{orgGroup.name}</span>
        <span className="text-sm text-muted">— {orgGroup.legalName}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0 sm:grid-cols-4 lg:grid-cols-7">
        {kpis.map(({ label, value, mono }) => (
          <div key={label} className="border-b border-line/60 py-2 last:border-b-0">
            <dt className="text-xs uppercase tracking-wide text-faint">{label}</dt>
            <dd className={cn('mt-0.5 text-base text-ink', mono && 'font-mono tabular-nums')}>{value}</dd>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Entity drill-down row (expandable) ──────────────────────────────────────

function EntityRow({ le }: { le: LegalEntity }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const bus = businessUnits.filter(bu => bu.companyId === le.id);
  const bps = branchPlants.filter(bp => bp.companyId === le.id);
  const ccs = costCenters.filter(cc => cc.companyId === le.id);

  const totalBudget = ccs.reduce((s, cc) => s + cc.annualBudget, 0);
  const usedBudget  = ccs.reduce((s, cc) => s + cc.consumedBudget + cc.encumberedBudget, 0);
  const budgetUtil  = totalBudget > 0 ? Math.round((usedBudget / totalBudget) * 100) : 0;

  return (
    <>
      {/* Main entity row */}
      <tr
        className="cursor-pointer border-b border-line transition-colors hover:bg-surface"
        onClick={() => setOpen(o => !o)}
      >
        {/* Expand toggle */}
        <td className="w-8 px-3 py-3 text-faint">
          {open
            ? <ChevronDownIcon className="h-3.5 w-3.5" />
            : <ChevronRightIcon className="h-3.5 w-3.5" />}
        </td>

        {/* Name + sector */}
        <td className="py-3 pr-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-xs font-bold text-accent">
              {le.short.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="font-medium text-ink">{le.name}</p>
              <p className="text-xs text-muted">{le.sector} · {le.country}</p>
            </div>
          </div>
        </td>

        {/* Counts */}
        <td className="py-3 pr-4 text-center font-mono text-base tabular-nums text-ink">{le.employees.toLocaleString('en-IN')}</td>
        <td className="py-3 pr-4 text-center font-mono text-xs text-muted">{bus.length}</td>
        <td className="py-3 pr-4 text-center font-mono text-xs text-muted">{bps.length}</td>
        <td className="py-3 pr-4 text-center font-mono text-xs text-muted">{ccs.length}</td>

        {/* Revenue */}
        <td className="py-3 pr-4 text-right font-mono text-base tabular-nums text-ink">
          ৳ {(le.revenue / 100).toFixed(2)} Cr
        </td>

        {/* Margin */}
        <td className="py-3 pr-4 text-right">
          <span className={cn('font-mono tabular-nums text-base', le.margin < 8 ? 'text-danger' : le.margin < 15 ? 'text-warning' : 'text-success')}>
            {le.margin.toFixed(1)}%
          </span>
        </td>

        {/* Budget util */}
        <td className="py-3 pr-4">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted">Budget</span>
              <span className={cn('font-mono tabular-nums', budgetUtil > 90 ? 'text-danger' : budgetUtil > 70 ? 'text-warning' : 'text-muted')}>
                {budgetUtil}%
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-line">
              <div
                className={cn('h-full rounded-full', budgetUtil > 90 ? 'bg-danger' : budgetUtil > 70 ? 'bg-warning' : 'bg-success')}
                style={{ width: `${Math.min(budgetUtil, 100)}%` }}
              />
            </div>
          </div>
        </td>

        {/* Status */}
        <td className="py-3 pr-4"><StatusBadge status={le.status} /></td>

        {/* Modules */}
        <td className="py-3 pr-4">
          <div className="flex flex-wrap gap-1">
            {le.enabledModules.slice(0, 3).map(m => <Badge key={m}>{MODULE_LABEL[m] ?? m}</Badge>)}
            {le.enabledModules.length > 3 && <Badge>+{le.enabledModules.length - 3}</Badge>}
          </div>
        </td>

        <td className="py-3 pr-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate('/company'); }}
            className="rounded px-2 py-0.5 text-xs text-accent hover:bg-accent/10"
          >
            Open →
          </button>
        </td>
      </tr>

      {/* Expanded drill-down */}
      {open && (
        <tr className="border-b border-line bg-canvas/50">
          <td colSpan={12} className="px-4 pb-4 pt-2">
            <div className="grid gap-4 md:grid-cols-3">

              {/* Business Units */}
              <section>
                <div className="mb-2 flex items-center gap-1.5">
                  <LayersIcon className="h-3.5 w-3.5 text-muted" aria-hidden />
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Business Units ({bus.length})</h4>
                </div>
                <ul className="space-y-1">
                  {bus.map(bu => (
                    <li key={bu.id} className="rounded-md border border-line bg-subtle px-3 py-2">
                      <p className="text-base font-medium text-ink">{bu.name}</p>
                      <p className="text-xs text-muted">{bu.head} · {bu.employees} people · {bu.revenueShare}% revenue</p>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Branches / Plants */}
              <section>
                <div className="mb-2 flex items-center gap-1.5">
                  <WarehouseIcon className="h-3.5 w-3.5 text-muted" aria-hidden />
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Branches & Plants ({bps.length})</h4>
                </div>
                <ul className="space-y-1">
                  {bps.map(bp => (
                    <li key={bp.id} className="rounded-md border border-line bg-subtle px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-base font-medium text-ink">{bp.name}</p>
                          <p className="text-xs text-muted">{bp.type.replace(/-/g, ' ')} · {bp.city} · {bp.employees} people</p>
                        </div>
                        <StatusBadge status={bp.status} className="shrink-0" />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Cost Centers */}
              <section>
                <div className="mb-2 flex items-center gap-1.5">
                  <CircleDollarSignIcon className="h-3.5 w-3.5 text-muted" aria-hidden />
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Cost Centers ({ccs.length})</h4>
                </div>
                <ul className="space-y-1">
                  {ccs.map(cc => {
                    const util = Math.round(((cc.consumedBudget + cc.encumberedBudget) / cc.annualBudget) * 100);
                    return (
                      <li key={cc.id} className="rounded-md border border-line bg-subtle px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-mono text-muted">{cc.code}</p>
                            <p className="truncate text-base font-medium text-ink">{cc.name}</p>
                            <p className="text-xs text-muted">{cc.type.replace(/-/g, ' ')} · ৳{(cc.annualBudget / 1_000_000).toFixed(1)}M</p>
                          </div>
                          <span className={cn('shrink-0 font-mono text-xs tabular-nums', util > 90 ? 'text-danger' : util > 70 ? 'text-warning' : 'text-success')}>
                            {util}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line">
                          <div
                            className={cn('h-full rounded-full', util > 90 ? 'bg-danger' : util > 70 ? 'bg-warning' : 'bg-success')}
                            style={{ width: `${Math.min(util, 100)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>

            {/* Enabled Modules */}
            <div className="mt-4">
              <p className="mb-1.5 text-xs uppercase tracking-wide text-faint">Enabled ERP Modules</p>
              <div className="flex flex-wrap gap-1.5">
                {le.enabledModules.map(m => (
                  <span
                    key={m}
                    className="inline-flex items-center rounded border border-accent/30 bg-accent/5 px-2 py-0.5 text-xs font-medium text-accent"
                  >
                    {MODULE_LABEL[m] ?? m}
                  </span>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Companies() {
  const { can } = useApp();
  const { canAccessCompany, activeCompanyName } = useEntityScope();

  const isGroupScoped = can('group.read');
  const visibleEntities = isGroupScoped
    ? legalEntities
    : legalEntities.filter(le => canAccessCompany(le.id));

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: 'Organization' }, { label: 'Legal Entities' }]}
        title="Legal Entities"
        description="All operating companies in the group. Click any row to drill down into Business Units, Branches, and Cost Centers."
        meta={<Badge tone="accent">{visibleEntities.length} legal entities · {isGroupScoped ? 'Group Scope' : `Scoped to ${activeCompanyName}`}</Badge>}
        actions={
          can('company.manage') ? (
            <Button variant="primary" icon={PlusIcon}>Add legal entity</Button>
          ) : undefined
        }
      />

      <div className="px-6">
        {/* Group-level summary */}
        {isGroupScoped && <GroupSummary />}

        {/* Entity table with drill-down rows */}
        <div className="overflow-x-auto rounded-lg border border-line bg-subtle">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-xs uppercase tracking-wide text-faint">
                <th className="w-8 px-3 py-2.5" />
                <th className="py-2.5 pr-4 text-left">Company</th>
                <th className="py-2.5 pr-4 text-center">People</th>
                <th className="py-2.5 pr-4 text-center">Biz Units</th>
                <th className="py-2.5 pr-4 text-center">Branches</th>
                <th className="py-2.5 pr-4 text-center">Cost Centers</th>
                <th className="py-2.5 pr-4 text-right">Revenue YTD</th>
                <th className="py-2.5 pr-4 text-right">Margin</th>
                <th className="py-2.5 pr-4 text-left">Budget Util.</th>
                <th className="py-2.5 pr-4 text-left">Status</th>
                <th className="py-2.5 pr-4 text-left">Enabled Modules</th>
                <th className="py-2.5 pr-3" />
              </tr>
            </thead>
            <tbody>
              {visibleEntities.map(le => (
                <EntityRow key={le.id} le={le} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Cross-company comparison note */}
        <p className="mt-3 text-xs text-faint">
          * Revenue in Cr BDT (YTD). Budget utilization includes committed (encumbered) amounts in pending purchase orders.
          Click any row to see Business Units, Branches / Plants, and Cost Centers for that entity.
        </p>
      </div>
    </div>
  );
}