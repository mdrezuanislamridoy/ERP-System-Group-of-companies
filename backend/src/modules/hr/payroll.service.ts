import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../platform/number-sequence.service';
import { AuditService } from '../audit/audit.service';
import { AbacPolicyService } from '../auth/services/abac-policy.service';
import { ScopedRepository } from '../../common/repositories/scoped.repository';
import { RequestContext } from '../../common/interfaces/request-context.interface';
import { AttendanceService } from './attendance.service';
import { UpsertSalaryStructureDto } from './dto/upsert-salary-structure.dto';
import { RunPayrollDto } from './dto/run-payroll.dto';

interface SalaryComponents {
  basic: number;
  houseRent: number;
  medical: number;
  conveyance: number;
  other: number;
}

/** Standard BD-style monthly split used only as a fallback until HR sets an explicit structure. */
function defaultSplit(gross: number): SalaryComponents {
  const basic = Math.round(gross * 0.5);
  const houseRent = Math.round(gross * 0.25);
  const medical = Math.round(gross * 0.1);
  const conveyance = Math.round(gross * 0.07);
  const other = gross - basic - houseRent - medical - conveyance;
  return { basic, houseRent, medical, conveyance, other };
}

@Injectable()
export class PayrollService extends ScopedRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSeq: NumberSequenceService,
    private readonly auditService: AuditService,
    private readonly abacPolicy: AbacPolicyService,
    private readonly attendanceService: AttendanceService,
  ) {
    super();
  }

  /** Resolves a person's company via their active assignment and enforces caller company scope. */
  private assertPersonInScope(
    person: { user: { assignments: { companyId: string | null }[] } | null },
    ctx: RequestContext,
    action: string,
  ) {
    const employeeCompanyId = person.user?.assignments.find((a) => a.companyId)?.companyId;
    if (ctx.scope && employeeCompanyId) {
      this.abacPolicy.assertCompanyScope(ctx.scope, employeeCompanyId, action);
    }
  }

  async getSalaryStructure(personId: string, ctx?: RequestContext) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: { salaryStructure: true, user: { include: { assignments: true } } },
    });
    if (!person) throw new NotFoundException('Employee not found.');
    if (ctx) this.assertPersonInScope(person, ctx, 'view salary structure for employees in');

    if (person.salaryStructure) return person.salaryStructure;
    if (person.baseSalary == null) return null;

    const split = defaultSplit(Number(person.baseSalary));
    return {
      personId,
      ...split,
      grossMonthly: Number(person.baseSalary),
      effectiveFrom: person.createdAt,
      updatedBy: null,
    };
  }

  async getMySalaryStructure(ctx: RequestContext) {
    if (!ctx.user) throw new BadRequestException('Authentication context required.');
    return this.getSalaryStructure(ctx.user.personId);
  }

  async upsertSalaryStructure(personId: string, dto: UpsertSalaryStructureDto, ctx: RequestContext) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: { user: { include: { assignments: true } } },
    });
    if (!person) throw new NotFoundException('Employee not found.');
    this.assertPersonInScope(person, ctx, 'manage salary structure for employees in');

    const grossMonthly = dto.basic + dto.houseRent + dto.medical + dto.conveyance + dto.other;
    if (grossMonthly <= 0) {
      throw new BadRequestException('Gross monthly salary must be greater than zero.');
    }

    const structure = await this.prisma.salaryStructure.upsert({
      where: { personId },
      create: {
        personId,
        companyId: ctx.scope?.activeCompanyId || '',
        basic: dto.basic,
        houseRent: dto.houseRent,
        medical: dto.medical,
        conveyance: dto.conveyance,
        other: dto.other,
        grossMonthly,
        updatedBy: ctx.user?.id,
      },
      update: {
        basic: dto.basic,
        houseRent: dto.houseRent,
        medical: dto.medical,
        conveyance: dto.conveyance,
        other: dto.other,
        grossMonthly,
        updatedBy: ctx.user?.id,
      },
    });

    await this.auditService.log({
      action: 'SALARY_STRUCTURE_UPDATED',
      resource: 'salary_structure',
      resourceId: structure.id,
      newValue: { personId, grossMonthly },
      ctx,
    });

    return structure;
  }

  private async computePayslipInput(personId: string, periodMonth: number, periodYear: number) {
    const structure = await this.getSalaryStructure(personId);
    if (!structure) return null;

    const { summary } = await this.attendanceService.getAttendanceForPerson(personId, periodYear, periodMonth);
    const daysInMonth = new Date(periodYear, periodMonth, 0).getDate();
    // Approximates the BD workweek (Fri/Sat rest days) absent a holiday calendar in this schema.
    const workingDays = Math.max(1, daysInMonth - 8);
    const lopDays = summary.absent;
    const presentDays = summary.present + summary.late + summary.halfDay;

    const grossMonthly = Number(structure.grossMonthly);
    const perDay = grossMonthly / workingDays;
    const lopDeduction = Math.round(perDay * lopDays);
    const providentFund = Math.round(Number(structure.basic) * 0.05);
    const taxable = Math.max(0, grossMonthly - 20000);
    const taxDeduction = Math.round(taxable * 0.05);
    const totalDeductions = providentFund + taxDeduction + lopDeduction;
    const netPay = grossMonthly - totalDeductions;

    return {
      personId,
      basic: Number(structure.basic),
      houseRent: Number(structure.houseRent),
      medical: Number(structure.medical),
      conveyance: Number(structure.conveyance),
      other: Number(structure.other),
      grossPay: grossMonthly,
      workingDays,
      presentDays,
      lopDays,
      providentFund,
      taxDeduction,
      lopDeduction,
      totalDeductions,
      netPay,
    };
  }

  async runPayroll(dto: RunPayrollDto, ctx: RequestContext) {
    if (!ctx.scope) throw new BadRequestException('Authentication context required.');
    this.abacPolicy.assertCompanyScope(ctx.scope, dto.companyId, 'run payroll for');

    const existing = await this.prisma.payrollRun.findUnique({
      where: {
        companyId_periodMonth_periodYear: {
          companyId: dto.companyId,
          periodMonth: dto.periodMonth,
          periodYear: dto.periodYear,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Payroll for ${dto.periodMonth}/${dto.periodYear} has already been run for this company.`,
      );
    }

    // Resolve every employee with an active assignment in this company.
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { companyId: dto.companyId, OR: [{ validTo: null }, { validTo: { gt: new Date() } }] },
      include: { user: { include: { person: true } } },
    });
    const persons = Array.from(new Map(assignments.map((a) => [a.user.person.id, a.user.person])).values());

    if (persons.length === 0) {
      throw new BadRequestException('No employees found for this company.');
    }

    const payslipInputs = [];
    for (const person of persons) {
      const input = await this.computePayslipInput(person.id, dto.periodMonth, dto.periodYear);
      if (input) payslipInputs.push(input);
    }

    if (payslipInputs.length === 0) {
      throw new BadRequestException('No salaried employees with a salary structure were found for this company.');
    }

    const runNumber = await this.numberSeq.nextDocumentNumber(dto.companyId, 'PAYROLL', dto.periodYear);
    const totalGross = payslipInputs.reduce((s, p) => s + p.grossPay, 0);
    const totalDeductions = payslipInputs.reduce((s, p) => s + p.totalDeductions, 0);

    const run = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payrollRun.create({
        data: {
          runNumber,
          companyId: dto.companyId,
          periodMonth: dto.periodMonth,
          periodYear: dto.periodYear,
          status: 'PROCESSING',
          employeeCount: payslipInputs.length,
          totalGross,
          totalDeductions,
          totalNet: totalGross - totalDeductions,
          generatedBy: ctx.user?.id,
        },
      });

      for (const input of payslipInputs) {
        await tx.payslip.create({
          data: {
            payrollRunId: created.id,
            status: 'PROCESSING',
            ...input,
          },
        });
      }

      return created;
    });

    await this.auditService.log({
      action: 'PAYROLL_RUN_GENERATED',
      resource: 'payroll_run',
      resourceId: run.id,
      newValue: { runNumber, employeeCount: payslipInputs.length, totalNet: totalGross - totalDeductions },
      companyId: dto.companyId,
      ctx,
    });

    return run;
  }

  async finalizePayrollRun(runId: string, ctx: RequestContext) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Payroll run not found.');
    if (run.status !== 'PROCESSING') {
      throw new BadRequestException(`This payroll run is already ${run.status}.`);
    }
    if (ctx.scope) {
      this.abacPolicy.assertCompanyScope(ctx.scope, run.companyId, 'finalize payroll for');
    }

    const entryNumber = await this.numberSeq.nextDocumentNumber(run.companyId, 'JOURNAL');
    const totalNet = Number(run.totalNet);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Post to the General Ledger: Dr Salaries & Wages Expense, Cr Salaries Payable.
      const expenseAccount = await tx.account.findFirst({
        where: { code: '5210', OR: [{ companyId: run.companyId }, { companyId: null }] },
      });
      const payableAccount = await tx.account.findFirst({
        where: { code: '2120', OR: [{ companyId: run.companyId }, { companyId: null }] },
      });

      if (expenseAccount && payableAccount) {
        const entry = await tx.journalEntry.create({
          data: {
            entryNumber,
            companyId: run.companyId,
            reference: run.runNumber,
            memo: `Payroll disbursement — period ${run.periodMonth}/${run.periodYear}`,
            totalDebit: totalNet,
            totalCredit: totalNet,
            createdBy: ctx.user?.id,
            status: 'POSTED',
          },
        });

        await tx.journalLine.create({
          data: {
            journalEntryId: entry.id,
            accountId: expenseAccount.id,
            accountCode: expenseAccount.code,
            debit: totalNet,
            credit: 0,
            description: `Payroll ${run.runNumber}`,
          },
        });
        await tx.journalLine.create({
          data: {
            journalEntryId: entry.id,
            accountId: payableAccount.id,
            accountCode: payableAccount.code,
            debit: 0,
            credit: totalNet,
            description: `Payroll ${run.runNumber}`,
          },
        });

        await tx.account.update({
          where: { id: expenseAccount.id },
          data: { currentBalance: { increment: totalNet } },
        });
        await tx.account.update({
          where: { id: payableAccount.id },
          data: { currentBalance: { increment: totalNet } },
        });
      }

      await tx.payslip.updateMany({ where: { payrollRunId: runId }, data: { status: 'COMPLETED' } });

      return tx.payrollRun.update({
        where: { id: runId },
        data: { status: 'COMPLETED', processedBy: ctx.user?.id, processedAt: new Date() },
      });
    });

    await this.auditService.log({
      action: 'PAYROLL_RUN_FINALIZED',
      resource: 'payroll_run',
      resourceId: runId,
      newValue: { status: 'COMPLETED', totalNet },
      companyId: run.companyId,
      ctx,
    });

    return updated;
  }

  async getPayrollRuns(ctx: RequestContext) {
    const filter = this.buildScopeFilter(ctx, 'companyId');
    return this.prisma.payrollRun.findMany({
      where: filter,
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
  }

  async getPayslipsForRun(runId: string, ctx: RequestContext) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Payroll run not found.');
    if (ctx.scope) {
      this.abacPolicy.assertCompanyScope(ctx.scope, run.companyId, 'view payroll for');
    }
    return this.prisma.payslip.findMany({
      where: { payrollRunId: runId },
      include: { person: true },
    });
  }

  async getMyPayslips(ctx: RequestContext) {
    if (!ctx.user) throw new BadRequestException('Authentication context required.');
    return this.prisma.payslip.findMany({
      where: { personId: ctx.user.personId },
      include: { payrollRun: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
