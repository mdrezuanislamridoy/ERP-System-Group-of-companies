import React, { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/StatusBadge';
import { group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import { cn } from '../utils/cn';

const GROUPS = [
{ label: 'Organization', items: ['Organization', 'Companies', 'Branches', 'Departments'] },
{ label: 'Access', items: ['Users', 'Roles', 'Permissions', 'Security'] },
{ label: 'Platform', items: ['Modules', 'Workflow', 'Notifications', 'Integrations'] },
{ label: 'Business', items: ['Numbering', 'Finance', 'Localization', 'Audit'] }];


const MODULES = [
{ name: 'Finance & Accounting', enabled: true, companies: 24 },
{ name: 'Human Resources', enabled: true, companies: 24 },
{ name: 'Procurement', enabled: true, companies: 18 },
{ name: 'Inventory & Warehouse', enabled: true, companies: 14 },
{ name: 'Manufacturing', enabled: true, companies: 6 },
{ name: 'Fleet & Transport', enabled: true, companies: 3 },
{ name: 'Projects', enabled: false, companies: 0 }];


export function Settings() {
  const { companyName } = useApp();
  const [section, setSection] = useState('Modules');

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: 'Administration' }, { label: 'Settings' }, { label: section }]}
        title="Settings"
        description="Configuration applies to the scope shown. Company settings inherit from group defaults unless overridden."
        meta={<Badge tone="accent">Scope: {companyName}</Badge>}
        actions={<Button variant="primary">Save changes</Button>} />
      

      <div className="grid gap-4 p-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="space-y-4">
          {GROUPS.map((g) =>
          <div key={g.label}>
              <p className="px-2 pb-1 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((item) =>
              <li key={item}>
                    <button
                  onClick={() => setSection(item)}
                  className={cn(
                    'w-full rounded px-2 py-1.5 text-left text-base transition-colors duration-100 ease-out',
                    section === item ? 'bg-surface font-medium text-ink' : 'text-muted hover:bg-surface hover:text-ink'
                  )}>
                  
                      {item}
                    </button>
                  </li>
              )}
              </ul>
            </div>
          )}
        </nav>

        <div className="space-y-4">
          {section === 'Modules' ?
          <Panel title="Modules" description="Enable ERP modules per company. Disabled modules are hidden from navigation and search." bodyClassName="p-0">
              <ul className="divide-y divide-line">
                {MODULES.map((m) =>
              <li key={m.name} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base text-ink">{m.name}</p>
                      <p className="text-sm text-muted">
                        {m.enabled ? `Enabled for ${m.companies} companies` : 'Not enabled for any company'}
                      </p>
                    </div>
                    <Button size="xs">Configure</Button>
                    <span
                  role="switch"
                  aria-checked={m.enabled}
                  aria-label={`${m.name} enabled`}
                  tabIndex={0}
                  className={cn(
                    'relative h-4 w-7 cursor-pointer rounded-full transition-colors duration-100 ease-out',
                    m.enabled ? 'bg-accent' : 'bg-line'
                  )}>
                  
                      <span
                    className={cn(
                      'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform duration-150 ease-out',
                      m.enabled ? 'translate-x-3.5' : 'translate-x-0.5'
                    )} />
                  
                    </span>
                  </li>
              )}
              </ul>
            </Panel> :

          <Panel title={section} description={`${section} configuration for ${companyName}`}>
              <div className="space-y-4">
                {[
              { label: 'Inherit from group defaults', hint: 'Company overrides are disabled while inheritance is on.' },
              { label: 'Require approval for changes', hint: 'Configuration changes route through the Group IT workflow.' },
              { label: 'Log all changes to audit trail', hint: 'Always on for privileged settings.' }].
              map((row, i) =>
              <label key={row.label} className="flex items-start gap-3 border-b border-line pb-4 last:border-b-0 last:pb-0">
                    <input type="checkbox" defaultChecked={i !== 1} disabled={i === 2} className="mt-1 h-3 w-3 accent-[#3B82F6]" />
                    <span>
                      <span className="block text-base text-ink">{row.label}</span>
                      <span className="block text-sm text-muted">{row.hint}</span>
                    </span>
                  </label>
              )}
              </div>
            </Panel>
          }
        </div>
      </div>
    </div>);

}