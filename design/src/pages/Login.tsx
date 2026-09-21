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
  UserIcon } from
'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { roleTemplates } from '../data/roles';
import { companies, group } from '../data/organization';
import { directoryUsers, type DirectoryUser } from '../data/directory';

const FEATURES = [
{ icon: NetworkIcon, title: 'One tree, every company', text: 'Group, company, department, branch, store or plant — same organization model.' },
{ icon: ShieldCheckIcon, title: 'Role-based access', text: 'What you see and can do is resolved from your assigned roles, not your job title.' },
{ icon: BuildingIcon, title: 'Multi-company by design', text: 'One account can hold different roles in different companies at the same time.' },
{ icon: ScrollTextIcon, title: 'Every action is audited', text: 'Sign-ins, approvals and context switches are logged against your identity.' }];


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
    const from = (location.state as {from?: {pathname?: string;};} | null)?.from?.pathname;
    return from && from !== '/login' ? from : '/';
  }, [location.state]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim() || !password) {
      setError('Enter your user ID and password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    // Simulated latency so the auth step reads as a real request, not a client-side toggle.
    window.setTimeout(() => {
      const result = login(userId, password);
      setSubmitting(false);
      if (!result.ok || !result.user) {
        setError(result.error ?? 'Sign in failed.');
        return;
      }
      if (result.user.assignments.length === 1) {
        establishSession(result.user.userId, result.user.assignments[0].id);
        navigate(redirectTo, { replace: true });
        return;
      }
      setPendingUser(result.user);
    }, 350);
  }

  function chooseWorkspace(assignmentId: string) {
    if (!pendingUser) return;
    establishSession(pendingUser.userId, assignmentId);
    navigate(redirectTo, { replace: true });
  }

  function useDemoAccount(u: DirectoryUser) {
    setUserId(u.userId);
    setPassword(u.password);
    setError(null);
    setShowDemo(false);
  }

  return (
    <div className="flex min-h-full w-full bg-canvas text-ink">
      <div className="hidden w-[42%] shrink-0 flex-col justify-between border-r border-line bg-subtle px-10 py-10 lg:flex xl:w-[38%]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-accent font-mono text-lg font-semibold text-white">
              A
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink">ABC Group OS</span>
          </div>
          <h1 className="mt-10 max-w-sm text-2xl font-semibold leading-snug tracking-tight text-ink">
            One login. Every company you're assigned to.
          </h1>
          <p className="mt-3 max-w-sm text-base text-muted">
            A single group identity resolves into scoped access for each company, department and role you
            hold — nothing more, nothing less.
          </p>
        </div>

        <div className="space-y-5">
          {FEATURES.map((f) =>
          <div key={f.title} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded border border-line bg-surface text-accent">
                <f.icon className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="text-base font-medium text-ink">{f.title}</p>
                <p className="text-sm text-muted">{f.text}</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-faint">
          {group.legal} · {group.companies} companies · {group.countries} countries
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-accent font-mono text-base font-semibold text-white">
              A
            </span>
            <span className="text-md font-semibold tracking-tight text-ink">ABC Group OS</span>
          </div>

          {!pendingUser &&
          <>
              <h2 className="text-xl font-semibold tracking-tight text-ink">Sign in</h2>
              <p className="mt-1 text-base text-muted">Use your group user ID and password.</p>

              <form className="mt-6 space-y-3.5" onSubmit={handleSubmit} noValidate>
                {error &&
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger-soft px-3 py-2.5 text-base text-danger">

                    <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{error}</span>
                  </div>
              }

                <div>
                  <label htmlFor="userId" className="mb-1.5 block text-sm font-medium text-muted">
                    User ID
                  </label>
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
                    <input
                    id="userId"
                    name="userId"
                    autoComplete="username"
                    autoFocus
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g. rahim.ahmed"
                    className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-base text-ink placeholder:text-faint focus:border-accent focus:outline-none" />

                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-muted">
                    Password
                  </label>
                  <div className="relative">
                    <LockIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
                    <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-9 text-base text-ink placeholder:text-faint focus:border-accent focus:outline-none" />

                    <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-muted">

                      {showPassword ? <EyeOffIcon className="h-4 w-4" aria-hidden /> : <EyeIcon className="h-4 w-4" aria-hidden />}
                    </button>
                  </div>
                </div>

                <Button type="submit" variant="primary" size="md" className="w-full" loading={submitting}>
                  {submitting ? 'Signing in…' : 'Sign in'}
                </Button>

                <p className="text-center text-xs text-faint">
                  Access to companies and modules is limited to the roles assigned to your account.
                </p>
              </form>

              <div className="mt-6 border-t border-line pt-4">
                <button
                type="button"
                onClick={() => setShowDemo((s) => !s)}
                className="flex w-full items-center gap-1.5 text-sm font-medium text-accent hover:underline">

                  <KeyRoundIcon className="h-3.5 w-3.5" aria-hidden />
                  {showDemo ? 'Hide demo accounts' : 'This is a prototype — view demo accounts'}
                </button>

                {showDemo &&
              <div className="mt-3 max-h-[280px] space-y-1 overflow-y-auto rounded-md border border-line bg-subtle p-1.5">
                    {directoryUsers.map((u) => {
                  const primary = u.assignments[0];
                  const template = roleTemplates[primary.roleKey];
                  return (
                    <button
                      key={u.userId}
                      type="button"
                      onClick={() => useDemoAccount(u)}
                      className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left hover:bg-elevated">

                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-2xs font-medium text-accent">
                            {u.initials}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-ink">
                              {u.personName}
                              {u.assignments.length > 1 &&
                          <span className="ml-1.5 text-2xs text-faint">+{u.assignments.length - 1} more</span>
                          }
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {template.label} · {companyLabel(primary.companyId)}
                            </span>
                          </span>
                          {u.status !== 'active' &&
                      <span className="shrink-0 rounded border border-danger/35 bg-danger-soft px-1.5 py-0.5 text-2xs font-medium text-danger">
                              {u.status === 'suspended' ? 'Suspended' : 'Inactive'}
                            </span>
                      }
                        </button>);

                })}
                    <p className="px-2 pb-1 pt-2 text-2xs text-faint">
                      Password for every demo account: <span className="font-mono text-ink">Demo@123</span>
                    </p>
                  </div>
              }
              </div>
            </>
          }

          {pendingUser &&
          <>
              <button
              type="button"
              onClick={() => setPendingUser(null)}
              className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-ink">

                <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> Back to sign in
              </button>

              <h2 className="text-xl font-semibold tracking-tight text-ink">Choose your workspace</h2>
              <p className="mt-1 text-base text-muted">
                {pendingUser.personName} holds {pendingUser.assignments.length} role assignments. Pick the one to
                open — you can switch later from the top bar.
              </p>

              <div className="mt-5 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {pendingUser.assignments.map((a) => {
                const template = roleTemplates[a.roleKey];
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => chooseWorkspace(a.id)}
                    className="group flex w-full items-center gap-3 rounded-lg border border-line bg-subtle px-3.5 py-3 text-left transition-colors duration-100 ease-out hover:border-accent hover:bg-surface">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-line bg-surface text-accent">
                        <BuildingIcon className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium text-ink">{a.title ?? template.label}</p>
                        <p className="truncate text-sm text-muted">{a.orgLabel}</p>
                      </div>
                      {template.privileged &&
                    <span className="shrink-0 rounded border border-danger/35 bg-danger-soft px-1.5 py-0.5 text-2xs font-medium text-danger">
                          Privileged
                        </span>
                    }
                      <ChevronRightIcon
                      className="h-4 w-4 shrink-0 text-faint transition-colors duration-100 ease-out group-hover:text-accent"
                      aria-hidden />

                    </button>);

              })}
              </div>
            </>
          }
        </div>
      </div>
    </div>);

}
