import React, { useState } from 'react';
import {
  CircleDollarSignIcon,
  LayersIcon,
  MapPinIcon,
  ShieldCheckIcon,
  UsersIcon,
  WarehouseIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/StatusBadge';
import { orgApi } from '../../api/client';
import { recordAuditEvent } from '../../data/system';
import type { BranchPlant, BusinessUnit, CostCenter, Department, LegalEntity } from '../../types';

export type OrgUnitType = 'branch' | 'business-unit' | 'cost-center' | 'department';

interface CreateOrgUnitModalProps {
  companies: LegalEntity[];
  defaultCompanyId?: string;
  defaultType?: OrgUnitType;
  onClose: () => void;
  onSuccess: (unit: any, type: OrgUnitType) => void;
}

export function CreateOrgUnitModal({
  companies,
  defaultCompanyId,
  defaultType = 'branch',
  onClose,
  onSuccess,
}: CreateOrgUnitModalProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState(defaultCompanyId || companies[0]?.id || '');
  const [unitType, setUnitType] = useState<OrgUnitType>(defaultType);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('Dhaka');
  const [headPerson, setHeadPerson] = useState('');
  const [subType, setSubType] = useState('plant');
  const [annualBudget, setAnnualBudget] = useState(10000000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Unit name is required');
      return;
    }
    if (!code.trim()) {
      setError('Unit code is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const cleanCode = code.trim().toUpperCase();
    const id = `${unitType.slice(0, 3)}-${Date.now().toString(36)}`;

    let createdRecord: any = null;

    if (unitType === 'branch') {
      const bp: BranchPlant = {
        id,
        companyId: selectedCompanyId,
        name: name.trim(),
        type: subType as any,
        address: `${city}, Bangladesh`,
        city,
        employees: 0,
        status: 'active',
      };
      createdRecord = bp;
    } else if (unitType === 'business-unit') {
      const bu: BusinessUnit = {
        id,
        companyId: selectedCompanyId,
        name: name.trim(),
        head: headPerson.trim() || 'Unassigned',
        type: subType as any,
        employees: 0,
        revenueShare: 10,
        status: 'active',
      };
      createdRecord = bu;
    } else if (unitType === 'cost-center') {
      const cc: CostCenter = {
        id,
        companyId: selectedCompanyId,
        code: cleanCode,
        name: name.trim(),
        type: subType as any,
        manager: headPerson.trim() || 'Finance Manager',
        annualBudget,
        consumedBudget: 0,
        encumberedBudget: 0,
        status: 'active',
      };
      createdRecord = cc;
    } else {
      const dept: Department = {
        id,
        companyId: selectedCompanyId,
        name: name.trim(),
        head: headPerson.trim() || 'Department Head',
        employees: 0,
        status: 'active',
      };
      createdRecord = dept;
    }

    try {
      await orgApi.createNode({
        parentId: selectedCompanyId,
        type:
          unitType === 'branch'
            ? 'BRANCH_PLANT'
            : unitType === 'business-unit'
            ? 'BUSINESS_UNIT'
            : unitType === 'cost-center'
            ? 'COST_CENTER'
            : 'DEPARTMENT',
        code: cleanCode,
        name: name.trim(),
        city,
        headPerson,
        annualBudget: unitType === 'cost-center' ? annualBudget : undefined,
      }).catch(() => null);

      recordAuditEvent({
        action: 'ORG_UNIT_CREATED',
        resource: unitType,
        resourceId: id,
        details: `Created ${unitType} "${name}" under company "${selectedCompany?.name}".`,
      });

      onSuccess(createdRecord, unitType);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create organizational unit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-xl rounded-xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-subtle text-ink">
              {unitType === 'branch' && <WarehouseIcon className="h-5 w-5" />}
              {unitType === 'business-unit' && <LayersIcon className="h-5 w-5" />}
              {unitType === 'cost-center' && <CircleDollarSignIcon className="h-5 w-5" />}
              {unitType === 'department' && <UsersIcon className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-ink">Add Organizational Unit</h2>
                <Badge tone="accent">Entity Scoped</Badge>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Register a branch, facility, division, or cost center under a legal entity.
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Target Company */}
          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
              Parent Legal Entity / Sister Concern
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.short})
                </option>
              ))}
            </select>
          </div>

          {/* Unit Type Segmented Controls */}
          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
              Unit Classification
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'branch', label: 'Branch / Plant', icon: WarehouseIcon },
                { id: 'business-unit', label: 'Business Unit', icon: LayersIcon },
                { id: 'cost-center', label: 'Cost Center', icon: CircleDollarSignIcon },
                { id: 'department', label: 'Department', icon: UsersIcon },
              ].map((t) => {
                const active = unitType === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setUnitType(t.id as OrgUnitType);
                      if (t.id === 'branch') setSubType('plant');
                      if (t.id === 'business-unit') setSubType('division');
                      if (t.id === 'cost-center') setSubType('operating');
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-colors ${
                      active
                        ? 'border-accent bg-subtle text-ink'
                        : 'border-line bg-canvas text-muted hover:text-ink'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Code and Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Unit Code <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={
                  unitType === 'cost-center'
                    ? 'CC-PROC-001'
                    : unitType === 'branch'
                    ? 'BP-SAVAR-02'
                    : 'BU-FMCG-01'
                }
                className="w-full font-mono uppercase rounded border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Unit Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Savar Processing Plant II"
                className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Subtype and Location / Head */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Sub-Type / Function
              </label>
              <select
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
                className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none capitalize"
              >
                {unitType === 'branch' && (
                  <>
                    <option value="plant">Manufacturing Plant</option>
                    <option value="warehouse">Warehouse & Distribution Center</option>
                    <option value="head-office">Corporate Office</option>
                    <option value="sales-office">Regional Sales Office</option>
                    <option value="depot">Transit Depot</option>
                  </>
                )}
                {unitType === 'business-unit' && (
                  <>
                    <option value="division">Operational Division</option>
                    <option value="segment">Market Segment</option>
                    <option value="vertical">Product Vertical</option>
                  </>
                )}
                {unitType === 'cost-center' && (
                  <>
                    <option value="operating">Operating Expenses</option>
                    <option value="production">Production & Factory Costs</option>
                    <option value="administrative">General & Administrative</option>
                    <option value="shared-service">Shared Corporate Service</option>
                  </>
                )}
                {unitType === 'department' && (
                  <>
                    <option value="operational">Operational Department</option>
                    <option value="support">Support Function</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                {unitType === 'branch' ? 'Location / City' : 'Unit Head / Manager'}
              </label>
              <input
                type="text"
                value={unitType === 'branch' ? city : headPerson}
                onChange={(e) =>
                  unitType === 'branch' ? setCity(e.target.value) : setHeadPerson(e.target.value)
                }
                placeholder={unitType === 'branch' ? 'e.g. Gazipur' : 'Manager Name'}
                className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Cost Center Specific: Budget */}
          {unitType === 'cost-center' && (
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Annual Budget Allocation (BDT)
              </label>
              <input
                type="number"
                min="0"
                step="100000"
                value={annualBudget}
                onChange={(e) => setAnnualBudget(Number(e.target.value))}
                className="w-full font-mono rounded border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
              <p className="text-2xs text-muted mt-1">
                Transactions and Purchase Orders tagged with this cost center will validate against this ceiling.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded border border-danger/30 bg-danger-soft p-2.5 text-xs text-danger">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting}>
              Create Unit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
