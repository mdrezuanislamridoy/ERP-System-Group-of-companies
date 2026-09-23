import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AbacPolicyService } from './services/abac-policy.service';
import { RequestContext, UserScope, ScopeMode } from '../../common/interfaces/request-context.interface';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const REFRESH_TOKEN_VALIDITY_DAYS = 7;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly abacPolicy: AbacPolicyService,
  ) {}

  /**
   * Secure credential authentication with brute-force lockout and session creation.
   */
  async login(userIdRaw: string, pass: string, ctx?: RequestContext) {
    const identifier = userIdRaw.trim();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { employeeId: identifier },
          { email: identifier.toLowerCase() },
          { person: { email: identifier.toLowerCase() } },
          { person: { employeeNo: identifier } },
        ],
      },
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

    if (!user) {
      this.logger.warn(`Failed login attempt for non-existent account: ${identifier}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 1. Check Account Status
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}. Contact your system administrator.`);
    }

    // 2. Check Brute-Force Lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (1000 * 60));
      this.logger.warn(`Locked account login attempt: ${user.email} (locked for ${remainingMinutes}m)`);
      throw new ForbiddenException({
        code: 'ACCOUNT_TEMPORARILY_LOCKED',
        message: `Account is temporarily locked due to repeated failed login attempts. Try again in ${remainingMinutes} minutes.`,
        details: { lockedUntil: user.lockedUntil, remainingMinutes },
      });
    }

    // 3. Constant-Time Bcrypt Verification
    const isMatch = await bcrypt.compare(pass, user.passwordHash);

    if (!isMatch) {
      const nextAttempts = user.failedAttempts + 1;
      const isLockingNow = nextAttempts >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = isLockingNow ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: nextAttempts,
          lockedUntil,
        },
      });

      await this.auditService.log({
        action: isLockingNow ? 'ACCOUNT_LOCKED_BRUTE_FORCE' : 'LOGIN_FAILED_BAD_PASSWORD',
        resource: 'user',
        resourceId: user.id,
        newValue: { failedAttempts: nextAttempts, lockedUntil },
        ctx,
      });

      if (isLockingNow) {
        throw new ForbiddenException({
          code: 'ACCOUNT_LOCKED',
          message: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
        });
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Successful Authentication: Reset lockouts and update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // 5. Select Default Active Assignment
    if (!user.assignments || user.assignments.length === 0) {
      throw new ForbiddenException('User has no active organizational assignments. Contact Group HR.');
    }

    const activeAssignment = user.assignments[0];

    // 6. Resolve Active Scope & Closure Subtree
    const activeScope = await this.resolveScopeForAssignment(user.id, activeAssignment);

    // 7. Create Session with Refresh Token Rotation
    const { rawRefreshToken, session } = await this.createSession(
      user.id,
      activeAssignment.organizationId,
      ctx,
    );

    // 8. Sign 15-Minute Access Token
    const accessToken = this.signAccessToken(user.id, user.email, activeAssignment.organizationId, session.id, user.permissionsVersion);

    // 9. Audit Event
    await this.auditService.log({
      action: 'USER_LOGIN_SUCCESS',
      resource: 'user',
      resourceId: user.id,
      companyId: activeAssignment.companyId || undefined,
      organizationId: activeAssignment.organizationId,
      ctx,
    });

    const permissions = activeAssignment.role.permissions
      .filter((rp) => rp.effect === 'ALLOW')
      .map((rp) => rp.permission.key);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        employeeId: user.employeeId || user.person.employeeNo || null,
        email: user.email,
        name: `${user.person.firstName} ${user.person.lastName}`,
        status: user.status,
      },
      activeAssignment: {
        id: activeAssignment.id,
        roleKey: activeAssignment.role.key,
        roleName: activeAssignment.role.name,
        organizationId: activeAssignment.organizationId,
        organizationName: activeAssignment.organization.name,
        companyId: activeAssignment.companyId,
        title: activeAssignment.title,
      },
      availableAssignments: user.assignments.map((a) => ({
        id: a.id,
        roleKey: a.role.key,
        roleName: a.role.name,
        organizationId: a.organizationId,
        organizationName: a.organization.name,
        companyId: a.companyId,
        title: a.title,
      })),
      scope: activeScope,
      permissions,
    };
  }

  /**
   * Rotates refresh tokens and issues new access token.
   * Includes Token Reuse Detection to mitigate stolen token attacks.
   */
  async rotateRefreshToken(rawToken: string, ctx?: RequestContext) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash: tokenHash },
      include: {
        user: {
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
                      include: { permission: true },
                    },
                  },
                },
                organization: true,
              },
            },
          },
        },
      },
    });

    // Token Reuse / Tampering Detection:
    if (!session || session.revokedAt) {
      if (session) {
        // If a previously revoked token is reused, revoke ALL sessions for this user family
        this.logger.error(`CRITICAL: Detected refresh token reuse for user ${session.userId}. Revoking all sessions.`);
        await this.prisma.session.updateMany({
          where: { userId: session.userId },
          data: { revokedAt: new Date() },
        });

        await this.auditService.log({
          action: 'SECURITY_ALERT_REFRESH_TOKEN_REUSE',
          resource: 'user',
          resourceId: session.userId,
          ctx,
        });
      }

      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired. Please re-authenticate.');
    }

    const user = session.user;
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive');
    }

    // Determine active assignment for the session
    const activeAssignment =
      user.assignments.find((a) => a.organizationId === session.activeOrgId) ||
      user.assignments[0];

    if (!activeAssignment) {
      throw new ForbiddenException('User has no valid assignments for active session');
    }

    // Rotate refresh token
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: newExpiresAt,
      },
    });

    const activeScope = await this.resolveScopeForAssignment(user.id, activeAssignment);
    const accessToken = this.signAccessToken(user.id, user.email, activeAssignment.organizationId, session.id, user.permissionsVersion);

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      scope: activeScope,
    };
  }

  /**
   * Switches active operating organization context with ABAC hierarchy validation.
   */
  async switchContext(userId: string, targetOrgId: string, ctx?: RequestContext) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
                  include: { permission: true },
                },
              },
            },
            organization: true,
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException();

    // 1. Direct match: user holds an assignment directly at this node or company
    let targetAssignment = user.assignments.find(
      (a) => a.organizationId === targetOrgId || a.companyId === targetOrgId,
    );

    // 2. Hierarchical match: user holds an ancestor assignment with SUBTREE scope
    if (!targetAssignment) {
      for (const a of user.assignments) {
        if (a.scopeMode === 'SUBTREE') {
          const closure = await this.prisma.organizationClosure.findUnique({
            where: {
              ancestorId_descendantId: {
                ancestorId: a.organizationId,
                descendantId: targetOrgId,
              },
            },
          });

          if (closure) {
            targetAssignment = a;
            break;
          }
        }
      }
    }

    if (!targetAssignment) {
      await this.auditService.log({
        action: 'CONTEXT_SWITCH_UNAUTHORIZED_DENIED',
        resource: 'organization',
        resourceId: targetOrgId,
        ctx,
      });

      throw new ForbiddenException({
        code: 'UNAUTHORIZED_CONTEXT_SWITCH',
        message: `You do not have organizational authority to operate in organization node ${targetOrgId}.`,
        details: { targetOrgId },
      });
    }

    // Resolve target organization details
    const targetOrg = await this.prisma.organization.findUnique({
      where: { id: targetOrgId },
    });

    if (!targetOrg) throw new BadRequestException(`Organization ${targetOrgId} does not exist`);

    const activeScope = await this.resolveScopeForAssignment(user.id, targetAssignment, targetOrg);
    const accessToken = this.signAccessToken(user.id, user.email, targetOrg.id, undefined, user.permissionsVersion);

    await this.auditService.log({
      action: 'CONTEXT_SWITCH_SUCCESS',
      resource: 'organization',
      resourceId: targetOrg.id,
      newValue: { targetOrgId, assignmentId: targetAssignment.id },
      companyId: targetOrg.companyId || undefined,
      ctx,
    });

    return {
      accessToken,
      activeAssignment: {
        id: targetAssignment.id,
        roleKey: targetAssignment.role.key,
        roleName: targetAssignment.role.name,
        organizationId: targetOrg.id,
        organizationName: targetOrg.name,
        companyId: targetOrg.companyId,
      },
      scope: activeScope,
    };
  }

  /**
   * Explicitly revokes active session.
   */
  async logout(sessionId?: string, ctx?: RequestContext) {
    if (sessionId) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });
    }

    await this.auditService.log({
      action: 'USER_LOGOUT',
      resource: 'session',
      resourceId: sessionId,
      ctx,
    });

    return { ok: true, message: 'Logged out successfully' };
  }

  /**
   * Lists all sessions for user device management.
   */
  async getSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        activeOrgId: true,
        device: true,
        ip: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
  }

  /**
   * Revokes a specific device session.
   */
  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) throw new BadRequestException('Session not found');

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    return { ok: true, revokedSessionId: sessionId };
  }

  async getMe(ctx: RequestContext) {
    if (!ctx.user) throw new UnauthorizedException();
    return {
      user: ctx.user,
      scope: ctx.scope,
    };
  }

  // ─── Internal Helper Methods ───────────────────────────────────────────────

  private signAccessToken(
    userId: string,
    email: string,
    activeOrgId: string,
    sessionId?: string,
    permissionsVersion = 1,
  ): string {
    const payload = {
      sub: userId,
      email,
      activeOrgId,
      sessionId,
      permissionsVersion,
    };
    return this.jwtService.sign(payload);
  }

  private async createSession(userId: string, activeOrgId: string, ctx?: RequestContext) {
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId,
        activeOrgId,
        refreshTokenHash,
        ip: ctx?.ipAddress,
        device: ctx?.userAgent ? ctx.userAgent.slice(0, 255) : undefined,
        expiresAt,
      },
    });

    return { rawRefreshToken, session };
  }

  private async resolveScopeForAssignment(
    userId: string,
    assignment: any,
    targetOrgOverride?: any,
  ): Promise<UserScope> {
    const orgId = targetOrgOverride?.id || assignment.organizationId;
    const companyId = targetOrgOverride?.companyId !== undefined ? targetOrgOverride.companyId : assignment.companyId;

    const closureRows = await this.prisma.organizationClosure.findMany({
      where: { ancestorId: orgId },
      select: { descendantId: true },
    });

    const descendantOrgIds = closureRows.map((c) => c.descendantId);
    const isGroup = !companyId;
    const roleAttrs = (assignment.role?.attributes as Record<string, any>) || {};

    return {
      userId,
      assignmentId: assignment.id,
      roleKey: assignment.role?.key || 'unknown',
      activeOrgId: orgId,
      activeCompanyId: companyId,
      scopeMode: assignment.scopeMode as ScopeMode,
      allowedCompanyIds: isGroup ? ['*'] : [companyId],
      allowedBranchIds: ['*'],
      allowedDepartmentIds: ['*'],
      descendantOrgIds,
      financialApprovalLimit: roleAttrs.financialApprovalLimit || 0,
    };
  }
}
