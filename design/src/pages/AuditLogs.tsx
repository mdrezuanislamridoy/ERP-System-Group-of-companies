import React, { useState } from 'react';
import { XIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Panel, KeyValue } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/StatusBadge';
import { auditEvents } from '../data/system';
import { companies, group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import type { AuditEvent } from '../types';

const ACTION_TONE: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'neutral'> = {
  APPROVE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'neutral',
  EXPORT: 'warning',
  ROLE_GRANT: 'warning'
};

export function AuditLogs() {
  const { density, can, companyName } = useApp();
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const groupScoped = can('group.read');
  const scopedEvents = groupScoped ? auditEvents : auditEvents.filter((a) => a.company === companyName);

  const columns: Array<Column<AuditEvent>> = [
  { key: 'time', header: 'Timestamp', mono: true, sortable: true, hideable: false, value: (a) => a.time, render: (a) => <span className="text-muted">{a.time}</span> },
  { key: 'user', header: 'User', sortable: true, value: (a) => a.user, render: (a) => a.user },
  { key: 'action', header: 'Action', value: (a) => a.action, render: (a) => <Badge tone={ACTION_TONE[a.action] ?? 'neutral'}>{a.action}</Badge> },
  { key: 'resource', header: 'Resource', mono: true, value: (a) => a.resource, render: (a) => a.resource },
  { key: 'company', header: 'Company', value: (a) => a.company, render: (a) => <span className="text-muted">{a.company}</span> },
  { key: 'ip', header: 'IP', mono: true, align: 'right', value: (a) => a.ip, render: (a) => <span className="text-muted">{a.ip}</span> }];


  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: 'Administration' }, { label: 'Audit Logs' }]}
        title="Audit Logs"
        description={
        groupScoped ?
        'Immutable record of every privileged action across the group. Retained for 7 years.' :
        `Immutable record of privileged actions within ${companyName}. Retained for 7 years.`
        }
        meta={<Badge tone="accent">{groupScoped ? 'Group scope' : `${companyName} scope`} · {scopedEvents.length.toLocaleString('en-IN')} events</Badge>}
        actions={<Button>Export range</Button>} />


      <div className="grid gap-4 p-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <DataTable
          rows={scopedEvents}
          columns={columns}
          getId={(a) => a.id}
          density={density}
          pageSize={10}
          searchPlaceholder="Search user, resource, correlation id..."
          searchIn={(a) => `${a.user} ${a.resource} ${a.action} ${a.correlation}`}
          filters={[
          { key: 'action', label: 'Action', options: ['APPROVE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT', 'ROLE_GRANT'], match: (a, v) => a.action === v },
          ...(groupScoped ?
          [{ key: 'company', label: 'Company', options: [group.name, ...companies.map((c) => c.name)], match: (a: AuditEvent, v: string) => a.company === v }] :
          [])]
          }
          onRowClick={setSelected} />
        

        {selected ?
        <Panel
          title="Event detail"
          description={selected.action}
          actions={
          <Button variant="ghost" size="xs" icon={XIcon} onClick={() => setSelected(null)} aria-label="Close event detail" />
          }>
          
            <dl>
              <KeyValue label="Actor" value={selected.user} />
              <KeyValue label="Action" value={selected.action} />
              <KeyValue label="Resource" value={selected.resource} mono />
              <KeyValue label="Company" value={selected.company} />
              <KeyValue label="Old value" value={selected.before ?? '—'} mono />
              <KeyValue label="New value" value={selected.after ?? '—'} mono />
              <KeyValue label="IP address" value={selected.ip} mono />
              <KeyValue label="Device" value={selected.device} />
              <KeyValue label="Timestamp" value={selected.time} mono />
              <KeyValue label="Correlation ID" value={selected.correlation} mono />
            </dl>
          </Panel> :

        <Panel title="Event detail">
            <p className="text-base text-muted">
              Select an event to inspect the actor, before/after values, originating device and correlation id used to
              trace the request end to end.
            </p>
          </Panel>
        }
      </div>
    </div>);

}