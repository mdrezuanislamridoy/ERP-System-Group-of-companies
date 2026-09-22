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
  RTVStatus,
  ApprovalItem,
  ApprovalItemType,
  ApprovalNote,
  ApprovalDomain,
  ItemBatch,
  BatchStatus,
  StockTransferOrder,
  StockTransferLine,
  TransferStatus,
  JournalEntry,
  SalesOrder,
  SalesOrderLine,
  SOStatus
} from '../types';
import { getCostCenterBudget, commitCostCenterEncumbrance, branchPlants } from './organization';
import { getInvoices, approveInvoiceForPayment, rejectInvoice, postJournalEntry, createMirroredInterCompanyInvoices } from './finance';
import { recordAuditEvent } from './system';
import { employees, getLeaveRequests, decideLeaveRequest } from './people';

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

export function decidePurchaseRequest(prId: string, decision: 'approved' | 'rejected', by: string): PurchaseRequest {
  const request = purchaseRequests.find((p) => p.id === prId);
  if (!request) throw new Error('Purchase Request not found.');
  if (request.status !== 'pending') throw new Error(`This request is already ${request.status}.`);

  const updated: PurchaseRequest = {
    ...request,
    status: decision,
    stage: decision === 'approved' ? 'Completed' : `Rejected by ${by}`
  };
  purchaseRequests = purchaseRequests.map((p) => (p.id === prId ? updated : p));
  prListeners.forEach((l) => l());
  return updated;
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
  // Inter-Company Sister Concerns
  { id: 'sup-ic-transport', name: 'ABC Transport Ltd.', category: 'Logistics & Fleet', spend: 64500000, orders: 112, rating: 4.8, isSisterConcern: true, sisterCompanyId: 'c-transport', interCompanyCode: 'IC-TRANSPORT' },
  { id: 'sup-ic-tech', name: 'ABC Technologies Ltd.', category: 'IT Services & Cloud Hosting', spend: 28400000, orders: 45, rating: 4.9, isSisterConcern: true, sisterCompanyId: 'c-tech', interCompanyCode: 'IC-TECH' },
  { id: 'sup-ic-foods', name: 'ABC Foods Ltd.', category: 'Food & Raw Materials', spend: 31200000, orders: 58, rating: 4.7, isSisterConcern: true, sisterCompanyId: 'c-foods', interCompanyCode: 'IC-FOODS' },
  { id: 'sup-ic-textile', name: 'ABC Textiles Ltd.', category: 'Textiles & Staff Uniforms', spend: 12500000, orders: 24, rating: 4.5, isSisterConcern: true, sisterCompanyId: 'c-textile', interCompanyCode: 'IC-TEXTILE' },
  // External Suppliers
  { id: 'sup-meghna', name: 'Meghna Packaging Ltd.', category: 'Packaging', spend: 42800000, orders: 64, rating: 4.6 },
  { id: 'sup-padma', name: 'Padma Oil Company', category: 'Fuel & Lubricants', spend: 38100000, orders: 41, rating: 4.1 },
  { id: 'sup-bengal-steel', name: 'Bengal Steel Works', category: 'Engineering', spend: 21400000, orders: 28, rating: 4.4 },
  { id: 'sup-rangs', name: 'Rangs Logistics', category: 'Transport Services', spend: 17600000, orders: 92, rating: 3.8 },
  { id: 'sup-southeast-tech', name: 'Southeast Tech Distribution', category: 'IT Hardware & Electronics', spend: 15200000, orders: 34, rating: 4.3 },
  { id: 'sup-rahman-computer', name: 'Rahman Computer Source', category: 'IT Hardware & Electronics', spend: 6100000, orders: 12, rating: 4.5 },
  { id: 'sup-grameen-fleet', name: 'Grameen Fleet Solutions', category: 'Fleet & Telematics', spend: 8600000, orders: 19, rating: 4.0 }
];


export let stock: StockItem[] = [
  {
    id: 's1',
    product: 'Rice — Premium Grade (50kg)',
    sku: 'RM-RICE-050',
    warehouse: 'Savar Plant WH-01',
    onHand: 2200,
    reserved: 320,
    quarantineQty: 40,
    inTransitQty: 200,
    atp: 1840,
    available: 1840,
    incoming: 500,
    reorder: 800,
    unit: 'Bag (50kg)',
    unitCost: 5018,
    value: 11039600,
    status: 'active'
  },
  {
    id: 's2',
    product: 'Edible Oil — Soybean (20L)',
    sku: 'RM-OIL-020',
    warehouse: 'Savar Plant WH-01',
    onHand: 420,
    reserved: 180,
    quarantineQty: 30,
    inTransitQty: 50,
    atp: 210,
    available: 210,
    incoming: 200,
    reorder: 400,
    unit: 'Drum (20L)',
    unitCost: 9000,
    value: 3780000,
    status: 'low-stock'
  },
  {
    id: 's3',
    product: 'Packaging Film — 80 micron',
    sku: 'PK-FILM-080',
    warehouse: 'Gazipur Plant II',
    onHand: 0,
    reserved: 0,
    quarantineQty: 0,
    inTransitQty: 0,
    atp: 0,
    available: 0,
    incoming: 1200,
    reorder: 300,
    unit: 'Roll',
    unitCost: 620,
    value: 0,
    status: 'out-of-stock'
  },
  {
    id: 's4',
    product: 'Wheat Flour — Fine (25kg)',
    sku: 'RM-FLR-025',
    warehouse: 'Chattogram DC',
    onHand: 3820,
    reserved: 640,
    quarantineQty: 60,
    inTransitQty: 0,
    atp: 3120,
    available: 3120,
    incoming: 0,
    reorder: 1000,
    unit: 'Bag (25kg)',
    unitCost: 2450,
    value: 9359000,
    status: 'active'
  },
  {
    id: 's5',
    product: 'Sugar — Refined (50kg)',
    sku: 'RM-SGR-050',
    warehouse: 'Chattogram DC',
    onHand: 880,
    reserved: 220,
    quarantineQty: 20,
    inTransitQty: 100,
    atp: 640,
    available: 640,
    incoming: 800,
    reorder: 700,
    unit: 'Bag (50kg)',
    unitCost: 5090,
    value: 4479200,
    status: 'low-stock'
  },
  {
    id: 's6',
    product: 'Pallet — Euro Standard',
    sku: 'PK-PLT-EU',
    warehouse: 'Savar Plant WH-02',
    onHand: 940,
    reserved: 40,
    quarantineQty: 10,
    inTransitQty: 0,
    atp: 890,
    available: 890,
    incoming: 100,
    reorder: 200,
    unit: 'Pallet',
    unitCost: 946,
    value: 889240,
    status: 'active'
  },
  {
    id: 's7',
    product: 'Carton Box — 12×8×6',
    sku: 'PK-BOX-1286',
    warehouse: 'Gazipur Plant II',
    onHand: 15800,
    reserved: 3200,
    quarantineQty: 200,
    inTransitQty: 500,
    atp: 12400,
    available: 12400,
    incoming: 5000,
    reorder: 6000,
    unit: 'Box',
    unitCost: 157,
    value: 2480600,
    status: 'active'
  }
];

export const initialBatches: ItemBatch[] = [
  {
    id: 'bch-01',
    batchNumber: 'LOT-2026-RICE-01',
    sku: 'RM-RICE-050',
    product: 'Rice — Premium Grade (50kg)',
    warehouse: 'Savar Plant WH-01',
    binLocation: 'BIN-A1-04',
    manufacturingDate: '2026-06-10',
    expiryDate: '2026-10-15',
    quantityAvailable: 400,
    initialQuantity: 500,
    qcReleaseNumber: 'QC-REL-8810',
    status: 'active',
    supplierName: 'Meghna Agro Farms',
    poNumber: 'PO-2026-0001',
    grnNumber: 'GRN-2026-0001',
    companyName: 'ABC Foods Ltd.'
  },
  {
    id: 'bch-02',
    batchNumber: 'LOT-2026-RICE-02',
    sku: 'RM-RICE-050',
    product: 'Rice — Premium Grade (50kg)',
    warehouse: 'Savar Plant WH-01',
    binLocation: 'BIN-A1-05',
    manufacturingDate: '2026-07-20',
    expiryDate: '2026-11-25',
    quantityAvailable: 800,
    initialQuantity: 800,
    qcReleaseNumber: 'QC-REL-8924',
    status: 'active',
    supplierName: 'Meghna Agro Farms',
    poNumber: 'PO-2026-0001',
    grnNumber: 'GRN-2026-0001',
    companyName: 'ABC Foods Ltd.'
  },
  {
    id: 'bch-03',
    batchNumber: 'LOT-2026-RICE-03',
    sku: 'RM-RICE-050',
    product: 'Rice — Premium Grade (50kg)',
    warehouse: 'Savar Plant WH-01',
    binLocation: 'BIN-A2-01',
    manufacturingDate: '2026-09-01',
    expiryDate: '2027-04-30',
    quantityAvailable: 1000,
    initialQuantity: 1000,
    qcReleaseNumber: 'QC-REL-9102',
    status: 'active',
    supplierName: 'Meghna Agro Farms',
    companyName: 'ABC Foods Ltd.'
  },
  {
    id: 'bch-04',
    batchNumber: 'LOT-2026-OIL-01',
    sku: 'RM-OIL-020',
    product: 'Edible Oil — Soybean (20L)',
    warehouse: 'Savar Plant WH-01',
    binLocation: 'BIN-QUAR-02',
    manufacturingDate: '2026-01-15',
    expiryDate: '2026-09-10',
    quantityAvailable: 30,
    initialQuantity: 30,
    qcReleaseNumber: 'QC-REL-7911',
    status: 'expired',
    supplierName: 'Padma Oil Company',
    companyName: 'ABC Foods Ltd.'
  },
  {
    id: 'bch-05',
    batchNumber: 'LOT-2026-OIL-02',
    sku: 'RM-OIL-020',
    product: 'Edible Oil — Soybean (20L)',
    warehouse: 'Savar Plant WH-01',
    binLocation: 'BIN-B1-08',
    manufacturingDate: '2026-08-01',
    expiryDate: '2026-11-10',
    quantityAvailable: 150,
    initialQuantity: 200,
    qcReleaseNumber: 'QC-REL-8980',
    status: 'active',
    supplierName: 'Padma Oil Company',
    companyName: 'ABC Foods Ltd.'
  },
  {
    id: 'bch-06',
    batchNumber: 'LOT-2026-OIL-03',
    sku: 'RM-OIL-020',
    product: 'Edible Oil — Soybean (20L)',
    warehouse: 'Savar Plant WH-01',
    binLocation: 'BIN-B2-04',
    manufacturingDate: '2026-09-15',
    expiryDate: '2027-03-15',
    quantityAvailable: 240,
    initialQuantity: 240,
    qcReleaseNumber: 'QC-REL-9140',
    status: 'active',
    supplierName: 'Padma Oil Company',
    companyName: 'ABC Foods Ltd.'
  },
  {
    id: 'bch-07',
    batchNumber: 'LOT-2026-FLR-01',
    sku: 'RM-FLR-025',
    product: 'Wheat Flour — Fine (25kg)',
    warehouse: 'Chattogram DC',
    binLocation: 'BIN-C1-11',
    manufacturingDate: '2026-07-01',
    expiryDate: '2026-10-18',
    quantityAvailable: 620,
    initialQuantity: 800,
    qcReleaseNumber: 'QC-REL-8890',
    status: 'active',
    supplierName: 'City Flour Mills Ltd.',
    companyName: 'ABC Foods Ltd.'
  },
  {
    id: 'bch-08',
    batchNumber: 'LOT-2026-FLR-02',
    sku: 'RM-FLR-025',
    product: 'Wheat Flour — Fine (25kg)',
    warehouse: 'Chattogram DC',
    binLocation: 'BIN-C2-03',
    manufacturingDate: '2026-08-10',
    expiryDate: '2027-01-15',
    quantityAvailable: 3200,
    initialQuantity: 3200,
    qcReleaseNumber: 'QC-REL-9040',
    status: 'active',
    supplierName: 'City Flour Mills Ltd.',
    companyName: 'ABC Foods Ltd.'
  },
  {
    id: 'bch-09',
    batchNumber: 'LOT-2026-SGR-01',
    sku: 'RM-SGR-050',
    product: 'Sugar — Refined (50kg)',
    warehouse: 'Chattogram DC',
    binLocation: 'BIN-D1-06',
    manufacturingDate: '2026-05-12',
    expiryDate: '2026-12-30',
    quantityAvailable: 880,
    initialQuantity: 1000,
    qcReleaseNumber: 'QC-REL-8750',
    status: 'active',
    supplierName: 'Desh Sugar Refineries',
    companyName: 'ABC Foods Ltd.'
  }
];

export const initialStockTransfers: StockTransferOrder[] = [
  {
    id: 'sto-2026-0001',
    transferNumber: 'STO-2026-0001',
    sourceWarehouseId: 'bp-foods-savar',
    sourceWarehouseName: 'Savar Plant WH-01',
    destWarehouseId: 'bp-foods-ctg-wh',
    destWarehouseName: 'Chattogram DC',
    companyId: 'c-foods',
    companyName: 'ABC Foods Ltd.',
    isInterCompany: false,
    carrier: 'Rangs Logistics',
    trackingNumber: 'RL-TR-90442',
    vehicleNumber: 'DHAKA-METRO-TA-14-8821',
    driverName: 'Rafiqul Islam',
    driverPhone: '+880 1711-234567',
    lines: [
      {
        id: 'stol-0001-1',
        sku: 'RM-RICE-050',
        product: 'Rice — Premium Grade (50kg)',
        batchNumber: 'LOT-2026-RICE-01',
        shippedQty: 200,
        receivedQty: 0,
        unit: 'Bag (50kg)',
        transitVariance: 0
      }
    ],
    status: 'In-Transit',
    dispatchedAt: '2026-09-20T11:30:00Z',
    dispatchedBy: 'Shahidul Alam',
    createdAt: '2026-09-20T09:00:00Z',
    createdBy: 'Shahidul Alam'
  },
  {
    id: 'sto-2026-0002',
    transferNumber: 'STO-2026-0002',
    sourceWarehouseId: 'bp-foods-savar',
    sourceWarehouseName: 'Savar Plant WH-01',
    destWarehouseId: 'bp-trans-depot-n',
    destWarehouseName: 'Narsingdi Depot',
    companyId: 'c-foods',
    companyName: 'ABC Foods Ltd.',
    destCompanyId: 'c-transport',
    destCompanyName: 'ABC Transport Ltd.',
    isInterCompany: true,
    carrier: 'ABC Internal Fleet',
    trackingNumber: 'IF-2026-1082',
    vehicleNumber: 'DHAKA-METRO-DA-11-2090',
    driverName: 'Mohsin Kabir',
    driverPhone: '+880 1819-876543',
    lines: [
      {
        id: 'stol-0002-1',
        sku: 'RM-OIL-020',
        product: 'Edible Oil — Soybean (20L)',
        batchNumber: 'LOT-2026-OIL-02',
        shippedQty: 50,
        receivedQty: 50,
        unit: 'Drum (20L)',
        transitVariance: 0
      }
    ],
    status: 'Received',
    dispatchedAt: '2026-09-17T08:00:00Z',
    dispatchedBy: 'Shahidul Alam',
    receivedAt: '2026-09-18T14:30:00Z',
    receivedBy: 'Sohel Rana',
    createdAt: '2026-09-17T07:30:00Z',
    createdBy: 'Shahidul Alam'
  },
  {
    id: 'sto-2026-0003',
    transferNumber: 'STO-2026-0003',
    sourceWarehouseId: 'bp-foods-gazipur',
    sourceWarehouseName: 'Gazipur Plant II',
    destWarehouseId: 'bp-foods-savar',
    destWarehouseName: 'Savar Plant WH-02',
    companyId: 'c-foods',
    companyName: 'ABC Foods Ltd.',
    isInterCompany: false,
    carrier: 'Rangs Logistics',
    trackingNumber: 'RL-TR-88190',
    vehicleNumber: 'DHAKA-METRO-TA-18-4012',
    driverName: 'Kamal Hossain',
    driverPhone: '+880 1912-345678',
    lines: [
      {
        id: 'stol-0003-1',
        sku: 'PK-BOX-1286',
        product: 'Carton Box — 12×8×6',
        shippedQty: 500,
        receivedQty: 480,
        unit: 'Box',
        transitVariance: 20
      }
    ],
    status: 'Discrepancy',
    dispatchedAt: '2026-09-16T10:00:00Z',
    dispatchedBy: 'Shahidul Alam',
    receivedAt: '2026-09-17T16:00:00Z',
    receivedBy: 'Shahidul Alam',
    incidentNotes: '20 carton boxes crushed and water damaged due to heavy rain leak in truck tarp. Driver signed shrinkage claim acknowledgement.',
    createdAt: '2026-09-16T09:00:00Z',
    createdBy: 'Shahidul Alam'
  }
];

export let itemBatches: ItemBatch[] = [...initialBatches];
export let stockTransfers: StockTransferOrder[] = initialStockTransfers.map((st) => ({
  ...st,
  lines: st.lines.map((l) => ({ ...l }))
}));


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
const poLine0004 = buildPOLine({ id: 'pol-0004-1', sku: 'ENG-BRACKET-STD', description: 'Steel Mounting Brackets — Standard', qty: 500, unit: 'Unit', unitPrice: 340, qtyReceived: 500 });
const poLine0005 = buildPOLine({ id: 'pol-0005-1', sku: 'LOG-TRUCK-50T', description: 'Heavy Freight Logistics — Chattogram to Savar Corridor', qty: 15, unit: 'Trip', unitPrice: 300000, taxRatePct: 15, qtyReceived: 0 });

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
  },
  {
    id: 'po-2026-0004',
    poNumber: 'PO-2026-0004',
    supplierId: 'sup-bengal-steel',
    supplierName: 'Bengal Steel Works',
    companyId: 'c-foods',
    companyName: 'ABC Foods Ltd.',
    deliveryAddress: getCompanyDeliveryAddress('c-foods'),
    lines: [poLine0004],
    ...totalsFromLines([poLine0004]),
    paymentTerms: 'Net 30',
    status: 'Completed',
    statusHistory: [
      { status: 'Draft', at: '2026-09-02T09:00:00Z', by: 'Imran Hossain' },
      { status: 'Pending Approval', at: '2026-09-02T09:15:00Z', by: 'Imran Hossain' },
      { status: 'Issued', at: '2026-09-02T13:00:00Z', by: 'Rahim Ahmed' },
      { status: 'Completed', at: '2026-09-09T10:30:00Z', by: 'Shahidul Alam', note: 'GRN-2026-0002 — full quantity accepted' }
    ],
    createdAt: '2026-09-02T09:00:00Z',
    createdBy: 'Imran Hossain',
    approvedBy: 'Rahim Ahmed',
    approvedAt: '2026-09-02T13:00:00Z',
    issuedAt: '2026-09-02T13:00:00Z',
    closedAt: '2026-09-09T10:30:00Z'
  },
  {
    id: 'po-2026-0005',
    poNumber: 'PO-2026-0005',
    supplierId: 'sup-ic-transport',
    supplierName: 'ABC Transport Ltd.',
    companyId: 'c-foods',
    companyName: 'ABC Foods Ltd.',
    deliveryAddress: getCompanyDeliveryAddress('c-foods'),
    lines: [poLine0005],
    ...totalsFromLines([poLine0005]),
    paymentTerms: 'Net 30 — Sister Concern',
    status: 'Issued',
    statusHistory: [
      { status: 'Draft', at: '2026-09-14T09:00:00Z', by: 'Imran Hossain' },
      { status: 'Pending Approval', at: '2026-09-14T09:30:00Z', by: 'Imran Hossain' },
      { status: 'Issued', at: '2026-09-14T11:00:00Z', by: 'Rahim Ahmed', note: 'Auto-mirrored to SO-IC-2026-0001 in ABC Transport Ltd.' }
    ],
    createdAt: '2026-09-14T09:00:00Z',
    createdBy: 'Imran Hossain',
    approvedBy: 'Rahim Ahmed',
    approvedAt: '2026-09-14T11:00:00Z',
    issuedAt: '2026-09-14T11:00:00Z',
    isInterCompany: true,
    sisterCompanyId: 'c-transport',
    interCompanyCode: 'IC-TRANSPORT',
    mirroredSalesOrderId: 'so-ic-2026-0001'
  }
];

// ─── Phase 6 (Issue #19): Seeded Sales Orders (Auto-Mirrored) ─────────────────

export const initialSalesOrders: SalesOrder[] = [
  {
    id: 'so-ic-2026-0001',
    soNumber: 'SO-IC-2026-0001',
    customerName: 'ABC Foods Ltd.',
    customerCompanyId: 'c-foods',
    companyId: 'c-transport',
    companyName: 'ABC Transport Ltd.',
    lines: [
      {
        id: 'sol-0001-1',
        sku: 'LOG-TRUCK-50T',
        description: 'Heavy Freight Logistics — Chattogram to Savar Corridor',
        qty: 15,
        unit: 'Trip',
        unitPrice: 300000,
        taxRatePct: 15,
        taxAmount: 675000,
        lineTotal: 4500000,
        sourcePoLineId: 'pol-0005-1'
      }
    ],
    subtotal: 4500000,
    taxAmount: 675000,
    totalAmount: 5175000,
    status: 'Confirmed',
    isInterCompany: true,
    sourcePoId: 'po-2026-0005',
    sourcePoNumber: 'PO-2026-0005',
    mirroredInvoiceId: 'INV-IC-2026-000101',
    createdAt: '2026-09-14T11:00:00Z',
    createdBy: 'Automated Mirror Engine (from PO-2026-0005)'
  }
];

export let rfqs: RFQ[] = initialRFQs.map((r) => ({ ...r, items: [...r.items], invitedSuppliers: [...r.invitedSuppliers], quotes: r.quotes.map((q) => ({ ...q, items: [...q.items] })) }));
export let purchaseOrders: PurchaseOrder[] = initialPurchaseOrders.map((po) => ({ ...po, lines: [...po.lines], statusHistory: [...po.statusHistory] }));
export let salesOrders: SalesOrder[] = initialSalesOrders.map((so) => ({ ...so, lines: [...so.lines] }));

const rfqListeners: Array<() => void> = [];
const soListeners: Array<() => void> = [];

export function getRFQs(): RFQ[] {
  return rfqs.map((r) => ({ ...r, items: [...r.items], invitedSuppliers: [...r.invitedSuppliers], quotes: r.quotes.map((q) => ({ ...q, items: [...q.items] })) }));
}

export function getPurchaseOrders(): PurchaseOrder[] {
  return purchaseOrders.map((po) => ({ ...po, lines: [...po.lines], statusHistory: [...po.statusHistory] }));
}

export function getSalesOrders(): SalesOrder[] {
  return salesOrders.map((so) => ({ ...so, lines: [...so.lines] }));
}

export function subscribeRFQs(listener: () => void): () => void {
  rfqListeners.push(listener);
  return () => {
    const idx = rfqListeners.indexOf(listener);
    if (idx !== -1) rfqListeners.splice(idx, 1);
  };
}

export function subscribeSalesOrders(listener: () => void): () => void {
  soListeners.push(listener);
  return () => {
    const idx = soListeners.indexOf(listener);
    if (idx !== -1) soListeners.splice(idx, 1);
  };
}

function notifySalesOrders(): void {
  soListeners.forEach((l) => l());
}

function notifyRFQs(): void {
  rfqListeners.forEach((l) => l());
}

let nextRfqSeq = 4;
let nextQuoteSeq = 1;
let nextPoSeq = 5;
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

  const isInterCompany = Boolean(supplier.isSisterConcern);
  const sisterCompanyId = supplier.sisterCompanyId || undefined;
  const interCompanyCode = supplier.interCompanyCode || undefined;

  let mirroredSalesOrderId: string | undefined = undefined;

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
    createdBy: data.createdBy,
    isInterCompany,
    sisterCompanyId,
    interCompanyCode
  };

  // Phase 6 (Issue #19): Auto-mirror Sales Order if supplier is a Sister Concern
  if (isInterCompany && sisterCompanyId) {
    const soId = `so-ic-${id.replace('po-', '')}`;
    const soNumber = `SO-IC-${poNumber.replace('PO-', '')}`;
    mirroredSalesOrderId = soId;
    purchaseOrder.mirroredSalesOrderId = soId;

    const mirroredSO: SalesOrder = {
      id: soId,
      soNumber,
      customerName: data.companyName,
      customerCompanyId: data.companyId,
      companyId: sisterCompanyId,
      companyName: supplier.name,
      lines: lines.map((l) => ({
        id: `sol-${l.id.replace('pol-', '')}`,
        sku: l.sku,
        description: l.description,
        qty: l.qty,
        unit: l.unit,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
        taxRatePct: l.taxRatePct,
        taxAmount: l.taxAmount,
        sourcePoLineId: l.id
      })),
      subtotal: purchaseOrder.subtotal,
      taxAmount: purchaseOrder.taxAmount,
      totalAmount: purchaseOrder.totalAmount,
      status: 'Confirmed',
      isInterCompany: true,
      sourcePoId: id,
      sourcePoNumber: poNumber,
      createdAt: now,
      createdBy: `Automated Mirror Engine (from ${poNumber})`
    };

    salesOrders = [mirroredSO, ...salesOrders];
    notifySalesOrders();

    recordAuditEvent({
      user: data.createdBy,
      action: 'AUTO_MIRROR_SALES_ORDER',
      resource: `${poNumber} → ${soNumber}`,
      company: `${data.companyName} → ${supplier.name}`,
      before: '—',
      after: `Auto-generated matched Sales Order in sister concern ${supplier.name}`
    });
  }

  purchaseOrders = [purchaseOrder, ...purchaseOrders];
  notifyRFQs();
  return purchaseOrder;
}

/**
 * Phase 6 (Issue #19): Issue a Sales Order invoice.
 * Generates the Sales Invoice (Receivable) in the seller entity and
 * automatically creates the draft matching Supplier Invoice (Payable) in the buyer entity.
 */
export function issueSalesOrderInvoice(soId: string, by: string): {
  salesOrder: SalesOrder;
  salesInvoiceId: string;
  purchaseInvoiceId: string;
} {
  const so = salesOrders.find((s) => s.id === soId);
  if (!so) throw new Error('Sales Order not found.');
  if (so.status === 'Billed') throw new Error('This Sales Order has already been invoiced.');

  const { salesInvoice, supplierInvoice } = createMirroredInterCompanyInvoices({
    salesOrderId: so.id,
    sourcePoId: so.sourcePoId,
    sellerCompanyName: so.companyName,
    buyerCompanyName: so.customerName,
    amount: so.totalAmount,
    lines: so.lines.map((l) => ({
      sku: l.sku,
      description: l.description,
      qty: l.qty,
      unit: l.unit,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
      sourcePoLineId: l.sourcePoLineId
    })),
    by
  });

  const updatedSO: SalesOrder = {
    ...so,
    status: 'Billed',
    mirroredInvoiceId: salesInvoice.id
  };

  salesOrders = salesOrders.map((s) => (s.id === soId ? updatedSO : s));
  notifySalesOrders();

  recordAuditEvent({
    user: by,
    action: 'ISSUE_INTERCOMPANY_SALES_INVOICE',
    resource: `${so.soNumber} → ${salesInvoice.id}`,
    company: so.companyName,
    before: `Status: ${so.status}`,
    after: `Billed — Generated ${salesInvoice.id} in ${so.companyName} & mirrored ${supplierInvoice.id} in ${so.customerName}`
  });

  return {
    salesOrder: updatedSO,
    salesInvoiceId: salesInvoice.id,
    purchaseInvoiceId: supplierInvoice.id
  };
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
  const updated = transitionPO(poId, 'Issued', by, 'Approved and issued to supplier', { approvedBy: by, approvedAt: new Date().toISOString(), issuedAt: new Date().toISOString() });

  // Phase 6 (Issue #19): If this PO is inter-company, ensure mirrored SO is active/confirmed
  if (updated.isInterCompany && updated.mirroredSalesOrderId) {
    const so = salesOrders.find((s) => s.id === updated.mirroredSalesOrderId);
    if (so && so.status === 'Draft') {
      salesOrders = salesOrders.map((s) => (s.id === so.id ? { ...s, status: 'Confirmed' } : s));
      notifySalesOrders();
    }
  }
  return updated;
}

export function sendPurchaseOrderBackToDraft(poId: string, by: string, note: string): PurchaseOrder {
  return transitionPO(poId, 'Draft', by, note || 'Sent back for revision');
}

export function cancelPurchaseOrder(poId: string, by: string, reason: string): PurchaseOrder {
  if (!reason || !reason.trim()) throw new Error('A cancellation reason is required.');
  return transitionPO(poId, 'Cancelled', by, reason.trim());
}

// ─── Issue #11: Goods Receipt Note (GRN) & QC Inspection ─────────────────────

export const initialGoodsReceiptNotes: GoodsReceiptNote[] = [
  {
    id: 'grn-2026-0001',
    grnNumber: 'GRN-2026-0001',
    poId: 'po-2026-0002',
    poNumber: 'PO-2026-0002',
    supplierId: 'sup-padma',
    supplierName: 'Padma Oil Company',
    companyId: 'c-transport',
    companyName: 'ABC Transport Ltd.',
    warehouse: 'Savar Plant WH-01',
    lines: [
      {
        id: 'grnl-0001-1',
        poLineId: 'pol-0002-1',
        sku: 'FUEL-DIESEL-BULK',
        description: 'Diesel Fuel — Bulk Tanker Delivery',
        unit: 'Litre',
        qc: {
          inspectorName: 'Mizanur Rahman',
          inspectedAt: '2026-09-19T10:00:00Z',
          receivedQty: 3000,
          acceptedQty: 3000,
          rejectedQty: 0
        }
      }
    ],
    receivedAt: '2026-09-19T10:00:00Z',
    receivedBy: 'Mizanur Rahman'
  },
  {
    id: 'grn-2026-0002',
    grnNumber: 'GRN-2026-0002',
    poId: 'po-2026-0004',
    poNumber: 'PO-2026-0004',
    supplierId: 'sup-bengal-steel',
    supplierName: 'Bengal Steel Works',
    companyId: 'c-foods',
    companyName: 'ABC Foods Ltd.',
    warehouse: 'Gazipur Plant II',
    lines: [
      {
        id: 'grnl-0002-1',
        poLineId: 'pol-0004-1',
        sku: 'ENG-BRACKET-STD',
        description: 'Steel Mounting Brackets — Standard',
        unit: 'Unit',
        qc: {
          inspectorName: 'Roksana Begum',
          inspectedAt: '2026-09-09T10:30:00Z',
          receivedQty: 500,
          acceptedQty: 500,
          rejectedQty: 0
        }
      }
    ],
    receivedAt: '2026-09-09T10:30:00Z',
    receivedBy: 'Shahidul Alam'
  }
];

export let goodsReceiptNotes: GoodsReceiptNote[] = initialGoodsReceiptNotes.map((g) => ({ ...g, lines: [...g.lines] }));
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

let nextGrnSeq = 3;
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
    manufacturingDate?: string;
    expiryDate?: string;
    binLocation?: string;
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
  // Updates granular stock state: onHand, atp, quarantineQty, value.
  for (const l of activeLines) {
    const poLine = po.lines.find((pl) => pl.id === l.poLineId)!;
    stock = stock.map((s) => {
      if (s.sku !== poLine.sku) return s;
      const newOnHand = s.onHand + l.acceptedQty;
      const newQuarantine = s.quarantineQty + l.rejectedQty;
      const newAtp = Math.max(0, newOnHand - (s.reserved + newQuarantine));
      const newStatus = newAtp <= 0 ? 'out-of-stock' : newAtp <= s.reorder ? 'low-stock' : 'active';
      return {
        ...s,
        onHand: newOnHand,
        quarantineQty: newQuarantine,
        atp: newAtp,
        available: newAtp,
        incoming: Math.max(0, s.incoming - l.receivedQty),
        value: newOnHand * s.unitCost,
        status: newStatus
      };
    });

    // Create ItemBatch if batch details are supplied and goods accepted
    if (l.batchNumber?.trim() && l.acceptedQty > 0) {
      const newBatch: ItemBatch = {
        id: `bch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        batchNumber: l.batchNumber.trim(),
        sku: poLine.sku,
        product: poLine.description,
        warehouse: params.warehouse,
        binLocation: l.binLocation?.trim() || 'BIN-GEN-01',
        manufacturingDate: l.manufacturingDate || now.slice(0, 10),
        expiryDate: l.expiryDate || new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
        quantityAvailable: l.acceptedQty,
        initialQuantity: l.acceptedQty,
        qcReleaseNumber: `QC-REL-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'active',
        companyName: po.companyName,
        supplierName: po.supplierName,
        poNumber: po.poNumber,
        grnNumber: grn.grnNumber
      };
      itemBatches = [newBatch, ...itemBatches];
    }
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

// ─── Phase 5 Issue #16: Batches & Expiry Data APIs ───────────────────────────

export function getItemBatches(): ItemBatch[] {
  return [...itemBatches];
}

export function quarantineBatch(batchId: string, reason: string, by: string): ItemBatch {
  const batch = itemBatches.find((b) => b.id === batchId);
  if (!batch) throw new Error('Batch not found.');

  const prevStatus = batch.status;
  const updatedBatch: ItemBatch = {
    ...batch,
    status: 'recalled'
  };

  itemBatches = itemBatches.map((b) => (b.id === batchId ? updatedBatch : b));

  // If this batch had available quantity, move it into quarantine state on the stock item
  if (batch.quantityAvailable > 0) {
    stock = stock.map((s) => {
      if (s.sku !== batch.sku || s.warehouse !== batch.warehouse) return s;
      const newQuarantine = s.quarantineQty + batch.quantityAvailable;
      const newAtp = Math.max(0, s.onHand - (s.reserved + newQuarantine));
      return {
        ...s,
        quarantineQty: newQuarantine,
        atp: newAtp,
        available: newAtp
      };
    });
  }

  recordAuditEvent({
    user: by,
    action: 'BATCH_RECALL_INITIATED',
    resource: `${batch.batchNumber} (${batch.product})`,
    company: batch.companyName || 'ABC Foods Ltd.',
    before: prevStatus,
    after: `RECALLED & QUARANTINED — ${reason.trim()}`
  });

  notifyInventory();
  return updatedBatch;
}

export function releaseBatch(batchId: string, by: string): ItemBatch {
  const batch = itemBatches.find((b) => b.id === batchId);
  if (!batch) throw new Error('Batch not found.');

  const updatedBatch: ItemBatch = { ...batch, status: 'active' };
  itemBatches = itemBatches.map((b) => (b.id === batchId ? updatedBatch : b));

  if (batch.quantityAvailable > 0) {
    stock = stock.map((s) => {
      if (s.sku !== batch.sku || s.warehouse !== batch.warehouse) return s;
      const newQuarantine = Math.max(0, s.quarantineQty - batch.quantityAvailable);
      const newAtp = Math.max(0, s.onHand - (s.reserved + newQuarantine));
      return {
        ...s,
        quarantineQty: newQuarantine,
        atp: newAtp,
        available: newAtp
      };
    });
  }

  recordAuditEvent({
    user: by,
    action: 'BATCH_RELEASED_TO_ACTIVE',
    resource: `${batch.batchNumber} (${batch.product})`,
    company: batch.companyName || 'ABC Foods Ltd.',
    before: batch.status,
    after: 'active — QC cleared'
  });

  notifyInventory();
  return updatedBatch;
}

// ─── Phase 5 Issue #17: Stock Adjustment & Scrap Voucher GL Posting ──────────

export function adjustStockAndWriteOff(params: {
  stockId: string;
  adjustmentType: 'scrap_writeoff' | 'to_quarantine' | 'from_quarantine' | 'cycle_count';
  qty: number;
  reason: string;
  costCenterId?: string;
  costCenterCode?: string;
  expenseAccountCode?: string;
  assetAccountCode?: string;
  performedBy: string;
  batchId?: string;
}): { updatedStock: StockItem; journalEntry?: JournalEntry } {
  const item = stock.find((s) => s.id === params.stockId);
  if (!item) throw new Error('Stock item not found.');
  if (params.qty <= 0) throw new Error('Adjustment quantity must be greater than zero.');
  if (!params.reason.trim()) throw new Error('Adjustment justification is required.');

  let journalEntry: JournalEntry | undefined;
  const now = new Date().toISOString();

  if (params.adjustmentType === 'scrap_writeoff') {
    if (params.qty > item.onHand) {
      throw new Error(`Cannot write off ${params.qty} units; physical On-Hand is only ${item.onHand}.`);
    }

    const writeOffValue = Math.round(params.qty * item.unitCost);
    const expenseCode = params.expenseAccountCode || '5140';
    const assetCode = params.assetAccountCode || '1130';

    // Automated GL posting: Dr. Inventory Write-Off Expense / Cr. Inventory Asset
    journalEntry = postJournalEntry({
      date: now.slice(0, 10),
      companyId: 'c-foods',
      companyName: 'ABC Foods Ltd.',
      reference: `SCRAP-${item.sku}`,
      memo: `Damaged inventory write-off — ${params.qty} ${item.unit} of ${item.product}: ${params.reason.trim()}`,
      type: 'adjusting',
      createdBy: params.performedBy,
      lines: [
        {
          accountCode: expenseCode,
          accountName: 'Inventory Write-Off & Scrap Expense',
          costCenterId: params.costCenterId || 'cc-foods-prod-001',
          costCenterCode: params.costCenterCode || 'CC-FOODS-PROD-001',
          debit: writeOffValue,
          credit: 0,
          description: `Scrap write-off: ${params.qty} ${item.unit} of ${item.sku} (${params.reason.trim()})`
        },
        {
          accountCode: assetCode,
          accountName: 'Inventory — Raw Materials',
          costCenterId: params.costCenterId || 'cc-foods-prod-001',
          costCenterCode: params.costCenterCode || 'CC-FOODS-PROD-001',
          debit: 0,
          credit: writeOffValue,
          description: `Inventory reduction for written-off ${item.sku}`
        }
      ]
    });

    const newOnHand = Math.max(0, item.onHand - params.qty);
    // If stock was quarantined, deduct from quarantine first, otherwise deduct from ATP
    const deductFromQuarantine = Math.min(item.quarantineQty, params.qty);
    const newQuarantine = item.quarantineQty - deductFromQuarantine;
    const newAtp = Math.max(0, newOnHand - (item.reserved + newQuarantine));

    item.onHand = newOnHand;
    item.quarantineQty = newQuarantine;
    item.atp = newAtp;
    item.available = newAtp;
    item.value = newOnHand * item.unitCost;
    item.status = newAtp <= 0 ? 'out-of-stock' : newAtp <= item.reorder ? 'low-stock' : 'active';

    if (params.batchId) {
      const batch = itemBatches.find((b) => b.id === params.batchId);
      if (batch) {
        batch.quantityAvailable = Math.max(0, batch.quantityAvailable - params.qty);
      }
    }

    recordAuditEvent({
      user: params.performedBy,
      action: 'STOCK_WRITE_OFF_SCRAP',
      resource: `${item.sku} (${item.warehouse})`,
      company: 'ABC Foods Ltd.',
      before: `On-Hand: ${item.onHand + params.qty}`,
      after: `On-Hand: ${item.onHand} — Scrapped ${params.qty} ${item.unit} (GL Voucher: ${journalEntry.entryNumber}, ৳${writeOffValue.toLocaleString('en-IN')})`
    });
  } else if (params.adjustmentType === 'to_quarantine') {
    if (params.qty > item.atp) {
      throw new Error(`Cannot quarantine ${params.qty} units; Available to Promise (ATP) is only ${item.atp}.`);
    }
    item.quarantineQty += params.qty;
    item.atp = Math.max(0, item.onHand - (item.reserved + item.quarantineQty));
    item.available = item.atp;

    recordAuditEvent({
      user: params.performedBy,
      action: 'STOCK_RECLASSIFIED_TO_QUARANTINE',
      resource: `${item.sku} (${item.warehouse})`,
      company: 'ABC Foods Ltd.',
      before: `Quarantine: ${item.quarantineQty - params.qty}, ATP: ${item.atp + params.qty}`,
      after: `Quarantine: ${item.quarantineQty}, ATP: ${item.atp} — Reason: ${params.reason.trim()}`
    });
  } else if (params.adjustmentType === 'from_quarantine') {
    if (params.qty > item.quarantineQty) {
      throw new Error(`Cannot release ${params.qty} units; Quarantined count is only ${item.quarantineQty}.`);
    }
    item.quarantineQty -= params.qty;
    item.atp = Math.max(0, item.onHand - (item.reserved + item.quarantineQty));
    item.available = item.atp;

    recordAuditEvent({
      user: params.performedBy,
      action: 'STOCK_RELEASED_FROM_QUARANTINE',
      resource: `${item.sku} (${item.warehouse})`,
      company: 'ABC Foods Ltd.',
      before: `Quarantine: ${item.quarantineQty + params.qty}`,
      after: `Quarantine: ${item.quarantineQty}, ATP: ${item.atp} — Reason: ${params.reason.trim()}`
    });
  } else if (params.adjustmentType === 'cycle_count') {
    // Delta adjustment from physical inventory count
    const newOnHand = Math.max(0, item.onHand + params.qty);
    const newAtp = Math.max(0, newOnHand - (item.reserved + item.quarantineQty));
    item.onHand = newOnHand;
    item.atp = newAtp;
    item.available = newAtp;
    item.value = newOnHand * item.unitCost;

    recordAuditEvent({
      user: params.performedBy,
      action: 'STOCK_CYCLE_COUNT_ADJUSTMENT',
      resource: `${item.sku} (${item.warehouse})`,
      company: 'ABC Foods Ltd.',
      before: `On-Hand: ${item.onHand - params.qty}`,
      after: `On-Hand: ${item.onHand} (delta: ${params.qty > 0 ? `+${params.qty}` : params.qty})`
    });
  }

  stock = stock.map((s) => (s.id === item.id ? { ...item } : s));
  notifyInventory();
  return { updatedStock: { ...item }, journalEntry };
}

// ─── Phase 5 Issue #18: Inter-Warehouse & Inter-Company Stock Transfers ───────

export function getStockTransferOrders(): StockTransferOrder[] {
  return stockTransfers.map((st) => ({
    ...st,
    lines: st.lines.map((l) => ({ ...l }))
  }));
}

let nextStoSeq = 4;

export function createStockTransferOrder(data: {
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destWarehouseId: string;
  destWarehouseName: string;
  companyId: string;
  companyName: string;
  destCompanyId?: string;
  destCompanyName?: string;
  isInterCompany: boolean;
  carrier?: string;
  trackingNumber?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  lines: Array<{
    sku: string;
    product: string;
    batchNumber?: string;
    shippedQty: number;
    unit: string;
  }>;
  dispatchImmediately?: boolean;
  createdBy: string;
}): StockTransferOrder {
  if (data.sourceWarehouseName === data.destWarehouseName) {
    throw new Error('Source warehouse and destination warehouse must be different.');
  }
  if (data.lines.length === 0) {
    throw new Error('Transfer order must include at least one item.');
  }

  const now = new Date().toISOString();
  const stoId = `sto-2026-${String(nextStoSeq++).padStart(4, '0')}`;
  const transferNumber = `STO-2026-${String(nextStoSeq - 1).padStart(4, '0')}`;

  const lines: StockTransferLine[] = data.lines.map((l, idx) => ({
    id: `stol-${stoId.slice(-4)}-${idx + 1}`,
    sku: l.sku,
    product: l.product,
    batchNumber: l.batchNumber?.trim() || undefined,
    shippedQty: l.shippedQty,
    receivedQty: 0,
    unit: l.unit,
    transitVariance: 0
  }));

  const newOrder: StockTransferOrder = {
    id: stoId,
    transferNumber,
    sourceWarehouseId: data.sourceWarehouseId,
    sourceWarehouseName: data.sourceWarehouseName,
    destWarehouseId: data.destWarehouseId,
    destWarehouseName: data.destWarehouseName,
    companyId: data.companyId,
    companyName: data.companyName,
    destCompanyId: data.destCompanyId,
    destCompanyName: data.destCompanyName,
    isInterCompany: data.isInterCompany,
    carrier: data.carrier?.trim(),
    trackingNumber: data.trackingNumber?.trim(),
    vehicleNumber: data.vehicleNumber?.trim(),
    driverName: data.driverName?.trim(),
    driverPhone: data.driverPhone?.trim(),
    lines,
    status: 'Draft',
    createdAt: now,
    createdBy: data.createdBy
  };

  stockTransfers = [newOrder, ...stockTransfers];

  if (data.dispatchImmediately) {
    return dispatchStockTransferOrder(stoId, data.createdBy);
  }

  notifyInventory();
  return newOrder;
}

export function dispatchStockTransferOrder(stoId: string, by: string): StockTransferOrder {
  const sto = stockTransfers.find((t) => t.id === stoId);
  if (!sto) throw new Error('Stock transfer order not found.');
  if (sto.status !== 'Draft') throw new Error(`Cannot dispatch transfer order in "${sto.status}" status.`);

  const now = new Date().toISOString();
  const todayStr = now.slice(0, 10);

  // Validate FEFO: Cannot dispatch expired lots & cannot exceed ATP
  for (const line of sto.lines) {
    const stockItem = stock.find((s) => s.sku === line.sku && s.warehouse === sto.sourceWarehouseName);
    if (!stockItem) {
      throw new Error(`Stock not found for SKU ${line.sku} at ${sto.sourceWarehouseName}.`);
    }
    if (line.shippedQty > stockItem.atp) {
      throw new Error(`Cannot dispatch ${line.shippedQty} ${line.unit} of ${line.product}; Available to Promise (ATP) at ${sto.sourceWarehouseName} is only ${stockItem.atp}.`);
    }

    if (line.batchNumber) {
      const batch = itemBatches.find((b) => b.batchNumber === line.batchNumber);
      if (batch) {
        if (batch.status === 'expired' || batch.status === 'quarantined' || batch.status === 'recalled' || batch.expiryDate < todayStr) {
          throw new Error(`FEFO Violation: Batch ${batch.batchNumber} is expired/quarantined (Expiry: ${batch.expiryDate}). Dispatch of expired lots is strictly blocked.`);
        }
        if (line.shippedQty > batch.quantityAvailable) {
          throw new Error(`Batch ${batch.batchNumber} only has ${batch.quantityAvailable} available, but ${line.shippedQty} was requested.`);
        }
      }
    }
  }

  // Deduct from Source Warehouse ATP/OnHand and place into In-Transit state
  for (const line of sto.lines) {
    stock = stock.map((s) => {
      if (s.sku !== line.sku || s.warehouse !== sto.sourceWarehouseName) return s;
      const newOnHand = Math.max(0, s.onHand - line.shippedQty);
      const newInTransit = s.inTransitQty + line.shippedQty;
      const newAtp = Math.max(0, newOnHand - (s.reserved + s.quarantineQty));
      return {
        ...s,
        onHand: newOnHand,
        inTransitQty: newInTransit,
        atp: newAtp,
        available: newAtp,
        value: newOnHand * s.unitCost,
        status: newAtp <= 0 ? 'out-of-stock' : newAtp <= s.reorder ? 'low-stock' : 'active'
      };
    });

    if (line.batchNumber) {
      itemBatches = itemBatches.map((b) => {
        if (b.batchNumber !== line.batchNumber) return b;
        return {
          ...b,
          quantityAvailable: Math.max(0, b.quantityAvailable - line.shippedQty)
        };
      });
    }
  }

  const updated: StockTransferOrder = {
    ...sto,
    status: 'In-Transit',
    dispatchedAt: now,
    dispatchedBy: by
  };

  stockTransfers = stockTransfers.map((t) => (t.id === stoId ? updated : t));

  recordAuditEvent({
    user: by,
    action: 'DISPATCH_STOCK_TRANSFER',
    resource: `${sto.transferNumber} (${sto.sourceWarehouseName} → ${sto.destWarehouseName})`,
    company: sto.companyName,
    before: 'Draft',
    after: `Dispatched ${sto.lines.length} item(s) via ${sto.carrier || 'Internal Fleet'} (${sto.trackingNumber || 'No tracking'})`
  });

  notifyInventory();
  return updated;
}

export function receiveStockTransferOrder(params: {
  stoId: string;
  receivedBy: string;
  lineReceipts: Array<{ lineId: string; receivedQty: number }>;
  incidentNotes?: string;
}): StockTransferOrder {
  const sto = stockTransfers.find((t) => t.id === params.stoId);
  if (!sto) throw new Error('Stock transfer order not found.');
  if (sto.status !== 'In-Transit') throw new Error(`Cannot receive transfer order in "${sto.status}" status.`);

  const now = new Date().toISOString();
  let totalDiscrepancy = 0;

  const updatedLines: StockTransferLine[] = sto.lines.map((l) => {
    const receipt = params.lineReceipts.find((r) => r.lineId === l.id);
    const recQty = receipt !== undefined ? receipt.receivedQty : l.shippedQty;
    if (recQty < 0) throw new Error('Received quantity cannot be negative.');
    if (recQty > l.shippedQty) throw new Error(`Received quantity (${recQty}) cannot exceed shipped quantity (${l.shippedQty}).`);

    const variance = l.shippedQty - recQty;
    if (variance > 0) totalDiscrepancy += variance;

    return {
      ...l,
      receivedQty: recQty,
      transitVariance: variance
    };
  });

  if (totalDiscrepancy > 0 && !params.incidentNotes?.trim()) {
    throw new Error(
      `Discrepancy Detected: ${totalDiscrepancy} unit(s) missing or damaged in transit. A mandatory incident note is required.`
    );
  }

  const newStatus: TransferStatus = totalDiscrepancy > 0 ? 'Discrepancy' : 'Received';

  // 1. Relieve in-transit quantity from source
  for (const l of updatedLines) {
    stock = stock.map((s) => {
      if (s.sku !== l.sku || s.warehouse !== sto.sourceWarehouseName) return s;
      return {
        ...s,
        inTransitQty: Math.max(0, s.inTransitQty - l.shippedQty)
      };
    });

    // 2. Add physical received stock to Destination warehouse
    const destStock = stock.find((s) => s.sku === l.sku && s.warehouse === sto.destWarehouseName);
    if (destStock) {
      stock = stock.map((s) => {
        if (s.sku !== l.sku || s.warehouse !== sto.destWarehouseName) return s;
        const newOnHand = s.onHand + l.receivedQty;
        const newAtp = Math.max(0, newOnHand - (s.reserved + s.quarantineQty));
        return {
          ...s,
          onHand: newOnHand,
          atp: newAtp,
          available: newAtp,
          value: newOnHand * s.unitCost,
          status: newAtp <= 0 ? 'out-of-stock' : newAtp <= s.reorder ? 'low-stock' : 'active'
        };
      });
    } else {
      // Stock item didn't exist at destination warehouse; seed it
      const srcStock = stock.find((s) => s.sku === l.sku);
      const unitCost = srcStock?.unitCost || 1000;
      const newStockItem: StockItem = {
        id: `s-dest-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        product: l.product,
        sku: l.sku,
        warehouse: sto.destWarehouseName,
        onHand: l.receivedQty,
        reserved: 0,
        quarantineQty: 0,
        inTransitQty: 0,
        atp: l.receivedQty,
        available: l.receivedQty,
        incoming: 0,
        reorder: 200,
        unit: l.unit,
        unitCost,
        value: l.receivedQty * unitCost,
        status: l.receivedQty > 0 ? 'active' : 'out-of-stock'
      };
      stock = [...stock, newStockItem];
    }

    // 3. If batch was transferred, credit destination batch
    if (l.batchNumber && l.receivedQty > 0) {
      const srcBatch = itemBatches.find((b) => b.batchNumber === l.batchNumber);
      const existingDestBatch = itemBatches.find(
        (b) => b.batchNumber === l.batchNumber && b.warehouse === sto.destWarehouseName
      );

      if (existingDestBatch) {
        existingDestBatch.quantityAvailable += l.receivedQty;
      } else if (srcBatch) {
        itemBatches = [
          {
            ...srcBatch,
            id: `bch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            warehouse: sto.destWarehouseName,
            binLocation: 'BIN-DEST-01',
            quantityAvailable: l.receivedQty,
            initialQuantity: l.receivedQty
          },
          ...itemBatches
        ];
      }
    }
  }

  const updated: StockTransferOrder = {
    ...sto,
    lines: updatedLines,
    status: newStatus,
    receivedAt: now,
    receivedBy: params.receivedBy,
    incidentNotes: params.incidentNotes?.trim() || undefined
  };

  stockTransfers = stockTransfers.map((t) => (t.id === params.stoId ? updated : t));

  recordAuditEvent({
    user: params.receivedBy,
    action: 'RECEIVE_STOCK_TRANSFER',
    resource: `${sto.transferNumber} received at ${sto.destWarehouseName}`,
    company: sto.destCompanyName || sto.companyName,
    before: 'In-Transit',
    after:
      newStatus === 'Discrepancy'
        ? `Discrepancy flagged: ${totalDiscrepancy} unit(s) shrinkage — Incident: ${params.incidentNotes?.trim()}`
        : 'Received in full (100% physically verified)'
  });

  notifyInventory();
  return updated;
}


// ─── Issue #15: Approval Delegation, SLA Escalations & Timeouts ─────────────

export const APPROVAL_SLA_HOURS = 48;

export const initialDelegationRules: DelegationRule[] = [
  // Nasrin Sultana (Head of Finance, Rahim Ahmed's manager) is travelling — her Finance approval
  // authority is delegated to Rahim Ahmed for the week covering "today" in this demo calendar.
  {
    id: 'del-2026-0001',
    originalApproverId: 'EMP-10410',
    originalApproverName: 'Nasrin Sultana',
    delegateeId: 'EMP-10241',
    delegateeName: 'Rahim Ahmed',
    startDate: '2026-09-20',
    endDate: '2026-09-26',
    scope: 'Finance',
    reason: 'Regional CFO offsite — Singapore',
    createdAt: '2026-09-18T09:00:00Z',
    createdBy: 'Nasrin Sultana',
    revoked: false
  }
];

export let delegationRules: DelegationRule[] = [...initialDelegationRules];
const delegationListeners: Array<() => void> = [];

export function getDelegationRules(): DelegationRule[] {
  return [...delegationRules];
}

export function subscribeDelegations(listener: () => void): () => void {
  delegationListeners.push(listener);
  return () => {
    const idx = delegationListeners.indexOf(listener);
    if (idx !== -1) delegationListeners.splice(idx, 1);
  };
}

function notifyDelegations(): void {
  delegationListeners.forEach((l) => l());
}

let nextDelegationSeq = 2;

export function createDelegation(data: {
  originalApproverId: string;
  originalApproverName: string;
  delegateeId: string;
  delegateeName: string;
  startDate: string;
  endDate: string;
  scope: DelegationScope;
  reason?: string;
  createdBy: string;
}): DelegationRule {
  if (data.delegateeName === data.originalApproverName) {
    throw new Error('You cannot delegate to yourself.');
  }
  if (new Date(data.endDate) < new Date(data.startDate)) {
    throw new Error('End date must be on or after the start date.');
  }

  const rule: DelegationRule = {
    ...data,
    id: `del-2026-${String(nextDelegationSeq++).padStart(4, '0')}`,
    createdAt: new Date().toISOString(),
    revoked: false
  };
  delegationRules = [rule, ...delegationRules];
  notifyDelegations();
  return rule;
}

export function revokeDelegation(delegationId: string): DelegationRule {
  const rule = delegationRules.find((d) => d.id === delegationId);
  if (!rule) throw new Error('Delegation rule not found.');
  const updated: DelegationRule = { ...rule, revoked: true, revokedAt: new Date().toISOString() };
  delegationRules = delegationRules.map((d) => (d.id === delegationId ? updated : d));
  notifyDelegations();
  return updated;
}

function isDelegationActive(rule: DelegationRule, atISODate: string): boolean {
  if (rule.revoked) return false;
  return atISODate >= rule.startDate && atISODate <= rule.endDate;
}

/** Finds the delegation (if any) currently covering `approverName`'s authority for `domain`. */
export function getActiveDelegationFor(approverName: string, domain: ApprovalDomain, at: Date = new Date()): DelegationRule | undefined {
  const atISODate = at.toISOString().slice(0, 10);
  return delegationRules.find(
    (d) => d.originalApproverName === approverName && (d.scope === 'all' || d.scope === domain) && isDelegationActive(d, atISODate)
  );
}

/** Finds the delegation (if any) that makes `delegateeName` the acting approver for `domain`. */
export function getActiveDelegationAsDelegatee(delegateeName: string, domain: ApprovalDomain, at: Date = new Date()): DelegationRule | undefined {
  const atISODate = at.toISOString().slice(0, 10);
  return delegationRules.find(
    (d) => d.delegateeName === delegateeName && (d.scope === 'all' || d.scope === domain) && isDelegationActive(d, atISODate)
  );
}

export interface SlaStatus {
  hoursLeft: number;
  breached: boolean;
  label: string;
  tone: 'neutral' | 'warning' | 'danger';
}

/** Shared by Approvals.tsx and ApprovalDetail.tsx so the countdown badge reads identically everywhere. */
export function getSlaStatus(item: Pick<ApprovalItem, 'submittedAt' | 'slaHours' | 'escalated' | 'escalatedTo'>): SlaStatus {
  const deadlineMs = new Date(item.submittedAt).getTime() + item.slaHours * 3600 * 1000;
  const hoursLeft = (deadlineMs - Date.now()) / 3600 / 1000;

  if (item.escalated) {
    return { hoursLeft, breached: true, label: `Escalated → ${item.escalatedTo}`, tone: 'danger' };
  }
  if (hoursLeft <= 0) {
    return { hoursLeft, breached: true, label: 'SLA breached', tone: 'danger' };
  }
  if (hoursLeft <= 12) {
    return { hoursLeft, breached: false, label: `Expires in ${Math.ceil(hoursLeft)} hrs`, tone: 'danger' };
  }
  if (hoursLeft <= 24) {
    return { hoursLeft, breached: false, label: `Expires in ${Math.ceil(hoursLeft)} hrs`, tone: 'warning' };
  }
  const days = Math.floor(hoursLeft / 24);
  const hrs = Math.ceil(hoursLeft % 24);
  return { hoursLeft, breached: false, label: `Expires in ${days}d ${hrs}h`, tone: 'neutral' };
}

// ─── Issue #13: Unified Multi-Domain Approval Inbox ──────────────────────────
// Aggregates pending work from every domain store into one polymorphic list. Each ApprovalItem
// is a thin read projection — decideApprovalItem() dispatches back to the real domain function
// (decidePurchaseRequest, approveInvoiceForPayment, approvePurchaseOrder, decideLeaveRequest),
// so every module's own rules (3-Way Match gate, PO status machine, etc.) still apply.

const BULK_APPROVAL_THRESHOLD = 20000;
const PRIORITY_WEIGHT: Record<ApprovalItem['priority'], number> = { Critical: 3, High: 2, Normal: 1, Low: 0 };

const approvalNotesStore: Record<string, ApprovalNote[]> = {};
const approvalInboxListeners: Array<() => void> = [];

function approvalNoteKey(type: ApprovalItemType, sourceId: string): string {
  return `${type}:${sourceId}`;
}

function getApprovalNotesFor(type: ApprovalItemType, sourceId: string): ApprovalNote[] {
  return approvalNotesStore[approvalNoteKey(type, sourceId)] || [];
}

function recordApprovalNote(type: ApprovalItemType, sourceId: string, note: ApprovalNote): void {
  const key = approvalNoteKey(type, sourceId);
  approvalNotesStore[key] = [...(approvalNotesStore[key] || []), note];
}

export function subscribeApprovalInbox(listener: () => void): () => void {
  approvalInboxListeners.push(listener);
  return () => {
    const idx = approvalInboxListeners.indexOf(listener);
    if (idx !== -1) approvalInboxListeners.splice(idx, 1);
  };
}

function notifyApprovalInbox(): void {
  approvalInboxListeners.forEach((l) => l());
}

// Escalation state persists across getApprovalInbox() calls (keyed by ApprovalItem.id) so an
// already-escalated item isn't re-escalated (and re-audited) on every refresh.
const escalationStore: Record<string, { escalatedAt: string; escalatedTo: string }> = {};

function resolveEscalationManager(requesterName: string): string {
  return employees.find((e) => e.name === requesterName)?.manager || 'Group CEO';
}

/** Checks one item's SLA clock; on first breach, records the escalation (note + audit event) and
 *  remembers it. Called as a pass over the fully-built inbox, since it needs `notes` filled in. */
function withSlaEscalation(item: ApprovalItem): ApprovalItem {
  const deadlineMs = new Date(item.submittedAt).getTime() + item.slaHours * 3600 * 1000;
  const breached = Date.now() > deadlineMs;

  if (breached && !escalationStore[item.id]) {
    const escalatedTo = resolveEscalationManager(item.requester);
    const now = new Date().toISOString();
    escalationStore[item.id] = { escalatedAt: now, escalatedTo };
    recordApprovalNote(item.type, item.sourceId, {
      author: 'System',
      at: now,
      text: `SLA breached (${item.slaHours}h) — automatically escalated to ${escalatedTo}.`
    });
    recordAuditEvent({
      user: 'System',
      action: 'SLA_AUTO_ESCALATION',
      resource: `${item.title} [${item.id}]`,
      company: item.company,
      before: 'Pending',
      after: `Escalated to ${escalatedTo} after ${item.slaHours}h SLA breach`
    });
  }

  const escalation = escalationStore[item.id];
  if (!escalation) return item;
  return {
    ...item,
    escalated: true,
    escalatedAt: escalation.escalatedAt,
    escalatedTo: escalation.escalatedTo,
    notes: getApprovalNotesFor(item.type, item.sourceId)
  };
}

export function getApprovalInbox(): ApprovalItem[] {
  const items: ApprovalItem[] = [];

  for (const pr of purchaseRequests) {
    if (pr.status !== 'pending') continue;
    const isBudgetOverride = Boolean(pr.budgetOverrun && pr.escalationRequired);
    const type: ApprovalItemType = isBudgetOverride ? 'budget_override' : 'purchase_request';
    items.push({
      id: `${type}-${pr.id}`,
      type,
      domain: isBudgetOverride ? 'Finance' : 'Procurement',
      sourceId: pr.id,
      title: pr.title,
      subtitle: isBudgetOverride
        ? `Exceeds Cost Center headroom by ৳${(pr.overrunAmount || 0).toLocaleString('en-IN')} — CFO variance sign-off required`
        : `${pr.department} · ${pr.costCenterCode || 'Unbudgeted'}`,
      requester: pr.requester,
      company: pr.company,
      department: pr.department,
      amount: pr.amount,
      priority: isBudgetOverride ? 'Critical' : pr.priority,
      status: 'pending',
      createdAt: pr.created,
      stage: pr.stage,
      bulkEligible: !isBudgetOverride && pr.amount < BULK_APPROVAL_THRESHOLD,
      history: [{ label: 'Submitted', actor: pr.requester, state: 'done', time: pr.created }],
      notes: getApprovalNotesFor(type, pr.id),
      submittedAt: new Date(pr.created).toISOString(),
      slaHours: APPROVAL_SLA_HOURS,
      escalated: false
    });
  }

  for (const inv of getInvoices()) {
    if (inv.status !== 'pending' || inv.type !== 'Payable') continue;
    const isDiscrepancy = inv.matchStatus === 'Discrepancy';
    items.push({
      id: `supplier_invoice-${inv.id}`,
      type: 'supplier_invoice',
      domain: 'Finance',
      sourceId: inv.id,
      title: `Invoice from ${inv.party}`,
      subtitle: inv.poId ? `3-Way Match: ${inv.matchStatus || 'Unmatched'}` : `Due ${inv.due}`,
      requester: inv.party,
      company: inv.company,
      amount: inv.amount,
      priority: isDiscrepancy ? 'High' : 'Normal',
      status: 'pending',
      createdAt: inv.issued,
      stage: isDiscrepancy ? 'Blocked — 3-Way Match Discrepancy' : 'Awaiting Accounts Payable approval',
      bulkEligible: !isDiscrepancy && inv.amount < BULK_APPROVAL_THRESHOLD,
      history: [
        { label: 'Invoice received', actor: inv.party, state: 'done', time: inv.issued },
        ...(inv.poId
          ? [{ label: `3-Way Match: ${inv.matchStatus || 'Unmatched'}`, actor: 'System', state: (isDiscrepancy ? 'rejected' : 'done') as ApprovalStep['state'], time: inv.issued }]
          : [])
      ],
      notes: getApprovalNotesFor('supplier_invoice', inv.id),
      submittedAt: new Date(inv.issued).toISOString(),
      slaHours: APPROVAL_SLA_HOURS,
      escalated: false
    });
  }

  for (const po of purchaseOrders) {
    if (po.status !== 'Pending Approval') continue;
    items.push({
      id: `payment_voucher-${po.id}`,
      type: 'payment_voucher',
      domain: 'Finance',
      sourceId: po.id,
      title: `${po.poNumber} — ${po.supplierName}`,
      subtitle: `${po.lines.length} line(s) · ${po.paymentTerms}`,
      requester: po.createdBy,
      company: po.companyName,
      amount: po.totalAmount,
      priority: 'Normal',
      status: 'pending',
      createdAt: po.createdAt.slice(0, 10),
      stage: 'Pending Approval — Purchase Order',
      bulkEligible: po.totalAmount < BULK_APPROVAL_THRESHOLD,
      history: po.statusHistory.map((h) => ({ label: h.status, actor: h.by, state: 'done' as const, time: h.at.slice(0, 10), note: h.note })),
      notes: getApprovalNotesFor('payment_voucher', po.id),
      submittedAt: po.createdAt,
      slaHours: APPROVAL_SLA_HOURS,
      escalated: false
    });
  }

  for (const lv of getLeaveRequests()) {
    if (lv.status !== 'pending') continue;
    const emp = employees.find((e) => e.name === lv.employee);
    items.push({
      id: `leave_application-${lv.id}`,
      type: 'leave_application',
      domain: 'HR',
      sourceId: lv.id,
      title: `${lv.type} — ${lv.employee}`,
      subtitle: `${lv.from} → ${lv.to} (${lv.days} day${lv.days > 1 ? 's' : ''})`,
      requester: lv.employee,
      company: emp?.company || 'ABC Foods Ltd.',
      department: emp?.department,
      priority: lv.days >= 7 ? 'High' : 'Normal',
      status: 'pending',
      createdAt: lv.submittedOn,
      stage: 'Awaiting manager approval',
      bulkEligible: true,
      history: [{ label: 'Submitted', actor: lv.employee, state: 'done', time: lv.submittedOn }],
      notes: getApprovalNotesFor('leave_application', lv.id),
      submittedAt: new Date(lv.submittedOn).toISOString(),
      slaHours: APPROVAL_SLA_HOURS,
      escalated: false
    });
  }

  return items.map(withSlaEscalation).sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
}

export function decideApprovalItem(item: ApprovalItem, decision: 'approved' | 'rejected', by: string, comment?: string): void {
  switch (item.type) {
    case 'purchase_request':
    case 'budget_override':
      decidePurchaseRequest(item.sourceId, decision, by);
      break;
    case 'supplier_invoice':
      if (decision === 'approved') approveInvoiceForPayment(item.sourceId, by);
      else rejectInvoice(item.sourceId);
      break;
    case 'payment_voucher':
      if (decision === 'approved') approvePurchaseOrder(item.sourceId, by);
      else cancelPurchaseOrder(item.sourceId, by, comment?.trim() || 'Rejected via unified approval inbox');
      break;
    case 'leave_application':
      decideLeaveRequest(item.sourceId, decision, by, comment);
      break;
    case 'journal_entry':
    default:
      throw new Error('This item type does not support decisions from the unified inbox yet.');
  }

  // If the acting user is currently someone's active delegate for this domain, the audit trail
  // must explicitly say so — this is the delegation half of Issue #15's acceptance criteria.
  const delegation = getActiveDelegationAsDelegatee(by, item.domain);
  const actingFor = delegation?.originalApproverName;

  if ((comment && comment.trim()) || actingFor) {
    recordApprovalNote(item.type, item.sourceId, {
      author: by,
      at: new Date().toISOString(),
      text: comment?.trim() || `${decision === 'approved' ? 'Approved' : 'Rejected'} with no additional comment.`,
      decision,
      actingFor
    });
  }

  recordAuditEvent({
    user: by,
    action: decision === 'approved' ? 'APPROVE_UNIFIED_INBOX_ITEM' : 'REJECT_UNIFIED_INBOX_ITEM',
    resource: `${item.title} [${item.id}]`,
    company: item.company,
    before: 'Pending',
    after: actingFor ? `${decision} — acting on behalf of ${actingFor} (delegation ${delegation!.id})` : decision
  });

  notifyApprovalInbox();
}

/** Applies the same decision to every item, continuing past individual failures (e.g. a
 *  Discrepancy invoice slipping into a bulk selection) and reporting which ones didn't go through. */
export function decideApprovalItemsBulk(
  items: ApprovalItem[],
  decision: 'approved' | 'rejected',
  by: string,
  comment?: string
): { succeeded: ApprovalItem[]; failed: Array<{ item: ApprovalItem; error: string }> } {
  const succeeded: ApprovalItem[] = [];
  const failed: Array<{ item: ApprovalItem; error: string }> = [];

  for (const item of items) {
    try {
      decideApprovalItem(item, decision, by, comment);
      succeeded.push(item);
    } catch (err) {
      failed.push({ item, error: err instanceof Error ? err.message : 'Failed to apply decision.' });
    }
  }

  return { succeeded, failed };
}