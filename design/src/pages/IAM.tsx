import React, { useState } from 'react';
import { CheckIcon, PlusIcon, XIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { effectivePermissions, sessions } from '../data/system';
import { companies, group } from '../data/organization';
import { directoryUsers, type DirectoryUser } from '../data/directory';
import { roleTemplates } from '../data/roles';
import { useApp } from '../contexts/AppContext';
import { cn } from '../utils/cn';

import { CreateEmployeeModal } from '../components/iam/CreateEmployeeModal';

const ALL_ROLES = Object.values(roleTemplates);

function companyLabel(companyId: string | null) {
  if (!companyId) return group.name;
  return companies.find((c) => c.id === companyId)?.name ?? group.name;
}

const LEVEL_LABEL: Record<string, string> = {
  'group-exec': 'Group',
  'company-exec': 'Company',
  'department-head': 'Department',
  employee: 'Self'
};

export function IAM() {
  const { can, companyId, companyName } = useApp();
  const [tab, setTab] = useState('users');
  const [allUsers, setAllUsers] = useState<DirectoryUser[]>(directoryUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const groupScoped = can('group.read');
  const canProvision = groupScoped || can('iam.user.create') || can('employee.update');

  // A company-scoped admin (e.g. Company Admin, IT Head) manages only users with an
  // assignment inside their own company — never the rest of the group's directory.
  const scopedUsers: DirectoryUser[] = groupScoped ?
    allUsers :
    allUsers.filter((u) => u.assignments.some((a) => a.companyId === companyId));

  function usersForRole(roleKey: string) {
    return scopedUsers.filter((u) => u.assignments.some((a) => a.roleKey === roleKey)).length;
  }

  const handleUserCreated = (newEmp: any) => {
    const newUser: DirectoryUser = {
      userId: newEmp.email ? newEmp.email.split('@')[0] : newEmp.employeeId.toLowerCase(),
      password: newEmp.initialPassword || 'Password@2026!',
      personName: newEmp.name || `${newEmp.firstName} ${newEmp.lastName}`,
      initials: `${(newEmp.firstName?.[0] || 'U')}${(newEmp.lastName?.[0] || 'E')}`.toUpperCase(),
      email: newEmp.email,
      employeeId: newEmp.employeeId,
      department: newEmp.department || 'General',
      branch: newEmp.branch || 'Corporate HQ',
      status: 'active',
      assignments: [
        {
          id: `asn-${Date.now()}`,
          roleKey: newEmp.roleKey || 'employee',
          companyId: newEmp.companyId === 'group' ? null : newEmp.companyId,
          orgLabel: newEmp.companyId ? companyLabel(newEmp.companyId) : group.name,
          scopeMode: newEmp.scopeMode || 'SUBTREE',
          title: newEmp.title,
        },
      ],
    };
    setAllUsers((prev) => [newUser, ...prev]);
  };

  const visibleRoles = ALL_ROLES.filter((r) => groupScoped || r.level !== 'group-exec');

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: 'Administration' }, { label: 'Users & Roles' }]}
        title="Identity & Access"
        description={
          groupScoped ?
            'Users, roles and the effective permissions they resolve to in each organizational scope.' :
            `Users, roles and permissions within ${companyName}. Other companies are not visible from this workspace.`
        }
        meta={<Badge tone="danger">2 privileged accounts without MFA</Badge>}
        actions={
          canProvision ? (
            <Button variant="primary" icon={PlusIcon} onClick={() => setIsModalOpen(true)}>
              Provision user
            </Button>
          ) : undefined
        }
      />


      <div className="px-6">
        <Tabs
          tabs={[
          { id: 'users', label: 'Users', count: scopedUsers.length },
          { id: 'roles', label: 'Roles', count: visibleRoles.length },
          { id: 'effective', label: 'Effective permissions' },
          { id: 'sessions', label: 'Sessions', count: sessions.length }]
          }
          active={tab}
          onChange={setTab} />

      </div>

      <div className="p-6">
        {tab === 'users' &&
        <Panel bodyClassName="p-0">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-line">
                  {['User', 'Assignments', 'MFA', 'Status'].map((h) =>
                <th key={h} className="px-4 py-2 text-left text-sm font-semibold uppercase tracking-wide text-faint">
                      {h}
                    </th>
                )}
                </tr>
              </thead>
              <tbody>
                {scopedUsers.map((u, i) => {
                  // A company-scoped admin sees only this person's assignment(s) inside their own
                  // company — never that the same person also holds a role somewhere else in the group.
                  const visibleAssignments = groupScoped ?
                  u.assignments :
                  u.assignments.filter((a) => a.companyId === companyId);
                  return (
                    <tr key={u.userId} className="border-b border-line/70 last:border-b-0 hover:bg-surface">
                      <td className="px-4 py-2">
                        <p className="text-ink">{u.personName}</p>
                        <p className="font-mono text-sm text-muted">{u.userId}</p>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-0.5">
                          {visibleAssignments.map((a) =>
                      <span key={a.id} className="text-sm text-ink">
                              {a.title ?? roleTemplates[a.roleKey].label}
                              <span className="text-faint"> · {companyLabel(a.companyId)}</span>
                            </span>
                      )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {i % 5 === 0 ?
                    <Badge tone="danger">Not enrolled</Badge> :

                    <Badge tone="success">Enabled</Badge>
                    }
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={u.status} />
                      </td>
                    </tr>);

                })}
              </tbody>
            </table>
          </Panel>
        }

        {tab === 'roles' &&
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {visibleRoles.map((r) =>
          <div key={r.key} className="rounded-lg border border-line bg-subtle p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-md font-semibold text-ink">{r.label}</p>
                    <p className="text-sm text-muted">Scope: {LEVEL_LABEL[r.level]}</p>
                    <p className="mt-1 text-sm text-faint">{r.description}</p>
                  </div>
                  {r.privileged && <Badge tone="danger">Privileged</Badge>}
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-base">
                  <span className="text-muted">
                    Users <span className="ml-1 font-mono tabular text-ink">{usersForRole(r.key)}</span>
                  </span>
                  <span className="text-muted">
                    Permissions <span className="ml-1 font-mono tabular text-ink">{r.permissions.length}</span>
                  </span>
                  <Button size="xs" variant="ghost" className="ml-auto">
                    Edit
                  </Button>
                </div>
              </div>
          )}
          </div>
        }

        {tab === 'effective' &&
        <div className="grid gap-4 lg:grid-cols-3">
            {effectivePermissions.map((grp) =>
          <Panel
            key={grp.group}
            title={grp.group}
            description="Resolved for Rahim Ahmed · Finance Manager · ABC Foods Ltd."
            bodyClassName="p-0">
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
          </div>
        }

        {tab === 'sessions' &&
        <Panel bodyClassName="p-0">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-line">
                  {['Device', 'Location', 'IP', 'Last active', ''].map((h, i) =>
                <th key={h + i} className="px-4 py-2 text-left text-sm font-semibold uppercase tracking-wide text-faint">
                      {h}
                    </th>
                )}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) =>
              <tr key={s.ip} className="border-b border-line/70 last:border-b-0 hover:bg-surface">
                    <td className="px-4 py-2 text-ink">
                      {s.device} {s.current && <Badge tone="accent">This device</Badge>}
                    </td>
                    <td className="px-4 py-2 text-muted">{s.location}</td>
                    <td className="px-4 py-2 font-mono tabular text-muted">{s.ip}</td>
                    <td className="px-4 py-2 text-muted">{s.last}</td>
                    <td className="px-4 py-2 text-right">
                      {!s.current &&
                  <Button size="xs" variant="danger">
                          Revoke
                        </Button>
                  }
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </Panel>
        }
      </div>

      <CreateEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleUserCreated}
      />
    </div>
  );
}