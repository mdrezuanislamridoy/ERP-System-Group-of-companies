import type { Invoice } from '../types';

export const groupKpis = [
{ label: 'Revenue (YTD)', value: '৳245.0 Cr', delta: '+8.4%', tone: 'success' as const, sub: 'vs ৳226.1 Cr LY' },
{ label: 'Expenses (YTD)', value: '৳182.0 Cr', delta: '+5.1%', tone: 'warning' as const, sub: 'vs ৳173.2 Cr LY' },
{ label: 'Net Profit', value: '৳63.0 Cr', delta: '+18.2%', tone: 'success' as const, sub: 'Margin 25.7%' },
{ label: 'Headcount', value: '8,421', delta: '+312', tone: 'info' as const, sub: 'Across 24 companies' }];


export const revenueTrend = [
{ month: 'Apr', revenue: 18.2, expense: 14.1 },
{ month: 'May', revenue: 19.6, expense: 14.8 },
{ month: 'Jun', revenue: 21.1, expense: 15.9 },
{ month: 'Jul', revenue: 20.4, expense: 16.2 },
{ month: 'Aug', revenue: 23.8, expense: 17.1 },
{ month: 'Sep', revenue: 25.3, expense: 17.9 }];


export const headcountTrend = [
{ month: 'Apr', value: 8102 },
{ month: 'May', value: 8164 },
{ month: 'Jun', value: 8231 },
{ month: 'Jul', value: 8288 },
{ month: 'Aug', value: 8355 },
{ month: 'Sep', value: 8421 }];


export const departmentSplit = [
{ label: 'Production', value: 3820 },
{ label: 'Logistics', value: 1490 },
{ label: 'Sales', value: 1240 },
{ label: 'Engineering', value: 860 },
{ label: 'Finance & Admin', value: 611 },
{ label: 'HR', value: 400 }];


export const financeKpis = [
{ label: 'Cash Position', value: '৳41.2 Cr', sub: '7 bank accounts', tone: 'info' as const },
{ label: 'Receivables', value: '৳28.6 Cr', sub: '৳6.1 Cr overdue', tone: 'warning' as const },
{ label: 'Payables', value: '৳19.4 Cr', sub: '৳2.2 Cr due in 7d', tone: 'info' as const },
{ label: 'Budget Utilization', value: '68.4%', sub: 'Q3 FY2026', tone: 'success' as const }];


export const invoices: Invoice[] = [
{ id: 'INV-2026-001928', party: 'Meghna Packaging Ltd.', company: 'ABC Foods Ltd.', type: 'Payable', issued: '02 Sep 2026', due: '02 Oct 2026', amount: 1840000, balance: 1840000, status: 'pending' },
{ id: 'INV-2026-001911', party: 'Unimart Retail Chain', company: 'ABC Foods Ltd.', type: 'Receivable', issued: '28 Aug 2026', due: '27 Sep 2026', amount: 6420000, balance: 3210000, status: 'processing' },
{ id: 'INV-2026-001902', party: 'Padma Oil Company', company: 'ABC Transport Ltd.', type: 'Payable', issued: '25 Aug 2026', due: '24 Sep 2026', amount: 9280000, balance: 9280000, status: 'failed' },
{ id: 'INV-2026-001887', party: 'City Bank PLC', company: 'ABC Technologies Ltd.', type: 'Receivable', issued: '20 Aug 2026', due: '19 Sep 2026', amount: 12400000, balance: 0, status: 'completed' },
{ id: 'INV-2026-001855', party: 'Rangs Logistics', company: 'ABC Grocery Ltd.', type: 'Payable', issued: '18 Aug 2026', due: '17 Sep 2026', amount: 740000, balance: 740000, status: 'approved' },
{ id: 'INV-2026-001841', party: 'Bengal Steel Works', company: 'ABC Foods Ltd.', type: 'Payable', issued: '14 Aug 2026', due: '13 Sep 2026', amount: 3120000, balance: 3120000, status: 'draft' },
{ id: 'INV-2026-001830', party: 'Shwapno Superstore', company: 'ABC Grocery Ltd.', type: 'Receivable', issued: '11 Aug 2026', due: '10 Sep 2026', amount: 8860000, balance: 8860000, status: 'pending' },
{ id: 'INV-2026-001812', party: 'Navana Motors', company: 'ABC Transport Ltd.', type: 'Payable', issued: '06 Aug 2026', due: '05 Sep 2026', amount: 15600000, balance: 0, status: 'completed' },
{ id: 'INV-2026-001788', party: 'Beximco Pharma', company: 'ABC Pharma Ltd.', type: 'Receivable', issued: '01 Aug 2026', due: '31 Aug 2026', amount: 2240000, balance: 2240000, status: 'cancelled' }];


export const chartOfAccounts = [
{ code: '1000', name: 'Assets', level: 0, balance: 1284000000, type: 'Asset' },
{ code: '1100', name: 'Current Assets', level: 1, balance: 642000000, type: 'Asset' },
{ code: '1110', name: 'Cash & Cash Equivalents', level: 2, balance: 412000000, type: 'Asset' },
{ code: '1120', name: 'Accounts Receivable', level: 2, balance: 286000000, type: 'Asset' },
{ code: '2000', name: 'Liabilities', level: 0, balance: 508000000, type: 'Liability' },
{ code: '2100', name: 'Accounts Payable', level: 1, balance: 194000000, type: 'Liability' },
{ code: '4000', name: 'Revenue', level: 0, balance: 2450000000, type: 'Revenue' },
{ code: '5000', name: 'Cost of Goods Sold', level: 0, balance: 1420000000, type: 'Expense' }];


export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 10000000) return `৳${(value / 10000000).toFixed(2)} Cr`;
  if (Math.abs(value) >= 100000) return `৳${(value / 100000).toFixed(2)} L`;
  return `৳${value.toLocaleString('en-IN')}`;
}