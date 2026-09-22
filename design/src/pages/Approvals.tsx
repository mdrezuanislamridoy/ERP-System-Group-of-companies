import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  XIcon,
  ShoppingCartIcon,
  ReceiptIcon,
  CalendarCheckIcon,
  BanknoteIcon,
  AlertTriangleIcon,
  BookOpenIcon,
  CheckIcon,
  MessageSquareXIcon,
  ClockIcon,
  UserCogIcon,
  UndoIcon,
  ShieldAlertIcon
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/StatusBadge';
import { StateBlock } from '../components/ui/States';
import { ApprovalTimeline } from '../components/ApprovalTimeline';
import { ApprovalDecisionModal } from '../components/ApprovalDecisionModal';
import { DelegationModal } from '../components/DelegationModal';
import {
  getApprovalInbox,
  subscribeApprovalInbox,
  decideApprovalItem,
  decideApprovalItemsBulk,
  getSlaStatus,
  getDelegationRules,
  subscribeDelegations,
  revokeDelegation,
  getActiveDelegationAsDelegatee
} from '../data/operations';
import { formatCurrency } from '../data/finance';
import { group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import { cn } from '../utils/cn';
import type { ApprovalItem, ApprovalItemType, DelegationRule } from '../types';

const TYPE_META: Record<ApprovalItemType, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  purchase_request: { icon: ShoppingCartIcon, label: 'Purchase Request' },
  supplier_invoice: { icon: ReceiptIcon, label: 'Supplier Invoice' },
  leave_application: { icon: CalendarCheckIcon, label: 'Leave Application' },
  payment_voucher: { icon: BanknoteIcon, label: 'Payment Voucher' },
  budget_override: { icon: AlertTriangleIcon, label: 'Budget Override' },
  journal_entry: { icon: BookOpenIcon, label: 'Journal Entry' }
};

const PRIORITY_TONE: Record<ApprovalItem['priority'], 'neutral' | 'warning' | 'danger'> = {
  Low: 'neutral',
  Normal: 'neutral',
  High: 'warning',
  Critical: 'danger'
};

type TabId = 'all' | 'procurement' | 'hr' | 'finance' | 'delegated';

export function Approvals() {
  const navigate = useNavigate();
  const { role, can } = useApp();
  const [tab, setTab] = useState<TabId>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | ApprovalItem['priority']>('all');
  const [items, setItems] = useState<ApprovalItem[]>(getApprovalInbox());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<{ items: ApprovalItem[]; decision: 'approved' | 'rejected' } | null>(null);
  const [delegations, setDelegations] = useState<DelegationRule[]>(getDelegationRules());
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);

  useEffect(() => subscribeApprovalInbox(() => setItems(getApprovalInbox())), []);
  useEffect(() => subscribeDelegations(() => setDelegations(getDelegationRules())), []);

  // SLA countdowns and auto-escalation are time-based, not action-based — refresh periodically so
  // badges tick down and newly-breaching items escalate without requiring a manual action first.
  useEffect(() => {
    const interval = setInterval(() => setItems(getApprovalInbox()), 60000);
    return () => clearInterval(interval);
  }, []);

  const byDomain = useMemo<Record<TabId, ApprovalItem[]>>(
    () => ({
      all: items,
      procurement: items.filter((i) => i.domain === 'Procurement'),
      hr: items.filter((i) => i.domain === 'HR'),
      finance: items.filter((i) => i.domain === 'Finance'),
      delegated: []
    }),
    [items]
  );

  const domainItems = byDomain[tab];
  const rows = priorityFilter === 'all' ? domainItems : domainItems.filter((i) => i.priority === priorityFilter);
  const selectableRows = rows.filter((r) => r.bulkEligible);
  const drawerItem = drawerItemId ? items.find((i) => i.id === drawerItemId) || null : null;

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.size === selectableRows.length ? new Set() : new Set(selectableRows.map((r) => r.id))));
  };

  const selectedItems = items.filter((i) => selectedIds.has(i.id));

  const openDecision = (item: ApprovalItem, decision: 'approved' | 'rejected') => setDecisionTarget({ items: [item], decision });
  const openBulkDecision = (decision: 'approved' | 'rejected') => setDecisionTarget({ items: selectedItems, decision });

  const submitDecision = (comment: string) => {
    if (!decisionTarget) return;
    const by = role.user || 'Approver';
    if (decisionTarget.items.length === 1) {
      try {
        decideApprovalItem(decisionTarget.items[0], decisionTarget.decision, by, comment);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(decisionTarget.items[0].id);
          return next;
        });
        if (drawerItemId === decisionTarget.items[0].id) setDrawerItemId(null);
        return { succeeded: decisionTarget.items, failed: [] };
      } catch (err) {
        return { succeeded: [], failed: [{ item: decisionTarget.items[0], error: err instanceof Error ? err.message : 'Failed.' }] };
      }
    }
    const outcome = decideApprovalItemsBulk(decisionTarget.items, decisionTarget.decision, by, comment);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      outcome.succeeded.forEach((i) => next.delete(i.id));
      return next;
    });
    return outcome;
  };

  const breachingSla = items.filter((i) => getSlaStatus(i).breached).length;
  const activeDelegationAsDelegate = getActiveDelegationAsDelegatee(role.user || '', 'Procurement') ||
    getActiveDelegationAsDelegatee(role.user || '', 'Finance') ||
    getActiveDelegationAsDelegatee(role.user || '', 'HR') ||
    getActiveDelegationAsDelegatee(role.user || '', 'Operations');

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: 'Workflow' }, { label: 'My Approvals' }]}
        title="My Approvals"
        description="Every pending decision across Procurement, Finance and HR — in one inbox."
        meta={
        <>
            <Badge tone="accent">{role.title}</Badge>
            {breachingSla > 0 && <Badge tone="danger">{breachingSla} breaching SLA</Badge>}
          </>
        } />

      {activeDelegationAsDelegate && (
        <div className="mx-6 mt-4 flex items-center gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 text-xs font-medium text-warning shadow-sm">
          <ShieldAlertIcon className="h-4 w-4 shrink-0" />
          <span>
            You are currently covering {activeDelegationAsDelegate.scope === 'all' ? 'all approvals' : `${activeDelegationAsDelegate.scope} approvals`} for{' '}
            <strong>{activeDelegationAsDelegate.originalApproverName}</strong> until {activeDelegationAsDelegate.endDate}. Decisions you make in scope
            will be logged as acting on their behalf.
          </span>
        </div>
      )}

      <div className="px-6">
        <Tabs
          tabs={[
          { id: 'all', label: 'All Pending', count: byDomain.all.length },
          { id: 'procurement', label: 'Procurement', count: byDomain.procurement.length },
          { id: 'hr', label: 'HR & Leaves', count: byDomain.hr.length },
          { id: 'finance', label: 'Finance & Payments', count: byDomain.finance.length },
          { id: 'delegated', label: 'Delegated', count: delegations.filter((d) => !d.revoked).length }]
          }
          active={tab}
          onChange={(id) => {
            setTab(id as TabId);
            setSelectedIds(new Set());
          }} />

      </div>

      {tab === 'delegated' ? (
        <div className="p-6">
          <Panel
            title="Approval Delegations"
            description="Temporary hand-offs of your approval authority, and delegations covering you"
            actions={
              <Button size="xs" variant="primary" icon={UserCogIcon} onClick={() => setIsDelegationModalOpen(true)}>
                Set up delegation
              </Button>
            }
            bodyClassName="p-0"
          >
            {delegations.length === 0 ? (
              <StateBlock
                title="Nothing delegated"
                description="When you delegate approval authority — for leave or travel — the delegated items appear here."
                primary={{ label: 'Set up delegation', onClick: () => setIsDelegationModalOpen(true) }}
              />
            ) : (
              <ul className="divide-y divide-line">
                {delegations.map((d) => {
                  const isMine = d.originalApproverName === role.user;
                  const coversMe = d.delegateeName === role.user;
                  const isActiveNow = !d.revoked && d.startDate <= new Date().toISOString().slice(0, 10) && d.endDate >= new Date().toISOString().slice(0, 10);
                  return (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-ink">
                            {d.originalApproverName} <ClockIcon className="inline h-3 w-3 mx-0.5 text-faint" /> {d.delegateeName}
                          </span>
                          <Badge tone="neutral">{d.scope === 'all' ? 'All domains' : d.scope}</Badge>
                          {d.revoked ? (
                            <Badge tone="neutral">Revoked</Badge>
                          ) : isActiveNow ? (
                            <Badge tone="success">Active</Badge>
                          ) : (
                            <Badge tone="warning">{d.startDate > new Date().toISOString().slice(0, 10) ? 'Upcoming' : 'Expired'}</Badge>
                          )}
                          {isMine && <Badge tone="accent">Set by you</Badge>}
                          {coversMe && <Badge tone="accent">You cover this</Badge>}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {d.startDate} → {d.endDate}
                          {d.reason ? ` · ${d.reason}` : ''}
                        </p>
                      </div>
                      {isMine && !d.revoked && (
                        <Button size="xs" variant="ghost" icon={UndoIcon} onClick={() => revokeDelegation(d.id)}>
                          Revoke
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      ) : (
      <div className="p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-2xs font-semibold uppercase tracking-wider text-faint">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
              className="h-8 rounded border border-line bg-surface px-2.5 text-xs font-medium text-ink focus:border-accent focus:outline-none"
            >
              <option value="all">All</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft/30 px-3 py-1.5">
              <span className="text-xs font-medium text-ink">{selectedIds.size} selected (under ৳20,000, low-risk)</span>
              <Button size="xs" variant="success" icon={CheckIcon} onClick={() => openBulkDecision('approved')}>
                Approve selected
              </Button>
              <Button size="xs" variant="danger" icon={MessageSquareXIcon} onClick={() => openBulkDecision('rejected')}>
                Reject selected
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-line bg-subtle">
            <StateBlock
              title="Nothing pending"
              description="Nothing in this view is waiting on a decision right now."
              primary={{ label: 'Set up delegation', onClick: () => setIsDelegationModalOpen(true) }}
            />
          </div>
        ) : (
          <>
            {selectableRows.length > 1 && (
              <label className="flex items-center gap-2 px-1 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={selectedIds.size === selectableRows.length}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 accent-[#3B82F6]"
                />
                Select all {selectableRows.length} low-risk items in this view
              </label>
            )}

            <ul className="space-y-2">
              {rows.map((item) => {
                const meta = TYPE_META[item.type];
                const Icon = meta.icon;
                return (
                  <li key={item.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setDrawerItemId(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDrawerItemId(item.id);
                        }
                      }}
                      className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-subtle px-4 py-3 text-left transition-colors duration-100 ease-out hover:border-line-strong hover:bg-surface cursor-pointer"
                    >
                      {item.bulkEligible && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5 accent-[#3B82F6]"
                        />
                      )}

                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-muted">
                        <Icon className="h-4 w-4" />
                      </span>

                      <span className="min-w-[220px] flex-1">
                        <span className="flex items-center gap-2 flex-wrap">
                          <Badge tone="neutral">{meta.label}</Badge>
                          <Badge tone={PRIORITY_TONE[item.priority]}>{item.priority}</Badge>
                          {(() => {
                            const sla = getSlaStatus(item);
                            return (
                              <Badge tone={sla.tone} className="inline-flex items-center gap-1">
                                <ClockIcon className="h-3 w-3" /> {sla.label}
                              </Badge>
                            );
                          })()}
                        </span>
                        <span className="mt-1 block truncate text-md font-medium text-ink">{item.title}</span>
                        <span className="block text-sm text-muted">
                          {item.requester} · {item.department ? `${item.department} · ` : ''}
                          {item.company} · {item.createdAt}
                        </span>
                      </span>

                      <span className="text-right">
                        {typeof item.amount === 'number' && (
                          <span className="block font-mono tabular text-lg font-semibold text-ink">{formatCurrency(item.amount)}</span>
                        )}
                        <span className="block text-sm text-muted">{item.stage}</span>
                      </span>

                      {can('pr.approve') && (
                        <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="success" onClick={() => openDecision(item, 'approved')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => openDecision(item, 'rejected')}>
                            Reject
                          </Button>
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      )}

      {/* Inline detail drawer */}
      {drawerItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setDrawerItemId(null)}>
          <div
            className="h-full w-full max-w-lg overflow-y-auto border-l border-line bg-surface p-6 shadow-pop animate-in slide-in-from-right duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = TYPE_META[drawerItem.type].icon;
                  return (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                  );
                })()}
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wider text-faint">{TYPE_META[drawerItem.type].label}</p>
                  <h2 className="text-lg font-bold text-ink leading-tight">{drawerItem.title}</h2>
                </div>
              </div>
              <button onClick={() => setDrawerItemId(null)} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(() => {
                const sla = getSlaStatus(drawerItem);
                return (
                  <Badge tone={sla.tone} className="inline-flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" /> {sla.label}
                  </Badge>
                );
              })()}
              {(drawerItem.type === 'purchase_request' || drawerItem.type === 'budget_override') && (
                <Button size="xs" variant="ghost" onClick={() => navigate(`/approvals/${drawerItem.sourceId}`)}>
                  Open full page →
                </Button>
              )}
            </div>

            {drawerItem.notes.some((n) => n.actingFor) && (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-soft/30 p-3.5">
                <ShieldAlertIcon className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                <p className="text-xs text-ink">
                  A decision on this item was made by a delegate acting on behalf of another approver — see the note below.
                </p>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-line bg-subtle/70 p-3.5">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-faint">Requester</p>
                <p className="mt-0.5 text-sm text-ink">{drawerItem.requester}</p>
              </div>
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-faint">Company</p>
                <p className="mt-0.5 text-sm text-ink">{drawerItem.company}</p>
              </div>
              {drawerItem.department && (
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wider text-faint">Department</p>
                  <p className="mt-0.5 text-sm text-ink">{drawerItem.department}</p>
                </div>
              )}
              {typeof drawerItem.amount === 'number' && (
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wider text-faint">Amount</p>
                  <p className="mt-0.5 font-mono text-sm text-ink">{formatCurrency(drawerItem.amount)}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-2xs font-semibold uppercase tracking-wider text-faint">Current Stage</p>
                <p className="mt-0.5 text-sm text-ink">{drawerItem.stage}</p>
              </div>
              <div className="col-span-2">
                <p className="text-2xs font-semibold uppercase tracking-wider text-faint">Detail</p>
                <p className="mt-0.5 text-sm text-muted">{drawerItem.subtitle}</p>
              </div>
            </div>

            <div className="mt-4">
              <Panel title="History">
                <ApprovalTimeline steps={drawerItem.history} />
              </Panel>
            </div>

            {drawerItem.notes.length > 0 && (
              <div className="mt-4">
                <Panel title="Approval notes" bodyClassName="divide-y divide-line p-0">
                  {drawerItem.notes.map((n, idx) => (
                    <div key={idx} className="px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-ink">{n.author}</span>
                        <span className="text-xs text-faint">{n.at.slice(0, 10)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        {n.decision && (
                          <Badge tone={n.decision === 'approved' ? 'success' : 'danger'}>
                            {n.decision}
                          </Badge>
                        )}
                        {n.actingFor && <Badge tone="warning">Acting for {n.actingFor}</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted">{n.text}</p>
                    </div>
                  ))}
                </Panel>
              </div>
            )}

            {can('pr.approve') && (
              <div className={cn('mt-5 flex items-center gap-2 border-t border-line pt-4', 'sticky bottom-0 bg-surface')}>
                <Button variant="success" icon={CheckIcon} className="flex-1" onClick={() => openDecision(drawerItem, 'approved')}>
                  Approve
                </Button>
                <Button variant="danger" icon={MessageSquareXIcon} className="flex-1" onClick={() => openDecision(drawerItem, 'rejected')}>
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <ApprovalDecisionModal
        isOpen={Boolean(decisionTarget)}
        items={decisionTarget?.items || []}
        decision={decisionTarget?.decision || null}
        onClose={() => setDecisionTarget(null)}
        onSubmit={submitDecision}
      />

      <DelegationModal
        isOpen={isDelegationModalOpen}
        onClose={() => setIsDelegationModalOpen(false)}
        onSuccess={() => setDelegations(getDelegationRules())}
      />
    </div>);

}