import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../../common/interfaces/request-context.interface';

export interface RecordAuditParams {
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  companyId?: string;
  organizationId?: string;
  ctx?: RequestContext;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends an immutable audit event linked to the cryptographic chain.
   */
  async log(params: RecordAuditParams) {
    const { action, resource, resourceId, oldValue, newValue, companyId, organizationId, ctx } = params;

    // Get previous row hash to maintain SHA-256 chain
    const lastRow = await this.prisma.auditLog.findFirst({
      where: companyId ? { companyId } : undefined,
      orderBy: { occurredAt: 'desc' },
      select: { rowHash: true },
    });

    const prevHash = lastRow?.rowHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();

    const hashPayload = JSON.stringify({
      prevHash,
      timestamp,
      action,
      resource,
      resourceId,
      oldValue,
      newValue,
      actorUserId: ctx?.user?.id || null,
      companyId: companyId || ctx?.scope?.activeCompanyId || null,
    });

    const rowHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    return this.prisma.auditLog.create({
      data: {
        action,
        resource,
        resourceId,
        oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
        newValue: newValue ? JSON.stringify(newValue) : undefined,
        actorUserId: ctx?.user?.id,
        companyId: companyId || ctx?.scope?.activeCompanyId,
        organizationId: organizationId || ctx?.scope?.activeOrgId,
        ipAddress: ctx?.ipAddress,
        correlationId: ctx?.correlationId,
        prevHash,
        rowHash,
      },
    });
  }

  /**
   * Queries audit logs filtered by scope.
   */
  async getLogs(ctx: RequestContext, limit = 50) {
    const where: any = {};
    if (ctx.scope?.activeCompanyId) {
      where.companyId = ctx.scope.activeCompanyId;
    }

    return this.prisma.auditLog.findMany({
      where,
      take: limit,
      orderBy: { occurredAt: 'desc' },
      include: {
        organization: {
          select: { name: true, code: true },
        },
      },
    });
  }

  /**
   * Verifies the cryptographic chain integrity.
   */
  async verifyChain(companyId?: string): Promise<{ valid: boolean; totalChecked: number; errorAt?: string }> {
    const logs = await this.prisma.auditLog.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { occurredAt: 'asc' },
    });

    for (let i = 1; i < logs.length; i++) {
      const prev = logs[i - 1];
      const curr = logs[i];
      if (curr.prevHash !== prev.rowHash) {
        return {
          valid: false,
          totalChecked: i,
          errorAt: curr.id,
        };
      }
    }

    return {
      valid: true,
      totalChecked: logs.length,
    };
  }
}
