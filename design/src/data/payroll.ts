import { employees } from './people';
import { getAttendanceSummary } from './attendance';

// ─── Salary Structure ───────────────────────────────────────────────────────
// Standard Bangladesh-style monthly salary split: Basic 50% · House Rent 25% ·
// Medical 10% · Conveyance 7% · Other 8%. HR/Finance can override per employee.

export interface SalaryComponents {
  basic: number;
  houseRent: number;
  medical: number;
  conveyance: number;
  other: number;
}

export interface SalaryStructure extends SalaryComponents {
  employeeId: string;
  grossMonthly: number;
  effectiveFrom: string;
  updatedBy?: string;
  updatedAt?: string;
}

const salaryOverrides: Record<string, SalaryComponents> = {};
const salaryUpdateMeta: Record<string, { by: string; at: string }> = {};

function defaultSplit(gross: number): SalaryComponents {
  const basic = Math.round(gross * 0.5);
  const houseRent = Math.round(gross * 0.25);
  const medical = Math.round(gross * 0.1);
  const conveyance = Math.round(gross * 0.07);
  // Absorbs rounding so the components always sum back to the exact gross.
  const other = gross - basic - houseRent - medical - conveyance;
  return { basic, houseRent, medical, conveyance, other };
}

export function getSalaryStructure(employeeId: string): SalaryStructure | null {
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp || emp.baseSalary == null) return null;

  const components = salaryOverrides[employeeId] ?? defaultSplit(emp.baseSalary);
  const grossMonthly = components.basic + components.houseRent + components.medical + components.conveyance + components.other;
  const meta = salaryUpdateMeta[employeeId];

  return {
    employeeId,
    ...components,
    grossMonthly,
    effectiveFrom: meta?.at ? meta.at.slice(0, 10) : emp.joined,
    updatedBy: meta?.by,
    updatedAt: meta?.at,
  };
}

export function updateSalaryStructure(employeeId: string, components: SalaryComponents, updatedBy: string): SalaryStructure {
  if (!components.basic || components.basic <= 0) {
    throw new Error('Basic salary must be greater than zero.');
  }
  if ([components.houseRent, components.medical, components.conveyance, components.other].some((v) => v < 0)) {
    throw new Error('Salary components cannot be negative.');
  }

  salaryOverrides[employeeId] = { ...components };
  salaryUpdateMeta[employeeId] = { by: updatedBy, at: new Date().toISOString() };
  notifyPayrollListeners();

  const updated = getSalaryStructure(employeeId);
  if (!updated) throw new Error('Employee not found.');
  return updated;
}

// ─── Payroll Runs & Payslips ─────────────────────────────────────────────────

export type PayrollStatus = 'processing' | 'completed';

export interface PayslipDeductions {
  providentFund: number;
  tax: number;
  lop: number;
  total: number;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  position: string;
  company: string;
  department: string;
  period: string; // '2026-09'
  periodLabel: string; // 'September 2026'
  components: SalaryComponents;
  grossPay: number;
  workingDays: number;
  presentDays: number;
  lopDays: number;
  paidLeaveDays: number;
  deductions: PayslipDeductions;
  netPay: number;
  status: PayrollStatus;
  generatedAt: string;
}

export interface PayrollRun {
  id: string;
  runNumber: string;
  company: string;
  period: string;
  periodLabel: string;
  status: PayrollStatus;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  generatedAt: string;
  generatedBy: string;
  processedAt?: string;
  processedBy?: string;
  payslipIds: string[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function periodLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

const payslips: Record<string, Payslip> = {};
let payrollRuns: PayrollRun[] = [];
const payrollListeners: Array<() => void> = [];

function notifyPayrollListeners() {
  payrollListeners.forEach((l) => l());
}

export function subscribePayroll(listener: () => void): () => void {
  payrollListeners.push(listener);
  return () => {
    const idx = payrollListeners.indexOf(listener);
    if (idx !== -1) payrollListeners.splice(idx, 1);
  };
}

function computePayslip(
  emp: (typeof employees)[number],
  year: number,
  month: number,
  runId: string,
  status: PayrollStatus
): Payslip | null {
  const structure = getSalaryStructure(emp.id);
  if (!structure) return null;

  const summary = getAttendanceSummary(emp.id, year, month);
  const daysInMonth = new Date(year, month, 0).getDate();
  const workingDays = Math.max(1, daysInMonth - summary.weekends - summary.holidays);
  const lopDays = summary.absent;
  const paidLeaveDays = summary.onLeave;
  const presentDays = summary.present + summary.late + summary.halfDay;

  const perDay = structure.grossMonthly / workingDays;
  const lop = Math.round(perDay * lopDays);
  const providentFund = Math.round(structure.basic * 0.05);
  const taxable = Math.max(0, structure.grossMonthly - 20000);
  const tax = Math.round(taxable * 0.05);
  const total = providentFund + tax + lop;
  const netPay = structure.grossMonthly - total;

  return {
    id: `PS-${periodKey(year, month)}-${emp.id}`,
    payrollRunId: runId,
    employeeId: emp.id,
    employeeName: emp.name,
    position: emp.position,
    company: emp.company,
    department: emp.department,
    period: periodKey(year, month),
    periodLabel: periodLabel(year, month),
    components: {
      basic: structure.basic,
      houseRent: structure.houseRent,
      medical: structure.medical,
      conveyance: structure.conveyance,
      other: structure.other,
    },
    grossPay: structure.grossMonthly,
    workingDays,
    presentDays,
    lopDays,
    paidLeaveDays,
    deductions: { providentFund, tax, lop, total },
    netPay,
    status,
    generatedAt: new Date().toISOString(),
  };
}

function seedHistoricalPayroll() {
  const companies = Array.from(new Set(employees.map((e) => e.company)));
  let runSeq = 1;

  for (const month of [6, 7, 8]) {
    for (const company of companies) {
      const emps = employees.filter((e) => e.company === company && e.baseSalary != null);
      if (emps.length === 0) continue;

      const runId = `PR-2026-${String(runSeq++).padStart(4, '0')}`;
      const slips = emps
        .map((e) => computePayslip(e, 2026, month, runId, 'completed'))
        .filter((s): s is Payslip => s !== null);
      slips.forEach((s) => {
        payslips[s.id] = s;
      });

      const totalGross = slips.reduce((s, p) => s + p.grossPay, 0);
      const totalDeductions = slips.reduce((s, p) => s + p.deductions.total, 0);

      payrollRuns.push({
        id: runId,
        runNumber: runId,
        company,
        period: periodKey(2026, month),
        periodLabel: periodLabel(2026, month),
        status: 'completed',
        employeeCount: slips.length,
        totalGross,
        totalDeductions,
        totalNet: totalGross - totalDeductions,
        generatedAt: `01 ${periodLabel(2026, month)}`,
        generatedBy: 'System (historical)',
        processedAt: `05 ${periodLabel(2026, month)}`,
        processedBy: 'Finance Controller',
        payslipIds: slips.map((s) => s.id),
      });
    }
  }
}

seedHistoricalPayroll();

export function getPayslipsForEmployee(employeeId: string): Payslip[] {
  return Object.values(payslips)
    .filter((p) => p.employeeId === employeeId)
    .sort((a, b) => b.period.localeCompare(a.period));
}

export function getPayslip(payslipId: string): Payslip | undefined {
  return payslips[payslipId];
}

export function getPayslipsForRun(runId: string): Payslip[] {
  const run = payrollRuns.find((r) => r.id === runId);
  if (!run) return [];
  return run.payslipIds.map((id) => payslips[id]).filter((p): p is Payslip => Boolean(p));
}

export function getPayrollRuns(companyName: string, groupScoped: boolean): PayrollRun[] {
  return payrollRuns
    .filter((r) => groupScoped || r.company === companyName)
    .sort((a, b) => b.period.localeCompare(a.period) || a.company.localeCompare(b.company));
}

export function hasPayrollRun(company: string, year: number, month: number): boolean {
  return payrollRuns.some((r) => r.company === company && r.period === periodKey(year, month));
}

export function runPayroll(company: string, year: number, month: number, generatedBy: string): PayrollRun {
  const period = periodKey(year, month);
  if (hasPayrollRun(company, year, month)) {
    throw new Error(`Payroll for ${periodLabel(year, month)} has already been run for ${company}.`);
  }

  const emps = employees.filter((e) => e.company === company && e.baseSalary != null);
  if (emps.length === 0) {
    throw new Error(`No salaried employees found for ${company}.`);
  }

  const runId = `PR-${year}-${String(payrollRuns.length + 1).padStart(4, '0')}`;
  const slips = emps
    .map((e) => computePayslip(e, year, month, runId, 'processing'))
    .filter((s): s is Payslip => s !== null);
  slips.forEach((s) => {
    payslips[s.id] = s;
  });

  const totalGross = slips.reduce((s, p) => s + p.grossPay, 0);
  const totalDeductions = slips.reduce((s, p) => s + p.deductions.total, 0);

  const run: PayrollRun = {
    id: runId,
    runNumber: runId,
    company,
    period,
    periodLabel: periodLabel(year, month),
    status: 'processing',
    employeeCount: slips.length,
    totalGross,
    totalDeductions,
    totalNet: totalGross - totalDeductions,
    generatedAt: new Date().toISOString(),
    generatedBy,
    payslipIds: slips.map((s) => s.id),
  };

  payrollRuns = [run, ...payrollRuns];
  notifyPayrollListeners();
  return run;
}

export function finalizePayrollRun(runId: string, processedBy: string): PayrollRun {
  const run = payrollRuns.find((r) => r.id === runId);
  if (!run) throw new Error('Payroll run not found.');
  if (run.status !== 'processing') {
    throw new Error(`This payroll run is already ${run.status}.`);
  }

  const updated: PayrollRun = {
    ...run,
    status: 'completed',
    processedAt: new Date().toISOString(),
    processedBy,
  };

  updated.payslipIds.forEach((id) => {
    if (payslips[id]) payslips[id] = { ...payslips[id], status: 'completed' };
  });

  payrollRuns = payrollRuns.map((r) => (r.id === runId ? updated : r));
  notifyPayrollListeners();
  return updated;
}
