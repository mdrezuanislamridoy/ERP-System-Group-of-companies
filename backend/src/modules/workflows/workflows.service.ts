import { Injectable, NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AbacPolicyService } from '../auth/services/abac-policy.service';
import { RequestContext } from '../../common/interfaces/request-context.interface';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly abacPolicy: AbacPolicyService,
  ) {}

  async getInbox(ctx: RequestContext) {
    const userId = ctx.user?.id;
    if (!userId) return [];

    return this.prisma.workflowTask.findMany({
      where: {
        assigneeUserId: userId,
        status: 'PENDING',
      },
      include: {
        instance: true,
      },
      orderBy: { dueAt: 'asc' },
    });
  }

  async actionTask(taskId: string, action: 'APPROVE' | 'REJECT', comments: string | undefined, ctx: RequestContext) {
    const callerUserId = ctx.user?.id;
    if (!callerUserId || !ctx.scope) {
      throw new UnauthorizedException('Authentication context required');
    }

    const task = await this.prisma.workflowTask.findUnique({
      where: { id: taskId },
      include: {
        instance: true,
      },
    });

    if (!task) throw new NotFoundException('Workflow task not found');
    if (task.status !== 'PENDING') throw new BadRequestException(`Task is already ${task.status}`);

    // 1. Authorization: Task must be assigned to caller, unless user is Group CEO/Super Admin
    const isSuperAdmin = ctx.scope.roleKey === 'group-ceo' || ctx.scope.roleKey === 'group-super-admin';
    if (task.assigneeUserId !== callerUserId && !isSuperAdmin) {
      throw new ForbiddenException({
        code: 'NOT_TASK_ASSIGNEE',
        message: 'You are not the designated approver for this workflow task.',
      });
    }

    // 2. Company Scope Verification
    this.abacPolicy.assertCompanyScope(ctx.scope, task.instance.companyId, 'action approval task in');

    // 3. Document-specific ABAC checks (Financial Limits & Segregation of Duties)
    if (task.instance.documentType === 'PURCHASE_REQUEST') {
      const pr = await this.prisma.purchaseRequest.findUnique({
        where: { id: task.instance.documentId },
      });

      if (pr) {
        // Enforce Segregation of Duties (SoD): Requester cannot approve their own PR
        this.abacPolicy.assertSegregationOfDuties(callerUserId, pr.requesterId, pr.number);

        // Enforce Financial Threshold on Approvals
        if (action === 'APPROVE') {
          this.abacPolicy.assertFinancialApprovalLimit(ctx.scope, Number(pr.amount), `Purchase Request ${pr.number}`);
        }
      }
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    await this.prisma.$transaction(async (tx) => {
      // 1. Update task
      await tx.workflowTask.update({
        where: { id: taskId },
        data: {
          status: newStatus,
          comments,
          actionedAt: new Date(),
        },
      });

      // 2. Update workflow instance status
      await tx.workflowInstance.update({
        where: { id: task.instanceId },
        data: {
          status: newStatus,
        },
      });

      // 3. Update target document if it's a purchase request
      if (task.instance.documentType === 'PURCHASE_REQUEST') {
        await tx.purchaseRequest.update({
          where: { id: task.instance.documentId },
          data: {
            status: newStatus,
            stage: action === 'APPROVE' ? 'APPROVED_READY_FOR_PO' : 'REJECTED',
          },
        });
      }
    });

    await this.auditService.log({
      action: `WORKFLOW_TASK_${action}`,
      resource: task.instance.documentType,
      resourceId: task.instance.documentId,
      newValue: { taskId, action, comments, approverId: callerUserId },
      companyId: task.instance.companyId,
      ctx,
    });

    return {
      taskId,
      status: newStatus,
      documentId: task.instance.documentId,
      actionedAt: new Date().toISOString(),
    };
  }
}
