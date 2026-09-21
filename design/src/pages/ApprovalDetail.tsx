import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, CheckIcon, MessageSquareIcon, PaperclipIcon, XIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel, KeyValue } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { ApprovalTimeline } from '../components/ApprovalTimeline';
import { approvalSteps, prItems, purchaseRequests } from '../data/operations';
import { group } from '../data/organization';
import { recordAuditEvent } from '../data/system';
import { useApp } from '../contexts/AppContext';
import { useEntityScope } from '../contexts/EntityScopeContext';
import { NotFound } from './NotFound';
import { Unauthorized } from './Unauthorized';

export function ApprovalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can, role } = useApp();
  const { canAccessCompany, canApproveAmount, scope } = useEntityScope();
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'changes' | null>(null);
  const [comment, setComment] = useState('');

  const request = purchaseRequests.find((p) => p.id === id);
  if (!request) return <NotFound />;

  // ABAC Scope Check
  if (!canAccessCompany(request.company)) {
    const audit = recordAuditEvent({
      user: role.user || 'Unknown User',
      action: 'SECURITY_ABAC_DENIAL',
      resource: `PR:${request.id} (${request.title})`,
      company: request.company,
      before: `Attempted access to PR belonging to ${request.company}`,
      after: 'Blocked: ERR_ABAC_COMPANY_ISOLATION (403 Forbidden)',
    });

    return (
      <Unauthorized
        reasonCode="ERR_ABAC_COMPANY_ISOLATION"
        attemptedResource={`Purchase Request ${request.id} · ${request.company}`}
        entityName={request.company}
        correlationId={audit.correlation}
      />
    );
  }

  const approvalCheck = canApproveAmount(request.amount);

  const total = prItems.reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[
        { label: group.name, to: '/' },
        { label: request.company },
        { label: 'Procurement', to: '/procurement' },
        { label: 'Purchase Requests', to: '/procurement/requests' },
        { label: request.id }]
        }
        title={`Purchase Request ${request.id}`}
        description={request.title}
        meta={
        <>
            <StatusBadge status={decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : request.status} />
            <Badge tone={request.priority === 'Critical' ? 'danger' : 'warning'}>{request.priority} priority</Badge>
            <span className="text-sm text-muted">Raised {request.created}</span>
          </>
        }
        actions={
        <Button icon={ArrowLeftIcon} onClick={() => navigate('/approvals')}>
            Back to approvals
          </Button>
        } />
      

      <div className="grid gap-4 p-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel title="Request summary">
            <dl className="grid gap-x-6 sm:grid-cols-2">
              <KeyValue label="Requested by" value={`${request.requester} · Procurement Officer`} />
              <KeyValue label="Department" value={request.department} />
              <KeyValue label="Company" value={request.company} />
              <KeyValue label="Cost center" value="CC-PRD-014" mono />
              <KeyValue label="Amount" value={`৳${request.amount.toLocaleString('en-IN')}`} mono />
              <KeyValue label="Budget remaining" value="৳2,140,000 (Q4 raw material)" mono />
            </dl>
            <p className="mt-3 rounded border border-line bg-canvas px-3 py-2 text-base text-muted">
              <span className="text-ink">Justification: </span>
              Raw material procurement to cover the Q4 production plan for Line A and Line B. Current stock covers 11
              days against a 30-day policy minimum.
            </p>
          </Panel>

          <Panel title="Items" description={`${prItems.length} line items`} bodyClassName="p-0">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-line">
                  {['Product', 'SKU', 'Qty', 'Unit price', 'Total'].map((h, i) =>
                  <th
                    key={h}
                    className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide text-faint ${i > 1 ? 'text-right' : 'text-left'}`}>
                    
                      {h}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {prItems.map((item) =>
                <tr key={item.sku} className="border-b border-line/70 last:border-b-0">
                    <td className="px-4 py-2 text-ink">{item.product}</td>
                    <td className="px-4 py-2 font-mono text-sm text-muted">{item.sku}</td>
                    <td className="px-4 py-2 text-right font-mono tabular text-ink">
                      {item.qty} {item.unit}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular text-muted">৳{item.price}</td>
                    <td className="px-4 py-2 text-right font-mono tabular text-ink">
                      ৳{item.total.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-surface">
                  <td colSpan={4} className="px-4 py-2 text-right text-base font-medium text-muted">
                    Total
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular text-md font-semibold text-ink">
                    ৳{total.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Panel>

          <Panel title="Attachments" bodyClassName="divide-y divide-line">
            {['Supplier-quotation-Meghna.pdf · 240 KB', 'Q4-production-plan.xlsx · 88 KB'].map((f) =>
            <div key={f} className="flex items-center gap-2 px-4 py-2.5">
                <PaperclipIcon className="h-3.5 w-3.5 text-muted" aria-hidden />
                <span className="text-base text-ink">{f}</span>
                <Button size="xs" variant="ghost" className="ml-auto">
                  Download
                </Button>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Approval timeline" description="Workflow: Procurement — Raw Material">
            <ApprovalTimeline steps={approvalSteps} />
          </Panel>

          {can('pr.approve') ?
          <Panel title="Your decision">
              {decision ?
            <div className="rounded border border-line bg-canvas px-3 py-3">
                  <p className="text-base text-ink">
                    {decision === 'approved' ?
                'Approved and routed to Group CFO.' :
                decision === 'rejected' ?
                'Rejected and returned to the requester.' :
                'Sent back to the requester for changes.'}
                  </p>
                  <p className="mt-1 text-sm text-muted">Recorded 21 Sep 2026, 11:06 · audit id c-8f21b7</p>
                  <Button className="mt-3" onClick={() => setDecision(null)}>
                    Undo
                  </Button>
                </div> :

                  {!approvalCheck.allowed && (
                    <div className="mb-3 rounded border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                      <p className="font-semibold">⚠️ Financial Approval Ceiling Exceeded</p>
                      <p className="mt-0.5">
                        Amount of ৳{request.amount.toLocaleString('en-IN')} exceeds your approval ceiling of ৳{approvalCheck.limit.toLocaleString('en-IN')}.
                        Direct approval is disabled; this request must be escalated to Group CFO.
                      </p>
                    </div>
                  )}

                  <label htmlFor="approval-comment" className="mb-1.5 block text-sm font-medium text-muted">
                    Comment <span className="text-faint">(required when rejecting)</span>
                  </label>
                  <textarea
                id="approval-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Add context for the next approver..."
                className="w-full rounded border border-line bg-canvas px-2.5 py-2 text-base text-ink placeholder:text-faint focus:border-accent focus:outline-none" />
              
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="success"
                      size="md"
                      icon={CheckIcon}
                      onClick={() => setDecision('approved')}
                      disabled={!approvalCheck.allowed}
                      title={!approvalCheck.allowed ? 'Amount exceeds your approval limit' : undefined}
                    >
                      Approve
                    </Button>
                    <Button variant="danger" size="md" icon={XIcon} onClick={() => setDecision('rejected')}>
                      Reject
                    </Button>
                    <Button size="md" icon={MessageSquareIcon} onClick={() => setDecision('changes')}>
                      Request changes
                    </Button>
                  </div>
                  <p className="mt-3 border-t border-line pt-2.5 text-sm text-muted">
                    You are acting as <span className="text-ink">{role.title}</span> for{' '}
                    <span className="text-ink">{request.company}</span>. Approval limit: ৳{approvalCheck.limit === Infinity ? 'Unlimited' : approvalCheck.limit.toLocaleString('en-IN')}.
                  </p>
                </>
            }
            </Panel> :

          <Panel title="Your decision">
              <p className="text-base text-muted">
                You have view-only access to this request. Approval requires the <span className="text-ink">pr.approve</span>{' '}
                permission for {request.company}.
              </p>
            </Panel>
          }
        </div>
      </div>
    </div>);

}