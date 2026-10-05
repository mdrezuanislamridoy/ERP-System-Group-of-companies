import React, { useState } from 'react';
import { XIcon, WalletIcon, AlertTriangleIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { getSalaryStructure, updateSalaryStructure, type SalaryStructure } from '../../data/payroll';
import { recordAuditEvent } from '../../data/system';
import { useApp } from '../../contexts/AppContext';

interface SalaryStructureModalProps {
  isOpen: boolean;
  employeeId: string;
  employeeName: string;
  companyName: string;
  onClose: () => void;
  onSuccess?: (structure: SalaryStructure) => void;
}

type ComponentKey = 'basic' | 'houseRent' | 'medical' | 'conveyance' | 'other';

const FIELDS: Array<{ key: ComponentKey; label: string }> = [
  { key: 'basic', label: 'Basic Salary' },
  { key: 'houseRent', label: 'House Rent Allowance' },
  { key: 'medical', label: 'Medical Allowance' },
  { key: 'conveyance', label: 'Conveyance Allowance' },
  { key: 'other', label: 'Other Allowance' },
];

export function SalaryStructureModal({ isOpen, employeeId, employeeName, companyName, onClose, onSuccess }: SalaryStructureModalProps) {
  const { role } = useApp();
  const current = getSalaryStructure(employeeId);

  const [values, setValues] = useState({
    basic: current?.basic ?? 0,
    houseRent: current?.houseRent ?? 0,
    medical: current?.medical ?? 0,
    conveyance: current?.conveyance ?? 0,
    other: current?.other ?? 0,
  });
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const gross = values.basic + values.houseRent + values.medical + values.conveyance + values.other;

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = updateSalaryStructure(employeeId, values, role.user || 'Unknown User');

      recordAuditEvent({
        user: role.user || 'Unknown User',
        action: 'SALARY_STRUCTURE_UPDATED',
        resource: `${employeeName} (${employeeId})`,
        company: companyName,
        before: current ? `Gross ৳${current.grossMonthly.toLocaleString('en-IN')}` : '—',
        after: `Gross ৳${updated.grossMonthly.toLocaleString('en-IN')}`,
      });

      if (onSuccess) onSuccess(updated);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update salary structure.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <WalletIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Edit Salary Structure</h2>
              <p className="text-xs text-muted">{employeeName} · {companyName}</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">{f.label}</label>
              <input
                type="number"
                min={0}
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: Number(e.target.value) || 0 }))}
                required
                className="h-9 w-full rounded border border-line bg-canvas px-2.5 text-sm text-ink font-mono tabular focus:border-accent focus:outline-none"
              />
            </div>
          ))}

          <div className="flex items-center justify-between rounded-lg border border-line bg-subtle px-3 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Gross Monthly</span>
            <span className="font-mono text-base font-bold text-ink tabular">৳{gross.toLocaleString('en-IN')}</span>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger-soft/30 p-3.5">
              <AlertTriangleIcon className="h-4 w-4 shrink-0 text-danger mt-0.5" />
              <p className="text-xs text-ink">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save salary structure
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
