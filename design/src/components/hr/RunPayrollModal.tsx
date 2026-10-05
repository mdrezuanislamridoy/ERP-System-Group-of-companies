import React, { useState } from 'react';
import { XIcon, PlayIcon, AlertTriangleIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { employees } from '../../data/people';
import { runPayroll, periodLabel, type PayrollRun } from '../../data/payroll';
import { recordAuditEvent } from '../../data/system';
import { useApp } from '../../contexts/AppContext';

interface RunPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (run: PayrollRun) => void;
  /** When the caller isn't group-scoped, the company field is locked to this value. */
  lockedCompany?: string;
  groupScoped?: boolean;
}

const MONTH_OPTIONS = [
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
];

export function RunPayrollModal({ isOpen, onClose, onSuccess, lockedCompany, groupScoped }: RunPayrollModalProps) {
  const { role } = useApp();
  const allCompanies = Array.from(new Set(employees.map((e) => e.company)));

  const [company, setCompany] = useState(lockedCompany || allCompanies[0]);
  const [month, setMonth] = useState(9);
  const [year] = useState(2026);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const run = runPayroll(company, year, month, role.user || 'Unknown User');

      recordAuditEvent({
        user: role.user || 'Unknown User',
        action: 'PAYROLL_RUN_GENERATED',
        resource: `${run.id} · ${run.periodLabel}`,
        company,
        before: '—',
        after: `Generated payroll for ${run.employeeCount} employees · Net ৳${run.totalNet.toLocaleString('en-IN')}`,
      });

      if (onSuccess) onSuccess(run);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run payroll.');
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
              <PlayIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Run Payroll</h2>
              <p className="text-xs text-muted">Generates payslips for every salaried employee in scope.</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Company</label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              disabled={!groupScoped}
              required
              className="h-9 w-full rounded border border-line bg-canvas px-2.5 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60"
            >
              {(groupScoped ? allCompanies : [lockedCompany || allCompanies[0]]).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Pay period</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 w-full rounded border border-line bg-canvas px-2.5 text-sm text-ink focus:border-accent focus:outline-none"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{periodLabel(year, m.value)}</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-muted">
            This computes gross pay, provident fund, tax withholding and loss-of-pay deductions from each
            employee's salary structure and attendance for the selected period. The run starts as{' '}
            <strong className="text-ink">Processing</strong> until finalized.
          </p>

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
              Run payroll
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
