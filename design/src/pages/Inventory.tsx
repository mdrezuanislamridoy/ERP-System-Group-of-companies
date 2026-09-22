import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  PackageSearchIcon,
  UndoIcon,
  TruckIcon,
  ShieldAlertIcon,
  ArrowRightLeftIcon,
  LayersIcon,
  AlertTriangleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  SlidersHorizontalIcon,
  SearchIcon,
  ChevronRightIcon
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { Panel } from '../components/ui/Panel';
import { Metric, MetricRow } from '../components/ui/Metric';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import {
  getStock,
  subscribeInventory,
  warehouses,
  getGoodsReceiptNotes,
  getReturnToVendorTickets,
  setReturnToVendorStatus,
  getItemBatches,
  getStockTransferOrders,
  dispatchStockTransferOrder
} from '../data/operations';
import { formatCurrency } from '../data/finance';
import { group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import { recordAuditEvent } from '../data/system';
import { cn } from '../utils/cn';
import { ReceiveGoodsModal } from '../components/inventory/ReceiveGoodsModal';
import { StockAdjustmentModal } from '../components/inventory/StockAdjustmentModal';
import { StockTransferModal } from '../components/inventory/StockTransferModal';
import { ReceiveTransferModal } from '../components/inventory/ReceiveTransferModal';
import { BatchRecallModal } from '../components/inventory/BatchRecallModal';
import type { StockItem, RTVStatus, ItemBatch, StockTransferOrder } from '../types';

const RTV_STATUS_TONE: Record<RTVStatus, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  open: 'danger',
  'shipped-back': 'warning',
  resolved: 'success',
  cancelled: 'neutral'
};

const TRANSFER_STATUS_TONE: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  Draft: 'neutral',
  Dispatched: 'info',
  'In-Transit': 'warning',
  Received: 'success',
  Discrepancy: 'danger',
  Cancelled: 'neutral'
};

export function Inventory() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { density, companyName, role } = useApp();

  const [tab, setTab] = useState(
    location.pathname.includes('warehouses')
      ? 'warehouses'
      : searchParams.get('tab') === 'transfers'
      ? 'transfers'
      : searchParams.get('tab') === 'batches'
      ? 'batches'
      : searchParams.get('tab') === 'grn'
      ? 'grn'
      : 'stock'
  );

  const [stock, setStock] = useState(getStock());
  const [grns, setGrns] = useState(getGoodsReceiptNotes());
  const [rtvTickets, setRtvTickets] = useState(getReturnToVendorTickets());
  const [batches, setBatches] = useState(getItemBatches());
  const [transfers, setTransfers] = useState(getStockTransferOrders());

  // Modal Controls
  const [isReceiveOpen, setIsReceiveOpen] = useState(searchParams.get('tab') === 'grn' && Boolean(searchParams.get('po')));
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustTargetStockId, setAdjustTargetStockId] = useState<string | undefined>();
  const [inspectBatch, setInspectBatch] = useState<ItemBatch | null>(null);
  const [receiveTransferOrder, setReceiveTransferOrder] = useState<StockTransferOrder | null>(null);

  // Filters for batches tab
  const [batchFilter, setBatchFilter] = useState<'all' | 'urgent' | 'soon' | 'healthy'>('all');
  const [batchSearch, setBatchSearch] = useState('');

  const todayStr = '2026-09-22';
  const todayMs = new Date(todayStr).getTime();

  useEffect(() => {
    if (location.pathname.includes('warehouses')) {
      setTab('warehouses');
    } else if (searchParams.get('tab') === 'grn') {
      setTab('grn');
    } else if (searchParams.get('tab') === 'batches') {
      setTab('batches');
    } else if (searchParams.get('tab') === 'transfers') {
      setTab('transfers');
    }
  }, [location.pathname, searchParams]);

  useEffect(() => {
    return subscribeInventory(() => {
      setStock(getStock());
      setGrns(getGoodsReceiptNotes());
      setRtvTickets(getReturnToVendorTickets());
      setBatches(getItemBatches());
      setTransfers(getStockTransferOrders());
    });
  }, []);

  const openReceiveModal = () => setIsReceiveOpen(true);
  const closeReceiveModal = () => {
    setIsReceiveOpen(false);
    if (searchParams.get('po')) {
      const next = new URLSearchParams(searchParams);
      next.delete('po');
      setSearchParams(next, { replace: true });
    }
  };

  const handleOpenAdjust = (stockId?: string) => {
    setAdjustTargetStockId(stockId);
    setIsAdjustOpen(true);
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

  const handleDispatchOrder = (orderId: string) => {
    try {
      dispatchStockTransferOrder(orderId, role.user || 'Warehouse Dispatcher');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Dispatch failed');
    }
  };

  // Helper for expiry countdown
  const getBatchDaysRemaining = (expiryDate: string) => {
    const expMs = new Date(expiryDate).getTime();
    return Math.ceil((expMs - todayMs) / (1000 * 3600 * 24));
  };

  // Aggregated Metrics
  const totalValue = stock.reduce((sum, s) => sum + s.value, 0);
  const totalOnHand = stock.reduce((sum, s) => sum + s.onHand, 0);
  const totalAtp = stock.reduce((sum, s) => sum + s.atp, 0);
  const totalQuarantine = stock.reduce((sum, s) => sum + s.quarantineQty, 0);
  const totalInTransit = stock.reduce((sum, s) => sum + s.inTransitQty, 0);
  const urgentBatchesCount = batches.filter((b) => getBatchDaysRemaining(b.expiryDate) <= 30).length;

  // Filtered batches
  const filteredBatches = batches.filter((b) => {
    const days = getBatchDaysRemaining(b.expiryDate);
    if (batchFilter === 'urgent' && days > 30) return false;
    if (batchFilter === 'soon' && (days <= 30 || days > 90)) return false;
    if (batchFilter === 'healthy' && days <= 90) return false;
    if (batchSearch.trim()) {
      const q = batchSearch.toLowerCase();
      return (
        b.batchNumber.toLowerCase().includes(q) ||
        b.product.toLowerCase().includes(q) ||
        b.sku.toLowerCase().includes(q) ||
        b.warehouse.toLowerCase().includes(q) ||
        b.binLocation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Table Columns for Stock Positions
  const stockColumns: Array<Column<StockItem>> = [
    {
      key: 'product',
      header: 'Product / SKU',
      sortable: true,
      hideable: false,
      value: (s) => s.product,
      render: (s) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{s.product}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-2xs text-muted">{s.sku}</span>
            <span className="text-2xs text-faint">· {s.unit}</span>
          </div>
        </div>
      )
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      sortable: true,
      value: (s) => s.warehouse,
      render: (s) => <span className="text-muted text-xs">{s.warehouse}</span>
    },
    {
      key: 'onHand',
      header: 'On-Hand',
      align: 'right',
      mono: true,
      sortable: true,
      value: (s) => s.onHand,
      render: (s) => (
        <span className="font-semibold text-ink text-xs">
          {s.onHand.toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'reserved',
      header: 'Reserved',
      align: 'right',
      mono: true,
      value: (s) => s.reserved,
      render: (s) =>
        s.reserved > 0 ? (
          <span className="inline-flex items-center rounded-md bg-warning-soft/70 px-1.5 py-0.5 font-mono text-2xs font-semibold text-warning">
            {s.reserved.toLocaleString('en-IN')}
          </span>
        ) : (
          <span className="text-faint text-xs">—</span>
        )
    },
    {
      key: 'quarantineQty',
      header: 'Quarantine',
      align: 'right',
      mono: true,
      value: (s) => s.quarantineQty,
      render: (s) =>
        s.quarantineQty > 0 ? (
          <span className="inline-flex items-center rounded-md bg-danger-soft px-1.5 py-0.5 font-mono text-2xs font-bold text-danger">
            {s.quarantineQty.toLocaleString('en-IN')}
          </span>
        ) : (
          <span className="text-faint text-xs">—</span>
        )
    },
    {
      key: 'inTransitQty',
      header: 'In-Transit',
      align: 'right',
      mono: true,
      value: (s) => s.inTransitQty,
      render: (s) =>
        s.inTransitQty > 0 ? (
          <span className="inline-flex items-center rounded-md bg-accent-soft/70 px-1.5 py-0.5 font-mono text-2xs font-semibold text-accent">
            {s.inTransitQty.toLocaleString('en-IN')}
          </span>
        ) : (
          <span className="text-faint text-xs">—</span>
        )
    },
    {
      key: 'atp',
      header: 'Available (ATP)',
      align: 'right',
      mono: true,
      sortable: true,
      value: (s) => s.atp,
      render: (s) => (
        <span
          className={cn(
            'inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-bold',
            s.atp <= 0
              ? 'bg-danger-soft text-danger'
              : s.atp <= s.reorder
              ? 'bg-warning-soft text-warning'
              : 'bg-success-soft text-success'
          )}
        >
          {s.atp.toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'value',
      header: 'Valuation',
      align: 'right',
      mono: true,
      sortable: true,
      value: (s) => s.value,
      render: (s) => formatCurrency(s.value)
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="xs" variant="ghost" onClick={() => handleOpenAdjust(s.id)}>
            Adjust
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setIsTransferOpen(true)}>
            Transfer
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: companyName }, { label: 'Inventory' }]}
        title="Inventory & Logistics"
        description="Granular stock state machine, multi-bin lot/batch expiration tracking (FEFO), and inter-warehouse transfer orders."
        meta={<Badge tone="accent">Context: {companyName}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button icon={TruckIcon} onClick={() => setIsTransferOpen(true)}>
              Stock Transfer
            </Button>
            <Button icon={SlidersHorizontalIcon} onClick={() => handleOpenAdjust()}>
              Stock Adjustment / Scrap
            </Button>
            <Button variant="primary" icon={PackageSearchIcon} onClick={openReceiveModal}>
              Goods Receipt
            </Button>
          </div>
        }
      />

      <div className="px-6">
        <Tabs
          tabs={[
            { id: 'stock', label: 'Stock Positions & ATP', count: stock.length },
            { id: 'batches', label: 'Batches & Expiry (FEFO)', count: batches.length },
            { id: 'transfers', label: 'Stock Transfers', count: transfers.length },
            { id: 'grn', label: 'Goods Receipt (GRN)', count: grns.length },
            { id: 'warehouses', label: 'Warehouses', count: warehouses.length }
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      <div className="space-y-4 p-6">
        {/* Real-time Dynamic Metrics */}
        <MetricRow columns={6}>
          <Metric label="Total Stock Valuation" value={formatCurrency(totalValue)} sub={`${warehouses.length} warehouses`} emphasis />
          <Metric label="Physical On-Hand" value={totalOnHand.toLocaleString('en-IN')} sub="Shelf inventory count" />
          <Metric label="Available to Promise (ATP)" value={totalAtp.toLocaleString('en-IN')} tone="success" sub="Net sellable stock" />
          <Metric label="In-Transit Stock" value={totalInTransit.toLocaleString('en-IN')} tone="info" sub="Moving between depots" />
          <Metric label="Quarantine / Damaged" value={totalQuarantine.toLocaleString('en-IN')} tone="danger" sub="Held off shelves" />
          <Metric
            label="Expiring Batches"
            value={urgentBatchesCount}
            tone={urgentBatchesCount > 0 ? 'danger' : 'neutral'}
            sub="Expiring within 30 days"
          />
        </MetricRow>

        {/* Tab 1: Stock Positions & ATP State Machine */}
        {tab === 'stock' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-canvas p-3 rounded-xl border border-line text-xs">
              <div className="flex items-center gap-2 text-ink">
                <span className="font-semibold">Stock State Formula:</span>
                <span className="font-mono bg-surface px-2 py-0.5 rounded border border-line">
                  ATP = Physical On-Hand − (Reserved + Quarantined)
                </span>
              </div>
              <div className="flex items-center gap-3 text-2xs text-muted">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-success"></span> Available to Promise
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-warning"></span> Reserved Orders
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-danger"></span> Quarantined / Damaged
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent"></span> In-Transit Logistics
                </span>
              </div>
            </div>

            <DataTable
              rows={stock}
              columns={stockColumns}
              getId={(s) => s.id}
              density={density}
              pageSize={8}
              selectable
              bulkActions={
                <>
                  <Button size="xs" onClick={() => setIsTransferOpen(true)}>Transfer</Button>
                  <Button size="xs" onClick={() => handleOpenAdjust()}>Adjust / Write-Off</Button>
                </>
              }
              searchPlaceholder="Search products, SKUs, or warehouses..."
              searchIn={(s) => `${s.product} ${s.sku} ${s.warehouse}`}
              filters={[
                { key: 'warehouse', label: 'Warehouse', options: warehouses.map((w) => w.name), match: (s, v) => s.warehouse === v },
                { key: 'status', label: 'Status', options: ['active', 'low-stock', 'out-of-stock'], match: (s, v) => s.status === v }
              ]}
            />
          </div>
        )}

        {/* Tab 2: Batches & Expiry Management (FEFO) */}
        {tab === 'batches' && (
          <div className="space-y-4">
            <Panel
              title="Perishable Batches & Expiry Register (FEFO)"
              description="Legal compliance tracking for food, pharma, and consumer goods sister concerns with first-expired first-out rotation"
              actions={
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
                    <input
                      type="text"
                      value={batchSearch}
                      onChange={(e) => setBatchSearch(e.target.value)}
                      placeholder="Search lot, SKU, or bin..."
                      className="h-8 w-full rounded-lg border border-line bg-canvas pl-8 pr-2.5 text-xs text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center rounded-lg border border-line bg-canvas p-0.5 text-xs">
                    {(['all', 'urgent', 'soon', 'healthy'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setBatchFilter(mode)}
                        className={cn(
                          'px-2.5 py-1 rounded-md capitalize transition-colors',
                          batchFilter === mode ? 'bg-surface font-semibold text-ink shadow-xs' : 'text-muted hover:text-ink'
                        )}
                      >
                        {mode === 'all' ? 'All Batches' : mode === 'urgent' ? '< 30d (Urgent)' : mode === 'soon' ? '30-90d' : '> 90d (Safe)'}
                      </button>
                    ))}
                  </div>
                </div>
              }
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-surface/40 text-faint uppercase font-semibold text-2xs tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5">Batch / Lot #</th>
                      <th className="px-3 py-2.5">Product & SKU</th>
                      <th className="px-3 py-2.5">Warehouse & Storage Bin</th>
                      <th className="px-3 py-2.5">Mfg Date</th>
                      <th className="px-3 py-2.5">Expiry Date & Expiration Window</th>
                      <th className="px-3 py-2.5 text-right">Available Qty</th>
                      <th className="px-3 py-2.5">QC Release #</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Traceability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredBatches.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-xs text-muted">
                          No lot/batch records matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredBatches.map((b) => {
                        const days = getBatchDaysRemaining(b.expiryDate);
                        const isExpired = days <= 0;
                        const isUrgent = days > 0 && days <= 30;
                        const isSoon = days > 30 && days <= 90;
                        const isSafe = days > 90;

                        return (
                          <tr key={b.id} className="hover:bg-surface/60 transition-colors">
                            <td className="px-3 py-2.5 font-mono font-bold text-accent whitespace-nowrap">
                              {b.batchNumber}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="font-semibold text-ink block">{b.product}</span>
                              <span className="text-2xs font-mono text-muted">{b.sku}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-ink font-medium block">{b.warehouse}</span>
                              <span className="font-mono text-2xs text-muted bg-canvas px-1.5 py-0.5 rounded border border-line/60">
                                {b.binLocation}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-muted whitespace-nowrap">
                              {b.manufacturingDate}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium text-ink">{b.expiryDate}</span>
                                {isExpired ? (
                                  <span className="inline-flex items-center rounded-md bg-danger-soft px-2 py-0.5 text-2xs font-bold text-danger">
                                    Expired ({Math.abs(days)}d ago)
                                  </span>
                                ) : isUrgent ? (
                                  <span className="inline-flex items-center rounded-md bg-danger-soft px-2 py-0.5 text-2xs font-bold text-danger">
                                    {days}d left · Red
                                  </span>
                                ) : isSoon ? (
                                  <span className="inline-flex items-center rounded-md bg-warning-soft px-2 py-0.5 text-2xs font-bold text-warning">
                                    {days}d left · Amber
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-md bg-success-soft px-2 py-0.5 text-2xs font-bold text-success">
                                    {days}d left · Green
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-ink">
                              {b.quantityAvailable.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-2xs text-muted whitespace-nowrap">
                              {b.qcReleaseNumber}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={cn(
                                  'text-2xs px-2 py-0.5 rounded font-semibold uppercase tracking-wider',
                                  b.status === 'recalled'
                                    ? 'bg-danger text-white'
                                    : b.status === 'expired'
                                    ? 'bg-danger-soft text-danger'
                                    : 'bg-success-soft text-success'
                                )}
                              >
                                {b.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => setInspectBatch(b)}
                              >
                                Trace & Recall
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}

        {/* Tab 3: Inter-Warehouse & Inter-Company Transfers */}
        {tab === 'transfers' && (
          <div className="space-y-4">
            <Panel
              title="Stock Transfer Orders & In-Transit Tracking"
              description="Inter-depot logistics movements with transit variance discrepancy tracking"
              actions={
                <Button size="xs" variant="primary" icon={TruckIcon} onClick={() => setIsTransferOpen(true)}>
                  New Transfer Order
                </Button>
              }
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-surface/40 text-faint uppercase font-semibold text-2xs tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5">Transfer #</th>
                      <th className="px-3 py-2.5">Origin → Destination</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Items & Manifest</th>
                      <th className="px-3 py-2.5">Carrier & Vehicle</th>
                      <th className="px-3 py-2.5 text-right">Shipped / Received</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {transfers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-xs text-muted">
                          No stock transfer orders recorded.
                        </td>
                      </tr>
                    ) : (
                      transfers.map((sto) => {
                        const totalShipped = sto.lines.reduce((sum, l) => sum + l.shippedQty, 0);
                        const totalReceived = sto.lines.reduce((sum, l) => sum + l.receivedQty, 0);

                        return (
                          <tr key={sto.id} className="hover:bg-surface/60 transition-colors">
                            <td className="px-3 py-2.5 font-mono font-bold text-accent whitespace-nowrap">
                              {sto.transferNumber}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="font-semibold text-ink block">
                                {sto.sourceWarehouseName} → {sto.destWarehouseName}
                              </span>
                              {sto.isInterCompany && (
                                <span className="text-2xs text-muted">
                                  {sto.companyName} → {sto.destCompanyName}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {sto.isInterCompany ? (
                                <span className="rounded bg-accent-soft px-1.5 py-0.5 text-2xs font-semibold text-accent">
                                  Inter-Company
                                </span>
                              ) : (
                                <span className="rounded bg-canvas px-1.5 py-0.5 text-2xs font-medium text-muted border border-line">
                                  Inter-Warehouse
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {sto.lines.map((l) => (
                                <div key={l.id} className="text-2xs text-ink truncate max-w-xs">
                                  {l.product} ({l.shippedQty} {l.unit})
                                  {l.batchNumber && <span className="font-mono text-muted ml-1">[{l.batchNumber}]</span>}
                                </div>
                              ))}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-ink block">{sto.carrier || 'Internal Fleet'}</span>
                              <span className="font-mono text-2xs text-muted">{sto.vehicleNumber || sto.trackingNumber || '—'}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                              <span className="text-ink font-semibold">{totalShipped}</span>
                              <span className="text-muted"> / </span>
                              <span className={sto.status === 'Discrepancy' ? 'text-danger font-bold' : 'text-success font-semibold'}>
                                {sto.status === 'In-Transit' ? '—' : totalReceived}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge tone={TRANSFER_STATUS_TONE[sto.status] || 'neutral'}>
                                {sto.status.toUpperCase()}
                              </Badge>
                              {sto.incidentNotes && (
                                <span
                                  className="block text-2xs text-danger font-medium mt-0.5 max-w-xs truncate"
                                  title={sto.incidentNotes}
                                >
                                  Claim: {sto.incidentNotes}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {sto.status === 'Draft' && (
                                <Button size="xs" variant="primary" onClick={() => handleDispatchOrder(sto.id)}>
                                  Dispatch
                                </Button>
                              )}
                              {sto.status === 'In-Transit' && (
                                <Button size="xs" variant="primary" onClick={() => setReceiveTransferOrder(sto)}>
                                  Receive Goods
                                </Button>
                              )}
                              {sto.status === 'Received' && (
                                <span className="inline-flex items-center gap-1 text-2xs text-success font-medium">
                                  <CheckCircle2Icon className="h-3.5 w-3.5" />
                                  Completed
                                </span>
                              )}
                              {sto.status === 'Discrepancy' && (
                                <span className="inline-flex items-center gap-1 text-2xs text-danger font-medium">
                                  <AlertTriangleIcon className="h-3.5 w-3.5" />
                                  Shrinkage Flagged
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}

        {/* Tab 4: Goods Receipt Note (GRN) */}
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

        {/* Tab 5: Warehouses */}
        {tab === 'warehouses' && (
          <div className="grid gap-4 lg:grid-cols-2">
            {warehouses.map((w) => (
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
                    style={{ width: `${w.capacity}%` }}
                  />
                </span>
                {w.capacity > 85 && (
                  <p className="mt-2 text-sm text-danger">Near capacity — inbound shipments may be rejected.</p>
                )}
              </Panel>
            ))}
          </div>
        )}
      </div>

      {/* Receive Goods Modal */}
      <ReceiveGoodsModal
        isOpen={isReceiveOpen}
        initialPoId={searchParams.get('po')}
        onClose={closeReceiveModal}
        onSuccess={() => closeReceiveModal()}
      />

      {/* Stock Adjustment & Scrap Write-Off Modal */}
      <StockAdjustmentModal
        isOpen={isAdjustOpen}
        stockItems={stock}
        initialStockId={adjustTargetStockId}
        onClose={() => setIsAdjustOpen(false)}
      />

      {/* Stock Transfer Modal */}
      <StockTransferModal
        isOpen={isTransferOpen}
        stockItems={stock}
        onClose={() => setIsTransferOpen(false)}
      />

      {/* Receive Transfer Modal */}
      <ReceiveTransferModal
        isOpen={Boolean(receiveTransferOrder)}
        order={receiveTransferOrder}
        onClose={() => setReceiveTransferOrder(null)}
      />

      {/* Batch Recall & Traceability Modal */}
      <BatchRecallModal
        isOpen={Boolean(inspectBatch)}
        batch={inspectBatch}
        onClose={() => setInspectBatch(null)}
      />
    </div>
  );
}