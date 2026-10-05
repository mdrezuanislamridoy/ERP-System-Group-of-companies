import React from 'react';
import { XIcon, PrinterIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import type { Payslip } from '../../data/payroll';

interface PayslipModalProps {
  isOpen: boolean;
  payslip: Payslip | null;
  onClose: () => void;
}

function money(n: number): string {
  return `৳${Math.round(n).toLocaleString('en-IN')}`;
}

export function PayslipModal({ isOpen, payslip, onClose }: PayslipModalProps) {
  if (!isOpen || !payslip) return null;

  const earnings: Array<[string, number]> = [
    ['Basic Salary', payslip.components.basic],
    ['House Rent Allowance', payslip.components.houseRent],
    ['Medical Allowance', payslip.components.medical],
    ['Conveyance Allowance', payslip.components.conveyance],
    ['Other Allowance', payslip.components.other],
  ];

  const deductions: Array<[string, number]> = [
    ['Provident Fund (5% of Basic)', payslip.deductions.providentFund],
    ['Income Tax (withholding)', payslip.deductions.tax],
    [`Loss of Pay (${payslip.lopDays} day${payslip.lopDays === 1 ? '' : 's'})`, payslip.deductions.lop],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        id="payslip-print-area"
        className="w-full max-w-2xl rounded-2xl border border-line bg-white shadow-pop animate-in zoom-in-95 duration-150 my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="payslip-no-print flex items-center justify-between border-b border-line bg-surface px-6 py-3">
          <p className="text-sm font-semibold text-ink">Payslip Preview — {payslip.periodLabel}</p>
          <div className="flex items-center gap-2">
            <Button size="xs" variant="primary" icon={PrinterIcon} onClick={() => window.print()}>
              Print / Save as PDF
            </Button>
            <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-8 text-slate-900">
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="text-lg font-bold">{payslip.company}</p>
              <p className="text-sm text-slate-500">Payslip for {payslip.periodLabel}</p>
            </div>
            <StatusBadge status={payslip.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Employee</p>
              <p className="font-semibold">{payslip.employeeName}</p>
              <p className="text-slate-500">{payslip.position} · {payslip.department}</p>
              <p className="font-mono text-slate-500">{payslip.employeeId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-400">Attendance</p>
              <p>{payslip.presentDays} present / {payslip.workingDays} working days</p>
              <p className="text-slate-500">{payslip.paidLeaveDays} paid leave · {payslip.lopDays} unpaid (LOP)</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Earnings</p>
              <table className="w-full text-sm">
                <tbody>
                  {earnings.map(([label, amount]) => (
                    <tr key={label} className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-600">{label}</td>
                      <td className="py-1.5 text-right font-mono tabular">{money(amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-1.5 font-semibold">Gross Pay</td>
                    <td className="py-1.5 text-right font-mono tabular font-semibold">{money(payslip.grossPay)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Deductions</p>
              <table className="w-full text-sm">
                <tbody>
                  {deductions.map(([label, amount]) => (
                    <tr key={label} className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-600">{label}</td>
                      <td className="py-1.5 text-right font-mono tabular">−{money(amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-1.5 font-semibold">Total Deductions</td>
                    <td className="py-1.5 text-right font-mono tabular font-semibold">−{money(payslip.deductions.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Net Pay</p>
            <p className="font-mono text-2xl font-bold tabular">{money(payslip.netPay)}</p>
          </div>

          <p className="mt-4 text-center text-2xs text-slate-400">
            This is a system-generated payslip and does not require a signature. Generated {new Date(payslip.generatedAt).toLocaleString('en-GB')}.
          </p>
        </div>
      </div>
    </div>
  );
}
