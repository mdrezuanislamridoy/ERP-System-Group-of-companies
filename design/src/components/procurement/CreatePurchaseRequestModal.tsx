import React, { useMemo, useState } from 'react';
import { AlertTriangleIcon, CheckCircle2Icon, XIcon, ShoppingCartIcon, ScaleIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { createPurchaseRequest } from '../../data/operations';
import { companies, costCenters, departments, getCostCenterBudget } from '../../data/organization';
import { recordAuditEvent } from '../../data/system';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';
import type { PurchaseRequest } from '../../types';

interface CreatePurchaseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (request: PurchaseRequest) => void;
  initialCompanyId?: string | null;
}

function formatBDT(value: number): string {
  return `৳${Math.round(value).toLocaleString('en-IN')}`;
}

export function CreatePurchaseRequestModal({
  isOpen,
  onClose,
  onSuccess,
  initialCompanyId
}: CreatePurchaseRequestModalProps) {
  const { role } = useApp();

  const defaultCompanyId = initialCompanyId && initialCompanyId !== '*' ? initialCompanyId : companies[0].id;
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(defaultCompanyId);
  const [costCenterId, setCostCenterId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [requester, setRequester] = useState(role.user || 'Procurement Officer');
  const [priority, setPriority] = useState<'Low' | 'Normal' | 'High' | 'Critical'>('Normal');
  const [amount, setAmount] = useState('');

  if (!isOpen) return null;

  const targetCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0];

  const availableCostCenters = useMemo(
    () =>
      costCenters.filter(
        (cc) =>
          cc.companyId === selectedCompanyId ||
          cc.companyId === selectedCompanyId.replace(/^c-/, 'le-') ||
          cc.companyId === selectedCompanyId.replace(/^le-/, 'c-')
      ),
    [selectedCompanyId]
  );

  const handleCompanyChange = (coId: string) => {
    setSelectedCompanyId(coId);
    setCostCenterId('');
    setDepartment('');
  };

  const handleCostCenterChange = (ccId: string) => {
    setCostCenterId(ccId);
    const cc = costCenters.find((c) => c.id === ccId);
    const dept = cc?.departmentId ? departments.find((d) => d.id === cc.departmentId) : undefined;
    setDepartment(dept?.name || '');
  };

  const numericAmount = parseFloat(amount) || 0;
  const budget = costCenterId ? getCostCenterBudget(costCenterId) : undefined;
  const wouldOverrun = Boolean(budget && numericAmount > budget.availableAmount);
  const overrunBy = wouldOverrun && budget ? numericAmount - budget.availableAmount : 0;

  const canSubmit = title.trim().length > 0 && requester.trim().length > 0 && department.trim().length > 0 && numericAmount > 0;

  const handleClose = () => {
    setTitle('');
    setDepartment('');
    setAmount('');
    setCostCenterId('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const newRequest = createPurchaseRequest({
      title: title.trim(),
      requester: requester.trim(),
      department: department.trim(),
      company: targetCompany.name,
      amount: numericAmount,
      priority,
      costCenterId: costCenterId || undefined
    });

    recordAuditEvent({
      user: role.user || requester,
      action: 'CREATE_PURCHASE_REQUEST',
      resource: `${newRequest.id} [${targetCompany.name}]`,
      company: targetCompany.name,
      before: '—',
      after: newRequest.budgetOverrun
        ? `Submitted ${formatBDT(newRequest.amount)} — BUDGET OVERRUN by ${formatBDT(newRequest.overrunAmount || 0)}, escalated to ${newRequest.stage}`
        : `Submitted ${formatBDT(newRequest.amount)} against ${newRequest.costCenterCode || 'no cost center'}`
    });

    if (onSuccess) onSuccess(newRequest);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <ShoppingCartIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Create Purchase Request</h2>
              <p className="text-xs text-muted">
                Validated live against the Cost Center's remaining budget headroom before it's raised.
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-subtle/70 p-3.5 rounded-xl border border-line">
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Legal Entity</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs font-medium text-ink focus:border-accent focus:outline-none"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Cost Center</label>
              <select
                value={costCenterId}
                onChange={(e) => handleCostCenterChange(e.target.value)}
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
              >
                <option value="">— Unbudgeted (no headroom check) —</option>
                {availableCostCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>{cc.code} — {cc.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Subject</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Raw material procurement — Q4"
                required
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Production"
                required
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Requested by</label>
              <input
                type="text"
                value={requester}
                onChange={(e) => setRequester(e.target.value)}
                required
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Amount (৳)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-right font-mono text-xs text-ink focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Live Cost Center Budget Headroom */}
          {costCenterId && budget ? (
            <div
              className={cn(
                'rounded-xl border p-4 transition-all duration-150',
                wouldOverrun ? 'border-danger/40 bg-danger-soft/30' : 'border-success/30 bg-success-soft/30'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {wouldOverrun ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger">
                      <AlertTriangleIcon className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
                      <CheckCircle2Icon className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-ink">
                      {wouldOverrun
                        ? `Budget Overrun: ${formatBDT(overrunBy)}`
                        : 'Within Cost Center headroom'}
                    </p>
                    <p className="text-2xs text-muted mt-0.5">
                      {budget.costCenterCode} — {budget.costCenterName} · FY{budget.fiscalYear}
                      {wouldOverrun && ' · Will auto-escalate to Company CFO for variance sign-off.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-5 text-xs font-mono">
                  <div>
                    <span className="text-2xs uppercase text-faint block">Allocated</span>
                    <span className="font-bold text-ink">{formatBDT(budget.allocatedAmount)}</span>
                  </div>
                  <div>
                    <span className="text-2xs uppercase text-faint block">Consumed</span>
                    <span className="font-bold text-ink">{formatBDT(budget.consumedAmount)}</span>
                  </div>
                  <div>
                    <span className="text-2xs uppercase text-faint block">Committed</span>
                    <span className="font-bold text-ink">{formatBDT(budget.encumberedAmount)}</span>
                  </div>
                  <div className="border-l border-line pl-5">
                    <span className="text-2xs uppercase text-faint block">Available</span>
                    <span className={cn('font-bold', budget.availableAmount >= 0 ? 'text-success' : 'text-danger')}>
                      {formatBDT(budget.availableAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl border border-line bg-subtle/60 p-3.5">
              <ScaleIcon className="h-4 w-4 shrink-0 text-muted mt-0.5" />
              <p className="text-xs text-muted">
                No Cost Center selected — this request will not be validated against a budget and skips overrun
                escalation.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={wouldOverrun ? 'danger' : 'primary'}
              disabled={!canSubmit}
              title={wouldOverrun ? 'Will submit and escalate to Company CFO for variance sign-off' : 'Submit purchase request'}
            >
              {wouldOverrun ? 'Submit & Escalate to CFO' : 'Submit Purchase Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
