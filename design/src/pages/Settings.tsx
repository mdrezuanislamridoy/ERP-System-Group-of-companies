import React, { useState } from 'react';
import {
  BuildingIcon,
  CheckIcon,
  SparklesIcon,
  FactoryIcon,
  CarIcon,
  BoxesIcon,
  CircleDollarSignIcon,
  CalendarCheckIcon,
  ShoppingBagIcon,
  ShieldCheckIcon,
  TruckIcon,
  FolderKanbanIcon,
  BriefcaseIcon,
  WrenchIcon,
  CheckCircle2Icon,
  SlidersHorizontalIcon
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/StatusBadge';
import { companies, group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import { useEntityScope } from '../contexts/EntityScopeContext';
import { type ModuleKey, MODULE_METADATA } from '../types';
import { cn } from '../utils/cn';

const GROUPS = [
  { label: 'Organization', items: ['Organization', 'Companies', 'Branches', 'Departments'] },
  { label: 'Access', items: ['Users', 'Roles', 'Permissions', 'Security'] },
  { label: 'Platform', items: ['Modules', 'Workflow', 'Notifications', 'Integrations'] },
  { label: 'Business', items: ['Numbering', 'Finance', 'Localization', 'Audit'] }
];

const MODULE_ICONS: Record<ModuleKey, React.ComponentType<{ className?: string }>> = {
  finance: CircleDollarSignIcon,
  hr: CalendarCheckIcon,
  payroll: CircleDollarSignIcon,
  procurement: TruckIcon,
  inventory: BoxesIcon,
  manufacturing: FactoryIcon,
  quality: CheckCircle2Icon,
  sales: BriefcaseIcon,
  crm: FolderKanbanIcon,
  projects: FolderKanbanIcon,
  fleet: CarIcon,
  assets: BoxesIcon,
  maintenance: WrenchIcon,
  'retail-pos': ShoppingBagIcon,
};

const PRESETS: Record<string, { label: string; modules: ModuleKey[]; hint: string }> = {
  manufacturing: {
    label: 'Manufacturing & FMCG',
    hint: 'Foods, Textiles, Heavy Industry',
    modules: ['finance', 'hr', 'payroll', 'procurement', 'inventory', 'manufacturing', 'quality', 'sales']
  },
  tech: {
    label: 'Software & Technology',
    hint: 'IT, SaaS, Digital Agencies',
    modules: ['finance', 'hr', 'payroll', 'projects', 'crm', 'sales']
  },
  transport: {
    label: 'Logistics & Fleet',
    hint: 'Freight, Courier, Transport',
    modules: ['finance', 'hr', 'payroll', 'fleet', 'procurement', 'assets', 'maintenance']
  },
  retail: {
    label: 'Retail & Superstore',
    hint: 'Grocery, Outlets, Chain Stores',
    modules: ['finance', 'hr', 'payroll', 'inventory', 'sales', 'retail-pos', 'procurement']
  },
  all: {
    label: 'Enterprise (All Modules)',
    hint: 'Full ERP suite enabled',
    modules: Object.keys(MODULE_METADATA) as ModuleKey[]
  }
};

export function Settings() {
  const { companyName, can } = useApp();
  const { activeCompanyId, companyModules, toggleCompanyModule, setCompanyModulesPreset } = useEntityScope();
  const [section, setSection] = useState('Modules');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(activeCompanyId || companies[0].id);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const targetCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0];
  const activeModules = companyModules[targetCompany.id] || targetCompany.enabledModules;

  const handleToggle = (moduleKey: ModuleKey) => {
    if (!can('settings.manage')) return;
    const isCurrentlyEnabled = activeModules.includes(moduleKey);
    toggleCompanyModule(targetCompany.id, moduleKey, !isCurrentlyEnabled);

    setStatusMsg(`Updated '${MODULE_METADATA[moduleKey].label}' for ${targetCompany.name}`);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleApplyPreset = (presetKey: string) => {
    if (!can('settings.manage')) return;
    const preset = PRESETS[presetKey];
    if (!preset) return;
    setCompanyModulesPreset(targetCompany.id, preset.modules);

    setStatusMsg(`Applied '${preset.label}' preset to ${targetCompany.name}`);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: 'Administration' }, { label: 'Settings' }, { label: section }]}
        title="Settings"
        description="Configuration applies to the scope shown. Company settings inherit from group defaults unless overridden."
        meta={<Badge tone="accent">Scope: {companyName}</Badge>}
        actions={
          <Button variant="primary" onClick={() => {
            setStatusMsg('Settings successfully persisted to group state.');
            setTimeout(() => setStatusMsg(null), 3000);
          }}>
            Save changes
          </Button>
        }
      />

      {statusMsg && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-4 py-2.5 text-xs font-medium text-success shadow-sm">
          <CheckIcon className="h-4 w-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="grid gap-4 p-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="space-y-4">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <p className="px-2 pb-1 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((item) => (
                  <li key={item}>
                    <button
                      onClick={() => setSection(item)}
                      className={cn(
                        'w-full rounded px-2 py-1.5 text-left text-base transition-colors duration-100 ease-out',
                        section === item ? 'bg-surface font-medium text-ink' : 'text-muted hover:bg-surface hover:text-ink'
                      )}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-4">
          {section === 'Modules' ? (
            <div className="space-y-4">
              {/* Entity Selector Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <BuildingIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <label htmlFor="company-module-select" className="block text-2xs font-semibold uppercase tracking-wider text-faint">
                      Select Legal Entity / Sister Concern
                    </label>
                    <select
                      id="company-module-select"
                      value={targetCompany.id}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="mt-1 h-8 rounded border border-line bg-canvas px-2.5 text-sm font-semibold text-ink focus:border-accent focus:outline-none"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.sector})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-line bg-subtle px-2.5 py-1 text-xs text-muted">
                    Active: <strong className="text-ink">{activeModules.length}</strong> of{' '}
                    {Object.keys(MODULE_METADATA).length} modules
                  </span>
                  <Badge tone={activeModules.length > 5 ? 'success' : 'accent'}>
                    {targetCompany.sector}
                  </Badge>
                </div>
              </div>

              {/* Presets Toolbar */}
              <div className="rounded-xl border border-line bg-subtle p-3">
                <div className="flex items-center gap-1.5 pb-2 text-2xs font-semibold uppercase tracking-wider text-faint">
                  <SparklesIcon className="h-3.5 w-3.5 text-accent" />
                  <span>Quick Industry Profile Presets</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PRESETS).map(([key, p]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleApplyPreset(key)}
                      disabled={!can('settings.manage')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs text-ink hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
                      title={p.hint}
                    >
                      <SlidersHorizontalIcon className="h-3 w-3 text-muted" />
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Module Grid List */}
              <Panel
                title="Enabled Modules"
                description={`Toggle specific modules for ${targetCompany.name}. Disabled modules are immediately hidden from the sidebar navigation and protected by route guards.`}
                bodyClassName="p-0"
              >
                <ul className="divide-y divide-line">
                  {(Object.keys(MODULE_METADATA) as ModuleKey[]).map((mKey) => {
                    const meta = MODULE_METADATA[mKey];
                    const isEnabled = activeModules.includes(mKey);
                    const Icon = MODULE_ICONS[mKey] || BoxesIcon;

                    return (
                      <li key={mKey} className="flex items-center gap-3.5 px-4 py-3 hover:bg-subtle/50 transition-colors">
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
                            isEnabled
                              ? 'border-accent/30 bg-accent-soft text-accent'
                              : 'border-line bg-canvas text-faint'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-ink">{meta.label}</p>
                            <span className="rounded bg-canvas border border-line px-1.5 py-0.2 text-2xs font-medium text-faint">
                              {meta.category}
                            </span>
                            {isEnabled ? (
                              <Badge tone="success">Active</Badge>
                            ) : (
                              <Badge tone="muted">Disabled</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted mt-0.5">{meta.description}</p>
                        </div>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={isEnabled}
                          aria-label={`Toggle ${meta.label}`}
                          disabled={!can('settings.manage')}
                          onClick={() => handleToggle(mKey)}
                          className={cn(
                            'relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 disabled:opacity-50',
                            isEnabled ? 'bg-accent' : 'bg-line'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out',
                              isEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                            )}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            </div>
          ) : (
            <Panel title={section} description={`${section} configuration for ${companyName}`}>
              <div className="space-y-4">
                {[
                  { label: 'Inherit from group defaults', hint: 'Company overrides are disabled while inheritance is on.' },
                  { label: 'Require approval for changes', hint: 'Configuration changes route through the Group IT workflow.' },
                  { label: 'Log all changes to audit trail', hint: 'Always on for privileged settings.' }
                ].map((row, i) => (
                  <label key={row.label} className="flex items-start gap-3 border-b border-line pb-4 last:border-b-0 last:pb-0">
                    <input type="checkbox" defaultChecked={i !== 1} disabled={i === 2} className="mt-1 h-3 w-3 accent-[#3B82F6]" />
                    <span>
                      <span className="block text-base text-ink">{row.label}</span>
                      <span className="block text-sm text-muted">{row.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}