import React, { useState } from 'react';
import { XIcon, UserCogIcon, AlertTriangleIcon } from 'lucide-react';
import { Button } from './ui/Button';
import { createDelegation } from '../data/operations';
import { employees } from '../data/people';
import { recordAuditEvent } from '../data/system';
import { useApp } from '../contexts/AppContext';
import type { ApprovalDomain, DelegationScope } from '../types';

interface DelegationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SCOPE_OPTIONS: DelegationScope[] = ['all', 'Procurement', 'Finance', 'HR', 'Operations'];

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISODate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function DelegationModal({ isOpen, onClose, onSuccess }: DelegationModalProps) {
  const { role } = useApp();
  const currentUserEmployee = employees.find((e) => e.name === role.user);

  const [delegateeName, setDelegateeName] = useState('');
  const [startDate, setStartDate] = useState(todayISODate());
  const [endDate, setEndDate] = useState(addDaysISODate(7));
  const [scope, setScope] = useState<DelegationScope>('all');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const delegateOptions = employees.filter((e) => e.name !== role.user);
  const canSubmit = delegateeName.trim().length > 0 && startDate && endDate;

  const handleClose = () => {
    setDelegateeName('');
    setReason('');
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      const delegatee = employees.find((emp) => emp.name === delegateeName);
      const rule = createDelegation({
        originalApproverId: currentUserEmployee?.id || role.user || 'unknown',
        originalApproverName: role.user || 'Unknown User',
        delegateeId: delegatee?.id || delegateeName,
        delegateeName,
        startDate,
        endDate,
        scope,
        reason: reason.trim() || undefined,
        createdBy: role.user || 'Unknown User'
      });

      recordAuditEvent({
        user: role.user || 'Unknown User',
        action: 'CREATE_APPROVAL_DELEGATION',
        resource: `${rule.id} → ${delegateeName}`,
        company: currentUserEmployee?.company || 'ABC GROUP',
        before: '—',
        after: `${scope} approvals delegated to ${delegateeName}, ${startDate} to ${endDate}`
      });

      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create delegation.');
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
              <UserCogIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Set Up Delegation</h2>
              <p className="text-xs text-muted">Hand off your approval authority for a fixed window.</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Delegate to</label>
            <select
              value={delegateeName}
              onChange={(e) => setDelegateeName(e.target.value)}
              required
              className="h-9 w-full rounded border border-line bg-canvas px-2.5 text-sm text-ink focus:border-accent focus:outline-none"
            >
              <option value="">Select a colleague...</option>
              {delegateOptions.map((emp) => (
                <option key={emp.id} value={emp.name}>{emp.name} — {emp.position}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="h-9 w-full rounded border border-line bg-canvas px-2.5 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="h-9 w-full rounded border border-line bg-canvas px-2.5 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as ApprovalDomain | 'all')}
              className="h-9 w-full rounded border border-line bg-canvas px-2.5 text-sm text-ink focus:border-accent focus:outline-none"
            >
              {SCOPE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === 'all' ? 'Everything I can approve' : s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual leave, offsite travel..."
              className="h-9 w-full rounded border border-line bg-canvas px-2.5 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
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
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              Create Delegation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
