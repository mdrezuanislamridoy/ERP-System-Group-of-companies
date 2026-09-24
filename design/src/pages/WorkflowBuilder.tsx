import React, { useEffect, useMemo, useState } from 'react';
import {
  BellIcon,
  CheckCircle2Icon,
  ClockIcon,
  GitBranchIcon,
  PlayIcon,
  PlusIcon,
  SplitIcon,
  SquareIcon,
  ZapIcon,
  ArrowRightIcon,
  PencilIcon,
  Trash2Icon,
  UsersIcon
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel, KeyValue } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/StatusBadge';
import { Tabs } from '../components/ui/Tabs';
import { workflowNodes } from '../data/operations';
import { group, companies, departments } from '../data/organization';
import {
  getWorkflowRules,
  subscribeWorkflowRules,
  updateWorkflowRule,
  deleteWorkflowRule,
  evaluateWorkflow,
  describeCondition
} from '../data/workflow';
import { WorkflowRuleEditorModal } from '../components/workflow/WorkflowRuleEditorModal';
import { cn } from '../utils/cn';
import type { WorkflowRule } from '../types';

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

const DEPARTMENT_OPTIONS = Array.from(new Set(departments.map((d) => d.name))).sort();

function VisualBuilderTab() {
  const [selected, setSelected] = useState(workflowNodes[2].id);
  const node = workflowNodes.find((n) => n.id === selected)!;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,180px)_minmax(0,1fr)_minmax(0,300px)]">
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
            backgroundImage: 'radial-gradient(rgb(var(--color-line)) 1px, transparent 1px)',
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
  );
}

function RoutingRulesTab() {
  const [rules, setRules] = useState(getWorkflowRules());
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [simAmount, setSimAmount] = useState('275000');
  const [simCompany, setSimCompany] = useState('');
  const [simDepartment, setSimDepartment] = useState('');

  useEffect(() => subscribeWorkflowRules(() => setRules(getWorkflowRules())), []);

  const sortedRules = useMemo(() => [...rules].sort((a, b) => a.priority - b.priority), [rules]);

  const result = useMemo(() => {
    const payload: Partial<Record<'amount' | 'company' | 'department', number | string>> = {};
    const amountNum = parseFloat(simAmount);
    if (!Number.isNaN(amountNum)) payload.amount = amountNum;
    if (simCompany) payload.company = simCompany;
    if (simDepartment) payload.department = simDepartment;
    return evaluateWorkflow(payload, rules);
  }, [simAmount, simCompany, simDepartment, rules]);

  const handleToggle = (rule: WorkflowRule) => updateWorkflowRule(rule.id, { enabled: !rule.enabled });
  const handleDelete = (rule: WorkflowRule) => {
    if (rules.length <= 1) return;
    deleteWorkflowRule(rule.id);
  };

  return (
    <div className="space-y-4">
      <Panel title="Simulate a request" description="Enter a payload to see exactly which rule and approval chain the engine picks" bodyClassName="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Amount (৳)</label>
            <input
              type="number"
              min="0"
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value)}
              className="h-9 w-full rounded border border-line bg-canvas px-2.5 text-sm text-ink font-mono focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Company (optional)</label>
            <select
              value={simCompany}
              onChange={(e) => setSimCompany(e.target.value)}
              className="h-9 w-full rounded border border-line bg-canvas px-2.5 text-sm text-ink focus:border-accent focus:outline-none"
            >
              <option value="">Any company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Department (optional)</label>
            <select
              value={simDepartment}
              onChange={(e) => setSimDepartment(e.target.value)}
              className="h-9 w-full rounded border border-line bg-canvas px-2.5 text-sm text-ink focus:border-accent focus:outline-none"
            >
              <option value="">Any department</option>
              {DEPARTMENT_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-subtle/60 p-4">
          {!result.matchedRule ? (
            <p className="text-center text-sm text-muted py-4">No enabled rule matches this payload — the request would have no defined route.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone="accent">Matched: {result.matchedRule.name}</Badge>
                <span className="text-xs text-muted">{result.matchedRule.description}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-stretch gap-2 overflow-x-auto pb-1">
                {result.stages.map((stage, idx) => (
                  <React.Fragment key={stage.level}>
                    <div
                      className={cn(
                        'flex min-w-[140px] flex-col gap-1.5 rounded-lg border p-2.5',
                        stage.parallel ? 'border-warning/40 bg-warning-soft/20' : 'border-accent/30 bg-accent-soft/20'
                      )}
                    >
                      <span className="text-2xs font-semibold uppercase tracking-wider text-faint flex items-center gap-1">
                        Level {stage.level} {stage.parallel && <UsersIcon className="h-3 w-3" />}
                        {stage.parallel && <span className="text-warning">Parallel</span>}
                      </span>
                      {stage.approvers.map((a) => (
                        <div key={a.role} className="rounded border border-line bg-canvas px-2 py-1 text-xs text-ink">
                          {a.role}
                          {a.requiredSignatures > 1 && <span className="text-faint"> ×{a.requiredSignatures}</span>}
                        </div>
                      ))}
                    </div>
                    {idx < result.stages.length - 1 && (
                      <span className="flex items-center text-faint">
                        <ArrowRightIcon className="h-4 w-4" />
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </>
          )}
        </div>
      </Panel>

      <Panel
        title="Routing Rules"
        description="Evaluated top to bottom by priority — the first fully-matching enabled rule wins"
        actions={
          <Button size="xs" variant="primary" icon={PlusIcon} onClick={() => setIsCreating(true)}>
            Add Rule
          </Button>
        }
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-line">
          {sortedRules.map((rule) => (
            <li key={rule.id} className={cn('p-4', !rule.enabled && 'opacity-50')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-2xs text-faint">P{rule.priority}</span>
                    <p className="text-sm font-semibold text-ink">{rule.name}</p>
                    {result.matchedRule?.id === rule.id && <Badge tone="success">Active for simulation</Badge>}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{rule.description}</p>
                  <p className="mt-1.5 text-2xs text-muted">
                    <span className="font-medium text-ink">If: </span>
                    {rule.conditions.map(describeCondition).join(' AND ')}
                  </p>
                  <p className="mt-0.5 text-2xs text-muted">
                    <span className="font-medium text-ink">Then: </span>
                    {[...rule.approvers]
                      .sort((a, b) => a.level - b.level)
                      .reduce<string[][]>((groups, a) => {
                        const last = groups[groups.length - 1];
                        if (last && last[0] === String(a.level)) last.push(a.role);
                        else groups.push([String(a.level), a.role]);
                        return groups;
                      }, [])
                      .map((g) => g.slice(1).join(' + '))
                      .join(' → ')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="flex items-center gap-1.5 text-xs text-muted mr-1">
                    <input type="checkbox" checked={rule.enabled} onChange={() => handleToggle(rule)} className="h-3.5 w-3.5 accent-[#3B82F6]" />
                    Enabled
                  </label>
                  <Button size="xs" variant="ghost" icon={PencilIcon} onClick={() => setEditingRule(rule)}>
                    Edit
                  </Button>
                  <Button size="xs" variant="ghost" icon={Trash2Icon} onClick={() => handleDelete(rule)} disabled={rules.length <= 1}>
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <WorkflowRuleEditorModal isOpen={Boolean(editingRule)} rule={editingRule} onClose={() => setEditingRule(null)} />
      <WorkflowRuleEditorModal isOpen={isCreating} rule={null} onClose={() => setIsCreating(false)} />
    </div>
  );
}

export function WorkflowBuilder() {
  const [tab, setTab] = useState<'rules' | 'visual'>('rules');

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


      <div className="px-6 pt-4">
        <Tabs
          tabs={[
            { id: 'rules', label: 'Routing Rules' },
            { id: 'visual', label: 'Visual Builder' }
          ]}
          active={tab}
          onChange={(id) => setTab(id as 'rules' | 'visual')}
        />
      </div>

      <div className="p-6">
        {tab === 'rules' ? <RoutingRulesTab /> : <VisualBuilderTab />}
      </div>
    </div>);

}