import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BuildingIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  LockIcon,
  NetworkIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  BadgePercentIcon,
  UserCheckIcon,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { roleTemplates } from '../data/roles';
import { companies, group } from '../data/organization';
import { directoryUsers, type DirectoryUser } from '../data/directory';

const FEATURES = [
  {
    icon: NetworkIcon,
    title: 'One tree, every company',
    text: 'Group, legal entity, department, branch, or factory — unified organizational model.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Scope-based access (ABAC)',
    text: 'What you see and can do is resolved server-side from your assigned roles and active scope.',
  },
  {
    icon: BuildingIcon,
    title: 'Multi-company by design',
    text: 'One employee identity operates across sister concerns with audited context switching.',
  },
  {
    icon: ScrollTextIcon,
    title: 'Cryptographic audit trail',
    text: 'Sign-ins, approvals, and context switches are logged to a SHA-256 hash-chained ledger.',
  },
];

function companyLabel(companyId: string | null) {
  if (!companyId) return group.name;
  return companies.find((c) => c.id === companyId)?.name ?? group.name;
}

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, establishSession } = useAuth();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingUser, setPendingUser] = useState<DirectoryUser | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  const redirectTo = useMemo(() => {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    return from && from !== '/login' ? from : '/';
  }, [location.state]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim() || !password) {
      setError('Please enter your Employee ID and password.');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const result = await login(userId, password);
      setSubmitting(false);

      if (!result.ok || !result.user) {
        setError(result.error ?? 'Sign in failed. Check credentials or contact HR.');
        return;
      }

      if (result.user.assignments.length === 1) {
        establishSession(result.user.userId, result.user.assignments[0].id);
        navigate(redirectTo, { replace: true });
        return;
      }

      setPendingUser(result.user);
    } catch (err: any) {
      setSubmitting(false);
      setError(err?.message || 'Authentication service unavailable.');
    }
  }

  function chooseWorkspace(assignmentId: string) {
    if (!pendingUser) return;
    establishSession(pendingUser.userId, assignmentId);
    navigate(redirectTo, { replace: true });
  }

  function useDemoAccount(u: DirectoryUser) {
    setUserId(u.employeeId || u.userId);
    setPassword(u.password || 'password123');
    setError(null);
    setShowDemo(false);
  }

  return (
    <div className="flex min-h-full w-full bg-canvas text-ink">
      {/* Left side brand billboard */}
      <div className="hidden w-[42%] shrink-0 flex-col justify-between border-r border-line bg-subtle px-10 py-10 lg:flex xl:w-[38%]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-accent font-mono text-lg font-semibold text-white">
              O
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink">Okobiz Group OS</span>
          </div>

          <h1 className="mt-10 max-w-sm text-2xl font-semibold leading-snug tracking-tight text-ink">
            Group Enterprise ERP & Operational Platform
          </h1>
          <p className="mt-3 max-w-sm text-base text-muted">
            Single group identity with organization-scoped authorization across Holdings and all operating sister concerns.
          </p>
        </div>

        <div className="space-y-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded border border-line bg-surface text-accent">
                <f.icon className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="text-base font-medium text-ink">{f.title}</p>
                <p className="text-sm text-muted">{f.text}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-faint">
          {group.legal} · {group.companies} operating companies · Tier-1 Enterprise ERP
        </p>
      </div>

      {/* Right side form */}
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-accent font-mono text-base font-semibold text-white">
              O
            </span>
            <span className="text-md font-semibold tracking-tight text-ink">Okobiz Group OS</span>
          </div>

          {!pendingUser && (
            <>
              <h2 className="text-xl font-semibold tracking-tight text-ink">Enterprise Sign in</h2>
              <p className="mt-1 text-base text-muted">
                Enter your official Employee ID and account password.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger-soft px-3 py-2.5 text-base text-danger"
                  >
                    <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="userId" className="mb-1.5 block text-sm font-medium text-muted">
                    Employee ID
                  </label>
                  <div className="relative">
                    <UserCheckIcon
                      className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
                      aria-hidden
                    />
                    <input
                      id="userId"
                      name="userId"
                      autoComplete="username"
                      autoFocus
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="e.g. EMP-10001 or EMP-20001"
                      className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-base text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-muted">
                    Password
                  </label>
                  <div className="relative">
                    <LockIcon
                      className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
                      aria-hidden
                    />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-9 text-base text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-muted"
                    >
                      {showPassword ? (
                        <EyeOffIcon className="h-4 w-4" aria-hidden />
                      ) : (
                        <EyeIcon className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" variant="primary" size="md" className="w-full" loading={submitting}>
                  {submitting ? 'Authenticating…' : 'Sign in'}
                </Button>

                <div className="rounded-md border border-line/60 bg-subtle/70 p-2.5 text-center text-xs text-muted">
                  Accounts are provisioned by Group IT and HR Administration. Public registration is not permitted.
                </div>
              </form>

              <div className="mt-6 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setShowDemo((s) => !s)}
                  className="flex w-full items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  <KeyRoundIcon className="h-3.5 w-3.5" aria-hidden />
                  {showDemo ? 'Hide quick credentials' : 'Quick credentials (click to populate)'}
                </button>

                {showDemo && (
                  <div className="mt-3 max-h-[300px] space-y-1 overflow-y-auto rounded-md border border-line bg-subtle p-1.5">
                    {directoryUsers.slice(0, 8).map((u) => {
                      const primary = u.assignments[0];
                      const template = roleTemplates[primary?.roleKey || 'employee'];
                      return (
                        <button
                          key={u.userId}
                          type="button"
                          onClick={() => useDemoAccount(u)}
                          className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left hover:bg-elevated"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-2xs font-medium text-accent">
                            {u.initials}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between text-sm text-ink">
                              <span className="truncate font-medium">{u.personName}</span>
                              <span className="font-mono text-2xs text-accent font-semibold">{u.employeeId}</span>
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {template?.label || 'Staff'} · {companyLabel(primary?.companyId || null)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                    <p className="px-2 pb-1 pt-2 text-2xs text-faint">
                      Default password for demo accounts: <span className="font-mono text-ink">Demo@123</span> / <span className="font-mono text-ink">password123</span>
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {pendingUser && (
            <>
              <button
                type="button"
                onClick={() => setPendingUser(null)}
                className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-ink"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> Back to sign in
              </button>

              <h2 className="text-xl font-semibold tracking-tight text-ink">Choose your operating context</h2>
              <p className="mt-1 text-base text-muted">
                {pendingUser.personName} ({pendingUser.employeeId}) holds {pendingUser.assignments.length} assignments across the group.
              </p>

              <div className="mt-5 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {pendingUser.assignments.map((a) => {
                  const template = roleTemplates[a.roleKey];
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => chooseWorkspace(a.id)}
                      className="group flex w-full items-center justify-between rounded-md border border-line bg-surface p-3 text-left transition-colors duration-100 hover:border-accent hover:bg-rail"
                    >
                      <div className="min-w-0">
                        <p className="text-base font-medium text-ink group-hover:text-accent">
                          {companyLabel(a.companyId)}
                        </p>
                        <p className="text-sm text-muted">
                          {template?.label || a.roleKey} {a.title ? `· ${a.title}` : ''}
                        </p>
                        <span className="mt-1 inline-block rounded bg-subtle px-1.5 py-0.5 font-mono text-2xs text-faint">
                          Scope: {a.scopeMode}
                        </span>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
