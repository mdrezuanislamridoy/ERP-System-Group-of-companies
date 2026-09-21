import React, { useState } from 'react';
import {
  BellIcon,
  CheckCircle2Icon,
  ClockIcon,
  GitBranchIcon,
  PlayIcon,
  PlusIcon,
  SplitIcon,
  SquareIcon,
  ZapIcon } from
'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel, KeyValue } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/StatusBadge';
import { workflowNodes } from '../data/operations';
import { group } from '../data/organization';
import { cn } from '../utils/cn';

const NODE_STYLE = {
  start: { icon: PlayIcon, ring: 'border-success/50 bg-success-soft text-success' },
  approval: { icon: CheckCircle2Icon, ring: 'border-accent/50 bg-accent-soft text-accent' },
  condition: { icon: GitBranchIcon, ring: 'border-warning/50 bg-warning-soft text-warning' },
  action: { icon: ZapIcon, ring: 'border-info/50 bg-info-soft text-info' },
  notify: { icon: BellIcon, ring: 'border-line bg-surface text-muted' },
  end: { icon: SquareIcon, ring: 'border-line bg-surface text-muted' }
};

const PALETTE = [
{ label: 'Approval step', icon: CheckCircle2Icon },
{ label: 'Condition', icon: GitBranchIcon },
{ label: 'Parallel approval', icon: SplitIcon },
{ label: 'Notification', icon: BellIcon },
{ label: 'Escalation', icon: ZapIcon },
{ label: 'Delay', icon: ClockIcon }];


export function WorkflowBuilder() {
  const [selected, setSelected] = useState(workflowNodes[2].id);
  const node = workflowNodes.find((n) => n.id === selected)!;

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: 'Workflow' }, { label: 'Workflows' }, { label: 'Purchase Request — Raw Material' }]}
        title="Purchase Request — Raw Material"
        description="Approval chain applied to all raw-material purchase requests in manufacturing companies."
        meta={
        <>
            <Badge tone="success">Published · v7</Badge>
            <span className="text-sm text-muted">Applies to 5 companies · 3 departments</span>
          </>
        }
        actions={
        <>
            <Button>Test run</Button>
            <Button>Save draft</Button>
            <Button variant="primary">Publish</Button>
          </>
        } />
      

      <div className="grid gap-4 p-6 xl:grid-cols-[minmax(0,180px)_minmax(0,1fr)_minmax(0,300px)]">
        <Panel title="Add step" bodyClassName="p-2">
          <ul className="space-y-1">
            {PALETTE.map((p) => {
              const Icon = p.icon;
              return (
                <li key={p.label}>
                  <button className="flex w-full items-center gap-2 rounded border border-line bg-canvas px-2 py-1.5 text-base text-ink transition-colors duration-100 ease-out hover:border-line-strong hover:bg-surface">
                    <Icon className="h-3.5 w-3.5 text-muted" aria-hidden />
                    {p.label}
                  </button>
                </li>);

            })}
          </ul>
        </Panel>

        <Panel title="Flow" description="Click a node to configure it" bodyClassName="p-6">
          <ol
            className="mx-auto flex max-w-md flex-col items-stretch"
            style={{
              backgroundImage: 'radial-gradient(#30363D 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }}>
            
            {workflowNodes.map((n, i) => {
              const style = NODE_STYLE[n.kind];
              const Icon = style.icon;
              return (
                <li key={n.id} className="flex flex-col items-center">
                  <button
                    onClick={() => setSelected(n.id)}
                    className={cn(
                      'w-full rounded-lg border bg-subtle px-3 py-2.5 text-left transition-colors duration-100 ease-out',
                      selected === n.id ? 'border-accent' : 'border-line hover:border-line-strong'
                    )}>
                    
                    <span className="flex items-center gap-2">
                      <span className={cn('flex h-6 w-6 items-center justify-center rounded border', style.ring)}>
                        <Icon className="h-3 w-3" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-base font-medium text-ink">{n.label}</span>
                        <span className="block truncate text-sm text-muted">{n.detail}</span>
                      </span>
                    </span>
                  </button>
                  {i < workflowNodes.length - 1 &&
                  <span className="flex h-7 flex-col items-center" aria-hidden>
                      <span className="h-full w-px bg-line-strong" />
                      <button className="-mt-2 rounded-full border border-line bg-surface p-0.5 text-faint transition-colors duration-100 ease-out hover:text-ink">
                        <PlusIcon className="h-3 w-3" />
                      </button>
                    </span>
                  }
                </li>);

            })}
          </ol>
        </Panel>

        <Panel title="Step configuration" description={node.label}>
          <dl>
            <KeyValue label="Type" value={node.kind} />
            <KeyValue label="Assignee" value={node.kind === 'approval' ? 'Role: Finance Manager' : '—'} />
            <KeyValue label="SLA" value={node.kind === 'approval' ? '24 hours' : '—'} />
            <KeyValue label="On breach" value={node.kind === 'approval' ? 'Escalate to Group CFO' : '—'} />
            <KeyValue label="Condition" value={node.kind === 'condition' ? 'amount > 500000' : '—'} mono />
          </dl>
          <div className="mt-4 space-y-2 border-t border-line pt-3">
            <label className="flex items-center gap-2 text-base text-ink">
              <input type="checkbox" defaultChecked className="h-3 w-3 accent-[#3B82F6]" />
              Allow delegation
            </label>
            <label className="flex items-center gap-2 text-base text-ink">
              <input type="checkbox" className="h-3 w-3 accent-[#3B82F6]" />
              Require comment on approval
            </label>
            <label className="flex items-center gap-2 text-base text-ink">
              <input type="checkbox" defaultChecked className="h-3 w-3 accent-[#3B82F6]" />
              Notify requester on decision
            </label>
          </div>
          <Button variant="danger" className="mt-4">
            Remove step
          </Button>
        </Panel>
      </div>
    </div>);

}