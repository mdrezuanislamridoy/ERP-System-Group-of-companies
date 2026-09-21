import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { StateBlock } from '../components/ui/States';
import { purchaseRequests } from '../data/operations';
import { group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import { cn } from '../utils/cn';

export function Approvals() {
  const navigate = useNavigate();
  const { role } = useApp();
  const [tab, setTab] = useState('pending');

  const pending = purchaseRequests.filter((p) => p.status === 'pending');
  const done = purchaseRequests.filter((p) => ['approved', 'rejected'].includes(p.status));
  const rows = tab === 'pending' ? pending : done;

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: 'Workflow' }, { label: 'My Approvals' }]}
        title="My Approvals"
        description="Everything waiting on your decision, ordered by SLA risk."
        meta={
        <>
            <Badge tone="accent">{role.title}</Badge>
            <Badge tone="danger">2 breaching SLA</Badge>
          </>
        } />
      

      <div className="px-6">
        <Tabs
          tabs={[
          { id: 'pending', label: 'Awaiting me', count: pending.length },
          { id: 'history', label: 'Decided', count: done.length },
          { id: 'delegated', label: 'Delegated', count: 0 }]
          }
          active={tab}
          onChange={setTab} />
        
      </div>

      <div className="p-6">
        {tab === 'delegated' ?
        <div className="rounded-lg border border-line bg-subtle">
            <StateBlock
            title="Nothing delegated"
            description="When you delegate approval authority — for leave or travel — the delegated items appear here."
            primary={{ label: 'Set up delegation', onClick: () => navigate('/profile') }} />
          
          </div> :

        <ul className="space-y-2">
            {rows.map((p, i) => {
            const late = tab === 'pending' && i < 2;
            return (
              <li key={p.id}>
                  <button
                  onClick={() => navigate(`/approvals/${p.id}`)}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-subtle px-4 py-3 text-left transition-colors duration-100 ease-out hover:border-line-strong hover:bg-surface">
                  
                    <span className="min-w-[220px] flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted">{p.id}</span>
                        <StatusBadge status={p.status} />
                        {late && <Badge tone="danger">SLA breached</Badge>}
                      </span>
                      <span className="mt-1 block truncate text-md font-medium text-ink">{p.title}</span>
                      <span className="block text-sm text-muted">
                        {p.requester} · {p.department} · {p.company} · raised {p.created}
                      </span>
                    </span>

                    <span className="text-right">
                      <span className="block font-mono tabular text-lg font-semibold text-ink">
                        ৳{p.amount.toLocaleString('en-IN')}
                      </span>
                      <span className={cn('block text-sm', late ? 'text-danger' : 'text-muted')}>
                        Stage: {p.stage}
                      </span>
                    </span>

                    {tab === 'pending' &&
                  <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="success">
                          Approve
                        </Button>
                        <Button size="sm" variant="danger">
                          Reject
                        </Button>
                        <Button size="sm">Request changes</Button>
                      </span>
                  }
                  </button>
                </li>);

          })}
          </ul>
        }
      </div>
    </div>);

}