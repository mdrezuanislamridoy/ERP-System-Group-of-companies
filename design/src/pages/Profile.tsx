import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, XIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel, KeyValue } from '../components/ui/Panel';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/StatusBadge';
import { effectivePermissions, sessions } from '../data/system';
import { companies, group } from '../data/organization';
import { roleTemplates } from '../data/roles';
import { employees } from '../data/people';
import { SensitiveField } from '../components/common/SensitiveField';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

export function Profile() {
  const { role, can, assignments, activeAssignmentId } = useApp();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');

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
          { id: 'permissions', label: 'Roles & permissions' },
          { id: 'security', label: 'Security' },
          { id: 'preferences', label: 'Preferences' }]
          }
          active={tab}
          onChange={setTab} />
        
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

        {tab === 'security' &&
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Panel title="Active sessions" bodyClassName="p-0">
              <ul className="divide-y divide-line">
                {sessions.map((s) =>
              <li key={s.ip} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-base text-ink">
                        {s.device} {s.current && <Badge tone="accent">This device</Badge>}
                      </p>
                      <p className="font-mono text-sm text-muted">
                        {s.location} · {s.ip}
                      </p>
                    </div>
                    <span className="ml-auto text-sm text-muted">{s.last}</span>
                    {!s.current &&
                <Button size="xs" variant="danger">
                        Revoke
                      </Button>
                }
                  </li>
              )}
              </ul>
            </Panel>
            <Panel title="Account security">
              <dl>
                <KeyValue label="Multi-factor authentication" value="Authenticator app · enabled" />
                <KeyValue label="Password last changed" value="14 Jun 2026" />
                <KeyValue label="Trusted devices" value="2" mono />
                <KeyValue label="Last login" value="21 Sep 2026, 08:44 · Dhaka" />
              </dl>
              <div className="mt-4 flex gap-2">
                <Button>Change password</Button>
                <Button variant="danger" onClick={handleSignOutEverywhere}>
                  Sign out everywhere
                </Button>
              </div>
            </Panel>
          </div>
        }

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
    </div>);

}