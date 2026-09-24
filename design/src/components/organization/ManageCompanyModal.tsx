import React, { useState } from 'react';
import {
  Building2Icon,
  CheckIcon,
  LayersIcon,
  PowerIcon,
  ShieldCheckIcon,
  SlidersIcon,
  WarehouseIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge, StatusBadge } from '../ui/StatusBadge';
import { orgApi } from '../../api/client';
import { useEntityScope } from '../../contexts/EntityScopeContext';
import { recordAuditEvent } from '../../data/system';
import { businessUnits, branchPlants, costCenters } from '../../data/organization';
import type { LegalEntity, ModuleKey, StatusKey } from '../../types';

interface ManageCompanyModalProps {
  entity: LegalEntity;
  onClose: () => void;
  onUpdate: (updatedEntity: LegalEntity) => void;
}

const ALL_MODULES: Array<{ key: ModuleKey; label: string; desc: string }> = [
  { key: 'finance', label: 'Finance & Accounting', desc: 'General ledger, charts of accounts, and fiscal journals' },
  { key: 'hr', label: 'Human Resources', desc: 'Employee records, attendance, departments, and payroll' },
  { key: 'procurement', label: 'Procurement & Purchasing', desc: 'Purchase requests, orders, RFQs, and vendor comparisons' },
  { key: 'inventory', label: 'Inventory & Warehousing', desc: 'Multi-location stock, batches, lots, and ledger journals' },
  { key: 'manufacturing', label: 'Manufacturing & Plants', desc: 'Work orders, bills of materials (BOM), and factory routing' },
  { key: 'fleet', label: 'Fleet & Logistics', desc: 'Vehicle asset registers, trip dispatch, and driver assignments' },
  { key: 'projects', label: 'Projects & Job Costing', desc: 'Project budgets, milestone billing, and progress certificates' },
  { key: 'retail-pos', label: 'Retail & POS Storefront', desc: 'Point of sale checkouts, cashier shifts, and store inventory' },
  { key: 'quality', label: 'Quality Control (QC)', desc: 'Inspection gates, material hold/quarantine, and testing specs' },
];

export function ManageCompanyModal({ entity, onClose, onUpdate }: ManageCompanyModalProps) {
  const { toggleCompanyModule } = useEntityScope();
  const [activeTab, setActiveTab] = useState<'profile' | 'modules' | 'hierarchy'>('profile');

  // Form states
  const [name, setName] = useState(entity.name);
  const [short, setShort] = useState(entity.short);
  const [sector, setSector] = useState(entity.sector);
  const [status, setStatus] = useState<StatusKey>(entity.status);
  const [currency, setCurrency] = useState(entity.currency);
  const [legalRegNumber, setLegalRegNumber] = useState(entity.legalRegNumber);
  const [interCompanyCode, setInterCompanyCode] = useState(entity.interCompanyCode || `IC-${entity.short.toUpperCase()}`);

  const [enabledModules, setEnabledModules] = useState<ModuleKey[]>(entity.enabledModules);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const bus = businessUnits.filter((bu) => bu.companyId === entity.id);
  const bps = branchPlants.filter((bp) => bp.companyId === entity.id);
  const ccs = costCenters.filter((cc) => cc.companyId === entity.id);

  const handleToggleModule = async (modKey: ModuleKey) => {
    const isEnabling = !enabledModules.includes(modKey);
    const updated = isEnabling
      ? [...enabledModules, modKey]
      : enabledModules.filter((m) => m !== modKey);

    setEnabledModules(updated);
    toggleCompanyModule(entity.id, modKey, isEnabling);

    try {
      await orgApi.configureCompanyModules(entity.id, {
        modules: [{ moduleKey: modKey, status: isEnabling ? 'ACTIVE' : 'INACTIVE' }],
      }).catch(() => null);

      recordAuditEvent({
        action: 'COMPANY_MODULE_TOGGLED',
        resource: 'CompanyModule',
        resourceId: entity.id,
        details: `${isEnabling ? 'Enabled' : 'Disabled'} module "${modKey}" for ${entity.name}.`,
      });
    } catch {
      // Offline fallback
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedbackMsg(null);

    const updatedEntity: LegalEntity = {
      ...entity,
      name: name.trim(),
      short: short.trim(),
      sector: sector.trim(),
      status,
      currency,
      legalRegNumber: legalRegNumber.trim(),
      interCompanyCode: interCompanyCode.trim(),
      enabledModules,
    };

    try {
      await orgApi.updateCompany(entity.id, {
        name: name.trim(),
        sector: sector.trim(),
        status: status.toUpperCase(),
        currency,
        legalName: legalRegNumber,
      }).catch(() => null);

      recordAuditEvent({
        action: 'COMPANY_UPDATED',
        resource: 'LegalEntity',
        resourceId: entity.id,
        details: `Updated company profile and status (${status}) for ${entity.name}.`,
      });

      onUpdate(updatedEntity);
      setFeedbackMsg({ type: 'success', text: 'Company details and policy updated successfully.' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to update company.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-3xl rounded-xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-subtle text-ink">
              <Building2Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-ink">{entity.name}</h2>
                <StatusBadge status={status} />
              </div>
              <p className="text-xs text-muted mt-0.5">
                ID: <span className="font-mono text-ink">{entity.id}</span> · RJSC: {entity.legalRegNumber} · {entity.sector}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-subtle hover:text-ink transition-colors"
            aria-label="Close modal"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-line pt-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`border-b-2 px-3 py-2 font-medium transition-colors ${
              activeTab === 'profile'
                ? 'border-accent text-ink font-semibold'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Company Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className={`border-b-2 px-3 py-2 font-medium transition-colors ${
              activeTab === 'modules'
                ? 'border-accent text-ink font-semibold'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Module Configuration ({enabledModules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hierarchy')}
            className={`border-b-2 px-3 py-2 font-medium transition-colors ${
              activeTab === 'hierarchy'
                ? 'border-accent text-ink font-semibold'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Units & Hierarchy ({bus.length + bps.length + ccs.length})
          </button>
        </div>

        {/* Tab 1: Profile & Registration */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                  Legal Entity Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                  Short Alias
                </label>
                <input
                  type="text"
                  required
                  value={short}
                  onChange={(e) => setShort(e.target.value)}
                  className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                  Operating Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusKey)}
                  className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value="active">Active (Operational)</option>
                  <option value="inactive">Inactive (Dormant)</option>
                  <option value="suspended">Suspended (Restricted)</option>
                </select>
              </div>
              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                  Industry Sector
                </label>
                <input
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value="BDT">BDT (৳)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                  Registration / RJSC Number
                </label>
                <input
                  type="text"
                  value={legalRegNumber}
                  onChange={(e) => setLegalRegNumber(e.target.value)}
                  className="w-full font-mono rounded border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                  Inter-Company Supplier Code
                </label>
                <input
                  type="text"
                  value={interCompanyCode}
                  onChange={(e) => setInterCompanyCode(e.target.value)}
                  className="w-full font-mono rounded border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {feedbackMsg && (
              <div
                className={`rounded border p-2.5 text-xs ${
                  feedbackMsg.type === 'success'
                    ? 'border-success/30 bg-success-soft text-ink'
                    : 'border-danger/30 bg-danger-soft text-danger'
                }`}
              >
                {feedbackMsg.text}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Close
              </Button>
              <Button variant="primary" type="submit" loading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        )}

        {/* Tab 2: Feature & Module Gates */}
        {activeTab === 'modules' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <div>
                <p className="text-xs font-semibold text-ink">Module Entitlements & Feature Flags</p>
                <p className="text-2xs text-muted">
                  Toggling off a module restricts menu access, API endpoints, and ledger triggers for users scoped to {entity.name}.
                </p>
              </div>
              <Badge tone="accent">{enabledModules.length} Active</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {ALL_MODULES.map((m) => {
                const isEnabled = enabledModules.includes(m.key);
                return (
                  <div
                    key={m.key}
                    className={`flex items-start justify-between rounded-lg border p-3 transition-colors ${
                      isEnabled
                        ? 'border-line-strong bg-subtle'
                        : 'border-line/50 bg-canvas opacity-75'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-ink">{m.label}</span>
                        {isEnabled ? (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                        ) : (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-faint" />
                        )}
                      </div>
                      <p className="text-2xs text-muted mt-0.5 line-clamp-2">{m.desc}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleModule(m.key)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-success' : 'bg-line-strong'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Units & Hierarchy Breakdown */}
        {activeTab === 'hierarchy' && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-line bg-subtle p-3">
                <p className="font-mono text-xl font-bold text-ink">{bus.length}</p>
                <p className="text-xs text-muted mt-0.5">Business Units</p>
              </div>
              <div className="rounded-lg border border-line bg-subtle p-3">
                <p className="font-mono text-xl font-bold text-ink">{bps.length}</p>
                <p className="text-xs text-muted mt-0.5">Plants & Branches</p>
              </div>
              <div className="rounded-lg border border-line bg-subtle p-3">
                <p className="font-mono text-xl font-bold text-ink">{ccs.length}</p>
                <p className="text-xs text-muted mt-0.5">Cost Centers</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Branches and Facilities
                </h4>
                {bps.length === 0 ? (
                  <p className="text-xs text-faint">No plants or branches registered.</p>
                ) : (
                  <div className="space-y-1">
                    {bps.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between rounded border border-line bg-subtle px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <WarehouseIcon className="h-3.5 w-3.5 text-muted" />
                          <span className="font-medium text-ink">{b.name}</span>
                          <span className="text-faint">({b.type})</span>
                        </div>
                        <span className="text-muted">{b.city} · {b.employees} people</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Cost Centers
                </h4>
                {ccs.length === 0 ? (
                  <p className="text-xs text-faint">No cost centers registered.</p>
                ) : (
                  <div className="space-y-1">
                    {ccs.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded border border-line bg-subtle px-3 py-2 text-xs"
                      >
                        <div>
                          <span className="font-mono text-muted mr-2">{c.code}</span>
                          <span className="font-medium text-ink">{c.name}</span>
                        </div>
                        <span className="font-mono text-muted">
                          ৳{(c.annualBudget / 1_000_000).toFixed(1)}M Budget
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
