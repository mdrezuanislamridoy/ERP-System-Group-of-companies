import type {
  Invoice,
  ChartAccount,
  JournalEntry,
  JournalLineItem,
  GeneralLedgerPosting,
  TrialBalanceRow,
  AccountType,
  FiscalPeriod,
  FiscalPeriodStatus,
  BankStatement,
  ReconcilableLedgerLine,
  BankReconciliationSummary,
  ThreeWayMatchLine,
  ThreeWayMatchResult
} from '../types';
import { getPurchaseOrders, getGoodsReceiptNotes } from './operations';

export const groupKpis = [
  { label: 'Revenue (YTD)', value: '৳245.0 Cr', delta: '+8.4%', tone: 'success' as const, sub: 'vs ৳226.1 Cr LY' },
  { label: 'Expenses (YTD)', value: '৳182.0 Cr', delta: '+5.1%', tone: 'warning' as const, sub: 'vs ৳173.2 Cr LY' },
  { label: 'Net Profit', value: '৳63.0 Cr', delta: '+18.2%', tone: 'success' as const, sub: 'Margin 25.7%' },
  { label: 'Headcount', value: '8,421', delta: '+312', tone: 'info' as const, sub: 'Across 24 companies' }
];

export const revenueTrend = [
  { month: 'Apr', revenue: 18.2, expense: 14.1 },
  { month: 'May', revenue: 19.6, expense: 14.8 },
  { month: 'Jun', revenue: 21.1, expense: 15.9 },
  { month: 'Jul', revenue: 20.4, expense: 16.2 },
  { month: 'Aug', revenue: 23.8, expense: 17.1 },
  { month: 'Sep', revenue: 25.3, expense: 17.9 }
];

export const headcountTrend = [
  { month: 'Apr', value: 8102 },
  { month: 'May', value: 8164 },
  { month: 'Jun', value: 8231 },
  { month: 'Jul', value: 8288 },
  { month: 'Aug', value: 8355 },
  { month: 'Sep', value: 8421 }
];

export const departmentSplit = [
  { label: 'Production', value: 3820 },
  { label: 'Logistics', value: 1490 },
  { label: 'Sales', value: 1240 },
  { label: 'Engineering', value: 860 },
  { label: 'Finance & Admin', value: 611 },
  { label: 'HR', value: 400 }
];

export const financeKpis = [
  { label: 'Cash Position', value: '৳41.2 Cr', sub: '7 bank accounts', tone: 'info' as const },
  { label: 'Receivables', value: '৳28.6 Cr', sub: '৳6.1 Cr overdue', tone: 'warning' as const },
  { label: 'Payables', value: '৳19.4 Cr', sub: '৳2.2 Cr due in 7d', tone: 'info' as const },
  { label: 'Budget Utilization', value: '68.4%', sub: 'Q3 FY2026', tone: 'success' as const }
];

const initialInvoices: Invoice[] = [
  { id: 'INV-2026-001928', party: 'Meghna Packaging Ltd.', company: 'ABC Foods Ltd.', type: 'Payable', issued: '02 Sep 2026', due: '02 Oct 2026', amount: 1840000, balance: 1840000, status: 'pending' },
  { id: 'INV-2026-001911', party: 'Unimart Retail Chain', company: 'ABC Foods Ltd.', type: 'Receivable', issued: '28 Aug 2026', due: '27 Sep 2026', amount: 6420000, balance: 3210000, status: 'processing' },
  { id: 'INV-2026-001902', party: 'Padma Oil Company', company: 'ABC Transport Ltd.', type: 'Payable', issued: '25 Aug 2026', due: '24 Sep 2026', amount: 9280000, balance: 9280000, status: 'failed' },
  { id: 'INV-2026-001887', party: 'City Bank PLC', company: 'ABC Technologies Ltd.', type: 'Receivable', issued: '20 Aug 2026', due: '19 Sep 2026', amount: 12400000, balance: 0, status: 'completed' },
  { id: 'INV-2026-001855', party: 'Rangs Logistics', company: 'ABC Grocery Ltd.', type: 'Payable', issued: '18 Aug 2026', due: '17 Sep 2026', amount: 740000, balance: 740000, status: 'approved' },
  { id: 'INV-2026-001841', party: 'Bengal Steel Works', company: 'ABC Foods Ltd.', type: 'Payable', issued: '14 Aug 2026', due: '13 Sep 2026', amount: 3120000, balance: 3120000, status: 'draft' },
  { id: 'INV-2026-001830', party: 'Shwapno Superstore', company: 'ABC Grocery Ltd.', type: 'Receivable', issued: '11 Aug 2026', due: '10 Sep 2026', amount: 8860000, balance: 8860000, status: 'pending' },
  { id: 'INV-2026-001812', party: 'Navana Motors', company: 'ABC Transport Ltd.', type: 'Payable', issued: '06 Aug 2026', due: '05 Sep 2026', amount: 15600000, balance: 0, status: 'completed' },
  { id: 'INV-2026-001788', party: 'Beximco Pharma', company: 'ABC Pharma Ltd.', type: 'Receivable', issued: '01 Aug 2026', due: '31 Aug 2026', amount: 2240000, balance: 2240000, status: 'cancelled' },

  // ─── Issue #12: Procurement-sourced Payables wired for 3-Way Matching ──────
  {
    id: 'INV-2026-002001',
    party: 'Meghna Packaging Ltd.',
    company: 'ABC Foods Ltd.',
    type: 'Payable',
    issued: '19 Sep 2026',
    due: '19 Oct 2026',
    amount: 855600,
    balance: 855600,
    status: 'pending',
    poId: 'po-2026-0003',
    // No GRN yet — PO-2026-0003 hasn't been received (see data/operations.ts), so this can't be verified.
    matchStatus: 'Unmatched',
    lines: [
      { id: 'invl-2001-1', poLineId: 'pol-0003-1', sku: 'PK-FILM-080', description: 'Packaging Film — 80 micron', qty: 1200, unit: 'Roll', unitPrice: 620, lineTotal: 744000 }
    ]
  },
  {
    id: 'INV-2026-002002',
    party: 'Padma Oil Company',
    company: 'ABC Transport Ltd.',
    type: 'Payable',
    issued: '20 Sep 2026',
    due: '05 Oct 2026',
    amount: 718750,
    balance: 718750,
    status: 'pending',
    poId: 'po-2026-0002',
    grnId: 'grn-2026-0001',
    // Bills the full 5,000L ordered, but GRN-2026-0001 only accepted 3,000L so far — Quantity Overbill.
    matchStatus: 'Discrepancy',
    lines: [
      { id: 'invl-2002-1', poLineId: 'pol-0002-1', sku: 'FUEL-DIESEL-BULK', description: 'Diesel Fuel — Bulk Tanker Delivery', qty: 5000, unit: 'Litre', unitPrice: 125, lineTotal: 625000 }
    ]
  },
  {
    id: 'INV-2026-002003',
    party: 'Bengal Steel Works',
    company: 'ABC Foods Ltd.',
    type: 'Payable',
    issued: '10 Sep 2026',
    due: '10 Oct 2026',
    amount: 195500,
    balance: 195500,
    status: 'pending',
    poId: 'po-2026-0004',
    grnId: 'grn-2026-0002',
    // Billed qty/price exactly match the PO and GRN-2026-0002 accepted the full quantity — clean match.
    matchStatus: 'Matched',
    lines: [
      { id: 'invl-2003-1', poLineId: 'pol-0004-1', sku: 'ENG-BRACKET-STD', description: 'Steel Mounting Brackets — Standard', qty: 500, unit: 'Unit', unitPrice: 340, lineTotal: 170000 }
    ]
  }
];

// Runtime store — mutable so Executive Overrides (Issue #12) can be recorded against an invoice.
export let invoices: Invoice[] = initialInvoices.map((i) => ({ ...i, lines: i.lines ? [...i.lines] : undefined }));

// ─── Chart of Accounts Hierarchy ──────────────────────────────────────────────

export const initialChartOfAccounts: ChartAccount[] = [
  // 1000 ASSETS
  { code: '1000', name: 'Assets', level: 0, type: 'Asset', openingBalance: 1284000000, normalBalance: 'debit' },
  { code: '1100', name: 'Current Assets', level: 1, type: 'Asset', openingBalance: 642000000, parentCode: '1000', normalBalance: 'debit' },
  { code: '1110', name: 'Cash & Cash Equivalents', level: 2, type: 'Asset', openingBalance: 412000000, parentCode: '1100', normalBalance: 'debit' },
  { code: '1120', name: 'Accounts Receivable (Trade)', level: 2, type: 'Asset', openingBalance: 286000000, parentCode: '1100', normalBalance: 'debit' },
  { code: '1130', name: 'Inventory — Raw Materials', level: 2, type: 'Asset', openingBalance: 145000000, parentCode: '1100', normalBalance: 'debit' },
  { code: '1140', name: 'Inventory — Finished Goods', level: 2, type: 'Asset', openingBalance: 180000000, parentCode: '1100', normalBalance: 'debit' },
  { code: '1150', name: 'Advance Corporate Tax & Prepayments', level: 2, type: 'Asset', openingBalance: 32000000, parentCode: '1100', normalBalance: 'debit' },
  { code: '1500', name: 'Non-Current Assets', level: 1, type: 'Asset', openingBalance: 642000000, parentCode: '1000', normalBalance: 'debit' },
  { code: '1510', name: 'Property, Plant & Equipment', level: 2, type: 'Asset', openingBalance: 780000000, parentCode: '1500', normalBalance: 'debit' },
  { code: '1520', name: 'Accumulated Depreciation', level: 2, type: 'Asset', openingBalance: 138000000, parentCode: '1500', normalBalance: 'credit' },

  // 2000 LIABILITIES
  { code: '2000', name: 'Liabilities', level: 0, type: 'Liability', openingBalance: 508000000, normalBalance: 'credit' },
  { code: '2100', name: 'Current Liabilities', level: 1, type: 'Liability', openingBalance: 318000000, parentCode: '2000', normalBalance: 'credit' },
  { code: '2110', name: 'Accounts Payable (Trade)', level: 2, type: 'Liability', openingBalance: 194000000, parentCode: '2100', normalBalance: 'credit' },
  { code: '2120', name: 'Accrued Payroll & Benefits', level: 2, type: 'Liability', openingBalance: 48000000, parentCode: '2100', normalBalance: 'credit' },
  { code: '2130', name: 'VAT & Tax Withholding Payable', level: 2, type: 'Liability', openingBalance: 26000000, parentCode: '2100', normalBalance: 'credit' },
  { code: '2140', name: 'Short-Term Credit Facilities', level: 2, type: 'Liability', openingBalance: 50000000, parentCode: '2100', normalBalance: 'credit' },
  { code: '2500', name: 'Long-Term Liabilities', level: 1, type: 'Liability', openingBalance: 190000000, parentCode: '2000', normalBalance: 'credit' },
  { code: '2510', name: 'Term Loan Facilities', level: 2, type: 'Liability', openingBalance: 190000000, parentCode: '2500', normalBalance: 'credit' },

  // 3000 EQUITY
  { code: '3000', name: 'Equity', level: 0, type: 'Equity', openingBalance: 559000000, normalBalance: 'credit' },
  { code: '3100', name: 'Share Capital', level: 1, type: 'Equity', openingBalance: 500000000, parentCode: '3000', normalBalance: 'credit' },
  { code: '3110', name: 'Paid-Up Share Capital', level: 2, type: 'Equity', openingBalance: 500000000, parentCode: '3100', normalBalance: 'credit' },
  { code: '3200', name: 'Reserves & Retained Earnings', level: 1, type: 'Equity', openingBalance: 59000000, parentCode: '3000', normalBalance: 'credit' },
  { code: '3210', name: 'Retained Earnings', level: 2, type: 'Equity', openingBalance: 59000000, parentCode: '3200', normalBalance: 'credit' },

  // 4000 REVENUE
  { code: '4000', name: 'Revenue', level: 0, type: 'Revenue', openingBalance: 2450000000, normalBalance: 'credit' },
  { code: '4100', name: 'Operating Revenue', level: 1, type: 'Revenue', openingBalance: 2450000000, parentCode: '4000', normalBalance: 'credit' },
  { code: '4110', name: 'Sales Revenue — FMCG & Foods', level: 2, type: 'Revenue', openingBalance: 1480000000, parentCode: '4100', normalBalance: 'credit' },
  { code: '4120', name: 'Freight & Logistics Revenue', level: 2, type: 'Revenue', openingBalance: 580000000, parentCode: '4100', normalBalance: 'credit' },
  { code: '4130', name: 'IT & Software License Revenue', level: 2, type: 'Revenue', openingBalance: 390000000, parentCode: '4100', normalBalance: 'credit' },
  { code: '4140', name: 'Interest Income', level: 2, type: 'Revenue', openingBalance: 0, parentCode: '4100', normalBalance: 'credit' },

  // 5000 COST OF GOODS SOLD
  { code: '5000', name: 'Cost of Goods Sold', level: 0, type: 'Expense', openingBalance: 1420000000, normalBalance: 'debit' },
  { code: '5100', name: 'Direct Production Costs', level: 1, type: 'Expense', openingBalance: 1420000000, parentCode: '5000', normalBalance: 'debit' },
  { code: '5110', name: 'Raw Material Consumption', level: 2, type: 'Expense', openingBalance: 980000000, parentCode: '5100', normalBalance: 'debit' },
  { code: '5120', name: 'Direct Factory Labor', level: 2, type: 'Expense', openingBalance: 260000000, parentCode: '5100', normalBalance: 'debit' },
  { code: '5130', name: 'Factory Overheads & Energy', level: 2, type: 'Expense', openingBalance: 180000000, parentCode: '5100', normalBalance: 'debit' },

  // 6000 OPERATING EXPENSES
  { code: '6000', name: 'Operating Expenses', level: 0, type: 'Expense', openingBalance: 400000000, normalBalance: 'debit' },
  { code: '6100', name: 'Administrative Expenses', level: 1, type: 'Expense', openingBalance: 240000000, parentCode: '6000', normalBalance: 'debit' },
  { code: '6110', name: 'Salaries & Staff Benefits', level: 2, type: 'Expense', openingBalance: 180000000, parentCode: '6100', normalBalance: 'debit' },
  { code: '6120', name: 'Office Rent & Facilities', level: 2, type: 'Expense', openingBalance: 60000000, parentCode: '6100', normalBalance: 'debit' },
  { code: '6130', name: 'Bank Charges & Fees', level: 2, type: 'Expense', openingBalance: 0, parentCode: '6100', normalBalance: 'debit' },
  { code: '6200', name: 'Selling & Distribution', level: 1, type: 'Expense', openingBalance: 160000000, parentCode: '6000', normalBalance: 'debit' },
  { code: '6210', name: 'Fleet Fuel & Maintenance', level: 2, type: 'Expense', openingBalance: 110000000, parentCode: '6200', normalBalance: 'debit' },
  { code: '6220', name: 'Marketing & Distribution Promotion', level: 2, type: 'Expense', openingBalance: 50000000, parentCode: '6200', normalBalance: 'debit' }
];

export const chartOfAccounts = initialChartOfAccounts;

// ─── Initial Seeded Journal Entries ──────────────────────────────────────────

const seededJournalEntries: Array<Omit<JournalEntry, 'isPosted' | 'lockedAt'>> = [
  {
    id: 'jv-2026-0001',
    entryNumber: 'JV-2026-0001',
    date: '2026-09-01',
    companyId: 'c-foods',
    companyName: 'ABC Foods Ltd.',
    reference: 'INV-2026-001911',
    type: 'standard',
    status: 'posted',
    memo: 'Sale of Edible Oil consignment to Unimart Retail Chain',
    lines: [
      {
        id: 'jl-01',
        accountCode: '1120',
        accountName: 'Accounts Receivable (Trade)',
        costCenterId: 'cc-foods-fin-002',
        costCenterCode: 'CC-FOODS-FIN-002',
        debit: 6420000,
        credit: 0,
        description: 'Receivable recognized for Unimart retail sales invoice'
      },
      {
        id: 'jl-02',
        accountCode: '4110',
        accountName: 'Sales Revenue — FMCG & Foods',
        costCenterId: 'cc-foods-fin-002',
        costCenterCode: 'CC-FOODS-FIN-002',
        debit: 0,
        credit: 6420000,
        description: 'FMCG sales revenue recognition'
      }
    ],
    totalDebit: 6420000,
    totalCredit: 6420000,
    createdBy: 'Rahim Ahmed',
    createdAt: '2026-09-01T09:30:00Z',
    postedAt: '2026-09-01T09:30:00Z'
  },
  {
    id: 'jv-2026-0002',
    entryNumber: 'JV-2026-0002',
    date: '2026-09-02',
    companyId: 'c-foods',
    companyName: 'ABC Foods Ltd.',
    reference: 'INV-2026-001928',
    type: 'standard',
    status: 'posted',
    memo: 'Purchase of corrugated packaging boxes from Meghna Packaging Ltd.',
    lines: [
      {
        id: 'jl-03',
        accountCode: '1130',
        accountName: 'Inventory — Raw Materials',
        costCenterId: 'cc-foods-proc-001',
        costCenterCode: 'CC-FOODS-PROC-001',
        debit: 1840000,
        credit: 0,
        description: 'Raw packaging material intake at Savar warehouse'
      },
      {
        id: 'jl-04',
        accountCode: '2110',
        accountName: 'Accounts Payable (Trade)',
        costCenterId: 'cc-foods-fin-001',
        costCenterCode: 'CC-FOODS-FIN-001',
        debit: 0,
        credit: 1840000,
        description: 'Vendor liability recorded for Meghna Packaging'
      }
    ],
    totalDebit: 1840000,
    totalCredit: 1840000,
    createdBy: 'Rahim Ahmed',
    createdAt: '2026-09-02T11:15:00Z',
    postedAt: '2026-09-02T11:15:00Z'
  },
  {
    id: 'jv-2026-0003',
    entryNumber: 'JV-2026-0003',
    date: '2026-09-05',
    companyId: 'c-transport',
    companyName: 'ABC Transport Ltd.',
    reference: 'PO-TRANS-8821',
    type: 'standard',
    status: 'posted',
    memo: 'Heavy commercial vehicle diesel fueling from Padma Oil Company',
    lines: [
      {
        id: 'jl-05',
        accountCode: '6210',
        accountName: 'Fleet Fuel & Maintenance',
        costCenterId: 'cc-trans-fleet-001',
        costCenterCode: 'CC-TRANS-FLEET-001',
        debit: 9280000,
        credit: 0,
        description: 'Fleet bulk fuel consumption for highway haulage'
      },
      {
        id: 'jl-06',
        accountCode: '2110',
        accountName: 'Accounts Payable (Trade)',
        costCenterId: 'cc-trans-fleet-001',
        costCenterCode: 'CC-TRANS-FLEET-001',
        debit: 0,
        credit: 9280000,
        description: 'Supplier payable to Padma Oil Depot'
      }
    ],
    totalDebit: 9280000,
    totalCredit: 9280000,
    createdBy: 'Mizanur Rahman',
    createdAt: '2026-09-05T14:45:00Z',
    postedAt: '2026-09-05T14:45:00Z'
  },
  {
    id: 'jv-2026-0004',
    entryNumber: 'JV-2026-0004',
    date: '2026-09-08',
    companyId: 'c-foods',
    companyName: 'ABC Foods Ltd.',
    reference: 'PAY-SEP-2026',
    type: 'standard',
    status: 'posted',
    memo: 'Staff payroll disbursement for head office & processing plant',
    lines: [
      {
        id: 'jl-07',
        accountCode: '6110',
        accountName: 'Salaries & Staff Benefits',
        costCenterId: 'cc-foods-fin-001',
        costCenterCode: 'CC-FOODS-FIN-001',
        debit: 14200000,
        credit: 0,
        description: 'September 2026 gross payroll expense'
      },
      {
        id: 'jl-08',
        accountCode: '1110',
        accountName: 'Cash & Cash Equivalents',
        costCenterId: 'cc-foods-fin-001',
        costCenterCode: 'CC-FOODS-FIN-001',
        debit: 0,
        credit: 12070000,
        description: 'Net bank wire salary transfer via Standard Chartered'
      },
      {
        id: 'jl-09',
        accountCode: '2130',
        accountName: 'VAT & Tax Withholding Payable',
        costCenterId: 'cc-foods-fin-001',
        costCenterCode: 'CC-FOODS-FIN-001',
        debit: 0,
        credit: 2130000,
        description: 'Employee income tax withheld for NBR deposit'
      }
    ],
    totalDebit: 14200000,
    totalCredit: 14200000,
    createdBy: 'Nasrin Sultana',
    createdAt: '2026-09-08T16:00:00Z',
    postedAt: '2026-09-08T16:00:00Z'
  },
  {
    id: 'jv-2026-0005',
    entryNumber: 'JV-2026-0005',
    date: '2026-09-12',
    companyId: 'c-foods',
    companyName: 'ABC Foods Ltd.',
    reference: 'MFG-BATCH-401',
    type: 'standard',
    status: 'posted',
    memo: 'Factory raw material issue to Production Line A',
    lines: [
      {
        id: 'jl-10',
        accountCode: '5110',
        accountName: 'Raw Material Consumption',
        costCenterId: 'cc-foods-prod-001',
        costCenterCode: 'CC-FOODS-PROD-001',
        debit: 8500000,
        credit: 0,
        description: 'Unprocessed grain issued to Rice Milling Line A'
      },
      {
        id: 'jl-11',
        accountCode: '1130',
        accountName: 'Inventory — Raw Materials',
        costCenterId: 'cc-foods-proc-001',
        costCenterCode: 'CC-FOODS-PROC-001',
        debit: 0,
        credit: 8500000,
        description: 'Savar Silo inventory reduction for milling batch'
      }
    ],
    totalDebit: 8500000,
    totalCredit: 8500000,
    createdBy: 'Shahidul Alam',
    createdAt: '2026-09-12T11:20:00Z',
    postedAt: '2026-09-12T11:20:00Z'
  },
  {
    id: 'jv-2026-0006',
    entryNumber: 'JV-2026-0006',
    date: '2026-09-15',
    companyId: 'c-tech',
    companyName: 'ABC Technologies Ltd.',
    reference: 'INV-2026-001887',
    type: 'standard',
    status: 'posted',
    memo: 'Bank collection on ERP Software License delivery',
    lines: [
      {
        id: 'jl-12',
        accountCode: '1110',
        accountName: 'Cash & Cash Equivalents',
        costCenterId: 'cc-tech-eng-001',
        costCenterCode: 'CC-TECH-ENG-001',
        debit: 12400000,
        credit: 0,
        description: 'Wire receipt from City Bank PLC in Eastern Bank current account'
      },
      {
        id: 'jl-13',
        accountCode: '1120',
        accountName: 'Accounts Receivable (Trade)',
        costCenterId: 'cc-tech-eng-001',
        costCenterCode: 'CC-TECH-ENG-001',
        debit: 0,
        credit: 12400000,
        description: 'Clearance of City Bank trade receivable'
      }
    ],
    totalDebit: 12400000,
    totalCredit: 12400000,
    createdBy: 'Rumana Haque',
    createdAt: '2026-09-15T15:30:00Z',
    postedAt: '2026-09-15T15:30:00Z'
  },
  {
    id: 'jv-2026-0007',
    entryNumber: 'JV-2026-0007',
    date: '2026-09-18',
    companyId: 'c-foods',
    companyName: 'ABC Foods Ltd.',
    reference: 'INV-2026-001830',
    type: 'standard',
    status: 'posted',
    memo: 'Customer settlement collected — Shwapno Superstore retail account',
    lines: [
      {
        id: 'jl-14',
        accountCode: '1110',
        accountName: 'Cash & Cash Equivalents',
        costCenterId: 'cc-foods-fin-002',
        costCenterCode: 'CC-FOODS-FIN-002',
        debit: 8860000,
        credit: 0,
        description: 'Inward RTGS receipt from Shwapno Superstore'
      },
      {
        id: 'jl-15',
        accountCode: '1120',
        accountName: 'Accounts Receivable (Trade)',
        costCenterId: 'cc-foods-fin-002',
        costCenterCode: 'CC-FOODS-FIN-002',
        debit: 0,
        credit: 8860000,
        description: 'Clearance of Shwapno Superstore trade receivable'
      }
    ],
    totalDebit: 8860000,
    totalCredit: 8860000,
    createdBy: 'Sabina Yasmin',
    createdAt: '2026-09-18T13:10:00Z',
    postedAt: '2026-09-18T13:10:00Z'
  },
  {
    id: 'jv-2026-0008',
    entryNumber: 'JV-2026-0008',
    date: '2026-09-19',
    companyId: 'c-foods',
    companyName: 'ABC Foods Ltd.',
    reference: 'INV-2026-001855',
    type: 'standard',
    status: 'posted',
    memo: 'Vendor payment issued by cheque — Rangs Logistics',
    lines: [
      {
        id: 'jl-16',
        accountCode: '2110',
        accountName: 'Accounts Payable (Trade)',
        costCenterId: 'cc-foods-fin-001',
        costCenterCode: 'CC-FOODS-FIN-001',
        debit: 740000,
        credit: 0,
        description: 'Settlement of Rangs Logistics payable'
      },
      {
        id: 'jl-17',
        accountCode: '1110',
        accountName: 'Cash & Cash Equivalents',
        costCenterId: 'cc-foods-fin-001',
        costCenterCode: 'CC-FOODS-FIN-001',
        debit: 0,
        credit: 740000,
        description: 'Outward cheque issued to Rangs Logistics'
      }
    ],
    totalDebit: 740000,
    totalCredit: 740000,
    createdBy: 'Rahim Ahmed',
    createdAt: '2026-09-19T10:05:00Z',
    postedAt: '2026-09-19T10:05:00Z'
  }
];

// Posted vouchers are immutable from the moment they are created — isPosted/lockedAt
// are derived here rather than repeated on every seed entry above.
export const initialJournalEntries: JournalEntry[] = seededJournalEntries.map((entry) => ({
  ...entry,
  isPosted: entry.status === 'posted',
  lockedAt: entry.postedAt
}));

// Runtime store for posted journal vouchers
export let journalVouchers: JournalEntry[] = [...initialJournalEntries];
const listeners: Array<() => void> = [];

export function getJournalEntries(): JournalEntry[] {
  return [...journalVouchers];
}

export function subscribeJournalEntries(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

// ─── Double-Entry Balance Validator ──────────────────────────────────────────

export function validateJournalBalance(lines: Array<{ debit: number; credit: number }>): {
  balanced: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  message?: string;
} {
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const balanced = difference < 0.01 && totalDebit > 0;

  let message = '';
  if (totalDebit === 0 && totalCredit === 0) {
    message = 'Enter debit and credit amounts to balance the voucher.';
  } else if (!balanced) {
    message = totalDebit > totalCredit
      ? `Out of balance: Debits exceed Credits by ৳${difference.toLocaleString('en-IN')}.`
      : `Out of balance: Credits exceed Debits by ৳${difference.toLocaleString('en-IN')}.`;
  } else {
    message = `Voucher balanced: ৳${totalDebit.toLocaleString('en-IN')} Debit = ৳${totalCredit.toLocaleString('en-IN')} Credit.`;
  }

  return { balanced, totalDebit, totalCredit, difference, message };
}

// ─── Fiscal Period Closing ────────────────────────────────────────────────────
// Prevents unauthorized retro-active ledger tampering: once a month is closed,
// postJournalEntry() and reverseJournalEntry() below both refuse to touch it.

export const initialFiscalPeriods: FiscalPeriod[] = [
  { id: 'fp-2026-01', label: 'January 2026', year: 2026, month: 1, status: 'hard-closed', closedBy: 'Nasrin Sultana', closedAt: '2026-02-05T09:00:00Z' },
  { id: 'fp-2026-02', label: 'February 2026', year: 2026, month: 2, status: 'hard-closed', closedBy: 'Nasrin Sultana', closedAt: '2026-03-05T09:00:00Z' },
  { id: 'fp-2026-03', label: 'March 2026', year: 2026, month: 3, status: 'hard-closed', closedBy: 'Nasrin Sultana', closedAt: '2026-04-05T09:00:00Z' },
  { id: 'fp-2026-04', label: 'April 2026', year: 2026, month: 4, status: 'hard-closed', closedBy: 'Nasrin Sultana', closedAt: '2026-05-05T09:00:00Z' },
  { id: 'fp-2026-05', label: 'May 2026', year: 2026, month: 5, status: 'hard-closed', closedBy: 'Nasrin Sultana', closedAt: '2026-06-05T09:00:00Z' },
  { id: 'fp-2026-06', label: 'June 2026', year: 2026, month: 6, status: 'hard-closed', closedBy: 'Nasrin Sultana', closedAt: '2026-07-05T09:00:00Z' },
  { id: 'fp-2026-07', label: 'July 2026', year: 2026, month: 7, status: 'hard-closed', closedBy: 'Nasrin Sultana', closedAt: '2026-08-05T09:00:00Z' },
  { id: 'fp-2026-08', label: 'August 2026', year: 2026, month: 8, status: 'soft-closed', closedBy: 'Nasrin Sultana', closedAt: '2026-09-05T09:00:00Z' },
  { id: 'fp-2026-09', label: 'September 2026', year: 2026, month: 9, status: 'open' },
  { id: 'fp-2026-10', label: 'October 2026', year: 2026, month: 10, status: 'open' },
  { id: 'fp-2026-11', label: 'November 2026', year: 2026, month: 11, status: 'open' },
  { id: 'fp-2026-12', label: 'December 2026', year: 2026, month: 12, status: 'open' }
];

export let fiscalPeriods: FiscalPeriod[] = [...initialFiscalPeriods];
const periodListeners: Array<() => void> = [];

export function getFiscalPeriods(): FiscalPeriod[] {
  return [...fiscalPeriods];
}

export function subscribeFiscalPeriods(listener: () => void): () => void {
  periodListeners.push(listener);
  return () => {
    const idx = periodListeners.indexOf(listener);
    if (idx !== -1) periodListeners.splice(idx, 1);
  };
}

export function getFiscalPeriodForDate(dateStr: string): FiscalPeriod | undefined {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return undefined;
  return fiscalPeriods.find((p) => p.year === d.getUTCFullYear() && p.month === d.getUTCMonth() + 1);
}

/** Only adjusting/closing/reversing entries — never ordinary business activity — may post into a soft-closed period. */
export function isEntryTypeAllowedWhenSoftClosed(type: string): boolean {
  return type === 'adjusting' || type === 'closing' || type === 'reversing';
}

export function assertPeriodOpenForPosting(dateStr: string, entryType: string): void {
  const period = getFiscalPeriodForDate(dateStr);
  if (!period || period.status === 'open') return;

  if (period.status === 'hard-closed') {
    throw new Error(
      `Posting Blocked: Fiscal period "${period.label}" is hard closed. No postings are permitted for this period.`
    );
  }

  if (!isEntryTypeAllowedWhenSoftClosed(entryType)) {
    throw new Error(
      `Posting Blocked: Fiscal period "${period.label}" is soft closed. Only adjusting, closing or reversing entries may be posted; standard entries are rejected.`
    );
  }
}

export function setFiscalPeriodStatus(periodId: string, status: FiscalPeriodStatus, closedBy: string): FiscalPeriod {
  const idx = fiscalPeriods.findIndex((p) => p.id === periodId);
  if (idx === -1) throw new Error('Fiscal period not found.');

  const now = new Date().toISOString();
  const updated: FiscalPeriod = {
    ...fiscalPeriods[idx],
    status,
    closedBy: status === 'open' ? undefined : closedBy,
    closedAt: status === 'open' ? undefined : now
  };

  fiscalPeriods = fiscalPeriods.map((p, i) => (i === idx ? updated : p));
  periodListeners.forEach((l) => l());
  return updated;
}

// ─── Journal Entry Poster ───────────────────────────────────────────────────

let nextJvId = 9;

export function postJournalEntry(data: {
  date: string;
  companyId: string;
  companyName: string;
  reference: string;
  memo: string;
  type?: 'standard' | 'adjusting' | 'closing' | 'reversing' | 'intercompany';
  createdBy: string;
  lines: Array<{
    accountCode: string;
    accountName: string;
    costCenterId: string;
    costCenterCode: string;
    debit: number;
    credit: number;
    description: string;
  }>;
}): JournalEntry {
  // Strict mathematical check before posting
  const balanceCheck = validateJournalBalance(data.lines);
  if (!balanceCheck.balanced) {
    throw new Error(`Double-Entry Violation: Cannot post unbalanced journal entry (${balanceCheck.message})`);
  }

  // Fiscal period lock check — closed periods reject postings outright
  assertPeriodOpenForPosting(data.date, data.type ?? 'standard');

  const idNum = String(nextJvId++).padStart(4, '0');
  const now = new Date().toISOString();

  const newEntry: JournalEntry = {
    id: `jv-2026-${idNum}`,
    entryNumber: `JV-2026-${idNum}`,
    date: data.date,
    companyId: data.companyId,
    companyName: data.companyName,
    reference: data.reference,
    type: data.type ?? 'standard',
    status: 'posted',
    memo: data.memo,
    lines: data.lines.map((line, idx) => ({
      ...line,
      id: `jl-${idNum}-${idx + 1}`
    })),
    totalDebit: balanceCheck.totalDebit,
    totalCredit: balanceCheck.totalCredit,
    createdBy: data.createdBy,
    createdAt: now,
    postedAt: now,
    isPosted: true,
    lockedAt: now
  };

  journalVouchers = [newEntry, ...journalVouchers];
  listeners.forEach((l) => l());
  return newEntry;
}

// ─── Reversal Engine ─────────────────────────────────────────────────────────
// Posted vouchers are immutable — the ONLY correction mechanism is a mirror
// compensating entry that references the original voucher and carries a
// mandatory audit justification. The original is never edited or deleted.

export function reverseJournalEntry(params: {
  originalId: string;
  reason: string;
  createdBy: string;
}): JournalEntry {
  const original = journalVouchers.find((v) => v.id === params.originalId);
  if (!original) {
    throw new Error('Cannot reverse: original journal voucher was not found.');
  }
  if (original.status !== 'posted') {
    throw new Error(
      `Cannot reverse ${original.entryNumber}: only posted vouchers may be reversed (current status: ${original.status}).`
    );
  }
  if (!params.reason || !params.reason.trim()) {
    throw new Error('A mandatory audit justification is required to reverse a posted voucher.');
  }

  const today = new Date().toISOString().slice(0, 10);

  // Fiscal period lock check — a reversal is still a posting and must obey the same lock
  assertPeriodOpenForPosting(today, 'reversing');

  const idNum = String(nextJvId++).padStart(4, '0');
  const now = new Date().toISOString();
  const reason = params.reason.trim();

  const reversalLines: JournalLineItem[] = original.lines.map((line, idx) => ({
    ...line,
    id: `jl-${idNum}-${idx + 1}`,
    debit: line.credit,
    credit: line.debit,
    description: `Reversal: ${line.description}`
  }));

  const reversalEntry: JournalEntry = {
    id: `jv-2026-${idNum}`,
    entryNumber: `JV-2026-${idNum}`,
    date: today,
    companyId: original.companyId,
    companyName: original.companyName,
    reference: original.entryNumber,
    type: 'reversing',
    status: 'posted',
    memo: `Reversal of ${original.entryNumber}: ${reason}`,
    lines: reversalLines,
    totalDebit: original.totalCredit,
    totalCredit: original.totalDebit,
    createdBy: params.createdBy,
    createdAt: now,
    postedAt: now,
    isPosted: true,
    lockedAt: now,
    reversalOfEntryId: original.id,
    reversalOfEntryNumber: original.entryNumber,
    reversalReason: reason
  };

  // Mark the original as reversed — status metadata only, its lines/amounts stay untouched
  journalVouchers = journalVouchers.map((v) =>
    v.id === original.id
      ? { ...v, status: 'reversed' as const, reversedByEntryId: reversalEntry.id, reversedByEntryNumber: reversalEntry.entryNumber }
      : v
  );
  journalVouchers = [reversalEntry, ...journalVouchers];
  listeners.forEach((l) => l());
  return reversalEntry;
}

// ─── General Ledger Calculation Engine ──────────────────────────────────────

export function calculateGeneralLedger(
  entries: JournalEntry[] = journalVouchers,
  companyId?: string | null,
  accountCodeFilter?: string
): GeneralLedgerPosting[] {
  // 1. Filter entries by company if companyId is given
  const filtered = companyId && companyId !== '*' && companyId !== 'all'
    ? entries.filter((e) => e.companyId === companyId || e.companyId === companyId.replace(/^c-/, 'le-') || e.companyId === companyId.replace(/^le-/, 'c-'))
    : entries;

  // Flatten all line items with journal header context
  const lines: Array<{
    date: string;
    journalEntryId: string;
    journalEntryNumber: string;
    accountCode: string;
    accountName: string;
    accountType: AccountType;
    costCenterId: string;
    costCenterCode: string;
    companyId: string;
    companyName: string;
    debit: number;
    credit: number;
    description: string;
    reference: string;
  }> = [];

  // Sort entries chronologically
  const sortedEntries = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const entry of sortedEntries) {
    for (const line of entry.lines) {
      if (accountCodeFilter && line.accountCode !== accountCodeFilter) continue;

      const account = initialChartOfAccounts.find((a) => a.code === line.accountCode);
      const accountType = account?.type ?? 'Asset';

      lines.push({
        date: entry.date,
        journalEntryId: entry.id,
        journalEntryNumber: entry.entryNumber,
        accountCode: line.accountCode,
        accountName: line.accountName || account?.name || 'Unknown Account',
        accountType,
        costCenterId: line.costCenterId,
        costCenterCode: line.costCenterCode,
        companyId: entry.companyId,
        companyName: entry.companyName,
        debit: line.debit,
        credit: line.credit,
        description: line.description || entry.memo,
        reference: entry.reference
      });
    }
  }

  // Calculate sequential running balance per account
  const accountBalances: Record<string, number> = {};
  const postings: GeneralLedgerPosting[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const l = lines[idx];
    const account = initialChartOfAccounts.find((a) => a.code === l.accountCode);
    const normal = account?.normalBalance ?? (['Asset', 'Expense'].includes(l.accountType) ? 'debit' : 'credit');

    if (!(l.accountCode in accountBalances)) {
      accountBalances[l.accountCode] = account?.openingBalance ?? 0;
    }

    if (normal === 'debit') {
      accountBalances[l.accountCode] += l.debit - l.credit;
    } else {
      accountBalances[l.accountCode] += l.credit - l.debit;
    }

    postings.push({
      id: `gl-${l.journalEntryId}-${idx}`,
      ...l,
      runningBalance: accountBalances[l.accountCode]
    });
  }

  // Return reverse chronological for UI display (newest first)
  return postings.reverse();
}

// ─── Chart of Accounts Live Balance Calculation ──────────────────────────────

export function calculateAccountBalances(
  accounts: ChartAccount[] = initialChartOfAccounts,
  entries: JournalEntry[] = journalVouchers,
  companyId?: string | null
): ChartAccount[] {
  const filteredEntries = companyId && companyId !== '*' && companyId !== 'all'
    ? entries.filter((e) => e.companyId === companyId || e.companyId === companyId.replace(/^c-/, 'le-') || e.companyId === companyId.replace(/^le-/, 'c-'))
    : entries;

  // Aggregate debit and credit movements per account
  const movements: Record<string, { debit: number; credit: number }> = {};

  for (const entry of filteredEntries) {
    for (const line of entry.lines) {
      if (!movements[line.accountCode]) {
        movements[line.accountCode] = { debit: 0, credit: 0 };
      }
      movements[line.accountCode].debit += line.debit;
      movements[line.accountCode].credit += line.credit;
    }
  }

  // Calculate closing balance for leaf and summary accounts
  return accounts.map((acc) => {
    // If account has sub-accounts, aggregate from children
    const childAccounts = accounts.filter((a) => a.parentCode === acc.code);
    let debitMv = movements[acc.code]?.debit ?? 0;
    let creditMv = movements[acc.code]?.credit ?? 0;

    if (childAccounts.length > 0) {
      for (const child of childAccounts) {
        debitMv += movements[child.code]?.debit ?? 0;
        creditMv += movements[child.code]?.credit ?? 0;
      }
    }

    const normal = acc.normalBalance ?? (['Asset', 'Expense'].includes(acc.type) ? 'debit' : 'credit');
    let closingBalance = acc.openingBalance;

    if (normal === 'debit') {
      closingBalance = acc.openingBalance + debitMv - creditMv;
    } else {
      closingBalance = acc.openingBalance + creditMv - debitMv;
    }

    return {
      ...acc,
      debitMovement: debitMv,
      creditMovement: creditMv,
      closingBalance
    };
  });
}

// ─── Trial Balance Calculation Engine ────────────────────────────────────────

export function calculateTrialBalance(
  accounts: ChartAccount[] = initialChartOfAccounts,
  entries: JournalEntry[] = journalVouchers,
  companyId?: string | null
): {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
} {
  const calculatedAccounts = calculateAccountBalances(accounts, entries, companyId);
  // Only leaf accounts are reported on the Trial Balance
  const leafAccounts = calculatedAccounts.filter((a) => a.level === 2);

  let totalDebit = 0;
  let totalCredit = 0;

  const rows: TrialBalanceRow[] = leafAccounts.map((acc) => {
    const normal = acc.normalBalance ?? (['Asset', 'Expense'].includes(acc.type) ? 'debit' : 'credit');
    const closing = acc.closingBalance ?? acc.openingBalance;

    let netDebit = 0;
    let netCredit = 0;

    if (normal === 'debit') {
      if (closing >= 0) {
        netDebit = closing;
      } else {
        netCredit = Math.abs(closing);
      }
    } else {
      if (closing >= 0) {
        netCredit = closing;
      } else {
        netDebit = Math.abs(closing);
      }
    }

    totalDebit += netDebit;
    totalCredit += netCredit;

    return {
      accountCode: acc.code,
      accountName: acc.name,
      accountType: acc.type,
      openingBalance: acc.openingBalance,
      debitMovement: acc.debitMovement ?? 0,
      creditMovement: acc.creditMovement ?? 0,
      closingBalance: closing,
      netDebit,
      netCredit
    };
  });

  return {
    rows,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
  };
}

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 10000000) return `৳${(value / 10000000).toFixed(2)} Cr`;
  if (Math.abs(value) >= 100000) return `৳${(value / 100000).toFixed(2)} L`;
  return `৳${value.toLocaleString('en-IN')}`;
}

export function formatCurrencyFull(value: number): string {
  return `৳${Number(value || 0).toLocaleString('en-IN')}`;
}

// ─── Issue #08: Bank Reconciliation & Sub-Ledger Integration ────────────────
// Bank statement lines are matched against GL postings to the Cash/Bank account
// (default '1110'). GL postings are addressed by a stable `${journalEntryId}::${lineId}`
// key rather than the display-oriented GeneralLedgerPosting.id, which shifts as
// new entries are inserted into the date-sorted GL.

export const initialBankStatements: BankStatement[] = [
  {
    id: 'bstmt-foods-2026-09',
    companyId: 'c-foods',
    companyName: 'ABC Foods Ltd.',
    bankName: 'Standard Chartered Bank',
    accountNumberMasked: '••••••4821',
    glAccountCode: '1110',
    periodLabel: 'September 2026',
    openingBalance: 118500000,
    closingBalance: 114547750,
    importedAt: '2026-09-22T06:00:00Z',
    importedBy: 'Nasrin Sultana',
    transactions: [
      { id: 'btx-f1', statementId: 'bstmt-foods-2026-09', date: '2026-09-08', description: 'ACH Payroll Disbursement Batch', reference: 'PAY-SEP-2026', amount: 12070000, direction: 'debit', status: 'unmatched' },
      { id: 'btx-f2', statementId: 'bstmt-foods-2026-09', date: '2026-09-18', description: 'Inward RTGS — Shwapno Superstore', reference: 'INV-2026-001830', amount: 8860000, direction: 'credit', status: 'unmatched' },
      { id: 'btx-f3', statementId: 'bstmt-foods-2026-09', date: '2026-09-19', description: 'Outward Cheque — Rangs Logistics Ltd', reference: 'INV-2026-001855', amount: 740000, direction: 'debit', status: 'unmatched' },
      { id: 'btx-f4', statementId: 'bstmt-foods-2026-09', date: '2026-09-20', description: 'Monthly Account Maintenance Fee', reference: 'BANK-FEE-SEP26', amount: 3500, direction: 'debit', status: 'unmatched' },
      { id: 'btx-f5', statementId: 'bstmt-foods-2026-09', date: '2026-09-21', description: 'Interest Credited — Savings Sweep', reference: 'INT-SEP26', amount: 1250, direction: 'credit', status: 'unmatched' }
    ]
  },
  {
    id: 'bstmt-tech-2026-09',
    companyId: 'c-tech',
    companyName: 'ABC Technologies Ltd.',
    bankName: 'Eastern Bank PLC',
    accountNumberMasked: '••••••1190',
    glAccountCode: '1110',
    periodLabel: 'September 2026',
    openingBalance: 42000000,
    closingBalance: 54385000,
    importedAt: '2026-09-22T06:00:00Z',
    importedBy: 'Rumana Haque',
    transactions: [
      { id: 'btx-t1', statementId: 'bstmt-tech-2026-09', date: '2026-09-15', description: 'Inward Wire — City Bank PLC Settlement', reference: 'INV-2026-001887', amount: 12400000, direction: 'credit', status: 'unmatched' },
      { id: 'btx-t2', statementId: 'bstmt-tech-2026-09', date: '2026-09-16', description: 'Wire Transfer Processing Fee', reference: 'WIRE-FEE-0915', amount: 15000, direction: 'debit', status: 'unmatched' }
    ]
  }
];

export let bankStatements: BankStatement[] = initialBankStatements.map((s) => ({ ...s, transactions: [...s.transactions] }));
const bankStatementListeners: Array<() => void> = [];

export function getBankStatements(): BankStatement[] {
  return bankStatements.map((s) => ({ ...s, transactions: [...s.transactions] }));
}

export function subscribeBankStatements(listener: () => void): () => void {
  bankStatementListeners.push(listener);
  return () => {
    const idx = bankStatementListeners.indexOf(listener);
    if (idx !== -1) bankStatementListeners.splice(idx, 1);
  };
}

function notifyBankStatements(): void {
  bankStatementListeners.forEach((l) => l());
}

/** Every GL posting to `glAccountCode` for the scoped company, read live off journalVouchers. */
export function getReconcilableLedgerLines(companyId: string | null | undefined, glAccountCode: string): ReconcilableLedgerLine[] {
  const scoped = companyId && companyId !== '*' && companyId !== 'all'
    ? journalVouchers.filter((e) => e.companyId === companyId || e.companyId === companyId.replace(/^c-/, 'le-') || e.companyId === companyId.replace(/^le-/, 'c-'))
    : journalVouchers;

  const out: ReconcilableLedgerLine[] = [];
  for (const entry of scoped) {
    for (const line of entry.lines) {
      if (line.accountCode !== glAccountCode) continue;
      out.push({
        key: `${entry.id}::${line.id}`,
        journalEntryId: entry.id,
        journalEntryNumber: entry.entryNumber,
        lineId: line.id,
        date: entry.date,
        description: line.description || entry.memo,
        reference: entry.reference,
        debit: line.debit,
        credit: line.credit,
        companyId: entry.companyId,
        companyName: entry.companyName
      });
    }
  }
  return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** GL lines already claimed by any statement's matched transactions, across all statements. */
function getMatchedLedgerKeys(): Set<string> {
  const keys = new Set<string>();
  for (const stmt of bankStatements) {
    for (const txn of stmt.transactions) {
      if (txn.status === 'matched' && txn.matchedLineKey) keys.add(txn.matchedLineKey);
    }
  }
  return keys;
}

/**
 * Matches unmatched statement lines to unmatched GL postings on amount (exact, on the correct
 * side for the transaction's direction), reference (case-insensitive exact or substring), and
 * date proximity (within 5 days) — auto-matching only when exactly one candidate qualifies.
 */
export function autoReconcileStatement(statementId: string, actorName: string): { matchedCount: number } {
  const statement = bankStatements.find((s) => s.id === statementId);
  if (!statement) throw new Error('Bank statement not found.');

  const ledgerLines = getReconcilableLedgerLines(statement.companyId, statement.glAccountCode);
  const claimedKeys = getMatchedLedgerKeys();
  const now = new Date().toISOString();
  let matchedCount = 0;

  const updatedTransactions = statement.transactions.map((txn) => {
    if (txn.status === 'matched') return txn;

    const candidates = ledgerLines.filter((line) => {
      if (claimedKeys.has(line.key)) return false;
      const glAmount = txn.direction === 'credit' ? line.debit : line.credit;
      if (glAmount <= 0 || Math.abs(glAmount - txn.amount) > 0.01) return false;

      const txnRef = (txn.reference || '').trim().toLowerCase();
      const lineRef = (line.reference || '').trim().toLowerCase();
      const refMatch = Boolean(txnRef) && Boolean(lineRef) && (txnRef === lineRef || lineRef.includes(txnRef) || txnRef.includes(lineRef));
      if (!refMatch) return false;

      const dayDiff = Math.abs(new Date(txn.date).getTime() - new Date(line.date).getTime()) / 86400000;
      return dayDiff <= 5;
    });

    if (candidates.length !== 1) return txn;

    claimedKeys.add(candidates[0].key);
    matchedCount += 1;
    return {
      ...txn,
      status: 'matched' as const,
      matchedJournalEntryId: candidates[0].journalEntryId,
      matchedJournalEntryNumber: candidates[0].journalEntryNumber,
      matchedLineKey: candidates[0].key,
      matchType: 'auto' as const,
      matchedAt: now,
      matchedBy: actorName
    };
  });

  bankStatements = bankStatements.map((s) => (s.id === statementId ? { ...s, transactions: updatedTransactions } : s));
  notifyBankStatements();
  return { matchedCount };
}

/** Manually pair one unmatched statement line with one unmatched GL line the algorithm missed. */
export function matchBankTransaction(statementId: string, transactionId: string, ledgerLineKey: string, actorName: string): void {
  const statement = bankStatements.find((s) => s.id === statementId);
  if (!statement) throw new Error('Bank statement not found.');
  const txn = statement.transactions.find((t) => t.id === transactionId);
  if (!txn) throw new Error('Statement transaction not found.');
  if (txn.status === 'matched') throw new Error('This statement line is already matched — unmatch it first.');
  if (getMatchedLedgerKeys().has(ledgerLineKey)) throw new Error('That ledger posting is already matched to another statement line.');

  const [journalEntryId] = ledgerLineKey.split('::');
  const entry = journalVouchers.find((e) => e.id === journalEntryId);
  if (!entry) throw new Error('Ledger posting not found.');

  const now = new Date().toISOString();
  bankStatements = bankStatements.map((s) =>
    s.id !== statementId
      ? s
      : {
          ...s,
          transactions: s.transactions.map((t) =>
            t.id !== transactionId
              ? t
              : {
                  ...t,
                  status: 'matched' as const,
                  matchedJournalEntryId: entry.id,
                  matchedJournalEntryNumber: entry.entryNumber,
                  matchedLineKey: ledgerLineKey,
                  matchType: 'manual' as const,
                  matchedAt: now,
                  matchedBy: actorName
                }
          )
        }
  );
  notifyBankStatements();
}

/** Breaks a match, returning both sides to 'unmatched' — for correcting a wrong auto/manual pairing. */
export function unmatchBankTransaction(statementId: string, transactionId: string): void {
  bankStatements = bankStatements.map((s) =>
    s.id !== statementId
      ? s
      : {
          ...s,
          transactions: s.transactions.map((t) =>
            t.id !== transactionId
              ? t
              : {
                  ...t,
                  status: 'unmatched' as const,
                  matchedJournalEntryId: undefined,
                  matchedJournalEntryNumber: undefined,
                  matchedLineKey: undefined,
                  matchType: undefined,
                  matchedAt: undefined,
                  matchedBy: undefined
                }
          )
        }
  );
  notifyBankStatements();
}

/**
 * For a statement line with no corresponding GL entry at all (bank charges, interest credited) —
 * posts the missing journal voucher through the normal double-entry engine (so fiscal period locks
 * still apply) and immediately links the statement line to it as an 'adjustment' match.
 */
export function postBankAdjustment(params: {
  statementId: string;
  transactionId: string;
  type: 'bank-charge' | 'interest-income';
  costCenterId: string;
  costCenterCode: string;
  createdBy: string;
}): JournalEntry {
  const statement = bankStatements.find((s) => s.id === params.statementId);
  if (!statement) throw new Error('Bank statement not found.');
  const txn = statement.transactions.find((t) => t.id === params.transactionId);
  if (!txn) throw new Error('Statement transaction not found.');
  if (txn.status === 'matched') throw new Error('This statement line is already matched.');

  const isCharge = params.type === 'bank-charge';

  const entry = postJournalEntry({
    date: txn.date,
    companyId: statement.companyId,
    companyName: statement.companyName,
    reference: txn.reference || `${statement.bankName} Statement`,
    memo: `Bank Reconciliation Adjustment — ${txn.description}`,
    type: 'adjusting',
    createdBy: params.createdBy,
    lines: [
      {
        accountCode: isCharge ? '6130' : statement.glAccountCode,
        accountName: isCharge ? 'Bank Charges & Fees' : 'Cash & Cash Equivalents',
        costCenterId: params.costCenterId,
        costCenterCode: params.costCenterCode,
        debit: txn.amount,
        credit: 0,
        description: txn.description
      },
      {
        accountCode: isCharge ? statement.glAccountCode : '4140',
        accountName: isCharge ? 'Cash & Cash Equivalents' : 'Interest Income',
        costCenterId: params.costCenterId,
        costCenterCode: params.costCenterCode,
        debit: 0,
        credit: txn.amount,
        description: txn.description
      }
    ]
  });

  const lineKey = `${entry.id}::${entry.lines[0].id}`;
  const now = new Date().toISOString();
  bankStatements = bankStatements.map((s) =>
    s.id !== statement.id
      ? s
      : {
          ...s,
          transactions: s.transactions.map((t) =>
            t.id !== txn.id
              ? t
              : {
                  ...t,
                  status: 'matched' as const,
                  matchedJournalEntryId: entry.id,
                  matchedJournalEntryNumber: entry.entryNumber,
                  matchedLineKey: lineKey,
                  matchType: 'adjustment' as const,
                  matchedAt: now,
                  matchedBy: params.createdBy
                }
          )
        }
  );
  notifyBankStatements();

  return entry;
}

export function getBankReconciliationSummary(statementId: string): BankReconciliationSummary {
  const statement = bankStatements.find((s) => s.id === statementId);
  if (!statement) throw new Error('Bank statement not found.');

  // Anchored on the statement's own opening balance, NOT calculateAccountBalances()'s group-wide
  // openingBalance for account 1110 — that figure represents the consolidated cash position across
  // every one of the company's bank accounts, whereas one BankStatement is only ONE of those
  // accounts. Using the shared group baseline here would swamp "Unmatched Difference" with an
  // unrelated pooling gap instead of showing the genuine unreconciled items.
  const account = initialChartOfAccounts.find((a) => a.code === statement.glAccountCode);
  const normal = account?.normalBalance ?? 'debit';

  const ledgerLines = getReconcilableLedgerLines(statement.companyId, statement.glAccountCode);
  const ledgerNetMovement = ledgerLines.reduce(
    (sum, l) => sum + (normal === 'debit' ? l.debit - l.credit : l.credit - l.debit),
    0
  );
  const ledgerBalance = statement.openingBalance + ledgerNetMovement;

  const matchedTxns = statement.transactions.filter((t) => t.status === 'matched');
  const unmatchedTxns = statement.transactions.filter((t) => t.status !== 'matched');

  const reconciledBalance =
    statement.openingBalance + matchedTxns.reduce((sum, t) => sum + (t.direction === 'credit' ? t.amount : -t.amount), 0);

  const matchedLedgerKeys = new Set(matchedTxns.map((t) => t.matchedLineKey).filter(Boolean));
  const unmatchedLedgerCount = ledgerLines.filter((l) => !matchedLedgerKeys.has(l.key)).length;

  return {
    statementBalance: statement.closingBalance,
    ledgerBalance,
    reconciledBalance,
    unmatchedDifference: statement.closingBalance - ledgerBalance,
    matchedCount: matchedTxns.length,
    unmatchedStatementCount: unmatchedTxns.length,
    unmatchedLedgerCount
  };
}

// ─── Issue #12: Automated 3-Way Matching Engine (PO vs GRN vs Invoice) ───────
// Cross-verifies a Payable invoice against the PO that authorized it and the GRN(s) that
// confirm the goods actually arrived and passed QC — the standard AP fraud-prevention control.

export const THREE_WAY_MATCH_TOLERANCE_PCT = 0.5;

export function computeThreeWayMatch(invoice: Invoice, tolerancePct: number = THREE_WAY_MATCH_TOLERANCE_PCT): ThreeWayMatchResult {
  if (!invoice.poId || !invoice.lines || invoice.lines.length === 0) {
    return { status: 'Unmatched', tolerancePct, lines: [], substantiatedAmount: 0, netPayable: 0 };
  }

  const po = getPurchaseOrders().find((p) => p.id === invoice.poId);
  if (!po) {
    return { status: 'Unmatched', tolerancePct, lines: [], substantiatedAmount: 0, netPayable: 0 };
  }

  // The 3rd "way" is a specific referenced GRN — without one there's nothing to substantiate the
  // bill against yet, so the invoice can't be anything but Unmatched (never a computed Discrepancy).
  const grn = invoice.grnId ? getGoodsReceiptNotes().find((g) => g.id === invoice.grnId && g.poId === po.id) : undefined;

  const acceptedByPoLine: Record<string, number> = {};
  if (grn) {
    for (const line of grn.lines) {
      acceptedByPoLine[line.poLineId] = (acceptedByPoLine[line.poLineId] || 0) + line.qc.acceptedQty;
    }
  }

  const withinTolerance = (billed: number, reference: number) => billed <= reference * (1 + tolerancePct / 100);

  let substantiatedAmount = 0;
  let anyDiscrepancy = false;
  let anyLineMatched = false;

  const lines: ThreeWayMatchLine[] = invoice.lines.map((invLine) => {
    const poLine = invLine.poLineId ? po.lines.find((l) => l.id === invLine.poLineId) : undefined;
    const poQty = poLine?.qty ?? 0;
    const poUnitPrice = poLine?.unitPrice ?? 0;
    const grnAcceptedQty = invLine.poLineId ? acceptedByPoLine[invLine.poLineId] || 0 : 0;

    // Flags only mean something once a GRN exists to compare against — otherwise every line
    // would trivially "overbill" a zero baseline, which is a missing receipt, not a fraud signal.
    const quantityOverbill = Boolean(poLine) && Boolean(grn) && !withinTolerance(invLine.qty, grnAcceptedQty);
    const priceVariance = Boolean(poLine) && !withinTolerance(invLine.unitPrice, poUnitPrice);

    if (poLine && grn) {
      anyLineMatched = true;
      if (quantityOverbill || priceVariance) anyDiscrepancy = true;
      const substantiatedQty = Math.min(invLine.qty, grnAcceptedQty);
      const substantiatedPrice = Math.min(invLine.unitPrice, poUnitPrice);
      substantiatedAmount += Math.max(0, substantiatedQty) * substantiatedPrice;
    }

    return {
      poLineId: invLine.poLineId || '',
      sku: invLine.sku,
      description: invLine.description,
      unit: invLine.unit,
      poQty,
      poUnitPrice,
      grnAcceptedQty,
      billedQty: invLine.qty,
      billedUnitPrice: invLine.unitPrice,
      quantityOverbill,
      priceVariance
    };
  });

  const status: ThreeWayMatchResult['status'] = !grn || !anyLineMatched ? 'Unmatched' : anyDiscrepancy ? 'Discrepancy' : 'Matched';
  const netPayable = Math.max(0, substantiatedAmount - (invoice.discountAmount || 0) - (invoice.deductionAmount || 0));

  return { status, tolerancePct, lines, substantiatedAmount, netPayable };
}

let invoiceOverrideListeners: Array<() => void> = [];

function notifyInvoiceOverrides(): void {
  invoiceOverrideListeners.forEach((l) => l());
}

export function subscribeInvoiceOverrides(listener: () => void): () => void {
  invoiceOverrideListeners.push(listener);
  return () => {
    const idx = invoiceOverrideListeners.indexOf(listener);
    if (idx !== -1) invoiceOverrideListeners.splice(idx, 1);
  };
}

/** Executive Override — the only way a Discrepancy invoice can clear for payment. */
export function setInvoiceMatchOverride(invoiceId: string, by: string, reason: string): Invoice {
  if (!reason || !reason.trim()) throw new Error('An override reason is required.');
  const invoice = invoices.find((i) => i.id === invoiceId);
  if (!invoice) throw new Error('Invoice not found.');

  const updated: Invoice = {
    ...invoice,
    matchOverrideBy: by,
    matchOverrideAt: new Date().toISOString(),
    matchOverrideReason: reason.trim(),
    matchStatus: 'Bypassed'
  };

  invoices = invoices.map((i) => (i.id === invoiceId ? updated : i));
  notifyInvoiceOverrides();
  return updated;
}

export function getInvoices(): Invoice[] {
  return [...invoices];
}

/** Gate enforced here too (not just in the UI) — Discrepancy/Unmatched invoices can only post
 *  to AP once bypassed by an Executive Override. */
export function approveInvoiceForPayment(invoiceId: string, by: string): Invoice {
  const invoice = invoices.find((i) => i.id === invoiceId);
  if (!invoice) throw new Error('Invoice not found.');

  const matchStatus = invoice.matchStatus === 'Bypassed' ? 'Bypassed' : computeThreeWayMatch(invoice).status;
  if (invoice.poId && matchStatus !== 'Matched' && matchStatus !== 'Bypassed') {
    throw new Error(`Cannot approve for payment: 3-Way Match status is "${matchStatus}" — resolve the discrepancy or sign an Executive Override first.`);
  }

  const updated: Invoice = { ...invoice, status: 'approved', approvedBy: by, approvedAt: new Date().toISOString() };
  invoices = invoices.map((i) => (i.id === invoiceId ? updated : i));
  notifyInvoiceOverrides();
  return updated;
}

export function rejectInvoice(invoiceId: string): Invoice {
  const invoice = invoices.find((i) => i.id === invoiceId);
  if (!invoice) throw new Error('Invoice not found.');

  const updated: Invoice = { ...invoice, status: 'rejected' };
  invoices = invoices.map((i) => (i.id === invoiceId ? updated : i));
  notifyInvoiceOverrides();
  return updated;
}