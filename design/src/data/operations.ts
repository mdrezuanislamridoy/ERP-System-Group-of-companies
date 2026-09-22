import type {
  PurchaseRequest,
  StockItem,
  ApprovalStep,
  Supplier,
  RFQ,
  RFQItem,
  SupplierQuote,
  QuoteItem,
  PurchaseOrder,
  POLine,
  POStatus,
  GoodsReceiptNote,
  GRNLine,
  ReturnToVendorTicket,
  RTVStatus
} from '../types';
import { getCostCenterBudget, commitCostCenterEncumbrance, branchPlants } from './organization';

export const initialPurchaseRequests: PurchaseRequest[] = [
{ id: 'PR-2026-00192', title: 'Raw material procurement — Q4 rice & edible oil', requester: 'Imran Hossain', department: 'Production', company: 'ABC Foods Ltd.', amount: 850000, created: '20 Sep 2026', stage: 'Finance Manager', status: 'pending', priority: 'High', costCenterId: 'cc-foods-proc-001', costCenterCode: 'CC-FOODS-PROC-001' },
{ id: 'PR-2026-00191', title: 'Packaging film rolls — Line B', requester: 'Shahidul Alam', department: 'Production', company: 'ABC Foods Ltd.', amount: 320000, created: '19 Sep 2026', stage: 'Department Manager', status: 'pending', priority: 'Normal', costCenterId: 'cc-foods-prod-002', costCenterCode: 'CC-FOODS-PROD-002' },
{ id: 'PR-2026-00188', title: 'Fleet tyre replacement — 24 units', requester: 'Sohel Rana', department: 'Fleet', company: 'ABC Transport Ltd.', amount: 1240000, created: '18 Sep 2026', stage: 'CFO', status: 'pending', priority: 'Critical', costCenterId: 'cc-trans-fleet-001', costCenterCode: 'CC-TRANS-FLEET-001' },
{ id: 'PR-2026-00184', title: 'Laptop refresh — Engineering', requester: 'Hasan Mahmud', department: 'Information Technology', company: 'ABC Technologies Ltd.', amount: 2100000, created: '16 Sep 2026', stage: 'Completed', status: 'approved', priority: 'Normal', costCenterId: 'cc-tech-eng-002', costCenterCode: 'CC-TECH-ENG-002' },
{ id: 'PR-2026-00180', title: 'Cold storage maintenance contract', requester: 'Ayesha Siddika', department: 'Warehouse', company: 'ABC Grocery Ltd.', amount: 480000, created: '14 Sep 2026', stage: 'Rejected at Finance', status: 'rejected', priority: 'Low', costCenterId: 'cc-groc-retail-001', costCenterCode: 'CC-GROC-RETAIL-001' },
{ id: 'PR-2026-00176', title: 'Office stationery — HQ quarterly', requester: 'Farzana Yeasmin', department: 'Human Resources', company: 'ABC Foods Ltd.', amount: 96000, created: '12 Sep 2026', stage: 'Draft', status: 'draft', priority: 'Low' },
{ id: 'PR-2026-00170', title: 'Warehouse racking system — Savar Plant', requester: 'Shahidul Alam', department: 'Production', company: 'ABC Foods Ltd.', amount: 4200000, created: '05 Sep 2026', stage: 'Completed', status: 'approved', priority: 'High', costCenterId: 'cc-foods-prod-001', costCenterCode: 'CC-FOODS-PROD-001' },
{ id: 'PR-2026-00165', title: 'Fleet GPS tracking devices — 40 units', requester: 'Sohel Rana', department: 'Fleet', company: 'ABC Transport Ltd.', amount: 1600000, created: '01 Sep 2026', stage: 'Completed', status: 'approved', priority: 'Normal', costCenterId: 'cc-trans-fleet-002', costCenterCode: 'CC-TRANS-FLEET-002' }];

// Runtime store for purchase requests, mirroring the journalVouchers pattern in data/finance.ts
export let purchaseRequests: PurchaseRequest[] = [...initialPurchaseRequests];
const prListeners: Array<() => void> = [];

export function getPurchaseRequests(): PurchaseRequest[] {
  return [...purchaseRequests];
}

export function subscribePurchaseRequests(listener: () => void): () => void {
  prListeners.push(listener);
  return () => {
    const idx = prListeners.indexOf(listener);
    if (idx !== -1) prListeners.splice(idx, 1);
  };
}

let nextPrSeq = 193;

export function createPurchaseRequest(data: {
  title: string;
  requester: string;
  department: string;
  company: string;
  amount: number;
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
  costCenterId?: string;
}): PurchaseRequest {
  const budget = data.costCenterId ? getCostCenterBudget(data.costCenterId) : undefined;
  const budgetOverrun = Boolean(budget && data.amount > budget.availableAmount);
  const overrunAmount = budgetOverrun && budget ? data.amount - budget.availableAmount : undefined;

  const idNum = nextPrSeq++;
  const now = new Date();
  const created = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const newRequest: PurchaseRequest = {
    id: `PR-2026-${String(idNum).padStart(5, '0')}`,
    title: data.title,
    requester: data.requester,
    department: data.department,
    company: data.company,
    amount: data.amount,
    created,
    stage: budgetOverrun ? 'Company CFO — Budget Variance Override' : 'Department Manager',
    status: 'pending',
    priority: data.priority,
    costCenterId: data.costCenterId,
    costCenterCode: budget?.costCenterCode,
    budgetOverrun,
    overrunAmount,
    escalationRequired: budgetOverrun
  };

  // Encumbrance accounting — reserve the requested amount against the Cost Center immediately,
  // regardless of whether it pushed the request into overrun (that's exactly what surfaced the overrun).
  if (data.costCenterId) {
    commitCostCenterEncumbrance(data.costCenterId, data.amount);
  }

  purchaseRequests = [newRequest, ...purchaseRequests];
  prListeners.forEach((l) => l());
  return newRequest;
}


export const prItems = [
{ product: 'Rice — Premium Grade (50kg)', sku: 'RM-RICE-050', qty: 500, unit: 'Bag', price: 120, total: 60000 },
{ product: 'Edible Oil — Soybean (20L)', sku: 'RM-OIL-020', qty: 200, unit: 'Drum', price: 180, total: 36000 },
{ product: 'Packaging Film — 80 micron', sku: 'PK-FILM-080', qty: 1200, unit: 'Roll', price: 620, total: 744000 },
{ product: 'Pallet — Euro Standard', sku: 'PK-PLT-EU', qty: 100, unit: 'Unit', price: 100, total: 10000 }];


export const approvalSteps: ApprovalStep[] = [
{ label: 'Created', actor: 'Imran Hossain · Procurement Officer', state: 'done', time: '20 Sep 2026, 10:32' },
{ label: 'Department Manager', actor: 'Shahidul Alam · Head of Production', state: 'done', time: '20 Sep 2026, 12:15', note: 'Approved — required for Q4 production plan.' },
{ label: 'Finance Manager', actor: 'Rahim Ahmed · You', state: 'current' },
{ label: 'Group CFO', actor: 'Required above ৳500,000', state: 'waiting' },
{ label: 'Purchase Order issued', actor: 'Procurement', state: 'waiting' }];


export const procurementPipeline = [
{ stage: 'Request', count: 34, value: 18400000 },
{ stage: 'Approval', count: 21, value: 12900000 },
{ stage: 'RFQ', count: 12, value: 9800000 },
{ stage: 'Quotation', count: 9, value: 7200000 },
{ stage: 'Purchase Order', count: 27, value: 31400000 },
{ stage: 'Goods Receipt', count: 18, value: 22100000 },
{ stage: 'Invoice', count: 14, value: 16800000 },
{ stage: 'Payment', count: 11, value: 13200000 }];


export const suppliers: Supplier[] = [
{ id: 'sup-meghna', name: 'Meghna Packaging Ltd.', category: 'Packaging', spend: 42800000, orders: 64, rating: 4.6 },
{ id: 'sup-padma', name: 'Padma Oil Company', category: 'Fuel & Lubricants', spend: 38100000, orders: 41, rating: 4.1 },
{ id: 'sup-bengal-steel', name: 'Bengal Steel Works', category: 'Engineering', spend: 21400000, orders: 28, rating: 4.4 },
{ id: 'sup-rangs', name: 'Rangs Logistics', category: 'Transport Services', spend: 17600000, orders: 92, rating: 3.8 },
{ id: 'sup-southeast-tech', name: 'Southeast Tech Distribution', category: 'IT Hardware & Electronics', spend: 15200000, orders: 34, rating: 4.3 },
{ id: 'sup-rahman-computer', name: 'Rahman Computer Source', category: 'IT Hardware & Electronics', spend: 6100000, orders: 12, rating: 4.5 },
{ id: 'sup-grameen-fleet', name: 'Grameen Fleet Solutions', category: 'Fleet & Telematics', spend: 8600000, orders: 19, rating: 4.0 }];


export let stock: StockItem[] = [
{ id: 's1', product: 'Rice — Premium Grade (50kg)', sku: 'RM-RICE-050', warehouse: 'Savar Plant WH-01', available: 1840, reserved: 320, incoming: 500, reorder: 800, value: 11040000, status: 'active', quarantineQty: 0 },
{ id: 's2', product: 'Edible Oil — Soybean (20L)', sku: 'RM-OIL-020', warehouse: 'Savar Plant WH-01', available: 210, reserved: 180, incoming: 200, reorder: 400, value: 3780000, status: 'low-stock', quarantineQty: 0 },
{ id: 's3', product: 'Packaging Film — 80 micron', sku: 'PK-FILM-080', warehouse: 'Gazipur Plant II', available: 0, reserved: 0, incoming: 1200, reorder: 300, value: 0, status: 'out-of-stock', quarantineQty: 0 },
{ id: 's4', product: 'Wheat Flour — Fine (25kg)', sku: 'RM-FLR-025', warehouse: 'Chattogram DC', available: 3120, reserved: 640, incoming: 0, reorder: 1000, value: 9360000, status: 'active', quarantineQty: 0 },
{ id: 's5', product: 'Sugar — Refined (50kg)', sku: 'RM-SGR-050', warehouse: 'Chattogram DC', available: 640, reserved: 220, incoming: 800, reorder: 700, value: 4480000, status: 'low-stock', quarantineQty: 0 },
{ id: 's6', product: 'Pallet — Euro Standard', sku: 'PK-PLT-EU', warehouse: 'Savar Plant WH-02', available: 890, reserved: 40, incoming: 100, reorder: 200, value: 890000, status: 'active', quarantineQty: 0 },
{ id: 's7', product: 'Carton Box — 12×8×6', sku: 'PK-BOX-1286', warehouse: 'Gazipur Plant II', available: 12400, reserved: 3200, incoming: 5000, reorder: 6000, value: 2480000, status: 'active', quarantineQty: 0 }];


export const warehouses = [
{ name: 'Savar Plant WH-01', capacity: 82, value: 148000000, items: 412 },
{ name: 'Savar Plant WH-02', capacity: 64, value: 62000000, items: 188 },
{ name: 'Gazipur Plant II', capacity: 91, value: 96000000, items: 240 },
{ name: 'Chattogram DC', capacity: 47, value: 121000000, items: 366 }];


export const workflowNodes = [
{ id: 'w1', kind: 'start' as const, label: 'START', detail: 'Purchase Request submitted' },
{ id: 'w2', kind: 'approval' as const, label: 'Department Manager', detail: 'SLA 24h · Auto-escalate' },
{ id: 'w3', kind: 'condition' as const, label: 'Amount > ৳500,000', detail: 'True → CFO · False → skip' },
{ id: 'w4', kind: 'approval' as const, label: 'Group CFO', detail: 'SLA 48h · Delegate allowed' },
{ id: 'w5', kind: 'action' as const, label: 'Finance Verification', detail: 'Budget check · GL mapping' },
{ id: 'w6', kind: 'notify' as const, label: 'Notify Requester', detail: 'Email + in-app' },
{ id: 'w7', kind: 'end' as const, label: 'END', detail: 'Purchase Order created' }];

// ─── Issue #09: RFQ & Supplier Quotation Comparison Matrix ───────────────────

function quoteTotal(items: QuoteItem[]): number {
  return items.reduce((sum, i) => sum + i.lineTotal, 0);
}

export const initialRFQs: RFQ[] = [
  {
    id: 'rfq-2026-0001',
    rfqNumber: 'RFQ-2026-0001',
    title: 'Business Laptop Refresh — Engineering',
    purchaseRequestId: 'PR-2026-00184',
    companyId: 'c-tech',
    companyName: 'ABC Technologies Ltd.',
    department: 'Information Technology',
    issuedDate: '2026-09-10',
    dueDate: '2026-09-17',
    status: 'awarded',
    items: [{ id: 'rfqi-0001-1', product: 'Business Laptop — i7/16GB/512GB SSD', sku: 'IT-LAP-I7', qty: 60, unit: 'Unit' }],
    invitedSuppliers: ['Southeast Tech Distribution', 'Rahman Computer Source'],
    quotes: [
      {
        id: 'sq-0001-1',
        rfqId: 'rfq-2026-0001',
        supplierName: 'Southeast Tech Distribution',
        submittedAt: '2026-09-14T10:00:00Z',
        items: [{ rfqItemId: 'rfqi-0001-1', unitPrice: 32000, lineTotal: 1920000 }],
        totalAmount: 1920000,
        deliveryDays: 18,
        warrantyMonths: 24,
        paymentTerms: '30% advance, 70% on delivery',
        status: 'selected'
      },
      {
        id: 'sq-0001-2',
        rfqId: 'rfq-2026-0001',
        supplierName: 'Rahman Computer Source',
        submittedAt: '2026-09-15T09:30:00Z',
        items: [{ rfqItemId: 'rfqi-0001-1', unitPrice: 33500, lineTotal: 2010000 }],
        totalAmount: 2010000,
        deliveryDays: 12,
        warrantyMonths: 36,
        paymentTerms: 'Net 30',
        status: 'rejected'
      }
    ],
    winningSupplierName: 'Southeast Tech Distribution',
    winningQuoteId: 'sq-0001-1',
    awardedAt: '2026-09-16T11:00:00Z',
    awardedBy: 'Hasan Mahmud',
    generatedPurchaseOrderId: 'po-2026-0001',
    createdBy: 'Hasan Mahmud'
  },
  {
    id: 'rfq-2026-0002',
    rfqNumber: 'RFQ-2026-0002',
    title: 'Warehouse Racking System — Savar Plant',
    purchaseRequestId: 'PR-2026-00170',
    companyId: 'c-foods',
    companyName: 'ABC Foods Ltd.',
    department: 'Production',
    issuedDate: '2026-09-08',
    dueDate: '2026-09-25',
    status: 'open',
    items: [{ id: 'rfqi-0002-1', product: 'Heavy-Duty Pallet Racking — 4-tier bay', sku: 'ENG-RACK-4T', qty: 80, unit: 'Bay' }],
    invitedSuppliers: ['Bengal Steel Works', 'Meghna Packaging Ltd.'],
    quotes: [
      {
        id: 'sq-0002-1',
        rfqId: 'rfq-2026-0002',
        supplierName: 'Bengal Steel Works',
        submittedAt: '2026-09-19T14:20:00Z',
        items: [{ rfqItemId: 'rfqi-0002-1', unitPrice: 42000, lineTotal: 3360000 }],
        totalAmount: 3360000,
        deliveryDays: 25,
        warrantyMonths: 12,
        paymentTerms: 'LC at sight',
        status: 'submitted'
      }
    ],
    createdBy: 'Shahidul Alam'
  },
  {
    id: 'rfq-2026-0003',
    rfqNumber: 'RFQ-2026-0003',
    title: 'Fleet GPS Tracking Devices — 40 Units',
    purchaseRequestId: 'PR-2026-00165',
    companyId: 'c-transport',
    companyName: 'ABC Transport Ltd.',
    department: 'Fleet',
    issuedDate: '2026-09-20',
    dueDate: '2026-09-29',
    status: 'draft',
    items: [{ id: 'rfqi-0003-1', product: 'GPS Vehicle Tracker — 4G LTE', sku: 'FLT-GPS-4G', qty: 40, unit: 'Unit' }],
    invitedSuppliers: ['Grameen Fleet Solutions', 'Southeast Tech Distribution'],
    quotes: [],
    createdBy: 'Sohel Rana'
  }
];

// ─── Issue #10: Formal Purchase Order (PO) Lifecycle Management ──────────────

const VAT_RATE_PCT = 15;

function getCompanyDeliveryAddress(companyId: string): string {
  const legalEntityId = companyId.startsWith('le-') ? companyId : companyId.replace(/^c-/, 'le-');
  const hq = branchPlants.find((b) => b.companyId === legalEntityId && b.type === 'head-office') || branchPlants.find((b) => b.companyId === legalEntityId);
  return hq ? `${hq.name}, ${hq.address}, ${hq.city}, Bangladesh` : 'Registered Office, Bangladesh';
}

function buildPOLine(params: {
  id: string;
  sku: string;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  rfqItemId?: string;
  taxRatePct?: number;
  qtyReceived?: number;
}): POLine {
  const taxRatePct = params.taxRatePct ?? VAT_RATE_PCT;
  const subtotal = params.qty * params.unitPrice;
  const taxAmount = Math.round(subtotal * (taxRatePct / 100));
  return {
    id: params.id,
    rfqItemId: params.rfqItemId,
    sku: params.sku,
    description: params.description,
    qty: params.qty,
    unit: params.unit,
    unitPrice: params.unitPrice,
    taxRatePct,
    taxAmount,
    lineTotal: subtotal + taxAmount,
    qtyReceived: params.qtyReceived ?? 0
  };
}

function totalsFromLines(lines: POLine[]): { subtotal: number; taxAmount: number; totalAmount: number } {
  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const taxAmount = lines.reduce((sum, l) => sum + l.taxAmount, 0);
  return { subtotal, taxAmount, totalAmount: subtotal + taxAmount };
}

const poLine0001 = buildPOLine({ id: 'pol-0001-1', rfqItemId: 'rfqi-0001-1', sku: 'IT-LAP-I7', description: 'Business Laptop — i7/16GB/512GB SSD', qty: 60, unit: 'Unit', unitPrice: 32000 });
const poLine0002 = buildPOLine({ id: 'pol-0002-1', sku: 'FUEL-DIESEL-BULK', description: 'Diesel Fuel — Bulk Tanker Delivery', qty: 5000, unit: 'Litre', unitPrice: 125, qtyReceived: 3000 });
// Matches Inventory stock item 's3' (Packaging Film — 80 micron: 0 available, 1200 incoming, out-of-stock) —
// this PO is that shipment. It's seeded Issued/not-yet-received so recording its receipt live
// demonstrates the warehouse goods-arrival trigger against real, recognizable Inventory data.
const poLine0003 = buildPOLine({ id: 'pol-0003-1', sku: 'PK-FILM-080', description: 'Packaging Film — 80 micron', qty: 1200, unit: 'Roll', unitPrice: 620, qtyReceived: 0 });

export const initialPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-2026-0001',
    poNumber: 'PO-2026-0001',
    rfqId: 'rfq-2026-0001',
    purchaseRequestId: 'PR-2026-00184',
    supplierId: 'sup-southeast-tech',
    supplierName: 'Southeast Tech Distribution',
    companyId: 'c-tech',
    companyName: 'ABC Technologies Ltd.',
    deliveryAddress: getCompanyDeliveryAddress('c-tech'),
    lines: [poLine0001],
    ...totalsFromLines([poLine0001]),
    paymentTerms: '30% advance, 70% on delivery',
    deliveryDays: 18,
    warrantyMonths: 24,
    status: 'Draft',
    statusHistory: [{ status: 'Draft', at: '2026-09-16T11:00:00Z', by: 'Hasan Mahmud', note: 'Generated from awarded RFQ-2026-0001' }],
    createdAt: '2026-09-16T11:00:00Z',
    createdBy: 'Hasan Mahmud'
  },
  {
    id: 'po-2026-0002',
    poNumber: 'PO-2026-0002',
    supplierId: 'sup-padma',
    supplierName: 'Padma Oil Company',
    companyId: 'c-transport',
    companyName: 'ABC Transport Ltd.',
    deliveryAddress: getCompanyDeliveryAddress('c-transport'),
    lines: [poLine0002],
    ...totalsFromLines([poLine0002]),
    paymentTerms: 'Net 15',
    status: 'Partially Received',
    statusHistory: [
      { status: 'Draft', at: '2026-09-05T09:00:00Z', by: 'Sohel Rana' },
      { status: 'Pending Approval', at: '2026-09-05T09:30:00Z', by: 'Sohel Rana' },
      { status: 'Issued', at: '2026-09-05T14:00:00Z', by: 'Mizanur Rahman' },
      { status: 'Partially Received', at: '2026-09-19T10:00:00Z', by: 'Mizanur Rahman', note: '3,000 of 5,000 Litre received at Tejgaon depot' }
    ],
    createdAt: '2026-09-05T09:00:00Z',
    createdBy: 'Sohel Rana',
    approvedBy: 'Mizanur Rahman',
    approvedAt: '2026-09-05T14:00:00Z',
    issuedAt: '2026-09-05T14:00:00Z'
  },
  {
    id: 'po-2026-0003',
    poNumber: 'PO-2026-0003',
    supplierId: 'sup-meghna',
    supplierName: 'Meghna Packaging Ltd.',
    companyId: 'c-foods',
    companyName: 'ABC Foods Ltd.',
    deliveryAddress: getCompanyDeliveryAddress('c-foods'),
    lines: [poLine0003],
    ...totalsFromLines([poLine0003]),
    paymentTerms: 'Net 30',
    status: 'Issued',
    statusHistory: [
      { status: 'Draft', at: '2026-09-18T09:00:00Z', by: 'Imran Hossain' },
      { status: 'Pending Approval', at: '2026-09-18T09:20:00Z', by: 'Imran Hossain' },
      { status: 'Issued', at: '2026-09-19T11:00:00Z', by: 'Rahim Ahmed', note: 'Awaiting delivery at Gazipur Plant II' }
    ],
    createdAt: '2026-09-18T09:00:00Z',
    createdBy: 'Imran Hossain',
    approvedBy: 'Rahim Ahmed',
    approvedAt: '2026-09-19T11:00:00Z',
    issuedAt: '2026-09-19T11:00:00Z'
  }
];

export let rfqs: RFQ[] = initialRFQs.map((r) => ({ ...r, items: [...r.items], invitedSuppliers: [...r.invitedSuppliers], quotes: r.quotes.map((q) => ({ ...q, items: [...q.items] })) }));
export let purchaseOrders: PurchaseOrder[] = initialPurchaseOrders.map((po) => ({ ...po, lines: [...po.lines], statusHistory: [...po.statusHistory] }));
const rfqListeners: Array<() => void> = [];

export function getRFQs(): RFQ[] {
  return rfqs.map((r) => ({ ...r, items: [...r.items], invitedSuppliers: [...r.invitedSuppliers], quotes: r.quotes.map((q) => ({ ...q, items: [...q.items] })) }));
}

export function getPurchaseOrders(): PurchaseOrder[] {
  return purchaseOrders.map((po) => ({ ...po, lines: [...po.lines], statusHistory: [...po.statusHistory] }));
}

export function subscribeRFQs(listener: () => void): () => void {
  rfqListeners.push(listener);
  return () => {
    const idx = rfqListeners.indexOf(listener);
    if (idx !== -1) rfqListeners.splice(idx, 1);
  };
}

function notifyRFQs(): void {
  rfqListeners.forEach((l) => l());
}

let nextRfqSeq = 4;
let nextQuoteSeq = 1;
let nextPoSeq = 4;
let nextPoLineSeq = 1;

export function createRFQ(data: {
  title: string;
  purchaseRequest: PurchaseRequest;
  companyId: string;
  dueDate: string;
  items: Array<Omit<RFQItem, 'id'>>;
  invitedSuppliers: string[];
  createdBy: string;
}): RFQ {
  const idNum = nextRfqSeq++;
  const rfqId = `rfq-2026-${String(idNum).padStart(4, '0')}`;
  const now = new Date();

  const newRfq: RFQ = {
    id: rfqId,
    rfqNumber: `RFQ-2026-${String(idNum).padStart(4, '0')}`,
    title: data.title,
    purchaseRequestId: data.purchaseRequest.id,
    companyId: data.companyId,
    companyName: data.purchaseRequest.company,
    department: data.purchaseRequest.department,
    issuedDate: now.toISOString().slice(0, 10),
    dueDate: data.dueDate,
    status: 'open',
    items: data.items.map((item, idx) => ({ id: `rfqi-${idNum}-${idx + 1}`, ...item })),
    invitedSuppliers: data.invitedSuppliers,
    quotes: [],
    createdBy: data.createdBy
  };

  rfqs = [newRfq, ...rfqs];
  notifyRFQs();
  return newRfq;
}

export function submitSupplierQuote(data: {
  rfqId: string;
  supplierName: string;
  itemPrices: Array<{ rfqItemId: string; unitPrice: number }>;
  deliveryDays: number;
  warrantyMonths: number;
  paymentTerms: string;
}): SupplierQuote {
  const rfq = rfqs.find((r) => r.id === data.rfqId);
  if (!rfq) throw new Error('RFQ not found.');
  if (rfq.status === 'awarded' || rfq.status === 'cancelled') {
    throw new Error(`Cannot record a quote — this RFQ is already ${rfq.status}.`);
  }
  if (!rfq.invitedSuppliers.includes(data.supplierName)) {
    throw new Error(`${data.supplierName} was not invited to bid on this RFQ.`);
  }
  if (rfq.quotes.some((q) => q.supplierName === data.supplierName)) {
    throw new Error(`${data.supplierName} has already submitted a quote for this RFQ.`);
  }

  const quoteItems: QuoteItem[] = data.itemPrices.map((p) => {
    const rfqItem = rfq.items.find((i) => i.id === p.rfqItemId);
    const qty = rfqItem?.qty ?? 0;
    return { rfqItemId: p.rfqItemId, unitPrice: p.unitPrice, lineTotal: p.unitPrice * qty };
  });

  const newQuote: SupplierQuote = {
    id: `sq-${String(nextQuoteSeq++).padStart(4, '0')}-${data.rfqId.slice(-4)}`,
    rfqId: data.rfqId,
    supplierName: data.supplierName,
    submittedAt: new Date().toISOString(),
    items: quoteItems,
    totalAmount: quoteTotal(quoteItems),
    deliveryDays: data.deliveryDays,
    warrantyMonths: data.warrantyMonths,
    paymentTerms: data.paymentTerms,
    status: 'submitted'
  };

  rfqs = rfqs.map((r) =>
    r.id !== data.rfqId ? r : { ...r, status: r.status === 'draft' ? ('open' as const) : r.status, quotes: [...r.quotes, newQuote] }
  );
  notifyRFQs();
  return newQuote;
}

/** Awards the RFQ to `quoteId`'s supplier and generates a pre-filled draft Purchase Order carrying the winning prices forward. */
function nextPoId(): { id: string; poNumber: string } {
  const idNum = nextPoSeq++;
  const poNumber = `PO-2026-${String(idNum).padStart(4, '0')}`;
  return { id: `po-2026-${String(idNum).padStart(4, '0')}`, poNumber };
}

/** Awarding an RFQ generates a pre-filled DRAFT Purchase Order carrying the winning quote's prices forward. */
export function selectWinningSupplier(rfqId: string, quoteId: string, awardedBy: string): { rfq: RFQ; purchaseOrder: PurchaseOrder } {
  const rfq = rfqs.find((r) => r.id === rfqId);
  if (!rfq) throw new Error('RFQ not found.');
  if (rfq.status === 'awarded') throw new Error('This RFQ has already been awarded.');

  const winningQuote = rfq.quotes.find((q) => q.id === quoteId);
  if (!winningQuote) throw new Error('Quote not found on this RFQ.');

  const supplier = suppliers.find((s) => s.name === winningQuote.supplierName);
  const now = new Date().toISOString();
  const { id, poNumber } = nextPoId();

  const lines: POLine[] = winningQuote.items.map((qi) => {
    const rfqItem = rfq.items.find((i) => i.id === qi.rfqItemId);
    return buildPOLine({
      id: `pol-${id.slice(-4)}-${nextPoLineSeq++}`,
      rfqItemId: qi.rfqItemId,
      sku: rfqItem?.sku ?? '',
      description: rfqItem?.product ?? 'Item',
      qty: rfqItem?.qty ?? 0,
      unit: rfqItem?.unit ?? 'Unit',
      unitPrice: qi.unitPrice
    });
  });

  const purchaseOrder: PurchaseOrder = {
    id,
    poNumber,
    rfqId: rfq.id,
    purchaseRequestId: rfq.purchaseRequestId,
    supplierId: supplier?.id ?? winningQuote.supplierName,
    supplierName: winningQuote.supplierName,
    companyId: rfq.companyId,
    companyName: rfq.companyName,
    deliveryAddress: getCompanyDeliveryAddress(rfq.companyId),
    lines,
    ...totalsFromLines(lines),
    paymentTerms: winningQuote.paymentTerms,
    deliveryDays: winningQuote.deliveryDays,
    warrantyMonths: winningQuote.warrantyMonths,
    status: 'Draft',
    statusHistory: [{ status: 'Draft', at: now, by: awardedBy, note: `Generated from awarded ${rfq.rfqNumber}` }],
    createdAt: now,
    createdBy: awardedBy
  };

  const updatedRfq: RFQ = {
    ...rfq,
    status: 'awarded',
    winningSupplierName: winningQuote.supplierName,
    winningQuoteId: winningQuote.id,
    awardedAt: now,
    awardedBy,
    generatedPurchaseOrderId: purchaseOrder.id,
    quotes: rfq.quotes.map((q) => ({ ...q, status: q.id === quoteId ? ('selected' as const) : ('rejected' as const) }))
  };

  rfqs = rfqs.map((r) => (r.id === rfqId ? updatedRfq : r));
  purchaseOrders = [purchaseOrder, ...purchaseOrders];
  notifyRFQs();

  return { rfq: updatedRfq, purchaseOrder };
}

/** Raises a Purchase Order directly against an approved requisition, with no RFQ/sourcing step. */
export function createPurchaseOrder(data: {
  purchaseRequestId?: string;
  supplierId: string;
  companyId: string;
  companyName: string;
  deliveryAddress?: string;
  paymentTerms: string;
  lines: Array<{ sku: string; description: string; qty: number; unit: string; unitPrice: number; taxRatePct?: number }>;
  createdBy: string;
}): PurchaseOrder {
  const supplier = suppliers.find((s) => s.id === data.supplierId);
  if (!supplier) throw new Error('Supplier not found.');
  if (data.lines.length === 0) throw new Error('A Purchase Order needs at least one line.');

  const now = new Date().toISOString();
  const { id, poNumber } = nextPoId();

  const lines: POLine[] = data.lines.map((l) =>
    buildPOLine({ id: `pol-${id.slice(-4)}-${nextPoLineSeq++}`, ...l })
  );

  const purchaseOrder: PurchaseOrder = {
    id,
    poNumber,
    purchaseRequestId: data.purchaseRequestId,
    supplierId: supplier.id,
    supplierName: supplier.name,
    companyId: data.companyId,
    companyName: data.companyName,
    deliveryAddress: data.deliveryAddress || getCompanyDeliveryAddress(data.companyId),
    lines,
    ...totalsFromLines(lines),
    paymentTerms: data.paymentTerms,
    status: 'Draft',
    statusHistory: [{ status: 'Draft', at: now, by: data.createdBy }],
    createdAt: now,
    createdBy: data.createdBy
  };

  purchaseOrders = [purchaseOrder, ...purchaseOrders];
  notifyRFQs();
  return purchaseOrder;
}

const PO_TRANSITIONS: Record<POStatus, POStatus[]> = {
  Draft: ['Pending Approval', 'Cancelled'],
  'Pending Approval': ['Issued', 'Draft', 'Cancelled'],
  Issued: ['Partially Received', 'Completed', 'Cancelled'],
  'Partially Received': ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: []
};

function transitionPO(poId: string, to: POStatus, by: string, note: string | undefined, extra: Partial<PurchaseOrder> = {}): PurchaseOrder {
  const po = purchaseOrders.find((p) => p.id === poId);
  if (!po) throw new Error('Purchase Order not found.');
  if (!PO_TRANSITIONS[po.status].includes(to)) {
    throw new Error(`Cannot move Purchase Order from "${po.status}" to "${to}".`);
  }

  const now = new Date().toISOString();
  const updated: PurchaseOrder = {
    ...po,
    ...extra,
    status: to,
    statusHistory: [...po.statusHistory, { status: to, at: now, by, note }]
  };

  purchaseOrders = purchaseOrders.map((p) => (p.id === poId ? updated : p));
  notifyRFQs();
  return updated;
}

export function submitPurchaseOrderForApproval(poId: string, by: string): PurchaseOrder {
  return transitionPO(poId, 'Pending Approval', by, undefined);
}

export function approvePurchaseOrder(poId: string, by: string): PurchaseOrder {
  return transitionPO(poId, 'Issued', by, 'Approved and issued to supplier', { approvedBy: by, approvedAt: new Date().toISOString(), issuedAt: new Date().toISOString() });
}

export function sendPurchaseOrderBackToDraft(poId: string, by: string, note: string): PurchaseOrder {
  return transitionPO(poId, 'Draft', by, note || 'Sent back for revision');
}

export function cancelPurchaseOrder(poId: string, by: string, reason: string): PurchaseOrder {
  if (!reason || !reason.trim()) throw new Error('A cancellation reason is required.');
  return transitionPO(poId, 'Cancelled', by, reason.trim());
}

// ─── Issue #11: Goods Receipt Note (GRN) & QC Inspection ─────────────────────

export let goodsReceiptNotes: GoodsReceiptNote[] = [];
export let returnToVendorTickets: ReturnToVendorTicket[] = [];
const inventoryListeners: Array<() => void> = [];

export function getGoodsReceiptNotes(): GoodsReceiptNote[] {
  return goodsReceiptNotes.map((g) => ({ ...g, lines: [...g.lines] }));
}

export function getReturnToVendorTickets(): ReturnToVendorTicket[] {
  return [...returnToVendorTickets];
}

export function getStock(): StockItem[] {
  return [...stock];
}

export function subscribeInventory(listener: () => void): () => void {
  inventoryListeners.push(listener);
  return () => {
    const idx = inventoryListeners.indexOf(listener);
    if (idx !== -1) inventoryListeners.splice(idx, 1);
  };
}

function notifyInventory(): void {
  inventoryListeners.forEach((l) => l());
}

let nextGrnSeq = 1;
let nextRtvSeq = 1;

/**
 * Logs physical goods arrival against an active issued PO, with a per-line QC verdict.
 * Only `acceptedQty` is ever released to Available stock; `rejectedQty` is quarantined and
 * automatically raises a Return-to-Vendor ticket. Also rolls the PO's fulfillment status forward.
 */
export function createGoodsReceiptNote(params: {
  poId: string;
  warehouse: string;
  inspectorName: string;
  receivedBy: string;
  lines: Array<{
    poLineId: string;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    rejectionReason?: string;
    batchNumber?: string;
  }>;
}): { grn: GoodsReceiptNote; purchaseOrder: PurchaseOrder; rtvTickets: ReturnToVendorTicket[] } {
  const po = purchaseOrders.find((p) => p.id === params.poId);
  if (!po) throw new Error('Purchase Order not found.');
  if (po.status !== 'Issued' && po.status !== 'Partially Received') {
    throw new Error(`Cannot receive goods against a Purchase Order in "${po.status}" status — it must be an active issued PO.`);
  }

  const activeLines = params.lines.filter((l) => l.receivedQty > 0);
  if (activeLines.length === 0) throw new Error('Enter a received quantity for at least one line.');

  for (const l of activeLines) {
    const poLine = po.lines.find((pl) => pl.id === l.poLineId);
    if (!poLine) throw new Error('Purchase Order line not found.');
    if (l.acceptedQty + l.rejectedQty !== l.receivedQty) {
      throw new Error(`${poLine.description}: Accepted + Rejected must equal Received.`);
    }
    const outstanding = poLine.qty - poLine.qtyReceived;
    if (l.receivedQty > outstanding) {
      throw new Error(`${poLine.description}: Received (${l.receivedQty}) exceeds outstanding quantity (${outstanding}).`);
    }
    if (l.rejectedQty > 0 && !l.rejectionReason?.trim()) {
      throw new Error(`${poLine.description}: A rejection reason is required for rejected quantity.`);
    }
  }

  const now = new Date().toISOString();
  const grnIdNum = nextGrnSeq++;
  const grnId = `grn-2026-${String(grnIdNum).padStart(4, '0')}`;

  const grnLines: GRNLine[] = activeLines.map((l, idx) => {
    const poLine = po.lines.find((pl) => pl.id === l.poLineId)!;
    return {
      id: `grnl-${grnIdNum}-${idx + 1}`,
      poLineId: l.poLineId,
      sku: poLine.sku,
      description: poLine.description,
      unit: poLine.unit,
      qc: {
        inspectorName: params.inspectorName,
        inspectedAt: now,
        receivedQty: l.receivedQty,
        acceptedQty: l.acceptedQty,
        rejectedQty: l.rejectedQty,
        rejectionReason: l.rejectionReason?.trim() || undefined,
        batchNumber: l.batchNumber?.trim() || undefined
      }
    };
  });

  const grn: GoodsReceiptNote = {
    id: grnId,
    grnNumber: `GRN-2026-${String(grnIdNum).padStart(4, '0')}`,
    poId: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: po.supplierName,
    companyId: po.companyId,
    companyName: po.companyName,
    warehouse: params.warehouse,
    lines: grnLines,
    receivedAt: now,
    receivedBy: params.receivedBy
  };

  // Update the PO's fulfillment status — qtyReceived tracks total physical arrival regardless
  // of QC outcome (a rejected item still physically arrived and is no longer "outstanding").
  const updatedPoLines = po.lines.map((poLine) => {
    const l = activeLines.find((x) => x.poLineId === poLine.id);
    if (!l) return poLine;
    return { ...poLine, qtyReceived: Math.min(poLine.qty, poLine.qtyReceived + l.receivedQty) };
  });
  const allComplete = updatedPoLines.every((l) => l.qtyReceived >= l.qty);
  const anyReceived = updatedPoLines.some((l) => l.qtyReceived > 0);
  const newPoStatus: POStatus = allComplete ? 'Completed' : anyReceived ? 'Partially Received' : po.status;

  const updatedPo: PurchaseOrder = {
    ...po,
    lines: updatedPoLines,
    status: newPoStatus,
    closedAt: allComplete ? now : po.closedAt,
    statusHistory:
      newPoStatus === po.status
        ? po.statusHistory
        : [...po.statusHistory, { status: newPoStatus, at: now, by: params.receivedBy, note: `${grn.grnNumber} recorded` }]
  };
  purchaseOrders = purchaseOrders.map((p) => (p.id === po.id ? updatedPo : p));

  // Only ACCEPTED quantity is released to Available stock; REJECTED quantity is quarantined.
  // Physical arrival (accepted + rejected) always clears the PO's Incoming figure.
  for (const l of activeLines) {
    const poLine = po.lines.find((pl) => pl.id === l.poLineId)!;
    stock = stock.map((s) => {
      if (s.sku !== poLine.sku) return s;
      const newAvailable = s.available + l.acceptedQty;
      const newStatus = newAvailable <= 0 ? 'out-of-stock' : newAvailable <= s.reorder ? 'low-stock' : 'active';
      return {
        ...s,
        available: newAvailable,
        quarantineQty: s.quarantineQty + l.rejectedQty,
        incoming: Math.max(0, s.incoming - l.receivedQty),
        status: newStatus
      };
    });
  }

  // Rejected quantity automatically raises a Return-to-Vendor ticket.
  const rtvTickets: ReturnToVendorTicket[] = [];
  for (const l of activeLines) {
    if (l.rejectedQty <= 0) continue;
    const poLine = po.lines.find((pl) => pl.id === l.poLineId)!;
    const rtvIdNum = nextRtvSeq++;
    rtvTickets.push({
      id: `rtv-2026-${String(rtvIdNum).padStart(4, '0')}`,
      rtvNumber: `RTV-2026-${String(rtvIdNum).padStart(4, '0')}`,
      grnId,
      poId: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      companyId: po.companyId,
      companyName: po.companyName,
      sku: poLine.sku,
      description: poLine.description,
      rejectedQty: l.rejectedQty,
      unit: poLine.unit,
      rejectionReason: l.rejectionReason!.trim(),
      batchNumber: l.batchNumber?.trim() || undefined,
      status: 'open',
      createdAt: now,
      createdBy: params.receivedBy
    });
  }

  goodsReceiptNotes = [grn, ...goodsReceiptNotes];
  returnToVendorTickets = [...rtvTickets, ...returnToVendorTickets];

  notifyRFQs();
  notifyInventory();

  return { grn, purchaseOrder: updatedPo, rtvTickets };
}

export function setReturnToVendorStatus(rtvId: string, status: RTVStatus): ReturnToVendorTicket {
  const ticket = returnToVendorTickets.find((t) => t.id === rtvId);
  if (!ticket) throw new Error('Return-to-Vendor ticket not found.');
  const updated: ReturnToVendorTicket = { ...ticket, status };
  returnToVendorTickets = returnToVendorTickets.map((t) => (t.id === rtvId ? updated : t));
  notifyInventory();
  return updated;
}