import React, { useEffect, useState } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon, ShieldAlertIcon, ClockIcon, AlertCircleIcon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { recordAuditEvent } from '../../data/system';
import { cn } from '../../utils/cn';

export interface SensitiveFieldProps {
  value: string | number | undefined | null;
  permission: string;
  domain?: 'salary' | 'nid' | 'bank' | 'tin' | 'general';
  label?: string;
  resourceName?: string;
  companyName?: string;
  format?: 'currency' | 'nid' | 'bank' | 'tin' | 'text';
  mono?: boolean;
  className?: string;
}

const COMMON_REASONS = [
  'Employee Verification & Onboarding',
  'Statutory Compliance & Tax Audit',
  'Payroll Dispute & Compensation Review',
  'Banking & Inter-Company Settlement',
];

export function SensitiveField({
  value,
  permission,
  domain = 'general',
  label = 'Sensitive Data',
  resourceName = 'Employee Record',
  companyName,
  format = 'text',
  mono = false,
  className = '',
}: SensitiveFieldProps) {
  const { can, role, companyName: currentCompanyName } = useApp();
  const effectiveCompany = companyName ?? currentCompanyName ?? 'ABC Group';

  const [isRevealed, setIsRevealed] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reason, setReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [denialNotice, setDenialNotice] = useState<string | null>(null);

  // Auto-remask countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRevealed && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setIsRevealed(false);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!isRevealed) {
      setCountdown(30);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRevealed, countdown]);

  if (value === undefined || value === null || value === '') {
    return <span className="text-muted">—</span>;
  }

  // Format unmasked value
  const displayClearValue = (): string => {
    if (format === 'currency') {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      return isNaN(num) ? String(value) : `৳${num.toLocaleString('en-IN')}`;
    }
    return String(value);
  };

  // Generate masked value
  const displayMaskedValue = (): string => {
    const raw = String(value).trim();
    if (format === 'currency') {
      return '৳ ••••••••';
    }
    if (format === 'nid') {
      const parts = raw.split('-');
      if (parts.length > 1) {
        const last = parts[parts.length - 1];
        return `••••-••••-${last}`;
      }
      return raw.length > 4 ? `••••-••••-${raw.slice(-4)}` : '••••••••••••';
    }
    if (format === 'bank') {
      return raw.length > 4 ? `••••••••${raw.slice(-4)}` : '••••••••••••';
    }
    if (format === 'tin') {
      return raw.length > 4 ? `••••••••${raw.slice(-4)}` : '••••••••••••';
    }
    return '••••••••••••';
  };

  const handleEyeClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isRevealed) {
      // Manual lock / remask
      setIsRevealed(false);
      setCountdown(30);
      return;
    }

    // Permission Verification
    if (!can(permission)) {
      const deniedMsg = `Access Denied: Missing privileged permission '${permission}'`;
      setDenialNotice(deniedMsg);

      recordAuditEvent({
        user: role.user || 'Unknown User',
        action: 'SENSITIVE_FIELD_DENIAL',
        resource: `${resourceName} [${label}]`,
        company: effectiveCompany,
        before: 'Masked',
        after: `Blocked: Missing elevated permission '${permission}'`,
      });

      setTimeout(() => setDenialNotice(null), 4000);
      return;
    }

    // Has permission -> open reason confirmation modal
    setShowConfirmModal(true);
  };

  const handleConfirmReveal = () => {
    const finalReason = customReason.trim() || reason;

    // Log immutable audit event
    recordAuditEvent({
      user: role.user || 'Authorized Staff',
      action: 'VIEW_SENSITIVE_FIELD',
      resource: `${resourceName} [${label}]`,
      company: effectiveCompany,
      before: 'Masked (••••••••)',
      after: `Unmasked value for 30s. Reason: "${finalReason}" | Permission: ${permission}`,
    });

    setShowConfirmModal(false);
    setIsRevealed(true);
    setCountdown(30);
    setCustomReason('');
  };

  return (
    <div className={cn('relative inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'transition-colors duration-150',
          mono && 'font-mono tabular',
          isRevealed ? 'text-ink font-semibold bg-accent/10 px-1.5 py-0.5 rounded' : 'text-muted select-none'
        )}
      >
        {isRevealed ? displayClearValue() : displayMaskedValue()}
      </span>

      <button
        type="button"
        onClick={handleEyeClick}
        aria-label={isRevealed ? `Mask ${label}` : `Unmask ${label}`}
        title={isRevealed ? `Mask immediately (Auto-masks in ${countdown}s)` : `Elevated authorization required to unmask ${label}`}
        className={cn(
          'inline-flex items-center justify-center h-6 w-6 rounded text-muted hover:text-ink hover:bg-surface transition-colors duration-100',
          isRevealed ? 'text-accent bg-accent/10' : 'hover:bg-surface'
        )}
      >
        {isRevealed ? <EyeOffIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
      </button>

      {/* 30s Countdown Indicator when Revealed */}
      {isRevealed && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            setIsRevealed(false);
            setCountdown(30);
          }}
          title="Click to re-mask immediately"
          className="inline-flex cursor-pointer items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-mono font-medium bg-warning-soft text-warning border border-warning/30 hover:bg-warning/20 transition-colors"
        >
          <ClockIcon className="h-2.5 w-2.5 animate-pulse" />
          {countdown}s
          <LockIcon className="h-2.5 w-2.5 ml-0.5 opacity-80" />
        </span>
      )}

      {/* Denial Toast/Tooltip */}
      {denialNotice && (
        <div
          role="alert"
          className="absolute left-0 top-full mt-1 z-50 flex items-center gap-1.5 whitespace-nowrap rounded border border-danger/40 bg-danger-soft px-2.5 py-1 text-xs text-danger shadow-pop animate-in fade-in"
        >
          <ShieldAlertIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{denialNotice}</span>
        </div>
      )}

      {/* Reason Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-line bg-surface p-5 shadow-pop animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <LockIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-ink">Elevated Access Authorization</h3>
                <p className="mt-0.5 text-xs text-muted">
                  Field: <strong className="text-ink">{label}</strong> for {resourceName}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-line bg-subtle p-3 text-xs text-muted space-y-1">
              <p className="flex items-center gap-1.5 text-ink font-medium">
                <AlertCircleIcon className="h-3.5 w-3.5 text-accent" />
                GDPR & Data Protection Policy (SEC-03)
              </p>
              <p>
                Unmasking this data is logged to an immutable security audit event with your identity, IP, and reason.
                The field will automatically re-mask after <strong>30 seconds</strong>.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-faint">
                Select Business Justification
              </label>
              <div className="space-y-1.5">
                {COMMON_REASONS.map((r) => (
                  <label
                    key={r}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors',
                      reason === r && !customReason
                        ? 'border-accent bg-accent-soft/30 text-ink font-medium'
                        : 'border-line text-muted hover:border-line hover:text-ink'
                    )}
                  >
                    <input
                      type="radio"
                      name="accessReason"
                      checked={reason === r && !customReason}
                      onChange={() => {
                        setReason(r);
                        setCustomReason('');
                      }}
                      className="accent-[#3B82F6]"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>

              <div className="pt-1">
                <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                  Or specify other reason:
                </label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="e.g. Case #REF-9021 Investigation"
                  className="h-8 w-full rounded border border-line bg-canvas px-2.5 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded px-3 py-1.5 text-xs font-medium text-muted hover:bg-canvas hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReveal}
                className="inline-flex items-center gap-1.5 rounded bg-accent px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-accent/90 transition-colors"
              >
                <EyeIcon className="h-3.5 w-3.5" />
                Authorize & Reveal (30s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
