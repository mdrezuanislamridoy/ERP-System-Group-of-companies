import type { PurchaseRequest, StockItem, ApprovalStep } from '../types';

export const purchaseRequests: PurchaseRequest[] = [
{ id: 'PR-2026-00192', title: 'Raw material procurement — Q4 rice & edible oil', requester: 'Imran Hossain', department: 'Production', company: 'ABC Foods Ltd.', amount: 850000, created: '20 Sep 2026', stage: 'Finance Manager', status: 'pending', priority: 'High' },
{ id: 'PR-2026-00191', title: 'Packaging film rolls — Line B', requester: 'Shahidul Alam', department: 'Production', company: 'ABC Foods Ltd.', amount: 320000, created: '19 Sep 2026', stage: 'Department Manager', status: 'pending', priority: 'Normal' },
{ id: 'PR-2026-00188', title: 'Fleet tyre replacement — 24 units', requester: 'Sohel Rana', department: 'Fleet', company: 'ABC Transport Ltd.', amount: 1240000, created: '18 Sep 2026', stage: 'CFO', status: 'pending', priority: 'Critical' },
{ id: 'PR-2026-00184', title: 'Laptop refresh — Engineering', requester: 'Hasan Mahmud', department: 'Information Technology', company: 'ABC Technologies Ltd.', amount: 2100000, created: '16 Sep 2026', stage: 'Completed', status: 'approved', priority: 'Normal' },
{ id: 'PR-2026-00180', title: 'Cold storage maintenance contract', requester: 'Ayesha Siddika', department: 'Warehouse', company: 'ABC Grocery Ltd.', amount: 480000, created: '14 Sep 2026', stage: 'Rejected at Finance', status: 'rejected', priority: 'Low' },
{ id: 'PR-2026-00176', title: 'Office stationery — HQ quarterly', requester: 'Farzana Yeasmin', department: 'Human Resources', company: 'ABC Foods Ltd.', amount: 96000, created: '12 Sep 2026', stage: 'Draft', status: 'draft', priority: 'Low' }];


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


export const suppliers = [
{ name: 'Meghna Packaging Ltd.', category: 'Packaging', spend: 42800000, orders: 64, rating: 4.6 },
{ name: 'Padma Oil Company', category: 'Fuel & Lubricants', spend: 38100000, orders: 41, rating: 4.1 },
{ name: 'Bengal Steel Works', category: 'Engineering', spend: 21400000, orders: 28, rating: 4.4 },
{ name: 'Rangs Logistics', category: 'Transport Services', spend: 17600000, orders: 92, rating: 3.8 }];


export const stock: StockItem[] = [
{ id: 's1', product: 'Rice — Premium Grade (50kg)', sku: 'RM-RICE-050', warehouse: 'Savar Plant WH-01', available: 1840, reserved: 320, incoming: 500, reorder: 800, value: 11040000, status: 'active' },
{ id: 's2', product: 'Edible Oil — Soybean (20L)', sku: 'RM-OIL-020', warehouse: 'Savar Plant WH-01', available: 210, reserved: 180, incoming: 200, reorder: 400, value: 3780000, status: 'low-stock' },
{ id: 's3', product: 'Packaging Film — 80 micron', sku: 'PK-FILM-080', warehouse: 'Gazipur Plant II', available: 0, reserved: 0, incoming: 1200, reorder: 300, value: 0, status: 'out-of-stock' },
{ id: 's4', product: 'Wheat Flour — Fine (25kg)', sku: 'RM-FLR-025', warehouse: 'Chattogram DC', available: 3120, reserved: 640, incoming: 0, reorder: 1000, value: 9360000, status: 'active' },
{ id: 's5', product: 'Sugar — Refined (50kg)', sku: 'RM-SGR-050', warehouse: 'Chattogram DC', available: 640, reserved: 220, incoming: 800, reorder: 700, value: 4480000, status: 'low-stock' },
{ id: 's6', product: 'Pallet — Euro Standard', sku: 'PK-PLT-EU', warehouse: 'Savar Plant WH-02', available: 890, reserved: 40, incoming: 100, reorder: 200, value: 890000, status: 'active' },
{ id: 's7', product: 'Carton Box — 12×8×6', sku: 'PK-BOX-1286', warehouse: 'Gazipur Plant II', available: 12400, reserved: 3200, incoming: 5000, reorder: 6000, value: 2480000, status: 'active' }];


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