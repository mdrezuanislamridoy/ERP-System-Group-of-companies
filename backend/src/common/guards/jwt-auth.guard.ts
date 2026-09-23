import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { ScopeMode, UserScope } from '../interfaces/request-context.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    let payload: any;

    try {
      payload = this.jwtService.verify(token);
    } catch (err) {
      throw new UnauthorizedException('Token is expired or signature is invalid');
    }

    // 1. Load user with current assignments
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        person: true,
        assignments: {
          where: {
            OR: [{ validTo: null }, { validTo: { gt: new Date() } }],
          },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
            organization: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account does not exist or has been disabled');
    }

    // 2. Immediate Token Revocation via permissions_version (Rule 8)
    if (payload.permissionsVersion && payload.permissionsVersion !== user.permissionsVersion) {
      throw new UnauthorizedException({
        code: 'TOKEN_REVOKED_PRIVILEGE_CHANGED',
        message: 'Security privileges have been updated for your account. Please log in again to refresh credentials.',
      });
    }

    // 3. Verify Session Liveness (if token carries sessionId)
    if (payload.sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new UnauthorizedException({
          code: 'SESSION_REVOKED',
          message: 'This session has been revoked or expired. Please sign in again.',
        });
      }
    }

    // 4. Resolve Active Context & Assignment
    const requestedOrgId = (request.headers['x-organization-id'] as string) || payload.activeOrgId;

    let activeAssignment = user.assignments.find(
      (a) => a.organizationId === requestedOrgId || a.companyId === requestedOrgId,
    );

    // If requestedOrgId wasn't a direct match, check if it's within a SUBTREE assignment
    if (!activeAssignment && requestedOrgId) {
      for (const a of user.assignments) {
        if (a.scopeMode === 'SUBTREE') {
          const closure = await this.prisma.organizationClosure.findUnique({
            where: {
              ancestorId_descendantId: {
                ancestorId: a.organizationId,
                descendantId: requestedOrgId,
              },
            },
          });
          if (closure) {
            activeAssignment = a;
            break;
          }
        }
      }
    }

    // Fall back to default primary assignment
    if (!activeAssignment && user.assignments.length > 0) {
      activeAssignment = user.assignments[0];
    }

    if (!activeAssignment) {
      throw new ForbiddenException({
        code: 'NO_VALID_ASSIGNMENT',
        message: 'User does not hold an active operational assignment in the requested organization.',
      });
    }

    const effectiveOrgId = requestedOrgId || activeAssignment.organizationId;

    // 5. Expand Closure Descendant Set
    const closureRows = await this.prisma.organizationClosure.findMany({
      where: { ancestorId: effectiveOrgId },
      select: { descendantId: true },
    });

    const descendantOrgIds = closureRows.map((c) => c.descendantId);

    // Collect granted permissions
    const permissions = activeAssignment.role.permissions
      .filter((rp) => rp.effect === 'ALLOW')
      .map((rp) => rp.permission.key);

    const isGroup = !activeAssignment.companyId;
    const roleAttrs = (activeAssignment.role.attributes as Record<string, any>) || {};

    const userScope: UserScope = {
      userId: user.id,
      assignmentId: activeAssignment.id,
      roleKey: activeAssignment.role.key,
      activeOrgId: effectiveOrgId,
      activeCompanyId: activeAssignment.companyId,
      scopeMode: activeAssignment.scopeMode as ScopeMode,
      allowedCompanyIds: isGroup ? ['*'] : [activeAssignment.companyId!],
      allowedBranchIds: ['*'],
      allowedDepartmentIds: ['*'],
      descendantOrgIds,
      financialApprovalLimit: roleAttrs.financialApprovalLimit || 0,
    };

    // Populate request context
    request.context = {
      ...request.context,
      correlationId: request.context?.correlationId || (request.headers['x-correlation-id'] as string),
      user: {
        id: user.id,
        personId: user.personId,
        email: user.email,
        permissions,
      },
      scope: userScope,
    };

    return true;
  }
}
