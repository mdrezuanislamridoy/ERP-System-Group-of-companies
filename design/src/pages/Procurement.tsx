import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  PlusIcon,
  ClipboardCheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PackageCheckIcon,
  PrinterIcon,
  TruckIcon,
  BanIcon,
  CheckIcon
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Metric, MetricRow } from '../components/ui/Metric';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/StatusBadge';
import { Tabs } from '../components/ui/Tabs';
import {
  procurementPipeline,
  suppliers,
  getRFQs,
  subscribeRFQs,
  getPurchaseOrders,
  selectWinningSupplier,
  submitPurchaseOrderForApproval,
  approvePurchaseOrder
} from '../data/operations';
import { formatCurrency, formatCurrencyFull } from '../data/finance';
import { group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import { CreateRFQModal } from '../components/procurement/CreateRFQModal';
import { SubmitQuoteModal } from '../components/procurement/SubmitQuoteModal';
import { QuotationComparisonMatrix } from '../components/procurement/QuotationComparisonMatrix';
import { CreatePurchaseOrderModal } from '../components/procurement/CreatePurchaseOrderModal';
import { PurchaseOrderPrintModal } from '../components/procurement/PurchaseOrderPrintModal';
import { CancelPurchaseOrderModal } from '../components/procurement/CancelPurchaseOrderModal';
import { recordAuditEvent } from '../data/system';
import type { RFQ, SupplierQuote, RFQStatus, PurchaseOrder, POStatus } from '../types';

const RFQ_STATUS_TONE: Record<RFQStatus, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'neutral',
  open: 'info',
  closed: 'warning',
  awarded: 'success',
  cancelled: 'danger'
};

const PO_STATUS_TONE: Record<POStatus, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  Draft: 'neutral',
  'Pending Approval': 'warning',
  Issued: 'info',
  'Partially Received': 'warning',
  Completed: 'success',
  Cancelled: 'danger'
};

export function Procurement() {
  const navigate = useNavigate();
  const { companyName, companyId, can, role } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'rfq' | 'po'>('overview');
  const [rfqs, setRfqs] = useState(getRFQs());
  const [purchaseOrders, setPurchaseOrders] = useState(getPurchaseOrders());
  const [expandedRfqId, setExpandedRfqId] = useState<string | null>(null);
  const [isCreateRfqOpen, setIsCreateRfqOpen] = useState(false);
  const [quoteTargetRfq, setQuoteTargetRfq] = useState<RFQ | null>(null);
  const [isCreatePoOpen, setIsCreatePoOpen] = useState(false);
  const [printTargetPo, setPrintTargetPo] = useState<PurchaseOrder | null>(null);
  const [cancelTargetPo, setCancelTargetPo] = useState<PurchaseOrder | null>(null);

  useEffect(
    () =>
      subscribeRFQs(() => {
        setRfqs(getRFQs());
        setPurchaseOrders(getPurchaseOrders());
      }),
    []
  );

  const scopedRfqs = can('group.read') || !companyId || companyId === '*' || companyId === 'all'
    ? rfqs
    : rfqs.filter((r) => r.companyId === companyId || r.companyId === companyId.replace(/^c-/, 'le-') || r.companyId === companyId.replace(/^le-/, 'c-'));

  const scopedPOs = can('group.read') || !companyId || companyId === '*' || companyId === 'all'
    ? purchaseOrders
    : purchaseOrders.filter((p) => p.companyId === companyId || p.companyId === companyId.replace(/^c-/, 'le-') || p.companyId === companyId.replace(/^le-/, 'c-'));

  const handleSelectWinner = (rfq: RFQ, quote: SupplierQuote) => {
    const { purchaseOrder } = selectWinningSupplier(rfq.id, quote.id, role.user || 'Procurement Officer');
    recordAuditEvent({
      user: role.user || 'Procurement Officer',
      action: 'AWARD_RFQ',
      resource: `${rfq.rfqNumber} → ${quote.supplierName}`,
      company: rfq.companyName,
      before: `${rfq.quotes.length} quote(s) under comparison`,
      after: `Awarded ${formatCurrency(quote.totalAmount)} — draft ${purchaseOrder.poNumber} generated`
    });
  };

  const handleSubmitForApproval = (po: PurchaseOrder) => {
    submitPurchaseOrderForApproval(po.id, role.user || 'Procurement Officer');
    recordAuditEvent({
      user: role.user || 'Procurement Officer',
      action: 'SUBMIT_PO_FOR_APPROVAL',
      resource: po.poNumber,
      company: po.companyName,
      before: 'Draft',
      after: 'Pending Approval'
    });
  };

  const handleApproveAndIssue = (po: PurchaseOrder) => {
    approvePurchaseOrder(po.id, role.user || 'Procurement Manager');
    recordAuditEvent({
      user: role.user || 'Procurement Manager',
      action: 'APPROVE_AND_ISSUE_PO',
      resource: po.poNumber,
      company: po.companyName,
      before: 'Pending Approval',
      after: `Issued — ${formatCurrencyFull(po.totalAmount)} to ${po.supplierName}`
    });
  };

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: companyName }, { label: 'Procurement' }, { label: 'Overview' }]}
        title="Procurement"
        description="From request to payment — the full source-to-pay pipeline for your context."
        meta={<Badge tone="accent">Context: {companyName}</Badge>}
        actions={
          activeTab === 'rfq' ? (
            <Button variant="primary" icon={PlusIcon} onClick={() => setIsCreateRfqOpen(true)}>
              Create RFQ
            </Button>
          ) : activeTab === 'po' ? (
            <Button variant="primary" icon={PlusIcon} onClick={() => setIsCreatePoOpen(true)}>
              New Purchase Order
            </Button>
          ) : (
            <Button variant="primary" onClick={() => navigate('/procurement/requests')}>
              Purchase requests
            </Button>
          )
        } />


      <div className="space-y-4 p-6">
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'rfq', label: 'RFQ Management', count: scopedRfqs.length },
            { id: 'po', label: 'Purchase Orders', count: scopedPOs.length }
          ]}
          active={activeTab}
          onChange={(id) => setActiveTab(id as 'overview' | 'rfq' | 'po')}
        />

        {activeTab === 'overview' && (
        <>
        <MetricRow columns={6}>
          <Metric label="Pending Requests" value="34" sub="৳1.84 Cr" emphasis />
          <Metric label="Open RFQs" value="12" sub="4 closing this week" />
          <Metric label="Purchase Orders" value="27" sub="৳3.14 Cr committed" />
          <Metric label="Pending Approvals" value="21" delta="6 late" tone="danger" />
          <Metric label="Monthly Procurement" value="৳6.2 Cr" delta="+9.1%" tone="warning" />
          <Metric label="Active Suppliers" value="184" sub="12 under review" />
        </MetricRow>

        <Panel title="Source-to-pay pipeline" description="Documents in flight at each stage, with committed value" bodyClassName="p-4">
          <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
            {procurementPipeline.map((s, i) =>
            <React.Fragment key={s.stage}>
                <li className="flex-1 rounded border border-line bg-canvas px-3 py-2.5">
                  <p className="text-sm text-muted">{s.stage}</p>
                  <p className="mt-1 font-mono text-lg font-semibold leading-none text-ink">{s.count}</p>
                  <p className="mt-1 font-mono text-sm text-muted">{formatCurrency(s.value)}</p>
                </li>
                {i < procurementPipeline.length - 1 &&
              <li className="hidden items-center lg:flex" aria-hidden>
                    <ArrowRightIcon className="h-3.5 w-3.5 text-faint" />
                  </li>
              }
              </React.Fragment>
            )}
          </ol>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Panel title="Top suppliers" description="By spend, FY2026 to date" bodyClassName="p-0">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-line">
                  {['Supplier', 'Category', 'Orders', 'Spend', 'Rating'].map((h, i) =>
                  <th
                    key={h}
                    className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide text-faint ${i > 1 ? 'text-right' : 'text-left'}`}>
                    
                      {h}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) =>
                <tr key={s.name} className="border-b border-line/70 last:border-b-0 hover:bg-surface">
                    <td className="px-4 py-2 text-ink">{s.name}</td>
                    <td className="px-4 py-2 text-muted">{s.category}</td>
                    <td className="px-4 py-2 text-right font-mono tabular text-ink">{s.orders}</td>
                    <td className="px-4 py-2 text-right font-mono tabular text-ink">{formatCurrency(s.spend)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular text-muted">{s.rating.toFixed(1)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>

          <Panel title="Requiring action" bodyClassName="divide-y divide-line">
            {[
            { label: '6 approvals breaching 24h SLA', meta: 'Escalation triggers at 48h', tone: 'text-danger' },
            { label: '4 RFQs closing within 3 days', meta: 'No quotations received on 2', tone: 'text-warning' },
            { label: '3 goods receipts pending QC', meta: 'Savar Plant WH-01', tone: 'text-warning' },
            { label: '2 suppliers with expired trade licences', meta: 'Compliance hold applied', tone: 'text-danger' }].
            map((r) =>
            <div key={r.label} className="px-4 py-2.5">
                <p className={`text-base ${r.tone}`}>{r.label}</p>
                <p className="text-sm text-muted">{r.meta}</p>
              </div>
            )}
          </Panel>
        </div>
        </>
        )}

        {activeTab === 'rfq' && (
          <div className="space-y-3">
            {scopedRfqs.length === 0 && (
              <Panel bodyClassName="p-8">
                <p className="text-center text-sm text-muted">No RFQs in the current scope yet.</p>
              </Panel>
            )}

            {scopedRfqs.map((rfq) => {
              const isExpanded = expandedRfqId === rfq.id;
              const po = purchaseOrders.find((p) => p.id === rfq.generatedPurchaseOrderId);

              return (
                <Panel key={rfq.id} bodyClassName="p-0">
                  <div
                    className="flex flex-wrap items-center justify-between gap-4 p-4 cursor-pointer"
                    onClick={() => setExpandedRfqId(isExpanded ? null : rfq.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDownIcon className="h-4 w-4 text-muted" /> : <ChevronRightIcon className="h-4 w-4 text-muted" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-accent">{rfq.rfqNumber}</span>
                          <Badge tone={RFQ_STATUS_TONE[rfq.status]}>{rfq.status.toUpperCase()}</Badge>
                          <span className="text-xs text-muted">{rfq.companyName}</span>
                        </div>
                        <p className="text-sm font-medium text-ink mt-0.5">{rfq.title}</p>
                        <p className="text-xs text-muted mt-0.5">
                          Linked to <span className="font-mono">{rfq.purchaseRequestId}</span> · Due {rfq.dueDate} ·{' '}
                          {rfq.invitedSuppliers.length} invited · {rfq.quotes.length} quote(s) received
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {rfq.status !== 'awarded' && rfq.status !== 'cancelled' && (
                        <Button
                          size="xs"
                          variant="secondary"
                          icon={ClipboardCheckIcon}
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuoteTargetRfq(rfq);
                          }}
                        >
                          Record Quote
                        </Button>
                      )}
                      {rfq.winningSupplierName && (
                        <Badge tone="success">Awarded → {rfq.winningSupplierName}</Badge>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-line">
                      <QuotationComparisonMatrix
                        rfq={rfq}
                        canAward={can('pr.approve') && rfq.status !== 'cancelled'}
                        onSelectWinner={(quote) => handleSelectWinner(rfq, quote)}
                      />

                      {po && (
                        <div className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/30 bg-success-soft/20 p-4">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                              <PackageCheckIcon className="h-4 w-4 text-success" />
                              Purchase Order {po.poNumber}
                              <Badge tone={PO_STATUS_TONE[po.status]}>{po.status}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted">
                              {po.supplierName} · {formatCurrencyFull(po.totalAmount)} · carried forward from {rfq.rfqNumber}, awarded by{' '}
                              {rfq.awardedBy} on {rfq.awardedAt?.slice(0, 10)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="xs" variant="secondary" icon={PrinterIcon} onClick={() => setPrintTargetPo(po)}>
                              View / Print
                            </Button>
                            <Button size="xs" variant="ghost" onClick={() => setActiveTab('po')}>
                              Open in Purchase Orders →
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Panel>
              );
            })}
          </div>
        )}

        {activeTab === 'po' && (
          <Panel bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-line bg-surface/40">
                    {['PO #', 'Supplier', 'Entity', 'Total', 'Status', 'Created', ''].map((h, idx) => (
                      <th
                        key={h}
                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-faint ${idx === 3 ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scopedPOs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                        No Purchase Orders in the current scope yet.
                      </td>
                    </tr>
                  )}
                  {scopedPOs.map((po) => {
                    const canApprove = can('pr.approve');
                    const isTerminal = po.status === 'Completed' || po.status === 'Cancelled';
                    return (
                      <tr key={po.id} className="border-b border-line/70 last:border-b-0 hover:bg-surface">
                        <td className="px-4 py-2.5 font-mono text-sm font-medium text-accent">{po.poNumber}</td>
                        <td className="px-4 py-2.5 text-sm text-ink">{po.supplierName}</td>
                        <td className="px-4 py-2.5 text-xs text-muted">{po.companyName}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular text-sm text-ink">{formatCurrencyFull(po.totalAmount)}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={PO_STATUS_TONE[po.status]}>{po.status}</Badge>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted whitespace-nowrap">{po.createdAt.slice(0, 10)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <Button size="xs" variant="ghost" icon={PrinterIcon} onClick={() => setPrintTargetPo(po)}>
                              Print
                            </Button>
                            {po.status === 'Draft' && (
                              <Button size="xs" variant="secondary" onClick={() => handleSubmitForApproval(po)}>
                                Submit for Approval
                              </Button>
                            )}
                            {po.status === 'Pending Approval' && canApprove && (
                              <Button size="xs" variant="primary" icon={CheckIcon} onClick={() => handleApproveAndIssue(po)}>
                                Approve & Issue
                              </Button>
                            )}
                            {(po.status === 'Issued' || po.status === 'Partially Received') && (
                              <Button
                                size="xs"
                                variant="secondary"
                                icon={TruckIcon}
                                onClick={() => navigate(`/inventory?tab=grn&po=${po.id}`)}
                              >
                                Receive in Warehouse
                              </Button>
                            )}
                            {!isTerminal && (
                              <Button size="xs" variant="ghost" icon={BanIcon} onClick={() => setCancelTargetPo(po)}>
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>

      <CreateRFQModal
        isOpen={isCreateRfqOpen}
        onClose={() => setIsCreateRfqOpen(false)}
        onSuccess={(rfq) => setExpandedRfqId(rfq.id)}
      />

      <SubmitQuoteModal
        isOpen={Boolean(quoteTargetRfq)}
        rfq={quoteTargetRfq ? rfqs.find((r) => r.id === quoteTargetRfq.id) || quoteTargetRfq : null}
        onClose={() => setQuoteTargetRfq(null)}
        onSuccess={() => setQuoteTargetRfq(null)}
      />

      <CreatePurchaseOrderModal
        isOpen={isCreatePoOpen}
        onClose={() => setIsCreatePoOpen(false)}
        onSuccess={() => setActiveTab('po')}
      />

      <PurchaseOrderPrintModal
        isOpen={Boolean(printTargetPo)}
        po={printTargetPo ? purchaseOrders.find((p) => p.id === printTargetPo.id) || printTargetPo : null}
        onClose={() => setPrintTargetPo(null)}
      />

      <CancelPurchaseOrderModal
        isOpen={Boolean(cancelTargetPo)}
        po={cancelTargetPo ? purchaseOrders.find((p) => p.id === cancelTargetPo.id) || cancelTargetPo : null}
        onClose={() => setCancelTargetPo(null)}
        onSuccess={() => setCancelTargetPo(null)}
      />
    </div>);

}