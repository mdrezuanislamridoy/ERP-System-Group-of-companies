import type {
  Invoice,
  ChartAccount,
  JournalEntry,
  JournalLineItem,
  GeneralLedgerPosting,
  TrialBalanceRow,
  AccountType
} from '../types';

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

export const invoices: Invoice[] = [
  { id: 'INV-2026-001928', party: 'Meghna Packaging Ltd.', company: 'ABC Foods Ltd.', type: 'Payable', issued: '02 Sep 2026', due: '02 Oct 2026', amount: 1840000, balance: 1840000, status: 'pending' },
  { id: 'INV-2026-001911', party: 'Unimart Retail Chain', company: 'ABC Foods Ltd.', type: 'Receivable', issued: '28 Aug 2026', due: '27 Sep 2026', amount: 6420000, balance: 3210000, status: 'processing' },
  { id: 'INV-2026-001902', party: 'Padma Oil Company', company: 'ABC Transport Ltd.', type: 'Payable', issued: '25 Aug 2026', due: '24 Sep 2026', amount: 9280000, balance: 9280000, status: 'failed' },
  { id: 'INV-2026-001887', party: 'City Bank PLC', company: 'ABC Technologies Ltd.', type: 'Receivable', issued: '20 Aug 2026', due: '19 Sep 2026', amount: 12400000, balance: 0, status: 'completed' },
  { id: 'INV-2026-001855', party: 'Rangs Logistics', company: 'ABC Grocery Ltd.', type: 'Payable', issued: '18 Aug 2026', due: '17 Sep 2026', amount: 740000, balance: 740000, status: 'approved' },
  { id: 'INV-2026-001841', party: 'Bengal Steel Works', company: 'ABC Foods Ltd.', type: 'Payable', issued: '14 Aug 2026', due: '13 Sep 2026', amount: 3120000, balance: 3120000, status: 'draft' },
  { id: 'INV-2026-001830', party: 'Shwapno Superstore', company: 'ABC Grocery Ltd.', type: 'Receivable', issued: '11 Aug 2026', due: '10 Sep 2026', amount: 8860000, balance: 8860000, status: 'pending' },
  { id: 'INV-2026-001812', party: 'Navana Motors', company: 'ABC Transport Ltd.', type: 'Payable', issued: '06 Aug 2026', due: '05 Sep 2026', amount: 15600000, balance: 0, status: 'completed' },
  { id: 'INV-2026-001788', party: 'Beximco Pharma', company: 'ABC Pharma Ltd.', type: 'Receivable', issued: '01 Aug 2026', due: '31 Aug 2026', amount: 2240000, balance: 2240000, status: 'cancelled' }
];

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
  { code: '1520', name: 'Accumulated Depreciation', level: 2, type: 'Asset', openingBalance: -138000000, parentCode: '1500', normalBalance: 'credit' },

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
  { code: '3000', name: 'Equity', level: 0, type: 'Equity', openingBalance: 776000000, normalBalance: 'credit' },
  { code: '3100', name: 'Share Capital', level: 1, type: 'Equity', openingBalance: 500000000, parentCode: '3000', normalBalance: 'credit' },
  { code: '3110', name: 'Paid-Up Share Capital', level: 2, type: 'Equity', openingBalance: 500000000, parentCode: '3100', normalBalance: 'credit' },
  { code: '3200', name: 'Reserves & Retained Earnings', level: 1, type: 'Equity', openingBalance: 276000000, parentCode: '3000', normalBalance: 'credit' },
  { code: '3210', name: 'Retained Earnings', level: 2, type: 'Equity', openingBalance: 276000000, parentCode: '3200', normalBalance: 'credit' },

  // 4000 REVENUE
  { code: '4000', name: 'Revenue', level: 0, type: 'Revenue', openingBalance: 2450000000, normalBalance: 'credit' },
  { code: '4100', name: 'Operating Revenue', level: 1, type: 'Revenue', openingBalance: 2450000000, parentCode: '4000', normalBalance: 'credit' },
  { code: '4110', name: 'Sales Revenue — FMCG & Foods', level: 2, type: 'Revenue', openingBalance: 1480000000, parentCode: '4100', normalBalance: 'credit' },
  { code: '4120', name: 'Freight & Logistics Revenue', level: 2, type: 'Revenue', openingBalance: 580000000, parentCode: '4100', normalBalance: 'credit' },
  { code: '4130', name: 'IT & Software License Revenue', level: 2, type: 'Revenue', openingBalance: 390000000, parentCode: '4100', normalBalance: 'credit' },

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
  { code: '6200', name: 'Selling & Distribution', level: 1, type: 'Expense', openingBalance: 160000000, parentCode: '6000', normalBalance: 'debit' },
  { code: '6210', name: 'Fleet Fuel & Maintenance', level: 2, type: 'Expense', openingBalance: 110000000, parentCode: '6200', normalBalance: 'debit' },
  { code: '6220', name: 'Marketing & Distribution Promotion', level: 2, type: 'Expense', openingBalance: 50000000, parentCode: '6200', normalBalance: 'debit' }
];

export const chartOfAccounts = initialChartOfAccounts;

// ─── Initial Seeded Journal Entries ──────────────────────────────────────────

export const initialJournalEntries: JournalEntry[] = [
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
  }
];

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

// ─── Journal Entry Poster ───────────────────────────────────────────────────

let nextJvId = 7;

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
    postedAt: now
  };

  journalVouchers = [newEntry, ...journalVouchers];
  listeners.forEach((l) => l());
  return newEntry;
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