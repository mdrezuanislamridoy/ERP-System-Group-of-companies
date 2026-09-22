import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckIcon,
  XIcon,
  LaptopIcon,
  SmartphoneIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  LogOutIcon,
  AlertCircleIcon,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel, KeyValue } from '../components/ui/Panel';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/StatusBadge';
import {
  effectivePermissions,
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
  subscribeActiveSessions,
} from '../data/system';
import { companies, group } from '../data/organization';
import { roleTemplates } from '../data/roles';
import { employees } from '../data/people';
import { SensitiveField } from '../components/common/SensitiveField';
import { StepUpAuthModal } from '../components/common/StepUpAuthModal';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { AttendanceCalendar } from '../components/hr/AttendanceCalendar';
import { cn } from '../utils/cn';
import type { ActiveSession } from '../types';

export function Profile() {
  const { role, can, assignments, activeAssignmentId } = useApp();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(getActiveSessions());
  const [securityStatusMsg, setSecurityStatusMsg] = useState<string | null>(null);
  const [stepUpConfig, setStepUpConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => void;
  } | null>(null);

  useEffect(() => {
    return subscribeActiveSessions(() => setActiveSessions(getActiveSessions()));
  }, []);

  if (!user) return null;

  const companyName = (companyId: string | null) =>
  companyId ? companies.find((c) => c.id === companyId)?.name ?? group.name : group.name;

  const activeCompanyId = assignments.find((a) => a.id === activeAssignmentId)?.companyId ?? null;

  function handleSignOutEverywhere() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: companyName(activeCompanyId) }, { label: 'My Profile' }]}
        title={role.user}
        description={`${role.title} · ${user.branch}`}
        meta={
        <>
            <Badge tone="accent">{role.scopeLabel}</Badge>
            <span className="font-mono text-sm text-muted">{user.employeeId}</span>
          </>
        }
        actions={<Button variant="primary">Edit profile</Button>} />


      <div className="px-6">
        <Tabs
          tabs={[
            { id: 'profile', label: 'Profile' },
            { id: 'attendance', label: 'My Attendance' },
            { id: 'permissions', label: 'Roles & permissions' },
            { id: 'security', label: 'Security' },
            { id: 'preferences', label: 'Preferences' },
          ]}
          active={tab}
          onChange={setTab}
        />
        
      </div>

      <div className="p-6">
        {tab === 'profile' && (() => {
          const emp = employees.find((e) => e.id === user.employeeId || e.email === user.email) || employees[0];
          return (
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="Personal information">
                <dl>
                  <KeyValue label="Full name" value={role.user} />
                  <KeyValue label="Work email" value={user.email} />
                  <KeyValue label="Employee ID" value={user.employeeId} mono />
                  <KeyValue
                    label="National ID (NID)"
                    value={
                      <SensitiveField
                        value={emp?.nid || '4192-8830-1049'}
                        permission="sensitive.nid.read"
                        domain="nid"
                        label="Personal NID"
                        resourceName={`${user.personName} (${user.employeeId})`}
                        companyName={companyName(activeCompanyId)}
                        format="nid"
                        mono
                      />
                    }
                  />
                  <KeyValue
                    label="Tax ID (TIN)"
                    value={
                      <SensitiveField
                        value={emp?.tin || '883920192841'}
                        permission="sensitive.nid.read"
                        domain="tin"
                        label="Tax ID (TIN)"
                        resourceName={`${user.personName} (${user.employeeId})`}
                        companyName={companyName(activeCompanyId)}
                        format="tin"
                        mono
                      />
                    }
                  />
                </dl>
              </Panel>
              <Panel title="Employment">
                <dl>
                  <KeyValue label="Position" value={role.title} />
                  <KeyValue label="Department" value={user.department} />
                  <KeyValue label="Branch" value={user.branch} />
                  <KeyValue
                    label="Base Salary"
                    value={
                      <SensitiveField
                        value={emp?.baseSalary || 145000}
                        permission="sensitive.salary.read"
                        domain="salary"
                        label="Base Salary"
                        resourceName={`${user.personName} (${user.employeeId})`}
                        companyName={companyName(activeCompanyId)}
                        format="currency"
                        mono
                      />
                    }
                  />
                  <KeyValue
                    label="Bank Account"
                    value={
                      <SensitiveField
                        value={emp?.bankAccount || '01-8834921-01'}
                        permission="sensitive.bank.read"
                        domain="bank"
                        label="Salary Bank Account"
                        resourceName={`${user.personName} (${user.employeeId})`}
                        companyName={companyName(activeCompanyId)}
                        format="bank"
                        mono
                      />
                    }
                  />
                </dl>
              </Panel>
              <Panel title="Organization context">
                <dl>
                  <KeyValue label="Group" value={group.name} />
                  <KeyValue label="Active company" value={companyName(activeCompanyId)} />
                  <KeyValue label="Access scope" value={role.scopeLabel} />
                </dl>
                <p className="mt-3 rounded border border-line bg-canvas px-3 py-2 text-sm text-muted">
                  Actions you take apply to this workspace. Switch workspaces from the top bar before creating or
                  approving records under a different role or company.
                </p>
              </Panel>
            </div>
          );
        })()}

        {tab === 'attendance' && (
          <Panel
            title="My Monthly Attendance Register"
            description={`Detailed day-wise working hours, check-in, check-out, and status for ${user.personName} (${user.employeeId})`}
          >
            <AttendanceCalendar employeeId={user.employeeId || 'EMP-10241'} />
          </Panel>
        )}

        {tab === 'permissions' &&
        <div className="space-y-4">
            <Panel
            title="Assigned roles"
            description={`${assignments.length} assignment${assignments.length === 1 ? '' : 's'} on this account`}
            bodyClassName="divide-y divide-line">

              {assignments.map((a) => {
              const template = roleTemplates[a.roleKey];
              const active = a.id === activeAssignmentId;
              return (
                <div key={a.id} className={cn('flex items-center gap-3 px-4 py-2.5', active && 'bg-accent-soft/40')}>
                    <div>
                      <p className="flex items-center gap-2 text-base text-ink">
                        {a.title ?? template.label}
                        {active && <Badge tone="accent">Active</Badge>}
                        {template.privileged && <Badge tone="danger">Privileged</Badge>}
                      </p>
                      <p className="text-sm text-muted">
                        {a.orgLabel} · scope {a.scopeMode}
                      </p>
                    </div>
                    <span className="ml-auto text-sm text-faint">{template.permissions.length} permissions</span>
                  </div>);

            })}
            </Panel>

            {can('iam.manage') || can('self.read') ?
          <div className="grid gap-4 lg:grid-cols-3">
                {effectivePermissions.map((grp) =>
            <Panel key={grp.group} title={`Effective permissions — ${grp.group}`} bodyClassName="p-0">
                    <ul className="divide-y divide-line">
                      {grp.items.map((p) =>
                <li key={p.key} className="flex items-center gap-2.5 px-4 py-2">
                          {p.granted ?
                  <CheckIcon className="h-3.5 w-3.5 shrink-0 text-success" aria-label="Granted" /> :

                  <XIcon className="h-3.5 w-3.5 shrink-0 text-danger" aria-label="Denied" />
                  }
                          <span className={cn('font-mono text-base', p.granted ? 'text-ink' : 'text-muted line-through')}>
                            {p.key}
                          </span>
                          <span className="ml-auto truncate text-sm text-faint">{p.source}</span>
                        </li>
                )}
                    </ul>
                  </Panel>
            )}
              </div> :
          null}
          </div>
        }

        {tab === 'security' && (
          <div className="space-y-4">
            {securityStatusMsg && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{securityStatusMsg}</span>
                </div>
                <button onClick={() => setSecurityStatusMsg(null)} className="rounded p-1 hover:bg-black/10">
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <Panel
                title="Active Sessions & Devices"
                description="Manage devices currently authenticated with your Okobiz Enterprise identity."
                actions={
                  activeSessions.filter((s) => !s.isCurrent).length > 0 ? (
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => {
                        setStepUpConfig({
                          isOpen: true,
                          title: 'Terminate All Remote Sessions',
                          description: 'Revoking all active login sessions across all other computers and mobile devices.',
                          action: () => {
                            const current = activeSessions.find((s) => s.isCurrent);
                            const count = revokeAllOtherSessions(current?.sessionId || '', user.personName);
                            setSecurityStatusMsg(`Successfully revoked ${count} remote session(s). Audit record logged with SHA-256 seal.`);
                          },
                        });
                      }}
                    >
                      Revoke All Other Sessions
                    </Button>
                  ) : undefined
                }
                bodyClassName="p-0"
              >
                <ul className="divide-y divide-line">
                  {activeSessions.map((s) => {
                    const isMobile = s.device.toLowerCase().includes('iphone') || s.device.toLowerCase().includes('android');
                    return (
                      <li key={s.sessionId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                              s.isCurrent
                                ? 'border-accent/30 bg-accent-soft text-accent'
                                : 'border-line bg-canvas text-muted'
                            )}
                          >
                            {isMobile ? <SmartphoneIcon className="h-4 w-4" /> : <LaptopIcon className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-ink truncate">{s.device}</p>
                              {s.isCurrent && <Badge tone="accent">This device</Badge>}
                            </div>
                            <p className="font-mono text-xs text-muted mt-0.5">
                              {s.location} · {s.ip} · {s.browser}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="block text-xs font-medium text-ink">{s.lastActive}</span>
                            <span className="block text-2xs text-muted">Signed in {s.createdAt}</span>
                          </div>
                          {!s.isCurrent && (
                            <Button
                              size="xs"
                              variant="danger"
                              onClick={() => {
                                const ok = revokeSession(s.sessionId, user.personName);
                                if (ok) {
                                  setSecurityStatusMsg(`Session on ${s.device} (${s.ip}) was revoked successfully.`);
                                }
                              }}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Panel>

              <Panel title="Account Security & MFA">
                <dl>
                  <KeyValue label="Multi-factor authentication" value="Authenticator app (TOTP) · Active" />
                  <KeyValue label="Step-Up Authentication" value="Enforced for high-risk operations" />
                  <KeyValue label="Password last changed" value="14 Jun 2026" />
                  <KeyValue label="Trusted devices" value={String(activeSessions.length)} mono />
                  <KeyValue label="Last login" value="21 Sep 2026, 08:44 · Dhaka" />
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button>Change password</Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setStepUpConfig({
                        isOpen: true,
                        title: 'Sign Out Everywhere',
                        description: 'Terminate all active sessions across all devices and immediately log out from this browser.',
                        action: handleSignOutEverywhere,
                      });
                    }}
                  >
                    Sign out everywhere
                  </Button>
                </div>
              </Panel>
            </div>
          </div>
        )}

        {tab === 'preferences' &&
        <Panel title="Preferences" description="Applies to your account across all companies">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
            { label: 'Language', options: ['English (UK)', 'বাংলা'] },
            { label: 'Time zone', options: ['Asia/Dhaka (GMT+6)', 'UTC'] },
            { label: 'Number format', options: ['Indian (1,00,000)', 'International (100,000)'] },
            { label: 'Default landing page', options: ['Dashboard', 'My Approvals', 'My Workspace'] }].
            map((p) =>
            <div key={p.label}>
                  <label className="mb-1 block text-sm font-medium text-muted" htmlFor={`pref-${p.label}`}>
                    {p.label}
                  </label>
                  <select
                id={`pref-${p.label}`}
                className="h-7 w-full rounded border border-line bg-canvas px-2 text-base text-ink focus:border-accent focus:outline-none">
                
                    {p.options.map((o) =>
                <option key={o}>{o}</option>
                )}
                  </select>
                </div>
            )}
            </div>
          </Panel>
        }
      </div>

      {stepUpConfig && (
        <StepUpAuthModal
          isOpen={stepUpConfig.isOpen}
          title={stepUpConfig.title}
          actionDescription={stepUpConfig.description}
          resourceName={`Active User Session (${user.email})`}
          companyName={companyName(activeCompanyId)}
          requiredJustification={false}
          onSuccess={() => {
            stepUpConfig.action();
            setStepUpConfig(null);
          }}
          onClose={() => setStepUpConfig(null)}
        />
      )}
    </div>
  );
}