import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AbacPolicyService } from '../auth/services/abac-policy.service';
import { RequestContext, ScopeMode } from '../../common/interfaces/request-context.interface';
import { CreateEmployeeUserDto } from './dto/create-employee-user.dto';

@Injectable()
export class IamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly abacPolicy: AbacPolicyService,
  ) {}

  async getUsers(ctx: RequestContext) {
    const canReadSensitive = ctx.user?.permissions.includes('sensitive.salary.read');

    const users = await this.prisma.user.findMany({
      include: {
        person: true,
        assignments: {
          include: {
            role: true,
            organization: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      employeeId: u.employeeId || u.person.employeeNo || null,
      email: u.email,
      name: `${u.person.firstName} ${u.person.lastName}`,
      status: u.status,
      phone: u.person.phone,
      // Field-Level Masking (Issue #03 from Architecture Roadmap)
      baseSalary: canReadSensitive ? u.person.baseSalary : '••••••••',
      bankAccount: canReadSensitive ? u.person.bankAccount : '••••-••••-••••',
      bankName: u.person.bankName,
      assignments: u.assignments.map((a) => ({
        id: a.id,
        roleKey: a.role.key,
        roleName: a.role.name,
        level: a.role.level,
        organizationId: a.organizationId,
        organizationName: a.organization.name,
        companyId: a.companyId,
        scopeMode: a.scopeMode,
        title: a.title,
      })),
    }));
  }

  /**
   * Provision a new Employee and System User.
   * Strictly restricted to Administrators, HR Managers, and authorized roles.
   * Includes company boundary isolation and privilege escalation prevention.
   */
  async createEmployeeUser(dto: CreateEmployeeUserDto, ctx: RequestContext) {
    const callerScope = ctx.scope;
    if (!callerScope || !ctx.user) {
      throw new ForbiddenException('Authentication context required to provision users.');
    }

    // 1. Authorization & Role Verification
    const isGroupAdmin = callerScope.roleKey === 'group-super-admin' || callerScope.roleKey === 'group-ceo';
    const isCompanyExecOrHr =
      callerScope.roleKey === 'company-ceo' ||
      callerScope.roleKey === 'company-cfo' ||
      callerScope.roleKey === 'group-cfo' ||
      ctx.user.permissions.includes('iam.user.create') ||
      ctx.user.permissions.includes('org.write');

    if (!isGroupAdmin && !isCompanyExecOrHr) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PRIVILEGES_FOR_USER_CREATION',
        message: 'Only Administrators, HR Managers, and authorized Executives are permitted to create users.',
      });
    }

    // 2. Company Boundary Isolation (ABAC)
    this.abacPolicy.assertCompanyScope(callerScope, dto.companyId, 'create employee user in');

    // 3. Organization Node Validation
    const orgNode = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });
    if (!orgNode) {
      throw new NotFoundException(`Organization node with ID ${dto.organizationId} does not exist.`);
    }

    // 4. Role Validation & Privilege Escalation Prevention
    const targetRole = await this.prisma.role.findUnique({
      where: { key: dto.roleKey },
    });
    if (!targetRole) {
      throw new NotFoundException(`Role with key '${dto.roleKey}' not found.`);
    }

    // A non-Group Super Admin cannot grant Group Super Admin or elevate beyond their own domain
    if (targetRole.key === 'group-super-admin' && !isGroupAdmin) {
      throw new ForbiddenException({
        code: 'PRIVILEGE_ESCALATION_BLOCKED',
        message: 'Cannot grant Group Super Admin privileges without holding Group Super Admin authority.',
      });
    }

    // 5. Uniqueness Checks
    const existingEmployeeId = await this.prisma.user.findFirst({
      where: {
        OR: [{ employeeId: dto.employeeId }, { person: { employeeNo: dto.employeeId } }],
      },
    });
    if (existingEmployeeId) {
      throw new ConflictException({
        code: 'EMPLOYEE_ID_ALREADY_EXISTS',
        message: `An employee or user with Employee ID '${dto.employeeId}' is already registered.`,
      });
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingEmail) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: `An account with corporate email '${dto.email}' already exists.`,
      });
    }

    // 6. Password Hashing
    const passwordHash = await bcrypt.hash(dto.initialPassword, 10);

    // 7. Atomic Transactional Creation
    const result = await this.prisma.$transaction(async (tx) => {
      // Create Person record (the human entity)
      const person = await tx.person.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email.toLowerCase().trim(),
          phone: dto.phone,
          nationalId: dto.nationalId,
          taxId: dto.taxId,
          employeeNo: dto.employeeId,
          baseSalary: dto.baseSalary,
          bankName: dto.bankName,
          bankAccount: dto.bankAccount,
        },
      });

      // Create User credential record
      const user = await tx.user.create({
        data: {
          personId: person.id,
          employeeId: dto.employeeId,
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          status: 'ACTIVE',
        },
      });

      // Bind initial Role & Organization Assignment
      const assignment = await tx.userRoleAssignment.create({
        data: {
          userId: user.id,
          roleId: targetRole.id,
          organizationId: dto.organizationId,
          companyId: dto.companyId,
          scopeMode: (dto.scopeMode as ScopeMode) || 'SUBTREE',
          title: dto.title || targetRole.name,
        },
      });

      return { person, user, assignment };
    });

    // 8. Cryptographic Audit Log
    await this.auditService.log({
      action: 'EMPLOYEE_USER_CREATED',
      resource: 'user',
      resourceId: result.user.id,
      newValue: {
        employeeId: dto.employeeId,
        name: `${dto.firstName} ${dto.lastName}`,
        email: dto.email,
        companyId: dto.companyId,
        organizationId: dto.organizationId,
        roleKey: dto.roleKey,
        hasSalary: dto.baseSalary !== undefined,
        createdBy: ctx.user.id,
      },
      companyId: dto.companyId,
      organizationId: dto.organizationId,
      ctx,
    });

    return {
      id: result.user.id,
      employeeId: result.user.employeeId,
      email: result.user.email,
      name: `${result.person.firstName} ${result.person.lastName}`,
      role: targetRole.name,
      roleKey: targetRole.key,
      companyId: dto.companyId,
      organizationId: dto.organizationId,
      status: result.user.status,
      createdAt: result.user.createdAt,
    };
  }

  async getRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async getPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ moduleKey: 'asc' }, { resource: 'asc' }],
    });
  }
}
