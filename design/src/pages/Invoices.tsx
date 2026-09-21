import React, { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { invoices, formatCurrency } from '../data/finance';
import { companies, group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import type { Invoice } from '../types';

export function Invoices() {
  const { can, density, companyId, companyName } = useApp();
  const [tab, setTab] = useState('all');

  const scopeName = companyId ? companies.find((c) => c.id === companyId)?.name : null;
  const scoped = can('group.read') || !scopeName ? invoices : invoices.filter((i) => i.company === scopeName);
  const rows =
  tab === 'all' ? scoped : tab === 'payable' ? scoped.filter((i) => i.type === 'Payable') : scoped.filter((i) => i.type === 'Receivable');

  const columns: Array<Column<Invoice>> = [
  { key: 'id', header: 'Invoice', mono: true, sortable: true, hideable: false, value: (i) => i.id, render: (i) => i.id },
  { key: 'party', header: 'Counterparty', sortable: true, value: (i) => i.party, render: (i) => i.party },
  { key: 'company', header: 'Company', value: (i) => i.company, render: (i) => <span className="text-muted">{i.company}</span> },
  { key: 'type', header: 'Type', value: (i) => i.type, render: (i) => <Badge tone={i.type === 'Payable' ? 'warning' : 'info'}>{i.type}</Badge> },
  { key: 'issued', header: 'Issued', value: (i) => i.issued, render: (i) => <span className="text-muted">{i.issued}</span> },
  { key: 'due', header: 'Due', sortable: true, value: (i) => i.due, render: (i) => <span className="text-muted">{i.due}</span> },
  { key: 'amount', header: 'Amount', align: 'right', mono: true, sortable: true, value: (i) => i.amount, render: (i) => formatCurrency(i.amount) },
  {
    key: 'balance',
    header: 'Balance',
    align: 'right',
    mono: true,
    sortable: true,
    value: (i) => i.balance,
    render: (i) => <span className={i.balance > 0 ? 'text-ink' : 'text-muted'}>{formatCurrency(i.balance)}</span>
  },
  { key: 'status', header: 'Status', value: (i) => i.status, render: (i) => <StatusBadge status={i.status} /> },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    hideable: false,
    value: () => '',
    render: (i) =>
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="xs" variant="ghost">
            View
          </Button>
          {can('invoice.update') && i.status === 'draft' &&
      <Button size="xs" variant="ghost">
              Edit
            </Button>
      }
          {can('invoice.approve') && i.status === 'pending' &&
      <Button size="xs" variant="success">
              Approve
            </Button>
      }
          {can('invoice.cancel') && i.status !== 'completed' &&
      <Button size="xs" variant="ghost">
              Cancel
            </Button>
      }
        </div>

  }];


  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[
        { label: group.name, to: '/' },
        { label: companyName },
        { label: 'Finance', to: '/finance' },
        { label: 'Accounts Payable' },
        { label: 'Invoices' }]
        }
        title="Invoices"
        description="All payable and receivable invoices within your current organizational context."
        meta={<Badge tone="accent">Context: {scopeName ?? 'All companies'}</Badge>}
        actions={
        can('invoice.create') ?
        <Button variant="primary" icon={PlusIcon}>
              New invoice
            </Button> :
        undefined
        } />
      

      <div className="px-6">
        <Tabs
          tabs={[
          { id: 'all', label: 'All', count: scoped.length },
          { id: 'payable', label: 'Accounts Payable', count: scoped.filter((i) => i.type === 'Payable').length },
          { id: 'receivable', label: 'Accounts Receivable', count: scoped.filter((i) => i.type === 'Receivable').length }]
          }
          active={tab}
          onChange={setTab} />
        
      </div>

      <div className="p-6">
        {can('invoice.create') &&
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-line bg-subtle px-4 py-2.5">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            <p className="text-base text-muted">
              New invoices will be created for{' '}
              <span className="font-medium text-ink">{scopeName ?? 'ABC Foods Ltd.'}</span> · Finance Department. Switch
              context from the top bar before creating records for another company.
            </p>
          </div>
        }

        <DataTable
          rows={rows}
          columns={columns}
          getId={(i) => i.id}
          density={density}
          pageSize={8}
          selectable={can('invoice.approve')}
          bulkActions={
          <>
              <Button size="xs" variant="success">
                Approve selected
              </Button>
              <Button size="xs">Schedule payment</Button>
              <Button size="xs">Export</Button>
            </>
          }
          searchPlaceholder="Search invoice number or counterparty..."
          searchIn={(i) => `${i.id} ${i.party} ${i.company}`}
          filters={[
          { key: 'status', label: 'Status', options: ['draft', 'pending', 'approved', 'processing', 'completed', 'failed', 'cancelled'], match: (i, v) => i.status === v },
          ...(can('group.read') ?
          [{ key: 'company', label: 'Company', options: companies.map((c) => c.name), match: (i: Invoice, v: string) => i.company === v }] :
          [])]
          }
          emptyTitle="No invoices"
          emptyDescription="No invoices exist for this context yet." />
        
      </div>
    </div>);

}