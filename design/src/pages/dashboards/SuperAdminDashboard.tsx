import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, KeyRoundIcon, ShieldAlertIcon, UsersIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/ui/Panel';
import { Metric, MetricRow } from '../../components/ui/Metric';
import { Badge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { group, companies } from '../../data/organization';
import { directoryUsers } from '../../data/directory';
import { roleTemplates } from '../../data/roles';
import { alerts, notifications, sessions } from '../../data/system';
import { MODULE_METADATA } from '../../types';

/**
 * Platform administration view — exclusively for `group-super-admin`. Deliberately shows
 * NO business/financial data (revenue, margin, payroll, pipeline): per its role template
 * ("Platform configuration and identity administration. No default business data access."),
 * this is the one dashboard no other account — including the Group CEO/CFO — renders.
 */
export function SuperAdminDashboard() {
  const navigate = useNavigate();

  const totalUsers = directoryUsers.length;
  const totalRoles = Object.values(roleTemplates).length;
  const distinctPermissions = new Set(Object.values(roleTemplates).flatMap((r) => r.permissions)).size;
  const activeSessionCount = sessions.length;
  const securityAlerts = alerts.filter((a) => a.meta.toLowerCase().includes('security'));
  const securityNotifications = notifications.filter((n) => n.category === 'Security' || n.category === 'System');
  const totalModuleSlots = Object.keys(MODULE_METADATA).length;

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name }, { label: 'Platform Administration' }]}
        title="Platform Administration"
        description="Identity, access and system configuration — exclusive to Group Super Admin. No business or financial data is shown here."
        meta={
          <>
            <Badge tone="danger">Super Admin · exclusive view</Badge>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <CalendarIcon className="h-3 w-3" aria-hidden /> As of 21 Sep 2026, 11:04
            </span>
          </>
        }
        actions={
          <>
            <Button onClick={() => navigate('/admin/audit')}>Audit trail</Button>
            <Button variant="primary" onClick={() => navigate('/admin/iam')}>
              Manage users &amp; roles
            </Button>
          </>
        }
      />

      <div className="space-y-4 p-6">
        <MetricRow>
          <Metric label="Companies under management" value={String(companies.length)} sub={`${group.companies} sister concerns`} emphasis />
          <Metric label="Directory users" value={String(totalUsers)} sub="across the whole group" />
          <Metric label="Roles defined" value={String(totalRoles)} sub={`${distinctPermissions} distinct permissions`} />
          <Metric label="Active sessions" value={String(activeSessionCount)} sub="group-wide" />
        </MetricRow>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Panel
              title="Company module configuration"
              description="Which modules are enabled per legal entity — not what they're worth"
              actions={
                <Button variant="ghost" size="xs" onClick={() => navigate('/settings')}>
                  Manage modules
                </Button>
              }
              bodyClassName="divide-y divide-line"
            >
              {companies.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base text-ink">{c.name}</p>
                    <p className="text-sm text-muted">{c.sector}</p>
                  </div>
                  <span className="font-mono tabular text-base text-ink">
                    {c.enabledModules.length} / {totalModuleSlots}
                  </span>
                  <span className="text-sm text-faint">modules enabled</span>
                </div>
              ))}
            </Panel>

            <Panel title="Roles & permission coverage" description="Every role template and how many permissions it resolves to" bodyClassName="p-0">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-line">
                    {['Role', 'Scope', 'Permissions', 'Privileged'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-sm font-semibold uppercase tracking-wide text-faint">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(roleTemplates).map((r) => (
                    <tr key={r.key} className="border-b border-line/70 last:border-b-0 hover:bg-surface">
                      <td className="px-4 py-2 text-ink">{r.label}</td>
                      <td className="px-4 py-2 text-muted">{r.level}</td>
                      <td className="px-4 py-2 font-mono tabular text-ink">{r.permissions.length}</td>
                      <td className="px-4 py-2">{r.privileged && <Badge tone="danger">Privileged</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Security alerts" bodyClassName="divide-y divide-line">
              {securityAlerts.length === 0 && <p className="px-4 py-3 text-sm text-muted">No open security alerts.</p>}
              {securityAlerts.map((a) => (
                <div key={a.title} className="flex gap-2.5 px-4 py-2.5">
                  <ShieldAlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-base text-ink">{a.title}</p>
                    <p className="text-sm text-muted">{a.detail}</p>
                    <p className="mt-0.5 text-xs text-faint">{a.meta}</p>
                  </div>
                </div>
              ))}
            </Panel>

            <Panel
              title="Identity & access shortcuts"
              bodyClassName="p-3 space-y-1.5"
            >
              <Button className="w-full justify-start" variant="ghost" icon={UsersIcon} onClick={() => navigate('/admin/iam')}>
                Provision or review users
              </Button>
              <Button className="w-full justify-start" variant="ghost" icon={KeyRoundIcon} onClick={() => navigate('/admin/iam')}>
                Assign role permissions
              </Button>
              <Button className="w-full justify-start" variant="ghost" icon={ShieldAlertIcon} onClick={() => navigate('/admin/audit')}>
                Review audit trail
              </Button>
            </Panel>

            <Panel title="System notifications" bodyClassName="divide-y divide-line">
              {securityNotifications.length === 0 && <p className="px-4 py-3 text-sm text-muted">Nothing to review.</p>}
              {securityNotifications.map((n) => (
                <div key={n.id} className="px-4 py-2.5">
                  <p className="text-base text-ink">{n.title}</p>
                  <p className="text-sm text-muted">{n.meta}</p>
                  <p className="mt-0.5 text-xs text-faint">{n.time}</p>
                </div>
              ))}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
