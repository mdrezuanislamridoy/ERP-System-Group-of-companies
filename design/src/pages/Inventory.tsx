import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { Panel } from '../components/ui/Panel';
import { Metric, MetricRow } from '../components/ui/Metric';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { stock, warehouses } from '../data/operations';
import { formatCurrency } from '../data/finance';
import { group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import { cn } from '../utils/cn';
import type { StockItem } from '../types';

export function Inventory() {
  const location = useLocation();
  const { density, companyName } = useApp();
  const [tab, setTab] = useState(location.pathname.includes('warehouses') ? 'warehouses' : 'stock');

  useEffect(() => {
    setTab(location.pathname.includes('warehouses') ? 'warehouses' : 'stock');
  }, [location.pathname]);

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
            <Button variant="primary">Goods receipt</Button>
          </>
        } />
      

      <div className="px-6">
        <Tabs
          tabs={[
          { id: 'stock', label: 'Stock', count: stock.length },
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

        {tab === 'stock' ?
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
          } /> :


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
        }
      </div>
    </div>);

}