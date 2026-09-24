import type { ExpenseClaim, AttendanceRegularization, LeaveQuota } from '../types';
import { recordAuditEvent } from './system';

// ─── Initial Mock Data ────────────────────────────────────────────────────────

export const initialExpenseClaims: ExpenseClaim[] = [
  {
    id: 'exp-1',
    claimNumber: 'EXP-2026-0881',
    employeeId: 'EMP-10241',
    employeeName: 'Rahim Ahmed',
    company: 'ABC Foods Ltd.',
    department: 'Finance',
    title: 'Client Dinner & Q3 Audit Travel',
    category: 'Travel & Lodging',
    amount: 12400,
    currency: 'BDT',
    expenseDate: '2026-09-14',
    costCenter: 'CC-FIN-01 (HQ Finance)',
    description: 'Inter-city travel to Savar manufacturing plant and client dinner with external statutory audit partner.',
    receiptName: 'savar_travel_and_dinner_voucher.pdf',
    status: 'approved',
    submittedAt: '2026-09-14T10:30:00Z',
    decidedBy: 'Nasrin Sultana',
    decidedAt: '2026-09-15T14:20:00Z',
    decisionNote: 'Verified against travel log and corporate policy limit.'
  },
  {
    id: 'exp-2',
    claimNumber: 'EXP-2026-0889',
    employeeId: 'EMP-10322',
    employeeName: 'Hasan Mahmud',
    company: 'ABC Foods Ltd.',
    department: 'Information Technology',
    title: 'Cloud Infrastructure Cert Exam Voucher',
    category: 'Training & Certification',
    amount: 18500,
    currency: 'BDT',
    expenseDate: '2026-09-19',
    costCenter: 'CC-IT-02 (Systems)',
    description: 'AWS Solutions Architect professional exam registration fee under annual employee skill enhancement program.',
    receiptName: 'aws_exam_receipt_092026.pdf',
    status: 'pending',
    submittedAt: '2026-09-20T09:15:00Z'
  },
  {
    id: 'exp-3',
    claimNumber: 'EXP-2026-0892',
    employeeId: 'EMP-10455',
    employeeName: 'Imran Hossain',
    company: 'ABC Foods Ltd.',
    department: 'Procurement',
    title: 'Vendor Site Assessment Fuel & Tolls',
    category: 'Travel & Lodging',
    amount: 6750,
    currency: 'BDT',
    expenseDate: '2026-09-20',
    costCenter: 'CC-PROC-01 (Savar Sourcing)',
    description: 'Highway toll gates and fuel re-fill for emergency supplier facility inspection at Narayanganj.',
    receiptName: 'highway_toll_fuel_receipts.pdf',
    status: 'pending',
    submittedAt: '2026-09-21T08:45:00Z'
  },
  {
    id: 'exp-4',
    claimNumber: 'EXP-2026-0870',
    employeeId: 'EMP-10501',
    employeeName: 'Sabina Yasmin',
    company: 'ABC Foods Ltd.',
    department: 'Finance',
    title: 'Office Stationery & Toner Emergency Purchase',
    category: 'Office Supplies',
    amount: 4300,
    currency: 'BDT',
    expenseDate: '2026-09-08',
    costCenter: 'CC-FIN-01 (HQ Finance)',
    description: 'High-yield toner cartridges for corporate month-end financial statement printing.',
    receiptName: 'toner_cash_memo.pdf',
    status: 'approved',
    submittedAt: '2026-09-08T16:00:00Z',
    decidedBy: 'Nasrin Sultana',
    decidedAt: '2026-09-09T11:00:00Z',
    decisionNote: 'Urgent month-end requirement approved.'
  }
];

export const initialRegularizations: AttendanceRegularization[] = [
  {
    id: 'reg-1',
    employeeId: 'EMP-10241',
    employeeName: 'Rahim Ahmed',
    company: 'ABC Foods Ltd.',
    department: 'Finance',
    date: '2026-09-18',
    requestType: 'Missed Biometric Punch',
    checkInTime: '09:05 AM',
    checkOutTime: '06:15 PM',
    reason: 'HQ Biometric terminal 2 reader optical sensor error on entrance.',
    status: 'approved',
    submittedAt: '2026-09-18T18:30:00Z',
    decidedBy: 'Karim Chowdhury',
    decidedAt: '2026-09-19T09:30:00Z',
    decisionNote: 'Verified with security desk manual log.'
  },
  {
    id: 'reg-2',
    employeeId: 'EMP-10455',
    employeeName: 'Imran Hossain',
    company: 'ABC Foods Ltd.',
    department: 'Procurement',
    date: '2026-09-22',
    requestType: 'Client On-Site Duty',
    checkInTime: '08:30 AM',
    checkOutTime: '05:45 PM',
    reason: 'On-site factory quality inspection at Meghna Packaging Ltd.',
    status: 'pending',
    submittedAt: '2026-09-21T17:00:00Z'
  },
  {
    id: 'reg-3',
    employeeId: 'EMP-10322',
    employeeName: 'Hasan Mahmud',
    company: 'ABC Foods Ltd.',
    department: 'Information Technology',
    date: '2026-09-23',
    requestType: 'Remote / Work From Home',
    checkInTime: '09:00 AM',
    checkOutTime: '06:00 PM',
    reason: 'Off-hours data center database migration support.',
    status: 'pending',
    submittedAt: '2026-09-22T10:00:00Z'
  }
];

export const initialLeaveQuotas: Record<string, LeaveQuota> = {
  'EMP-10241': { employeeId: 'EMP-10241', annualTotal: 20, annualUsed: 6, sickTotal: 14, sickUsed: 8, casualTotal: 10, casualUsed: 7 },
  'EMP-10288': { employeeId: 'EMP-10288', annualTotal: 20, annualUsed: 4, sickTotal: 14, sickUsed: 2, casualTotal: 10, casualUsed: 3 },
  'EMP-10322': { employeeId: 'EMP-10322', annualTotal: 20, annualUsed: 12, sickTotal: 14, sickUsed: 5, casualTotal: 10, casualUsed: 4 },
  'EMP-10410': { employeeId: 'EMP-10410', annualTotal: 25, annualUsed: 5, sickTotal: 14, sickUsed: 1, casualTotal: 10, casualUsed: 2 },
  'EMP-10455': { employeeId: 'EMP-10455', annualTotal: 20, annualUsed: 8, sickTotal: 14, sickUsed: 3, casualTotal: 10, casualUsed: 6 },
  'EMP-10501': { employeeId: 'EMP-10501', annualTotal: 20, annualUsed: 7, sickTotal: 14, sickUsed: 4, casualTotal: 10, casualUsed: 5 }
};

// ─── State & Subscribers ──────────────────────────────────────────────────────

let expenseClaims: ExpenseClaim[] = [...initialExpenseClaims];
let regularizations: AttendanceRegularization[] = [...initialRegularizations];
let leaveQuotas: Record<string, LeaveQuota> = { ...initialLeaveQuotas };

const claimListeners: Array<() => void> = [];
const regularizationListeners: Array<() => void> = [];

export function getExpenseClaims(): ExpenseClaim[] {
  return [...expenseClaims];
}

export function subscribeExpenseClaims(listener: () => void): () => void {
  claimListeners.push(listener);
  return () => {
    const idx = claimListeners.indexOf(listener);
    if (idx !== -1) claimListeners.splice(idx, 1);
  };
}

export function getRegularizations(): AttendanceRegularization[] {
  return [...regularizations];
}

export function subscribeRegularizations(listener: () => void): () => void {
  regularizationListeners.push(listener);
  return () => {
    const idx = regularizationListeners.indexOf(listener);
    if (idx !== -1) regularizationListeners.splice(idx, 1);
  };
}

export function getEmployeeLeaveQuota(employeeId: string): LeaveQuota {
  return (
    leaveQuotas[employeeId] || {
      employeeId,
      annualTotal: 20,
      annualUsed: 5,
      sickTotal: 14,
      sickUsed: 3,
      casualTotal: 10,
      casualUsed: 4
    }
  );
}

// ─── Actions & Mutations ──────────────────────────────────────────────────────

let nextClaimSeq = 893;
let nextRegSeq = 4;

export function createExpenseClaim(params: {
  employeeId: string;
  employeeName: string;
  company: string;
  department: string;
  title: string;
  category: ExpenseClaim['category'];
  amount: number;
  currency?: string;
  expenseDate: string;
  costCenter: string;
  description: string;
  receiptName?: string;
}): ExpenseClaim {
  if (!params.title.trim()) throw new Error('Expense claim title is required.');
  if (params.amount <= 0) throw new Error('Expense amount must be greater than zero.');
  if (!params.costCenter) throw new Error('Cost center allocation is required.');

  const claimNumber = `EXP-2026-0${nextClaimSeq++}`;
  const newClaim: ExpenseClaim = {
    id: `exp-${claimNumber.toLowerCase()}`,
    claimNumber,
    employeeId: params.employeeId,
    employeeName: params.employeeName,
    company: params.company,
    department: params.department,
    title: params.title.trim(),
    category: params.category,
    amount: params.amount,
    currency: params.currency || 'BDT',
    expenseDate: params.expenseDate,
    costCenter: params.costCenter,
    description: params.description.trim(),
    receiptName: params.receiptName,
    status: 'pending',
    submittedAt: new Date().toISOString()
  };

  expenseClaims = [newClaim, ...expenseClaims];
  claimListeners.forEach((l) => l());

  recordAuditEvent({
    user: params.employeeName,
    action: 'SUBMIT_EXPENSE_CLAIM',
    resource: `${newClaim.claimNumber} (${newClaim.title})`,
    company: params.company,
    after: `Amount: ৳${params.amount.toLocaleString('en-IN')}, Cost Center: ${params.costCenter}`
  });

  return newClaim;
}

export function decideExpenseClaim(
  idOrClaimNumber: string,
  decision: 'approved' | 'rejected',
  by: string,
  note?: string
): ExpenseClaim {
  const claim = expenseClaims.find((c) => c.id === idOrClaimNumber || c.claimNumber === idOrClaimNumber);
  if (!claim) throw new Error('Expense claim not found.');
  if (claim.status !== 'pending') throw new Error(`Expense claim is already ${claim.status}.`);

  const updated: ExpenseClaim = {
    ...claim,
    status: decision,
    decidedBy: by,
    decidedAt: new Date().toISOString(),
    decisionNote: note
  };

  expenseClaims = expenseClaims.map((c) => (c.id === claim.id ? updated : c));
  claimListeners.forEach((l) => l());

  recordAuditEvent({
    user: by,
    action: decision === 'approved' ? 'APPROVE_EXPENSE_CLAIM' : 'REJECT_EXPENSE_CLAIM',
    resource: `${claim.claimNumber} [${claim.title}]`,
    company: claim.company,
    before: 'Status: pending',
    after: `Status: ${decision}${note ? ` | Note: ${note}` : ''}`
  });

  return updated;
}

export function createRegularization(params: {
  employeeId: string;
  employeeName: string;
  company: string;
  department: string;
  date: string;
  requestType: AttendanceRegularization['requestType'];
  checkInTime?: string;
  checkOutTime?: string;
  reason: string;
}): AttendanceRegularization {
  if (!params.reason.trim()) throw new Error('Reason / justification is required.');
  if (!params.date) throw new Error('Target date is required.');

  const newReg: AttendanceRegularization = {
    id: `reg-${nextRegSeq++}`,
    employeeId: params.employeeId,
    employeeName: params.employeeName,
    company: params.company,
    department: params.department,
    date: params.date,
    requestType: params.requestType,
    checkInTime: params.checkInTime,
    checkOutTime: params.checkOutTime,
    reason: params.reason.trim(),
    status: 'pending',
    submittedAt: new Date().toISOString()
  };

  regularizations = [newReg, ...regularizations];
  regularizationListeners.forEach((l) => l());

  recordAuditEvent({
    user: params.employeeName,
    action: 'SUBMIT_ATTENDANCE_REGULARIZATION',
    resource: `${newReg.requestType} for ${newReg.date}`,
    company: params.company,
    after: `Reason: ${newReg.reason}`
  });

  return newReg;
}

export function decideRegularization(
  id: string,
  decision: 'approved' | 'rejected',
  by: string,
  note?: string
): AttendanceRegularization {
  const reg = regularizations.find((r) => r.id === id);
  if (!reg) throw new Error('Regularization request not found.');
  if (reg.status !== 'pending') throw new Error(`Request is already ${reg.status}.`);

  const updated: AttendanceRegularization = {
    ...reg,
    status: decision,
    decidedBy: by,
    decidedAt: new Date().toISOString(),
    decisionNote: note
  };

  regularizations = regularizations.map((r) => (r.id === id ? updated : r));
  regularizationListeners.forEach((l) => l());

  recordAuditEvent({
    user: by,
    action: decision === 'approved' ? 'APPROVE_ATTENDANCE_REGULARIZATION' : 'REJECT_ATTENDANCE_REGULARIZATION',
    resource: `${reg.requestType} on ${reg.date} for ${reg.employeeName}`,
    company: reg.company,
    before: 'Status: pending',
    after: `Status: ${decision}${note ? ` | Note: ${note}` : ''}`
  });

  return updated;
}
