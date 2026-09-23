import React, { useState, useEffect } from 'react';
import {
  ShieldAlertIcon,
  XIcon,
  KeyRoundIcon,
  SmartphoneIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  LockIcon,
  TimerIcon,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import { recordAuditEvent } from '../../data/system';

interface StepUpAuthModalProps {
  isOpen: boolean;
  title: string;
  actionDescription: string;
  resourceName?: string;
  companyName?: string;
  requiredJustification?: boolean;
  onSuccess: (justification: string) => void;
  onClose: () => void;
}

export function StepUpAuthModal({
  isOpen,
  title,
  actionDescription,
  resourceName = 'Administrative Security Action',
  companyName = 'ABC GROUP',
  requiredJustification = false,
  onSuccess,
  onClose,
}: StepUpAuthModalProps) {
  const { user } = useAuth();
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(30);

  useEffect(() => {
    if (!isOpen) return;
    setPassword('');
    setOtp('');
    setJustification('');
    setError(null);
    setIsSubmitting(false);
    setOtpSecondsLeft(30);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || authMethod !== 'otp') return;
    const interval = setInterval(() => {
      setOtpSecondsLeft((prev) => (prev > 1 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, authMethod]);

  if (!isOpen) return null;

  const validPassword = user?.password || 'password123';
  const validOtp = '123456';

  const handleQuickFillPassword = () => {
    setPassword(validPassword);
    setError(null);
  };

  const handleQuickFillOtp = () => {
    setOtp(validOtp);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (requiredJustification && !justification.trim()) {
      setError('A mandatory compliance justification reason is required for this action.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      let isVerified = false;

      if (authMethod === 'password') {
        if (password === validPassword) {
          isVerified = true;
        } else {
          setError('Invalid credentials. Please re-enter your current password.');
        }
      } else {
        if (otp === validOtp) {
          isVerified = true;
        } else {
          setError('Invalid OTP code. Please verify the code in your Authenticator app (or use demo code 123456).');
        }
      }

      if (isVerified) {
        // Record tamper-evident step-up verification event in the cryptographic chain
        recordAuditEvent({
          user: user?.personName || 'Administrator',
          action: 'STEP_UP_VERIFIED',
          resource: resourceName,
          company: companyName,
          justificationReason: justification.trim() || `Step-Up Auth verified via ${authMethod.toUpperCase()} for ${title}`,
          beforeState: {
            stepUpVerified: false,
            action: actionDescription,
          },
          afterState: {
            stepUpVerified: true,
            method: authMethod,
            timestamp: new Date().toISOString(),
            action: actionDescription,
          },
        });

        setIsSubmitting(false);
        onSuccess(justification.trim());
        onClose();
      } else {
        setIsSubmitting(false);
      }
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldAlertIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                <Badge tone="warning">Step-Up Auth</Badge>
              </div>
              <p className="text-xs text-muted mt-0.5">High-Risk Operation · Requires Elevated Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors"
            aria-label="Close step up auth"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Action Context Box */}
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
          <div className="flex items-start gap-2.5">
            <LockIcon className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-ink">{actionDescription}</p>
              <p className="text-muted mt-0.5">
                Target: <span className="font-mono text-ink font-medium">{resourceName}</span>
              </p>
              <p className="text-faint mt-1 text-2xs">
                To prevent unauthorized execution, confirm your identity before this change is applied and sealed in the
                SHA-256 audit log.
              </p>
            </div>
          </div>
        </div>

        {/* Verification Method Tabs */}
        <div className="mt-4 flex rounded-lg border border-line bg-canvas p-1">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('password');
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all ${
              authMethod === 'password'
                ? 'bg-surface text-ink shadow-xs font-semibold'
                : 'text-muted hover:text-ink'
            }`}
          >
            <KeyRoundIcon className="h-3.5 w-3.5" />
            Account Password
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('otp');
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all ${
              authMethod === 'otp'
                ? 'bg-surface text-ink shadow-xs font-semibold'
                : 'text-muted hover:text-ink'
            }`}
          >
            <SmartphoneIcon className="h-3.5 w-3.5" />
            MFA / TOTP Authenticator
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {authMethod === 'password' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-2xs font-semibold uppercase tracking-wider text-muted">
                  Confirm Current Password
                </label>
                <button
                  type="button"
                  onClick={handleQuickFillPassword}
                  className="text-2xs font-medium text-accent hover:underline"
                >
                  Quick fill demo (password123)
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                autoFocus
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-2xs font-semibold uppercase tracking-wider text-muted">
                  6-Digit Authenticator Code
                </label>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-2xs text-muted font-mono">
                    <TimerIcon className="h-3 w-3 text-amber-500" />
                    {otpSecondsLeft}s
                  </span>
                  <button
                    type="button"
                    onClick={handleQuickFillOtp}
                    className="text-2xs font-medium text-accent hover:underline"
                  >
                    Quick fill (123456)
                  </button>
                </div>
              </div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-center font-mono text-lg tracking-widest text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
          )}

          {/* Mandatory or Optional Justification */}
          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Audit Justification Reason {requiredJustification ? <span className="text-danger">*</span> : '(Optional)'}
            </label>
            <input
              type="text"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="e.g., Security maintenance, device de-provisioning, or audit sign-off"
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger animate-in fade-in">
              <AlertCircleIcon className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-line pt-4">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              type="submit"
              disabled={isSubmitting || (authMethod === 'password' ? !password : otp.length !== 6)}
            >
              {isSubmitting ? 'Verifying...' : 'Authorize & Execute'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
