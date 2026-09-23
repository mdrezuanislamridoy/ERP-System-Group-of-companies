import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../platform/number-sequence.service';
import { AuditService } from '../audit/audit.service';
import { AbacPolicyService } from '../auth/services/abac-policy.service';
import { ScopedRepository } from '../../common/repositories/scoped.repository';
import { RequestContext } from '../../common/interfaces/request-context.interface';
import { CreateJournalDto } from './dto/create-journal.dto';

@Injectable()
export class FinanceService extends ScopedRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSeq: NumberSequenceService,
    private readonly auditService: AuditService,
    private readonly abacPolicy: AbacPolicyService,
  ) {
    super();
  }

  async getChartOfAccounts(companyId?: string) {
    const where: any = {};
    if (companyId) {
      where.OR = [{ companyId }, { companyId: null }];
    }

    return this.prisma.account.findMany({
      where,
      orderBy: { code: 'asc' },
    });
  }

  async getJournalEntries(ctx: RequestContext) {
    const filter = this.buildScopeFilter(ctx, 'companyId');

    return this.prisma.journalEntry.findMany({
      where: filter,
      include: {
        lines: true,
      },
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  async createJournalEntry(dto: CreateJournalDto, ctx: RequestContext) {
    // 1. Verify Scope via ABAC Policy Engine
    const targetCompanyId = dto.companyId;
    if (!ctx.scope) {
      throw new UnauthorizedException('Authentication context required');
    }
    this.abacPolicy.assertCompanyScope(ctx.scope, targetCompanyId, 'post journal in');

    // 2. Validate Double-Entry Balancing Invariant (totalDebit === totalCredit)
    const totalDebit = dto.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const totalCredit = dto.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new BadRequestException({
        code: 'JOURNAL_UNBALANCED',
        message: 'Journal entry is out of balance. Total debits must strictly equal total credits.',
        details: { totalDebit, totalCredit, difference: totalDebit - totalCredit },
      });
    }

    if (totalDebit <= 0) {
      throw new BadRequestException('Journal entry amount must be greater than zero.');
    }

    // 3. Obtain Gapless Document Number
    const entryNumber = await this.numberSeq.nextDocumentNumber(targetCompanyId, 'JOURNAL');

    // 4. Execute atomic posting in Prisma transaction
    const journal = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          entryNumber,
          companyId: targetCompanyId,
          reference: dto.reference,
          memo: dto.memo,
          totalDebit,
          totalCredit,
          createdBy: ctx.user?.id,
          status: 'POSTED',
        },
      });

      for (const line of dto.lines) {
        const account = await tx.account.findFirst({
          where: {
            code: line.accountCode,
            OR: [{ companyId: targetCompanyId }, { companyId: null }],
          },
        });

        if (!account) {
          throw new NotFoundException(`Chart of Account code ${line.accountCode} not found for company`);
        }

        await tx.journalLine.create({
          data: {
            journalEntryId: entry.id,
            accountId: account.id,
            accountCode: account.code,
            costCenterId: line.costCenterId,
            debit: line.debit,
            credit: line.credit,
            description: line.description,
          },
        });

        // Update Account Running Balance
        const isDebitNormal = account.normalBalance === 'DEBIT';
        const balanceChange = isDebitNormal
          ? Number(line.debit) - Number(line.credit)
          : Number(line.credit) - Number(line.debit);

        await tx.account.update({
          where: { id: account.id },
          data: {
            currentBalance: { increment: balanceChange },
          },
        });
      }

      return entry;
    });

    // 5. Audit Log Entry
    await this.auditService.log({
      action: 'JOURNAL_POSTED',
      resource: 'journal_entry',
      resourceId: journal.id,
      newValue: { entryNumber, totalDebit, totalCredit, linesCount: dto.lines.length },
      companyId: targetCompanyId,
      ctx,
    });

    return journal;
  }

  async getTrialBalance(companyId: string) {
    const accounts = await this.prisma.account.findMany({
      where: {
        OR: [{ companyId }, { companyId: null }],
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              companyId,
              status: 'POSTED',
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const rows = accounts.map((acc) => {
      const debitMovement = acc.journalLines.reduce((sum, l) => sum + Number(l.debit), 0);
      const creditMovement = acc.journalLines.reduce((sum, l) => sum + Number(l.credit), 0);
      const openingBalance = Number(acc.openingBalance);
      const closingBalance =
        acc.normalBalance === 'DEBIT'
          ? openingBalance + debitMovement - creditMovement
          : openingBalance + creditMovement - debitMovement;

      return {
        accountCode: acc.code,
        accountName: acc.name,
        accountType: acc.type,
        openingBalance,
        debitMovement,
        creditMovement,
        closingBalance,
        netDebit: closingBalance > 0 && acc.normalBalance === 'DEBIT' ? closingBalance : 0,
        netCredit: closingBalance > 0 && acc.normalBalance === 'CREDIT' ? closingBalance : 0,
      };
    });

    const totalNetDebit = rows.reduce((s, r) => s + r.netDebit, 0);
    const totalNetCredit = rows.reduce((s, r) => s + r.netCredit, 0);

    return {
      rows,
      summary: {
        totalNetDebit,
        totalNetCredit,
        isBalanced: Math.abs(totalNetDebit - totalNetCredit) < 0.01,
      },
    };
  }
}
