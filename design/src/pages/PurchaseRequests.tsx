import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { purchaseRequests } from '../data/operations';
import { companies, group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import type { PurchaseRequest } from '../types';

export function PurchaseRequests() {
  const navigate = useNavigate();
  const { can, density, companyId, companyName } = useApp();

  const scopeName = companyId ? companies.find((c) => c.id === companyId)?.name : null;
  const scoped = can('group.read') || !scopeName ? purchaseRequests : purchaseRequests.filter((p) => p.company === scopeName);

  const columns: Array<Column<PurchaseRequest>> = [
  { key: 'id', header: 'Request', mono: true, sortable: true, hideable: false, value: (p) => p.id, render: (p) => p.id },
  {
    key: 'title',
    header: 'Subject',
    value: (p) => p.title,
    render: (p) =>
    <div className="min-w-0">
          <p className="truncate text-ink">{p.title}</p>
          <p className="text-sm text-muted">
            {p.company} · {p.department}
          </p>
        </div>

  },
  { key: 'requester', header: 'Requested by', sortable: true, value: (p) => p.requester, render: (p) => p.requester },
  {
    key: 'priority',
    header: 'Priority',
    sortable: true,
    value: (p) => p.priority,
    render: (p) =>
    <Badge tone={p.priority === 'Critical' ? 'danger' : p.priority === 'High' ? 'warning' : 'neutral'}>
          {p.priority}
        </Badge>

  },
  { key: 'amount', header: 'Amount', align: 'right', mono: true, sortable: true, value: (p) => p.amount, render: (p) => `৳${p.amount.toLocaleString('en-IN')}` },
  { key: 'stage', header: 'Current stage', value: (p) => p.stage, render: (p) => <span className="text-muted">{p.stage}</span> },
  { key: 'created', header: 'Created', align: 'right', value: (p) => p.created, render: (p) => <span className="text-muted">{p.created}</span> },
  { key: 'status', header: 'Status', value: (p) => p.status, render: (p) => <StatusBadge status={p.status} /> }];


  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[
        { label: group.name, to: '/' },
        { label: companyName },
        { label: 'Procurement', to: '/procurement' },
        { label: 'Purchase Requests' }]
        }
        title="Purchase Requests"
        description="Requests raised across your context, with their live position in the approval workflow."
        meta={<Badge tone="accent">Context: {companyName}</Badge>}
        actions={
        <Button variant="primary" icon={PlusIcon}>
            Create purchase request
          </Button>
        } />
      

      <div className="p-6">
        <DataTable
          rows={scoped}
          columns={columns}
          getId={(p) => p.id}
          density={density}
          pageSize={8}
          selectable={can('pr.approve')}
          bulkActions={
          <>
              <Button size="xs" variant="success">
                Approve selected
              </Button>
              <Button size="xs" variant="danger">
                Reject selected
              </Button>
            </>
          }
          searchPlaceholder="Search requests, requesters, subjects..."
          searchIn={(p) => `${p.id} ${p.title} ${p.requester} ${p.department}`}
          filters={[
          { key: 'status', label: 'Status', options: ['draft', 'pending', 'approved', 'rejected'], match: (p, v) => p.status === v },
          ...(can('group.read') ?
          [{ key: 'company', label: 'Company', options: companies.map((c) => c.name), match: (p: PurchaseRequest, v: string) => p.company === v }] :
          []),
          { key: 'priority', label: 'Priority', options: ['Critical', 'High', 'Normal', 'Low'], match: (p, v) => p.priority === v }]
          }
          onRowClick={(p) => navigate(`/approvals/${p.id}`)} />
        
      </div>
    </div>);

}