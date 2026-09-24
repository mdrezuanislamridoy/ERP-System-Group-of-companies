import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  LayersIcon,
  NetworkIcon,
  PlusIcon,
  SearchIcon,
  SlidersIcon,
  WarehouseIcon,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import {
  group,
  legalEntities as initialLegalEntities,
  businessUnits as initialBusinessUnits,
  branchPlants as initialBranchPlants,
  costCenters as initialCostCenters,
  orgGroup,
} from '../data/organization';
import { useApp } from '../contexts/AppContext';
import { useEntityScope } from '../contexts/EntityScopeContext';
import { cn } from '../utils/cn';
import type { BranchPlant, BusinessUnit, CostCenter, LegalEntity, StatusKey } from '../types';
import { CreateCompanyModal } from '../components/organization/CreateCompanyModal';
import { ManageCompanyModal } from '../components/organization/ManageCompanyModal';
import { CreateOrgUnitModal, type OrgUnitType } from '../components/organization/CreateOrgUnitModal';

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

function GroupSummary({ totalCompanies }: { totalCompanies: number }) {
  const totalRevenue = initialLegalEntities.reduce((s, le) => s + le.revenue, 0);
  const totalExpense = initialLegalEntities.reduce((s, le) => s + le.expense, 0);
  const groupMargin = ((totalRevenue - totalExpense) / (totalRevenue || 1) * 100).toFixed(1);

  const kpis = [
    { label: 'Legal Entities', value: totalCompanies.toString(), mono: true },
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

interface EntityRowProps {
  le: LegalEntity;
  bus: BusinessUnit[];
  bps: BranchPlant[];
  ccs: CostCenter[];
  canManage: boolean;
  onManage: (le: LegalEntity) => void;
  onAddUnit: (le: LegalEntity, type: OrgUnitType) => void;
  onSelectCompany: (le: LegalEntity) => void;
}

function EntityRow({
  le,
  bus,
  bps,
  ccs,
  canManage,
  onManage,
  onAddUnit,
  onSelectCompany,
}: EntityRowProps) {
  const [open, setOpen] = useState(false);

  const totalBudget = ccs.reduce((s, cc) => s + cc.annualBudget, 0);
  const usedBudget = ccs.reduce((s, cc) => s + cc.consumedBudget + cc.encumberedBudget, 0);
  const budgetUtil = totalBudget > 0 ? Math.round((usedBudget / totalBudget) * 100) : 0;

  return (
    <>
      {/* Main entity row */}
      <tr
        className="cursor-pointer border-b border-line transition-colors hover:bg-surface"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Expand toggle */}
        <td className="w-8 px-3 py-3 text-faint">
          {open ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
        </td>

        {/* Name + sector */}
        <td className="py-3 pr-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-subtle text-xs font-bold text-ink">
              {le.short.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="font-medium text-ink flex items-center gap-1.5">
                {le.name}
                <span className="font-mono text-2xs text-faint font-normal">({le.short})</span>
              </p>
              <p className="text-xs text-muted">{le.sector} · {le.country}</p>
            </div>
          </div>
        </td>

        {/* Counts */}
        <td className="py-3 pr-4 text-center font-mono text-base tabular-nums text-ink">
          {le.employees.toLocaleString('en-IN')}
        </td>
        <td className="py-3 pr-4 text-center font-mono text-xs text-muted">{bus.length}</td>
        <td className="py-3 pr-4 text-center font-mono text-xs text-muted">{bps.length}</td>
        <td className="py-3 pr-4 text-center font-mono text-xs text-muted">{ccs.length}</td>

        {/* Revenue */}
        <td className="py-3 pr-4 text-right font-mono text-base tabular-nums text-ink">
          ৳ {(le.revenue / 100).toFixed(2)} Cr
        </td>

        {/* Margin */}
        <td className="py-3 pr-4 text-right">
          <span
            className={cn(
              'font-mono tabular-nums text-base',
              le.margin < 8 ? 'text-danger' : le.margin < 15 ? 'text-warning' : 'text-success'
            )}
          >
            {le.margin.toFixed(1)}%
          </span>
        </td>

        {/* Budget util */}
        <td className="py-3 pr-4">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted">Budget</span>
              <span
                className={cn(
                  'font-mono tabular-nums',
                  budgetUtil > 90 ? 'text-danger' : budgetUtil > 70 ? 'text-warning' : 'text-muted'
                )}
              >
                {budgetUtil}%
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-line">
              <div
                className={cn(
                  'h-full rounded-full',
                  budgetUtil > 90 ? 'bg-danger' : budgetUtil > 70 ? 'bg-warning' : 'bg-success'
                )}
                style={{ width: `${Math.min(budgetUtil, 100)}%` }}
              />
            </div>
          </div>
        </td>

        {/* Status */}
        <td className="py-3 pr-4">
          <StatusBadge status={le.status} />
        </td>

        {/* Modules */}
        <td className="py-3 pr-4">
          <div className="flex flex-wrap gap-1">
            {le.enabledModules.slice(0, 3).map((m) => (
              <Badge key={m}>{MODULE_LABEL[m] ?? m}</Badge>
            ))}
            {le.enabledModules.length > 3 && <Badge>+{le.enabledModules.length - 3}</Badge>}
          </div>
        </td>

        {/* Row actions */}
        <td className="py-3 pr-3 text-right">
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {canManage && (
              <button
                type="button"
                onClick={() => onManage(le)}
                title="Manage company details and module gates"
                className="inline-flex items-center gap-1 rounded border border-line bg-subtle px-2 py-1 text-xs text-muted hover:border-line-strong hover:text-ink transition-colors"
              >
                <SlidersIcon className="h-3 w-3" />
                <span>Manage</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectCompany(le)}
              className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2 py-1 text-xs font-medium text-ink hover:bg-subtle transition-colors"
            >
              Open →
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded drill-down */}
      {open && (
        <tr className="border-b border-line bg-canvas/50">
          <td colSpan={12} className="px-4 pb-4 pt-2">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Business Units */}
              <section className="rounded-lg border border-line bg-surface/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <LayersIcon className="h-3.5 w-3.5 text-muted" aria-hidden />
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Business Units ({bus.length})
                    </h4>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => onAddUnit(le, 'business-unit')}
                      className="inline-flex items-center gap-1 text-2xs text-muted hover:text-ink"
                    >
                      <PlusIcon className="h-3 w-3" /> Add
                    </button>
                  )}
                </div>
                {bus.length === 0 ? (
                  <p className="text-xs text-faint py-2 text-center">No business units registered</p>
                ) : (
                  <ul className="space-y-1">
                    {bus.map((bu) => (
                      <li key={bu.id} className="rounded-md border border-line bg-subtle px-3 py-2">
                        <p className="text-sm font-medium text-ink">{bu.name}</p>
                        <p className="text-xs text-muted">
                          {bu.head} · {bu.employees} people · {bu.revenueShare}% revenue
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Branches / Plants */}
              <section className="rounded-lg border border-line bg-surface/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <WarehouseIcon className="h-3.5 w-3.5 text-muted" aria-hidden />
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Branches & Plants ({bps.length})
                    </h4>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => onAddUnit(le, 'branch')}
                      className="inline-flex items-center gap-1 text-2xs text-muted hover:text-ink"
                    >
                      <PlusIcon className="h-3 w-3" /> Add
                    </button>
                  )}
                </div>
                {bps.length === 0 ? (
                  <p className="text-xs text-faint py-2 text-center">No facilities registered</p>
                ) : (
                  <ul className="space-y-1">
                    {bps.map((bp) => (
                      <li key={bp.id} className="rounded-md border border-line bg-subtle px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-ink">{bp.name}</p>
                            <p className="text-xs text-muted">
                              {bp.type.replace(/-/g, ' ')} · {bp.city} · {bp.employees} people
                            </p>
                          </div>
                          <StatusBadge status={bp.status} className="shrink-0" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Cost Centers */}
              <section className="rounded-lg border border-line bg-surface/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CircleDollarSignIcon className="h-3.5 w-3.5 text-muted" aria-hidden />
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Cost Centers ({ccs.length})
                    </h4>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => onAddUnit(le, 'cost-center')}
                      className="inline-flex items-center gap-1 text-2xs text-muted hover:text-ink"
                    >
                      <PlusIcon className="h-3 w-3" /> Add
                    </button>
                  )}
                </div>
                {ccs.length === 0 ? (
                  <p className="text-xs text-faint py-2 text-center">No cost centers registered</p>
                ) : (
                  <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
                    {ccs.map((cc) => {
                      const util = Math.round(
                        ((cc.consumedBudget + cc.encumberedBudget) / (cc.annualBudget || 1)) * 100
                      );
                      return (
                        <li key={cc.id} className="rounded-md border border-line bg-subtle px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-mono text-muted">{cc.code}</p>
                              <p className="truncate text-sm font-medium text-ink">{cc.name}</p>
                              <p className="text-xs text-muted">
                                {cc.type.replace(/-/g, ' ')} · ৳{(cc.annualBudget / 1_000_000).toFixed(1)}M
                              </p>
                            </div>
                            <span
                              className={cn(
                                'shrink-0 font-mono text-xs tabular-nums',
                                util > 90 ? 'text-danger' : util > 70 ? 'text-warning' : 'text-success'
                              )}
                            >
                              {util}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                util > 90 ? 'bg-danger' : util > 70 ? 'bg-warning' : 'bg-success'
                              )}
                              style={{ width: `${Math.min(util, 100)}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            {/* Enabled Modules Footer Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-subtle px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-faint font-semibold">
                  Enabled Modules ({le.enabledModules.length}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {le.enabledModules.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center rounded border border-line bg-surface px-2 py-0.5 text-2xs font-medium text-muted"
                    >
                      {MODULE_LABEL[m] ?? m}
                    </span>
                  ))}
                </div>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => onManage(le)}
                  className="text-xs text-muted hover:text-ink font-medium transition-colors"
                >
                  Configure Feature Gates ⚙️
                </button>
              )}
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
  const { canAccessCompany, activeCompanyName, setActiveCompanyId } = useEntityScope();
  const navigate = useNavigate();

  // State
  const [entities, setEntities] = useState<LegalEntity[]>(initialLegalEntities);
  const [busList, setBusList] = useState<BusinessUnit[]>(initialBusinessUnits);
  const [bpsList, setBpsList] = useState<BranchPlant[]>(initialBranchPlants);
  const [ccsList, setCcsList] = useState<CostCenter[]>(initialCostCenters);

  // Modals state
  const [createCompanyModalOpen, setCreateCompanyModalOpen] = useState(false);
  const [manageEntity, setManageEntity] = useState<LegalEntity | null>(null);
  const [createUnitModalOpen, setCreateUnitModalOpen] = useState(false);
  const [createUnitTargetCompanyId, setCreateUnitTargetCompanyId] = useState<string | undefined>(undefined);
  const [createUnitTargetType, setCreateUnitTargetType] = useState<OrgUnitType>('branch');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');

  const isGroupScoped = can('group.read');
  const canManageCompany = can('company.manage');

  // Visible entities filtered by ABAC scope
  const scopedEntities = useMemo(() => {
    return isGroupScoped
      ? entities
      : entities.filter((le) => canAccessCompany(le.id));
  }, [entities, isGroupScoped, canAccessCompany]);

  // Unique sectors for filter dropdown
  const uniqueSectors = useMemo(() => {
    return Array.from(new Set(scopedEntities.map((e) => e.sector))).filter(Boolean);
  }, [scopedEntities]);

  // Filtered list
  const filteredEntities = useMemo(() => {
    return scopedEntities.filter((e) => {
      if (statusFilter !== 'ALL' && e.status !== statusFilter.toLowerCase()) return false;
      if (sectorFilter !== 'ALL' && e.sector !== sectorFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.short.toLowerCase().includes(q) ||
          e.sector.toLowerCase().includes(q) ||
          e.legalRegNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [scopedEntities, searchQuery, statusFilter, sectorFilter]);

  const handleCompanyCreated = (newEntity: LegalEntity) => {
    setEntities((prev) => [newEntity, ...prev]);
  };

  const handleCompanyUpdated = (updatedEntity: LegalEntity) => {
    setEntities((prev) =>
      prev.map((e) => (e.id === updatedEntity.id ? updatedEntity : e))
    );
  };

  const handleUnitCreated = (newUnit: any, type: OrgUnitType) => {
    if (type === 'branch') {
      setBpsList((prev) => [...prev, newUnit]);
    } else if (type === 'business-unit') {
      setBusList((prev) => [...prev, newUnit]);
    } else if (type === 'cost-center') {
      setCcsList((prev) => [...prev, newUnit]);
    }
  };

  const handleOpenAddUnit = (le: LegalEntity, type: OrgUnitType) => {
    setCreateUnitTargetCompanyId(le.id);
    setCreateUnitTargetType(type);
    setCreateUnitModalOpen(true);
  };

  const handleSelectCompany = (le: LegalEntity) => {
    setActiveCompanyId(le.id);
    navigate('/company');
  };

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: 'Organization' }, { label: 'Legal Entities' }]}
        title="Legal Entities & Sister Concerns"
        description="Comprehensive management of conglomerate sister concerns, operational plants, business units, cost centers, and enabled ERP feature gates."
        meta={
          <Badge tone="accent">
            {scopedEntities.length} legal entities · {isGroupScoped ? 'Group Scope' : `Scoped to ${activeCompanyName}`}
          </Badge>
        }
        actions={
          canManageCompany ? (
            <Button
              variant="primary"
              icon={PlusIcon}
              onClick={() => setCreateCompanyModalOpen(true)}
            >
              Add legal entity
            </Button>
          ) : undefined
        }
      />

      <div className="px-6 space-y-4">
        {/* Group-level summary */}
        {isGroupScoped && <GroupSummary totalCompanies={entities.length} />}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-faint" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies by name, code, sector..."
              className="w-full rounded border border-line bg-canvas pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="rounded border border-line bg-subtle px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
            >
              <option value="ALL">All Sectors</option>
              {uniqueSectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-line bg-subtle px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

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
                <th className="py-2.5 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntities.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-sm text-muted">
                    No operating companies found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEntities.map((le) => (
                  <EntityRow
                    key={le.id}
                    le={le}
                    bus={busList.filter((b) => b.companyId === le.id)}
                    bps={bpsList.filter((p) => p.companyId === le.id)}
                    ccs={ccsList.filter((c) => c.companyId === le.id)}
                    canManage={canManageCompany}
                    onManage={(item) => setManageEntity(item)}
                    onAddUnit={handleOpenAddUnit}
                    onSelectCompany={handleSelectCompany}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Cross-company comparison note */}
        <p className="mt-3 text-xs text-faint">
          * Sister concerns operate under isolated ABAC boundaries. Expanding an entity allows viewing and adding units, plants, and cost centers.
        </p>
      </div>

      {/* Create Company Modal */}
      {createCompanyModalOpen && (
        <CreateCompanyModal
          onClose={() => setCreateCompanyModalOpen(false)}
          onSuccess={handleCompanyCreated}
        />
      )}

      {/* Manage Company Modal */}
      {manageEntity && (
        <ManageCompanyModal
          entity={manageEntity}
          onClose={() => setManageEntity(null)}
          onUpdate={handleCompanyUpdated}
        />
      )}

      {/* Create Org Unit Modal */}
      {createUnitModalOpen && (
        <CreateOrgUnitModal
          companies={scopedEntities}
          defaultCompanyId={createUnitTargetCompanyId}
          defaultType={createUnitTargetType}
          onClose={() => setCreateUnitModalOpen(false)}
          onSuccess={handleUnitCreated}
        />
      )}
    </div>
  );
}