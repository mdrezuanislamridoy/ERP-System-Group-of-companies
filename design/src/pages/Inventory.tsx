import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { PackageSearchIcon, UndoIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { Panel } from '../components/ui/Panel';
import { Metric, MetricRow } from '../components/ui/Metric';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { getStock, subscribeInventory, warehouses, getGoodsReceiptNotes, getReturnToVendorTickets, setReturnToVendorStatus } from '../data/operations';
import { formatCurrency } from '../data/finance';
import { group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import { recordAuditEvent } from '../data/system';
import { cn } from '../utils/cn';
import { ReceiveGoodsModal } from '../components/inventory/ReceiveGoodsModal';
import type { StockItem, RTVStatus } from '../types';

const RTV_STATUS_TONE: Record<RTVStatus, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  open: 'danger',
  'shipped-back': 'warning',
  resolved: 'success',
  cancelled: 'neutral'
};

export function Inventory() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { density, companyName, role } = useApp();
  const [tab, setTab] = useState(
    location.pathname.includes('warehouses') ? 'warehouses' : searchParams.get('tab') === 'grn' ? 'grn' : 'stock'
  );
  const [stock, setStock] = useState(getStock());
  const [grns, setGrns] = useState(getGoodsReceiptNotes());
  const [rtvTickets, setRtvTickets] = useState(getReturnToVendorTickets());
  const [isReceiveOpen, setIsReceiveOpen] = useState(searchParams.get('tab') === 'grn' && Boolean(searchParams.get('po')));

  useEffect(() => {
    if (location.pathname.includes('warehouses')) {
      setTab('warehouses');
    } else if (searchParams.get('tab') === 'grn') {
      setTab('grn');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(
    () =>
      subscribeInventory(() => {
        setStock(getStock());
        setGrns(getGoodsReceiptNotes());
        setRtvTickets(getReturnToVendorTickets());
      }),
    []
  );

  const openReceiveModal = () => setIsReceiveOpen(true);
  const closeReceiveModal = () => {
    setIsReceiveOpen(false);
    if (searchParams.get('po')) {
      const next = new URLSearchParams(searchParams);
      next.delete('po');
      setSearchParams(next, { replace: true });
    }
  };

  const handleRtvStatusChange = (rtvId: string, status: RTVStatus) => {
    const ticket = rtvTickets.find((t) => t.id === rtvId);
    setReturnToVendorStatus(rtvId, status);
    if (ticket) {
      recordAuditEvent({
        user: role.user || 'Warehouse Officer',
        action: 'UPDATE_RTV_STATUS',
        resource: ticket.rtvNumber,
        company: ticket.companyName,
        before: ticket.status,
        after: status
      });
    }
  };

  const columns: Array<Column<StockItem>> = [
  {
    key: 'product',
    header: 'Product',
    sortable: true,
    hideable: false,
    value: (s) => s.product,
    render: (s) =>
    <div className="min-w-0">
          <p className="truncate text-ink">{s.product}</p>
          <p className="font-mono text-sm text-muted">{s.sku}</p>
        </div>

  },
  { key: 'warehouse', header: 'Warehouse', sortable: true, value: (s) => s.warehouse, render: (s) => <span className="text-muted">{s.warehouse}</span> },
  { key: 'available', header: 'Available', align: 'right', mono: true, sortable: true, value: (s) => s.available, render: (s) => s.available.toLocaleString('en-IN') },
  { key: 'reserved', header: 'Reserved', align: 'right', mono: true, value: (s) => s.reserved, render: (s) => <span className="text-muted">{s.reserved.toLocaleString('en-IN')}</span> },
  { key: 'incoming', header: 'Incoming', align: 'right', mono: true, value: (s) => s.incoming, render: (s) => <span className="text-muted">{s.incoming.toLocaleString('en-IN')}</span> },
  {
    key: 'quarantineQty',
    header: 'Quarantine',
    align: 'right',
    mono: true,
    value: (s) => s.quarantineQty,
    render: (s) =>
      s.quarantineQty > 0 ? (
        <span className="font-medium text-danger">{s.quarantineQty.toLocaleString('en-IN')}</span>
      ) : (
        <span className="text-faint">—</span>
      )
  },
  { key: 'reorder', header: 'Reorder level', align: 'right', mono: true, value: (s) => s.reorder, render: (s) => <span className="text-muted">{s.reorder.toLocaleString('en-IN')}</span> },
  { key: 'value', header: 'Stock value', align: 'right', mono: true, sortable: true, value: (s) => s.value, render: (s) => formatCurrency(s.value) },
  { key: 'status', header: 'Status', value: (s) => s.status, render: (s) => <StatusBadge status={s.status} /> }];


  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: companyName }, { label: 'Inventory' }]}
        title="Inventory"
        description="Stock positions, reservations and warehouse utilization across your context."
        meta={<Badge tone="accent">Context: {companyName}</Badge>}
        actions={
        <>
            <Button>Stock transfer</Button>
            <Button>Stock adjustment</Button>
            <Button variant="primary" icon={PackageSearchIcon} onClick={openReceiveModal}>
              Goods receipt
            </Button>
          </>
        } />


      <div className="px-6">
        <Tabs
          tabs={[
          { id: 'stock', label: 'Stock', count: stock.length },
          { id: 'grn', label: 'Goods Receipt (GRN)', count: grns.length },
          { id: 'warehouses', label: 'Warehouses', count: warehouses.length }]
          }
          active={tab}
          onChange={setTab} />

      </div>

      <div className="space-y-4 p-6">
        <MetricRow columns={6}>
          <Metric label="Total Inventory Value" value="৳31.4 Cr" sub="4 warehouses" emphasis />
          <Metric label="Low Stock Items" value="2" tone="warning" delta="+1" />
          <Metric label="Out of Stock" value="1" tone="danger" delta="+1" />
          <Metric label="Incoming" value="7,800" sub="units in transit" />
          <Metric label="Outgoing" value="4,380" sub="units reserved" />
          <Metric label="Utilization" value="71%" sub="weighted average" />
        </MetricRow>

        {tab === 'stock' && (
        <DataTable
          rows={stock}
          columns={columns}
          getId={(s) => s.id}
          density={density}
          pageSize={8}
          selectable
          bulkActions={
          <>
                <Button size="xs">Transfer</Button>
                <Button size="xs">Adjust</Button>
                <Button size="xs">Count</Button>
              </>
          }
          searchPlaceholder="Search products or SKUs..."
          searchIn={(s) => `${s.product} ${s.sku} ${s.warehouse}`}
          filters={[
          { key: 'warehouse', label: 'Warehouse', options: warehouses.map((w) => w.name), match: (s, v) => s.warehouse === v },
          { key: 'status', label: 'Status', options: ['active', 'low-stock', 'out-of-stock'], match: (s, v) => s.status === v }]
          } />
        )}

        {tab === 'warehouses' && (
        <div className="grid gap-4 lg:grid-cols-2">
            {warehouses.map((w) =>
          <Panel key={w.name} title={w.name} description={`${w.items} SKUs · ${formatCurrency(w.value)} stock value`}>
                <div className="mb-1 flex items-center justify-between text-base">
                  <span className="text-muted">Capacity utilization</span>
                  <span className="font-mono tabular text-ink">{w.capacity}%</span>
                </div>
                <span className="block h-2 rounded-sm bg-surface" aria-hidden>
                  <span
                className={cn(
                  'block h-2 rounded-sm',
                  w.capacity > 85 ? 'bg-danger' : w.capacity > 70 ? 'bg-warning' : 'bg-accent/70'
                )}
                style={{ width: `${w.capacity}%` }} />

                </span>
                {w.capacity > 85 &&
            <p className="mt-2 text-sm text-danger">Near capacity — inbound shipments may be rejected.</p>
            }
              </Panel>
          )}
          </div>
        )}

        {tab === 'grn' && (
          <div className="space-y-4">
            <Panel
              title="Goods Receipt Notes"
              description="Every physical arrival logged against a Purchase Order, with its QC verdict"
              actions={
                <Button size="xs" variant="primary" icon={PackageSearchIcon} onClick={openReceiveModal}>
                  Receive Goods
                </Button>
              }
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface/40">
                      {['GRN #', 'PO #', 'Supplier', 'Warehouse', 'Received', 'Accepted', 'Rejected', 'Inspector', 'Date'].map((h, idx) => (
                        <th
                          key={h}
                          className={`px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-faint ${idx >= 4 && idx <= 6 ? 'text-right' : ''}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grns.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-xs text-muted">
                          No Goods Receipt Notes recorded yet.
                        </td>
                      </tr>
                    )}
                    {grns.map((grn) => {
                      const totals = grn.lines.reduce(
                        (acc, l) => ({
                          received: acc.received + l.qc.receivedQty,
                          accepted: acc.accepted + l.qc.acceptedQty,
                          rejected: acc.rejected + l.qc.rejectedQty
                        }),
                        { received: 0, accepted: 0, rejected: 0 }
                      );
                      return (
                        <tr key={grn.id} className="border-b border-line/70 last:border-b-0 hover:bg-surface/60">
                          <td className="px-3 py-2 font-mono text-xs font-medium text-accent whitespace-nowrap">{grn.grnNumber}</td>
                          <td className="px-3 py-2 font-mono text-xs text-muted whitespace-nowrap">{grn.poNumber}</td>
                          <td className="px-3 py-2 text-xs text-ink">{grn.supplierName}</td>
                          <td className="px-3 py-2 text-xs text-muted">{grn.warehouse}</td>
                          <td className="px-3 py-2 text-right font-mono tabular text-xs text-ink">{totals.received}</td>
                          <td className="px-3 py-2 text-right font-mono tabular text-xs text-success">{totals.accepted}</td>
                          <td className="px-3 py-2 text-right font-mono tabular text-xs text-danger">{totals.rejected || '—'}</td>
                          <td className="px-3 py-2 text-xs text-muted">{grn.lines[0]?.qc.inspectorName}</td>
                          <td className="px-3 py-2 font-mono text-xs text-muted whitespace-nowrap">{grn.receivedAt.slice(0, 10)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel
              title="Return-to-Vendor Tickets"
              description="Auto-raised whenever a GRN line fails QC — track until the rejected stock leaves the warehouse"
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface/40">
                      {['RTV #', 'Item', 'Qty', 'Reason', 'Supplier', 'Status', ''].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-faint">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rtvTickets.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-xs text-muted">
                          No Return-to-Vendor tickets — every receipt has passed QC so far.
                        </td>
                      </tr>
                    )}
                    {rtvTickets.map((t) => (
                      <tr key={t.id} className="border-b border-line/70 last:border-b-0 hover:bg-surface/60">
                        <td className="px-3 py-2 font-mono text-xs font-medium text-accent whitespace-nowrap">{t.rtvNumber}</td>
                        <td className="px-3 py-2 text-xs text-ink">
                          {t.description}
                          <span className="block text-2xs text-muted font-mono">{t.sku}</span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-ink whitespace-nowrap">{t.rejectedQty} {t.unit}</td>
                        <td className="px-3 py-2 text-xs text-muted max-w-xs truncate" title={t.rejectionReason}>{t.rejectionReason}</td>
                        <td className="px-3 py-2 text-xs text-ink">{t.supplierName}</td>
                        <td className="px-3 py-2">
                          <Badge tone={RTV_STATUS_TONE[t.status]}>{t.status.replace('-', ' ').toUpperCase()}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {t.status === 'open' && (
                            <Button size="xs" variant="ghost" onClick={() => handleRtvStatusChange(t.id, 'shipped-back')}>
                              Mark Shipped Back
                            </Button>
                          )}
                          {t.status === 'shipped-back' && (
                            <Button size="xs" variant="ghost" icon={UndoIcon} onClick={() => handleRtvStatusChange(t.id, 'resolved')}>
                              Mark Resolved
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}
      </div>

      <ReceiveGoodsModal
        isOpen={isReceiveOpen}
        initialPoId={searchParams.get('po')}
        onClose={closeReceiveModal}
        onSuccess={() => closeReceiveModal()}
      />
    </div>);

}