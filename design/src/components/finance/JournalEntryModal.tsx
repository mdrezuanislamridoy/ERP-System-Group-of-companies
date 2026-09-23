import React, { useState } from 'react';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  PlusIcon,
  Trash2Icon,
  XIcon,
  ScaleIcon,
  LockIcon,
  FileSpreadsheetIcon
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
  initialChartOfAccounts,
  validateJournalBalance,
  postJournalEntry,
  getFiscalPeriodForDate,
  isEntryTypeAllowedWhenSoftClosed
} from '../../data/finance';
import { companies, costCenters } from '../../data/organization';
import { recordAuditEvent } from '../../data/system';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';
import type { JournalEntry } from '../../types';

interface LineItemDraft {
  id: string;
  accountCode: string;
  costCenterId: string;
  debit: string;
  credit: string;
  description: string;
}

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (entry: JournalEntry) => void;
  initialCompanyId?: string | null;
}

export function JournalEntryModal({
  isOpen,
  onClose,
  onSuccess,
  initialCompanyId
}: JournalEntryModalProps) {
  const { role, companyName } = useApp();

  const defaultCompanyId = initialCompanyId && initialCompanyId !== '*' ? initialCompanyId : 'c-foods';
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(defaultCompanyId);
  const [voucherDate, setVoucherDate] = useState<string>('2026-09-21');
  const [reference, setReference] = useState<string>('MANUAL-JV-01');
  const [memo, setMemo] = useState<string>('Operating expenditure adjustment and allocation');
  const [voucherType, setVoucherType] = useState<'standard' | 'adjusting' | 'closing' | 'reversing'>('standard');

  // Leaf accounts available for posting
  const postableAccounts = initialChartOfAccounts.filter((a) => a.level === 2);

  // Filter cost centers by selected company
  const availableCostCenters = costCenters.filter(
    (cc) =>
      cc.companyId === selectedCompanyId ||
      cc.companyId === selectedCompanyId.replace(/^c-/, 'le-') ||
      cc.companyId === selectedCompanyId.replace(/^le-/, 'c-')
  );

  const defaultCostCenterId = availableCostCenters[0]?.id || costCenters[0]?.id || 'cc-foods-fin-001';

  // Initial 2 lines for balanced entry
  const [lines, setLines] = useState<LineItemDraft[]>([
    {
      id: 'l-1',
      accountCode: '5110', // Raw Material Consumption
      costCenterId: defaultCostCenterId,
      debit: '250000',
      credit: '0',
      description: 'Production batch allocation'
    },
    {
      id: 'l-2',
      accountCode: '1130', // Inventory Raw Materials
      costCenterId: defaultCostCenterId,
      debit: '0',
      credit: '250000',
      description: 'Savar storage issue'
    }
  ]);

  const [postError, setPostError] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0];

  // Fiscal period lock — live check against the selected posting date & voucher type
  const periodForDate = getFiscalPeriodForDate(voucherDate);
  const periodBlocksPosting = Boolean(
    periodForDate &&
      periodForDate.status !== 'open' &&
      (periodForDate.status === 'hard-closed' || !isEntryTypeAllowedWhenSoftClosed(voucherType))
  );

  const handleCompanyChange = (coId: string) => {
    setSelectedCompanyId(coId);
    const newCenters = costCenters.filter(
      (cc) =>
        cc.companyId === coId ||
        cc.companyId === coId.replace(/^c-/, 'le-') ||
        cc.companyId === coId.replace(/^le-/, 'c-')
    );
    const firstCenter = newCenters[0]?.id || 'cc-foods-fin-001';
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        costCenterId: firstCenter
      }))
    );
  };

  const handleLineChange = (id: string, field: keyof LineItemDraft, value: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        // If typing debit, zero out credit
        if (field === 'debit' && value && parseFloat(value) > 0) {
          return { ...l, debit: value, credit: '0' };
        }
        // If typing credit, zero out debit
        if (field === 'credit' && value && parseFloat(value) > 0) {
          return { ...l, credit: value, debit: '0' };
        }
        return { ...l, [field]: value };
      })
    );
  };

  const handleAddLine = () => {
    const nextId = `l-${Date.now()}`;
    setLines((prev) => [
      ...prev,
      {
        id: nextId,
        accountCode: postableAccounts[0]?.code || '1110',
        costCenterId: defaultCostCenterId,
        debit: '0',
        credit: '0',
        description: memo
      }
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  // Convert to numeric lines for balance validation
  const numericLines = lines.map((l) => ({
    debit: parseFloat(l.debit) || 0,
    credit: parseFloat(l.credit) || 0
  }));

  const balanceCheck = validateJournalBalance(numericLines);
  const allLinesHaveAccount = lines.every((l) => Boolean(l.accountCode));
  const allLinesHaveCostCenter = lines.every((l) => Boolean(l.costCenterId));
  const canSubmit = balanceCheck.balanced && allLinesHaveAccount && allLinesHaveCostCenter && !periodBlocksPosting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setPostError(null);

    const payloadLines = lines.map((l) => {
      const acc = postableAccounts.find((a) => a.code === l.accountCode);
      const cc = costCenters.find((c) => c.id === l.costCenterId);
      return {
        accountCode: l.accountCode,
        accountName: acc?.name || 'Account',
        costCenterId: l.costCenterId,
        costCenterCode: cc?.code || 'CC-GEN',
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description || memo
      };
    });

    try {
      const newVoucher = postJournalEntry({
        date: voucherDate,
        companyId: targetCompany.id,
        companyName: targetCompany.name,
        reference,
        memo,
        type: voucherType,
        createdBy: role.user || 'Finance Officer',
        lines: payloadLines
      });

      recordAuditEvent({
        user: role.user || 'Finance Manager',
        action: 'POST_JOURNAL_VOUCHER',
        resource: `${newVoucher.entryNumber} [${newVoucher.reference}]`,
        company: targetCompany.name,
        before: 'Draft',
        after: `Posted double-entry voucher of ৳${newVoucher.totalDebit.toLocaleString('en-IN')} (${newVoucher.lines.length} lines)`
      });

      if (onSuccess) {
        onSuccess(newVoucher);
      }
      onClose();
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Failed to post journal voucher.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-4xl rounded-2xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <FileSpreadsheetIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Create Manual Journal Voucher</h2>
              <p className="text-xs text-muted">
                Record double-entry General Ledger transaction with strict balance validation (Sum of Debits = Sum of Credits).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Header Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-subtle/70 p-3.5 rounded-xl border border-line">
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Legal Entity
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs font-medium text-ink focus:border-accent focus:outline-none"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Posting Date
              </label>
              <input
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                required
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
              >
              </input>
            </div>

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Reference / Document #
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. INV-9021 / ADJ-01"
                required
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Voucher Type
              </label>
              <select
                value={voucherType}
                onChange={(e) => setVoucherType(e.target.value as any)}
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
              >
                <option value="standard">Standard Journal Voucher</option>
                <option value="adjusting">Adjusting Entry</option>
                <option value="closing">Period Closing Entry</option>
                <option value="reversing">Reversing Entry</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Narration / General Memo
              </label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Detailed business explanation of this financial entry"
                required
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas border-b border-line text-faint uppercase font-semibold text-2xs tracking-wider">
                <tr>
                  <th className="px-3 py-2 w-48">GL Account Code & Title</th>
                  <th className="px-3 py-2 w-44">Cost Center</th>
                  <th className="px-3 py-2">Line Description</th>
                  <th className="px-3 py-2 w-28 text-right">Debit (৳)</th>
                  <th className="px-3 py-2 w-28 text-right">Credit (৳)</th>
                  <th className="px-2 py-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {lines.map((l, index) => (
                  <tr key={l.id} className="hover:bg-subtle/40 transition-colors">
                    {/* Account Selector */}
                    <td className="p-2">
                      <select
                        value={l.accountCode}
                        onChange={(e) => handleLineChange(l.id, 'accountCode', e.target.value)}
                        className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none font-mono"
                      >
                        {postableAccounts.map((acc) => (
                          <option key={acc.code} value={acc.code}>
                            {acc.code} — {acc.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Cost Center Selector */}
                    <td className="p-2">
                      <select
                        value={l.costCenterId}
                        onChange={(e) => handleLineChange(l.id, 'costCenterId', e.target.value)}
                        className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                      >
                        {availableCostCenters.map((cc) => (
                          <option key={cc.id} value={cc.id}>
                            {cc.code} — {cc.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Description */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={l.description}
                        onChange={(e) => handleLineChange(l.id, 'description', e.target.value)}
                        placeholder="Line item note..."
                        className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                      />
                    </td>

                    {/* Debit Input */}
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={l.debit}
                        onChange={(e) => handleLineChange(l.id, 'debit', e.target.value)}
                        className={cn(
                          'h-8 w-full rounded border border-line bg-canvas px-2 text-right font-mono text-xs text-ink focus:border-accent focus:outline-none',
                          parseFloat(l.debit) > 0 && 'font-semibold text-accent'
                        )}
                      />
                    </td>

                    {/* Credit Input */}
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={l.credit}
                        onChange={(e) => handleLineChange(l.id, 'credit', e.target.value)}
                        className={cn(
                          'h-8 w-full rounded border border-line bg-canvas px-2 text-right font-mono text-xs text-ink focus:border-accent focus:outline-none',
                          parseFloat(l.credit) > 0 && 'font-semibold text-ink'
                        )}
                      />
                    </td>

                    {/* Delete Action */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(l.id)}
                        disabled={lines.length <= 2}
                        className="p-1 rounded text-muted hover:text-danger hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={lines.length <= 2 ? 'Double-entry requires at least 2 lines' : 'Delete line'}
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <Button type="button" size="xs" variant="secondary" icon={PlusIcon} onClick={handleAddLine}>
              Add Voucher Line
            </Button>
            <span className="text-2xs text-muted">
              Standard Double-Entry Posting Standard (Debit = Credit)
            </span>
          </div>

          {/* Double-Entry Balance Validator Box */}
          <div
            className={cn(
              'rounded-xl border p-4 transition-all duration-150',
              balanceCheck.balanced
                ? 'border-success/30 bg-success-soft/30'
                : 'border-warning/40 bg-warning-soft/30'
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {balanceCheck.balanced ? (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
                    <CheckCircle2Icon className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
                    <ScaleIcon className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-ink">
                    {balanceCheck.balanced
                      ? 'Mathematical Balance Verified'
                      : 'Double-Entry Balance Required'}
                  </p>
                  <p className="text-2xs text-muted mt-0.5">{balanceCheck.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs font-mono">
                <div>
                  <span className="text-2xs uppercase text-faint block">Total Debits</span>
                  <span className="font-bold text-accent">
                    ৳{balanceCheck.totalDebit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-2xs uppercase text-faint block">Total Credits</span>
                  <span className="font-bold text-ink">
                    ৳{balanceCheck.totalCredit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="border-l border-line pl-4">
                  <span className="text-2xs uppercase text-faint block">Difference</span>
                  <span
                    className={cn(
                      'font-bold',
                      balanceCheck.difference === 0 ? 'text-success' : 'text-danger'
                    )}
                  >
                    ৳{balanceCheck.difference.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fiscal Period Lock Warning */}
          {periodForDate && periodForDate.status !== 'open' && (
            <div
              className={cn(
                'flex items-start gap-2.5 rounded-xl border p-3.5',
                periodBlocksPosting ? 'border-danger/40 bg-danger-soft/30' : 'border-warning/40 bg-warning-soft/30'
              )}
            >
              <LockIcon className={cn('h-4 w-4 shrink-0 mt-0.5', periodBlocksPosting ? 'text-danger' : 'text-warning')} />
              <p className="text-xs text-ink">
                Fiscal period <strong>{periodForDate.label}</strong> is{' '}
                {periodForDate.status === 'hard-closed' ? 'hard closed' : 'soft closed'}.{' '}
                {periodForDate.status === 'hard-closed'
                  ? 'No postings are permitted for this period.'
                  : periodBlocksPosting
                  ? 'Only Adjusting, Period Closing or Reversing entries may post while soft closed — change the Voucher Type above.'
                  : 'Posting is allowed for this correction entry type while soft closed.'}
              </p>
            </div>
          )}

          {postError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger-soft/30 p-3.5">
              <AlertTriangleIcon className="h-4 w-4 shrink-0 text-danger mt-0.5" />
              <p className="text-xs text-ink">{postError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!canSubmit}
              title={
                periodBlocksPosting
                  ? 'Cannot post voucher: target fiscal period is closed'
                  : !canSubmit
                  ? 'Cannot post voucher: Debits and Credits must balance'
                  : 'Post journal voucher'
              }
            >
              Post Journal Voucher
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
