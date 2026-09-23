import React, { useEffect, useState } from 'react';
import { PlusIcon, XIcon, ShieldAlertIcon, ArrowRightLeftIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { getInvoices, subscribeInvoiceOverrides, formatCurrency, formatCurrencyFull, computeThreeWayMatch, approveInvoiceForPayment } from '../data/finance';
import { companies, group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import { useEntityScope } from '../contexts/EntityScopeContext';
import { recordAuditEvent } from '../data/system';
import { ThreeWayMatchCard } from '../components/finance/ThreeWayMatchCard';
import { InvoiceMatchOverrideModal } from '../components/finance/InvoiceMatchOverrideModal';
import type { Invoice, InvoiceMatchStatus } from '../types';

const MATCH_STATUS_TONE: Record<InvoiceMatchStatus, 'neutral' | 'success' | 'danger' | 'warning'> = {
  Unmatched: 'neutral',
  Matched: 'success',
  Discrepancy: 'danger',
  Bypassed: 'warning'
};

export function Invoices() {
  const { can, density, companyName, role } = useApp();
  const { filterInvoices, activeCompanyName } = useEntityScope();
  const [tab, setTab] = useState('all');
  const [invoices, setInvoices] = useState(getInvoices());
  const [detailInvoiceId, setDetailInvoiceId] = useState<string | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<Invoice | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  useEffect(() => subscribeInvoiceOverrides(() => setInvoices(getInvoices())), []);

  const scoped = filterInvoices(invoices);
  const rows =
    tab === 'all'
      ? scoped
      : tab === 'payable'
      ? scoped.filter((i) => i.type === 'Payable')
      : tab === 'receivable'
      ? scoped.filter((i) => i.type === 'Receivable')
      : scoped.filter((i) => i.isInterCompany);

  const detailInvoice = detailInvoiceId ? invoices.find((i) => i.id === detailInvoiceId) || null : null;
  const detailMatch = detailInvoice ? computeThreeWayMatch(detailInvoice) : null;
  const detailEffectiveStatus: InvoiceMatchStatus | null = detailInvoice
    ? detailInvoice.matchStatus === 'Bypassed'
      ? 'Bypassed'
      : detailMatch?.status || 'Unmatched'
    : null;
  const detailCanApprove = detailEffectiveStatus === 'Matched' || detailEffectiveStatus === 'Bypassed';

  const handleApprove = (invoice: Invoice) => {
    setApproveError(null);
    try {
      approveInvoiceForPayment(invoice.id, role.user || 'Finance Manager');
      recordAuditEvent({
        user: role.user || 'Finance Manager',
        action: 'APPROVE_INVOICE_FOR_PAYMENT',
        resource: invoice.id,
        company: invoice.company,
        before: invoice.status,
        after: `Approved — ${formatCurrencyFull(invoice.amount)}`
      });
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : 'Failed to approve invoice.');
    }
  };

  const effectiveMatchStatus = (i: Invoice): InvoiceMatchStatus | null => {
    if (i.type !== 'Payable' || !i.poId) return null;
    if (i.matchStatus === 'Bypassed') return 'Bypassed';
    return computeThreeWayMatch(i).status;
  };

  const columns: Array<Column<Invoice>> = [
    {
      key: 'id',
      header: 'Invoice',
      mono: true,
      sortable: true,
      hideable: false,
      value: (i) => i.id,
      render: (i) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono">{i.id}</span>
          {i.isInterCompany && (
            <Badge tone="accent" className="text-2xs inline-flex items-center gap-0.5">
              <ArrowRightLeftIcon className="h-2.5 w-2.5" /> Inter-Co
            </Badge>
          )}
        </div>
      )
    },
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
    key: 'match',
    header: '3-Way Match',
    value: (i) => effectiveMatchStatus(i) || '',
    render: (i) => {
      const status = effectiveMatchStatus(i);
      return status ? <Badge tone={MATCH_STATUS_TONE[status]}>{status}</Badge> : <span className="text-faint text-sm">—</span>;
    }
  },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    hideable: false,
    value: () => '',
    render: (i) =>
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="xs" variant="ghost" onClick={() => setDetailInvoiceId(i.id)}>
            View
          </Button>
          {can('invoice.update') && i.status === 'draft' &&
      <Button size="xs" variant="ghost">
              Edit
            </Button>
      }
          {can('invoice.approve') && i.status === 'pending' && i.type === 'Payable' &&
      <Button
        size="xs"
        variant="success"
        disabled={Boolean(i.poId) && !['Matched', 'Bypassed'].includes(effectiveMatchStatus(i) || '')}
        title={
          i.poId && !['Matched', 'Bypassed'].includes(effectiveMatchStatus(i) || '')
            ? 'Blocked by 3-Way Match — open the invoice to review or override'
            : 'Approve for payment'
        }
        onClick={() => handleApprove(i)}
      >
              Approve
            </Button>
      }
          {can('invoice.approve') && i.status === 'pending' && i.type === 'Receivable' &&
      <Button size="xs" variant="success" onClick={() => handleApprove(i)}>
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
        meta={<Badge tone="accent">Context: {activeCompanyName ?? 'All companies'}</Badge>}
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
            { id: 'receivable', label: 'Accounts Receivable', count: scoped.filter((i) => i.type === 'Receivable').length },
            { id: 'intercompany', label: 'Inter-Company', count: scoped.filter((i) => i.isInterCompany).length }
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      <div className="p-6">
        {can('invoice.create') &&
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-line bg-subtle px-4 py-2.5">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            <p className="text-base text-muted">
              New invoices will be created for{' '}
              <span className="font-medium text-ink">{activeCompanyName ?? 'ABC Foods Ltd.'}</span> · Finance Department. Switch
              context from the top bar before creating records for another company.
            </p>
          </div>
        }

        {approveError && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-danger/40 bg-danger-soft/30 px-4 py-2.5">
            <ShieldAlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p className="text-sm text-ink">{approveError}</p>
          </div>
        )}

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
          onRowClick={(i) => setDetailInvoiceId(i.id)}
          emptyTitle="No invoices"
          emptyDescription="No invoices exist for this context yet." />

      </div>

      {detailInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div
            className="w-full max-w-3xl rounded-2xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <h2 className="text-lg font-bold text-ink">{detailInvoice.id}</h2>
                <p className="text-xs text-muted">
                  {detailInvoice.party} · {detailInvoice.company} · {detailInvoice.type}
                </p>
              </div>
              <button
                onClick={() => setDetailInvoiceId(null)}
                className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-line bg-subtle/70 p-3.5 sm:grid-cols-4">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-faint">Amount</p>
                <p className="mt-0.5 font-mono text-sm text-ink">{formatCurrencyFull(detailInvoice.amount)}</p>
              </div>
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-faint">Balance</p>
                <p className="mt-0.5 font-mono text-sm text-ink">{formatCurrencyFull(detailInvoice.balance)}</p>
              </div>
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-faint">Issued / Due</p>
                <p className="mt-0.5 text-sm text-ink">{detailInvoice.issued} → {detailInvoice.due}</p>
              </div>
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-faint">Status</p>
                <div className="mt-0.5"><StatusBadge status={detailInvoice.status} /></div>
              </div>
            </div>

            {detailInvoice.isInterCompany && (
              <div className="mt-4 rounded-xl border border-accent/40 bg-accent-soft/20 p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <ArrowRightLeftIcon className="h-4 w-4 text-accent shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-accent">
                    Inter-Company Auto-Mirroring Synchronization
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg border border-line bg-surface/80 p-2.5">
                    <p className="text-2xs font-semibold uppercase tracking-wider text-faint">Sister Entity Trade</p>
                    <p className="mt-0.5 font-medium text-ink truncate">
                      {detailInvoice.company} ↔ {detailInvoice.party}
                    </p>
                  </div>
                  <div className="rounded-lg border border-line bg-surface/80 p-2.5">
                    <p className="text-2xs font-semibold uppercase tracking-wider text-faint">Mirrored Counterpart Invoice</p>
                    <p className="mt-0.5 font-mono font-medium text-accent">
                      {detailInvoice.mirroredInvoiceId || 'Synchronized Cross-Entity Draft'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-line bg-surface/80 p-2.5">
                    <p className="text-2xs font-semibold uppercase tracking-wider text-faint">Cross-Entity Line Parity</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-success font-semibold">
                      <span className="h-2 w-2 rounded-full bg-success" />
                      <span>100% Synchronized</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {detailInvoice.type === 'Payable' && detailInvoice.poId ? (
              <div className="mt-4">
                <ThreeWayMatchCard invoice={detailInvoice} />
              </div>
            ) : detailInvoice.type === 'Payable' ? (
              <Panel bodyClassName="p-6 mt-4">
                <p className="text-center text-xs text-muted">
                  This invoice isn't linked to a Purchase Order — 3-Way Matching doesn't apply.
                </p>
              </Panel>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-3 border-t border-line pt-4">
              <Button variant="secondary" onClick={() => setDetailInvoiceId(null)}>
                Close
              </Button>
              {can('invoice.approve') && detailInvoice.type === 'Payable' && detailInvoice.status === 'pending' && (
                <>
                  {detailInvoice.poId && !detailCanApprove && (
                    <Button variant="danger" icon={ShieldAlertIcon} onClick={() => setOverrideTarget(detailInvoice)}>
                      Executive Override
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    disabled={Boolean(detailInvoice.poId) && !detailCanApprove}
                    title={detailInvoice.poId && !detailCanApprove ? 'Blocked by 3-Way Match' : 'Approve for payment'}
                    onClick={() => handleApprove(detailInvoice)}
                  >
                    Approve for Payment
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <InvoiceMatchOverrideModal
        isOpen={Boolean(overrideTarget)}
        invoice={overrideTarget}
        onClose={() => setOverrideTarget(null)}
        onSuccess={() => setOverrideTarget(null)}
      />
    </div>);

}