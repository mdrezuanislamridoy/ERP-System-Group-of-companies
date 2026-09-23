import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../platform/number-sequence.service';
import { AuditService } from '../audit/audit.service';
import { AbacPolicyService } from '../auth/services/abac-policy.service';
import { ScopedRepository } from '../../common/repositories/scoped.repository';
import { RequestContext } from '../../common/interfaces/request-context.interface';
import { CreatePurchaseRequestDto } from './dto/create-pr.dto';

@Injectable()
export class ProcurementService extends ScopedRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSeq: NumberSequenceService,
    private readonly auditService: AuditService,
    private readonly abacPolicy: AbacPolicyService,
  ) {
    super();
  }

  async getPurchaseRequests(ctx: RequestContext) {
    const filter = this.buildScopeFilter(ctx, 'companyId', 'departmentId');

    return this.prisma.purchaseRequest.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPurchaseRequest(dto: CreatePurchaseRequestDto, ctx: RequestContext) {
    const targetCompanyId = dto.companyId;
    if (!ctx.scope) {
      throw new UnauthorizedException('Authentication context required');
    }
    this.abacPolicy.assertCompanyScope(ctx.scope, targetCompanyId, 'create purchase request for');

    const number = await this.numberSeq.nextDocumentNumber(targetCompanyId, 'PR');

    const pr = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchaseRequest.create({
        data: {
          number,
          companyId: targetCompanyId,
          departmentId: dto.departmentId || ctx.scope?.activeOrgId,
          title: dto.title,
          amount: dto.amount,
          priority: dto.priority || 'NORMAL',
          stage: 'FINANCIAL_REVIEW',
          status: 'PENDING',
          requesterId: ctx.user?.id,
        },
      });

      // Find or create default workflow definition for PR
      let wfDef = await tx.workflowDefinition.findFirst({
        where: {
          documentType: 'PURCHASE_REQUEST',
          OR: [{ companyId: targetCompanyId }, { companyId: null }],
        },
      });

      if (!wfDef) {
        wfDef = await tx.workflowDefinition.create({
          data: {
            companyId: targetCompanyId,
            documentType: 'PURCHASE_REQUEST',
            name: 'Standard PR Approval Workflow',
          },
        });
      }

      // Instantiate workflow
      const wfInstance = await tx.workflowInstance.create({
        data: {
          definitionId: wfDef.id,
          companyId: targetCompanyId,
          documentType: 'PURCHASE_REQUEST',
          documentId: created.id,
          status: 'IN_PROGRESS',
        },
      });

      // Update PR with workflow link
      await tx.purchaseRequest.update({
        where: { id: created.id },
        data: { workflowInstanceId: wfInstance.id },
      });

      // Create initial approval task for company executive/CFO
      const approverUser = await tx.userRoleAssignment.findFirst({
        where: {
          companyId: targetCompanyId,
          role: {
            permissions: {
              some: { permission: { key: 'procurement.pr.approve' } },
            },
          },
        },
      });

      await tx.workflowTask.create({
        data: {
          instanceId: wfInstance.id,
          stepNumber: 1,
          stepName: 'Finance Approval',
          assigneeUserId: approverUser?.userId,
          status: 'PENDING',
          dueAt: new Date(Date.now() + 86400000 * 2), // 48 hrs
        },
      });

      return created;
    });

    await this.auditService.log({
      action: 'PURCHASE_REQUEST_CREATED',
      resource: 'purchase_request',
      resourceId: pr.id,
      newValue: { number: pr.number, amount: pr.amount, title: pr.title },
      companyId: targetCompanyId,
      ctx,
    });

    return pr;
  }

  async getPurchaseOrders(ctx: RequestContext) {
    const filter = this.buildScopeFilter(ctx, 'companyId');

    return this.prisma.purchaseOrder.findMany({
      where: filter,
      include: {
        supplier: true,
        lines: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSuppliers() {
    return this.prisma.party.findMany({
      where: {
        OR: [{ type: 'SUPPLIER' }, { type: 'BOTH' }],
      },
    });
  }
}
