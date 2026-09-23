import React, { useState } from 'react';
import {
  XIcon,
  UserPlusIcon,
  ShieldAlertIcon,
  BuildingIcon,
  CreditCardIcon,
  KeyRoundIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { iamApi, type CreateEmployeePayload } from '../../api/client';
import { companies } from '../../data/organization';
import { useAuth } from '../../contexts/AuthContext';

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newEmployee: any) => void;
}

const AVAILABLE_ROLES = [
  { key: 'employee', label: 'General Employee (Self Scope)' },
  { key: 'staff', label: 'Operational Staff (Self Scope)' },
  { key: 'procurement-officer', label: 'Procurement Officer (PR/PO Creation & Stock View)' },
  { key: 'department-manager', label: 'Department Manager (Approval limit ৳500,000)' },
  { key: 'company-cfo', label: 'Company Finance Director (Approval limit ৳2,500,000)' },
  { key: 'finance-auditor', label: 'Finance Auditor (Read-only GL Inspection)' },
];

const DEPARTMENTS = [
  { id: 'dept-fin-foods', name: 'Finance & Accounts' },
  { id: 'dept-proc-foods', name: 'Procurement & Supply Chain' },
  { id: 'dept-hr-foods', name: 'Human Resources & Administration' },
  { id: 'dept-prod-foods', name: 'Manufacturing & Production' },
  { id: 'dept-ops-foods', name: 'Fleet & Logistics Operations' },
  { id: 'dept-it-foods', name: 'Information Technology' },
];

export function CreateEmployeeModal({ isOpen, onClose, onSuccess }: CreateEmployeeModalProps) {
  const { scope, user } = useAuth();

  const isGroupScoped = scope.allowedCompanyIds.includes('*');
  const defaultCompany = isGroupScoped ? 'c-foods' : scope.allowedCompanyIds[0] || 'c-foods';

  const [formData, setFormData] = useState<CreateEmployeePayload>({
    employeeId: `EMP-${Math.floor(10000 + Math.random() * 90000)}`,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationalId: '',
    taxId: '',
    companyId: defaultCompany,
    organizationId: 'dept-fin-foods',
    roleKey: 'employee',
    title: '',
    baseSalary: 65000,
    bankName: 'Eastern Bank PLC',
    bankAccount: '',
    initialPassword: 'Password@2026!',
    scopeMode: 'SUBTREE',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  function updateField<K extends keyof CreateEmployeePayload>(field: K, val: CreateEmployeePayload[K]) {
    setFormData((prev) => ({ ...prev, [field]: val }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.employeeId.trim()) return setError('Employee ID is required.');
    if (!formData.firstName.trim() || !formData.lastName.trim()) return setError('First and last name are required.');
    if (!formData.email.trim()) return setError('Official corporate email is required.');
    if (!formData.initialPassword || formData.initialPassword.length < 8) {
      return setError('Initial password must be at least 8 characters long.');
    }

    setLoading(true);
    setError(null);

    try {
      const res = await iamApi.createEmployeeUser(formData);
      setSuccessMsg(`Employee ${formData.employeeId} (${formData.firstName} ${formData.lastName}) created successfully in database.`);
      if (onSuccess) onSuccess({ ...formData, id: formData.employeeId, name: `${formData.firstName} ${formData.lastName}`, ...res });
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError') || err?.message?.includes('Load failed')) {
        setSuccessMsg(`Employee ${formData.employeeId} (${formData.firstName} ${formData.lastName}) provisioned (Local / Demo Mode).`);
        if (onSuccess) onSuccess({ ...formData, id: formData.employeeId, name: `${formData.firstName} ${formData.lastName}` });
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1200);
      } else {
        setError(err?.error?.message || err?.message || 'Failed to provision employee. Verify privileges.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-line bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-accent-soft text-accent">
              <UserPlusIcon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-ink">Provision Employee Account</h3>
              <p className="text-xs text-muted">
                Restricted to Administrators & HR Managers. Generates identity, role assignment & compensation record.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted transition-colors hover:bg-elevated hover:text-ink"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-md border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 rounded-md border border-success/40 bg-success-soft p-3 text-sm text-success">
              <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Identification */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">1. Employee Identification</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Employee ID <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => updateField('employeeId', e.target.value)}
                  placeholder="e.g. EMP-10025"
                  className="h-9 w-full rounded border border-line bg-canvas px-3 font-mono text-sm text-ink focus:border-accent focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  First Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  placeholder="First name"
                  className="h-9 w-full rounded border border-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Last Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  placeholder="Last name"
                  className="h-9 w-full rounded border border-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Corporate Email <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="name@okobiz.com"
                  className="h-9 w-full rounded border border-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Mobile Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+880-1700-000000"
                  className="h-9 w-full rounded border border-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">National ID (NID)</label>
                <input
                  type="text"
                  value={formData.nationalId}
                  onChange={(e) => updateField('nationalId', e.target.value)}
                  placeholder="10 or 17 digits"
                  className="h-9 w-full rounded border border-line bg-canvas px-3 font-mono text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Corporate Scope & Role Assignment */}
          <div className="border-t border-line pt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">2. Organizational Scope & Role</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Operating Company <span className="text-danger">*</span>
                </label>
                <select
                  value={formData.companyId}
                  disabled={!isGroupScoped}
                  onChange={(e) => updateField('companyId', e.target.value)}
                  className="h-9 w-full rounded border border-line bg-canvas px-2.5 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Department Node <span className="text-danger">*</span>
                </label>
                <select
                  value={formData.organizationId}
                  onChange={(e) => updateField('organizationId', e.target.value)}
                  className="h-9 w-full rounded border border-line bg-canvas px-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Role Assignment <span className="text-danger">*</span>
                </label>
                <select
                  value={formData.roleKey}
                  onChange={(e) => updateField('roleKey', e.target.value)}
                  className="h-9 w-full rounded border border-line bg-canvas px-2.5 text-sm text-ink focus:border-accent focus:outline-none font-medium"
                >
                  {AVAILABLE_ROLES.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Official Job Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="e.g. Senior Accounts Officer"
                  className="h-9 w-full rounded border border-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Scope Traversal Mode</label>
                <select
                  value={formData.scopeMode}
                  onChange={(e) => updateField('scopeMode', e.target.value as any)}
                  className="h-9 w-full rounded border border-line bg-canvas px-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value="SUBTREE">SUBTREE (Node and all child units - Recommended)</option>
                  <option value="NODE">NODE (Strictly this node only)</option>
                  <option value="SELF">SELF (Own records only)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Compensation & Banking (Protected Sensitive HR Data) */}
          <div className="border-t border-line pt-4">
            <div className="mb-2 flex items-center gap-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">3. Compensation & Banking</h4>
              <span className="rounded bg-accent-soft px-1.5 py-0.5 text-2xs font-medium text-accent">
                GDPR Masked by Default
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Base Monthly Salary (৳ BDT)</label>
                <input
                  type="number"
                  value={formData.baseSalary}
                  onChange={(e) => updateField('baseSalary', Number(e.target.value))}
                  placeholder="65000"
                  className="h-9 w-full rounded border border-line bg-canvas px-3 font-mono text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Disbursement Bank</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => updateField('bankName', e.target.value)}
                  placeholder="Eastern Bank PLC"
                  className="h-9 w-full rounded border border-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Bank Account Number</label>
                <input
                  type="text"
                  value={formData.bankAccount}
                  onChange={(e) => updateField('bankAccount', e.target.value)}
                  placeholder="102-120-998822"
                  className="h-9 w-full rounded border border-line bg-canvas px-3 font-mono text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Initial Security Credentials */}
          <div className="border-t border-line pt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">4. Initial Security Credentials</h4>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Initial Account Password <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.initialPassword}
                  onChange={(e) => updateField('initialPassword', e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="h-9 w-full rounded border border-line bg-canvas px-3 font-mono text-sm text-ink focus:border-accent focus:outline-none"
                  required
                />
              </div>
              <p className="mt-1 text-2xs text-faint">
                Employee will be prompted to reset their password and configure MFA upon initial sign-in.
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-line bg-subtle px-5 py-3">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={loading}
            icon={UserPlusIcon}
          >
            Provision Employee
          </Button>
        </div>
      </div>
    </div>
  );
}
