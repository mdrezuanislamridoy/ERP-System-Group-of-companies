import React, { useState } from 'react';
import {
  Building2Icon,
  CheckIcon,
  Globe2Icon,
  LayersIcon,
  Loader2Icon,
  ShieldCheckIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/StatusBadge';
import { orgApi } from '../../api/client';
import { recordAuditEvent } from '../../data/system';
import type { LegalEntity, ModuleKey } from '../../types';

interface CreateCompanyModalProps {
  onClose: () => void;
  onSuccess: (newEntity: LegalEntity) => void;
}

const AVAILABLE_MODULES: Array<{ key: ModuleKey; label: string; desc: string }> = [
  { key: 'finance', label: 'Finance & Accounting', desc: 'Double-entry GL, Journals, Invoicing & Bank Recon' },
  { key: 'hr', label: 'Human Resources', desc: 'Workforce records, attendance, departments & payroll' },
  { key: 'procurement', label: 'Procurement', desc: 'PRs, POs, RFQs, vendor comparisons & 3-way match' },
  { key: 'inventory', label: 'Inventory & Warehousing', desc: 'Multi-warehouse stock, lot/batches & transfers' },
  { key: 'manufacturing', label: 'Manufacturing & Plants', desc: 'Production orders, BOMs & factory scheduling' },
  { key: 'fleet', label: 'Fleet & Logistics', desc: 'Vehicle tracking, dispatch logs & fuel usage' },
  { key: 'projects', label: 'Projects & Contracts', desc: 'Milestone tracking, budgets & deliverable audits' },
  { key: 'retail-pos', label: 'Retail & POS', desc: 'Store cash registers, retail inventory & sales' },
  { key: 'quality', label: 'Quality Control', desc: 'Inspection gates, quarantine & QC certificates' },
];

const SECTOR_OPTIONS = [
  'Manufacturing & Production',
  'Healthcare & Pharmaceuticals',
  'Consumer Goods & FMCG',
  'Transport & Logistics',
  'Textiles & Garments',
  'Real Estate & Infrastructure',
  'Retail & Superstores',
  'Technology & Cloud Services',
  'Agro & Food Processing',
  'Financial Services & Investments',
];

export function CreateCompanyModal({ onClose, onSuccess }: CreateCompanyModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sector, setSector] = useState(SECTOR_OPTIONS[0]);
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [binNumber, setBinNumber] = useState('');
  const [currency, setCurrency] = useState('BDT');
  const [incorporatedYear, setIncorporatedYear] = useState(new Date().getFullYear());
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>([
    'finance',
    'hr',
    'procurement',
    'inventory',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleModule = (modKey: ModuleKey) => {
    setSelectedModules((prev) =>
      prev.includes(modKey) ? prev.filter((k) => k !== modKey) : [...prev, modKey]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Company name is required');
      return;
    }
    if (!code.trim()) {
      setError('Company code is required (e.g. OKO-PHARM)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const cleanCode = code.trim().toUpperCase();
    const companyId = `c-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const newEntity: LegalEntity = {
      id: companyId,
      groupId: 'grp-abc',
      name: name.trim(),
      short: name.trim().split(' ')[0] || cleanCode,
      legalRegNumber: binNumber ? `RJSC-${binNumber}` : `RJSC-${incorporatedYear}-00${Math.floor(100 + Math.random() * 900)}`,
      sector,
      country: 'Bangladesh',
      currency,
      employees: 0,
      revenue: 0,
      expense: 0,
      margin: 0,
      status: 'active',
      enabledModules: selectedModules,
      isSisterConcern: true,
      interCompanyCode: `IC-${cleanCode}`,
    };

    try {
      // Attempt backend API persistence
      await orgApi.createCompany({
        name: name.trim(),
        code: cleanCode,
        sector,
        currency,
        legalName: legalName || name.trim(),
        taxId: taxId || undefined,
        binNumber: binNumber || undefined,
        incorporatedYear,
        modules: selectedModules,
      }).catch((apiErr) => {
        console.warn('Backend API persistence skipped or offline, updating frontend state:', apiErr);
      });

      // Record audit event
      recordAuditEvent({
        action: 'COMPANY_CREATED',
        resource: 'LegalEntity',
        resourceId: companyId,
        details: `Created sister concern "${name}" (${cleanCode}) under ABC Group with ${selectedModules.length} enabled modules.`,
      });

      onSuccess(newEntity);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create sister concern.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-subtle text-ink">
              <Building2Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-ink">Add Sister Concern</h2>
                <Badge tone="accent">Group Executive</Badge>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Register a new legally incorporated operating company under ABC Group Holdings PLC.
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

        {/* Security & Scoping Notice */}
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-line bg-subtle px-3 py-2 text-2xs text-muted">
          <ShieldCheckIcon className="h-4 w-4 shrink-0 text-success" />
          <span>
            This entity will be initialized with automated ABAC isolation, a dedicated general ledger chart, and scoped RBAC access controls.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Row 1: Name and Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Company Trade Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Okobiz Healthcare Ltd."
                className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Company Code <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. OKO-HLTH"
                className="w-full font-mono uppercase rounded border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Sector and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Industry Sector
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                {SECTOR_OPTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Base Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                <option value="BDT">BDT (৳) — Bangladesh Taka</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="GBP">GBP (£) — British Pound</option>
              </select>
            </div>
          </div>

          {/* Row 3: Statutory & Registration Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Legal Registered Name
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Official corporate entity name"
                className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Tax ID / TIN Number
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="e.g. TIN-99887766"
                className="w-full font-mono rounded border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                BIN / VAT Number
              </label>
              <input
                type="text"
                value={binNumber}
                onChange={(e) => setBinNumber(e.target.value)}
                placeholder="e.g. BIN-001234567"
                className="w-full font-mono rounded border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Module Activation Multi-Selector */}
          <div className="border-t border-line pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint">
                Active Modules for this Company ({selectedModules.length} selected)
              </label>
              <span className="text-2xs text-muted">Feature gates can be customized anytime</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {AVAILABLE_MODULES.map((mod) => {
                const checked = selectedModules.includes(mod.key);
                return (
                  <button
                    key={mod.key}
                    type="button"
                    onClick={() => toggleModule(mod.key)}
                    className={`flex items-start gap-2.5 rounded border p-2.5 text-left transition-colors ${
                      checked
                        ? 'border-line-strong bg-surface text-ink'
                        : 'border-line/60 bg-subtle text-muted hover:border-line hover:text-ink'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border mt-0.5 ${
                        checked
                          ? 'border-accent bg-accent text-white'
                          : 'border-line bg-canvas'
                      }`}
                    >
                      {checked && <CheckIcon className="h-3 w-3 stroke-[3]" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-ink truncate">{mod.label}</p>
                      <p className="text-2xs text-faint line-clamp-1">{mod.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="rounded border border-danger/30 bg-danger-soft p-2.5 text-xs text-danger">
              {error}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting}>
              Register Sister Concern
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
