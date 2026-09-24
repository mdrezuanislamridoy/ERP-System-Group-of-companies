import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ScopedRepository } from '../../common/repositories/scoped.repository';
import { RequestContext } from '../../common/interfaces/request-context.interface';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ConfigureCompanyModulesDto } from './dto/configure-company-modules.dto';
import { CreateOrgNodeDto } from './dto/create-org-node.dto';
import { UpdateOrgNodeDto } from './dto/update-org-node.dto';

@Injectable()
export class OrganizationsService extends ScopedRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  // ─── ACCESS CONTROL ASSERTIONS ─────────────────────────────────────────────

  /**
   * Asserts that caller holds group-level executive authorization (* wildcard in allowedCompanyIds).
   */
  private assertGroupAccess(ctx: RequestContext, action: string) {
    if (!ctx.scope?.allowedCompanyIds.includes('*')) {
      throw new ForbiddenException({
        code: 'GROUP_SCOPE_REQUIRED',
        message: `Action "${action}" requires group-level executive authorization.`,
      });
    }
  }

  /**
   * Asserts that caller has authority over the specified company.
   */
  private assertCompanyAccess(ctx: RequestContext, targetCompanyId: string, action: string) {
    if (ctx.scope?.allowedCompanyIds.includes('*')) return;
    if (
      ctx.scope?.activeCompanyId === targetCompanyId ||
      ctx.scope?.allowedCompanyIds.includes(targetCompanyId)
    ) {
      return;
    }
    throw new ForbiddenException({
      code: 'ERR_ABAC_COMPANY_ISOLATION',
      message: `Cross-company access violation: Cannot perform "${action}" outside your authorized company scope.`,
      details: {
        targetCompanyId,
        activeCompanyId: ctx.scope?.activeCompanyId,
      },
    });
  }

  // ─── QUERY OPERATIONS ──────────────────────────────────────────────────────

  /**
   * Returns full multi-level tree structure of the group.
   */
  async getHierarchyTree() {
    const root = await this.prisma.organization.findFirst({
      where: { parentId: null, deletedAt: null },
      include: {
        children: {
          where: { deletedAt: null },
          include: {
            modules: true,
            children: {
              where: { deletedAt: null },
              include: {
                children: {
                  where: { deletedAt: null },
                },
              },
            },
          },
        },
      },
    });

    return root;
  }

  /**
   * Returns sister concerns with activated modules, unit counts and financial metrics.
   */
  async getCompanies() {
    return this.prisma.organization.findMany({
      where: { type: 'LEGAL_ENTITY', deletedAt: null },
      include: {
        modules: true,
        children: {
          where: { deletedAt: null },
          select: {
            id: true,
            type: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { revenue: 'desc' },
    });
  }

  /**
   * Returns organization nodes filtered strictly by the caller's active scope.
   */
  async getScopedNodes(ctx: RequestContext) {
    const filter = this.buildScopeFilter(ctx, 'companyId');

    return this.prisma.organization.findMany({
      where: {
        ...filter,
        deletedAt: null,
      },
      include: {
        modules: true,
      },
      orderBy: { depth: 'asc' },
    });
  }

  /**
   * Returns single organization node detail with children and modules.
   */
  async getNodeById(id: string) {
    const node = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        children: {
          where: { deletedAt: null },
        },
        modules: true,
        parent: true,
      },
    });

    if (!node || node.deletedAt) {
      throw new NotFoundException(`Organization node with ID ${id} not found`);
    }
    return node;
  }

  // ─── COMPANY (LEGAL ENTITY) MUTATIONS ──────────────────────────────────────

  /**
   * Creates a new sister concern / legal entity under the group.
   * Requires group-level executive access and company.manage permission.
   */
  async createCompany(dto: CreateCompanyDto, ctx: RequestContext) {
    this.assertGroupAccess(ctx, 'createCompany');

    const cleanCode = dto.code.trim().toUpperCase();

    // Check duplicate code under group
    const existing = await this.prisma.organization.findFirst({
      where: { code: cleanCode, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`A company or organization node with code "${cleanCode}" already exists.`);
    }

    // Locate the Group root node
    const groupNode = await this.prisma.organization.findFirst({
      where: { type: 'GROUP', parentId: null, deletedAt: null },
    });
    if (!groupNode) {
      throw new BadRequestException('Group root organization node not found in system database.');
    }

    // Generate path and depth
    const companyId = `c-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const path = `${groupNode.path || groupNode.id}/${companyId}`;
    const depth = (groupNode.depth || 0) + 1;

    // Use Prisma transaction to atomically create organization, closures, and modules
    const created = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          id: companyId,
          parentId: groupNode.id,
          companyId: companyId,
          type: 'LEGAL_ENTITY',
          code: cleanCode,
          name: dto.name.trim(),
          path,
          depth,
          status: dto.status || 'ACTIVE',
          currency: dto.currency || 'BDT',
          sector: dto.sector || 'General Commerce',
          employeesCount: 0,
          revenue: 0,
          expense: 0,
          margin: 0,
          metadata: {
            legalName: dto.legalName || dto.name,
            taxId: dto.taxId,
            binNumber: dto.binNumber,
            incorporatedYear: dto.incorporatedYear || new Date().getFullYear(),
          },
        },
      });

      // Populate closure table: Group -> Company (depth 1) and Company -> Company (depth 0)
      const groupAncestors = await tx.organizationClosure.findMany({
        where: { descendantId: groupNode.id },
      });

      const closures = groupAncestors.map((anc) => ({
        ancestorId: anc.ancestorId,
        descendantId: org.id,
        depth: anc.depth + 1,
      }));

      // Add self closure
      closures.push({
        ancestorId: org.id,
        descendantId: org.id,
        depth: 0,
      });

      await tx.organizationClosure.createMany({
        data: closures,
        skipDuplicates: true,
      });

      // Enable requested initial modules
      const initialModules = dto.modules && dto.modules.length > 0
        ? dto.modules
        : ['FINANCE', 'HR', 'PROCUREMENT', 'INVENTORY', 'WORKFLOW'];

      for (const modKey of initialModules) {
        await tx.companyModule.create({
          data: {
            companyId: org.id,
            moduleKey: modKey.toLowerCase(),
            status: 'ACTIVE',
            settings: {},
          },
        });
      }

      return tx.organization.findUnique({
        where: { id: org.id },
        include: { modules: true },
      });
    });

    // Record immutable audit log
    await this.auditService.log({
      action: 'ORGANIZATION_COMPANY_CREATED',
      resource: 'organization',
      resourceId: created!.id,
      newValue: {
        id: created!.id,
        name: created!.name,
        code: created!.code,
        sector: created!.sector,
        modules: dto.modules,
      },
      companyId: created!.id,
      ctx,
    });

    return created;
  }

  /**
   * Updates an existing legal entity's profile, sector, currency or status.
   */
  async updateCompany(id: string, dto: UpdateCompanyDto, ctx: RequestContext) {
    this.assertCompanyAccess(ctx, id, 'updateCompany');

    const company = await this.prisma.organization.findUnique({
      where: { id, deletedAt: null },
      include: { modules: true },
    });
    if (!company || company.type !== 'LEGAL_ENTITY') {
      throw new NotFoundException(`Sister concern with ID "${id}" not found.`);
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        code: dto.code !== undefined ? dto.code.trim().toUpperCase() : undefined,
        sector: dto.sector !== undefined ? dto.sector.trim() : undefined,
        currency: dto.currency !== undefined ? dto.currency.trim().toUpperCase() : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
        metadata: dto.metadata
          ? { ...(company.metadata as any || {}), ...dto.metadata }
          : undefined,
      },
      include: { modules: true },
    });

    await this.auditService.log({
      action: 'ORGANIZATION_COMPANY_UPDATED',
      resource: 'organization',
      resourceId: id,
      oldValue: {
        name: company.name,
        code: company.code,
        status: company.status,
        sector: company.sector,
      },
      newValue: {
        name: updated.name,
        code: updated.code,
        status: updated.status,
        sector: updated.sector,
      },
      companyId: id,
      ctx,
    });

    return updated;
  }

  /**
   * Configures company-specific active modules and feature gates.
   */
  async configureCompanyModules(companyId: string, dto: ConfigureCompanyModulesDto, ctx: RequestContext) {
    this.assertCompanyAccess(ctx, companyId, 'configureCompanyModules');

    const company = await this.prisma.organization.findUnique({
      where: { id: companyId, deletedAt: null },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found.`);
    }

    const results = await this.prisma.$transaction(async (tx) => {
      for (const m of dto.modules) {
        const cleanKey = m.moduleKey.trim().toLowerCase();
        await tx.companyModule.upsert({
          where: {
            companyId_moduleKey: {
              companyId,
              moduleKey: cleanKey,
            },
          },
          update: {
            status: m.status,
            settings: m.settings ?? undefined,
          },
          create: {
            companyId,
            moduleKey: cleanKey,
            status: m.status,
            settings: m.settings ?? {},
          },
        });
      }

      return tx.companyModule.findMany({
        where: { companyId },
      });
    });

    await this.auditService.log({
      action: 'COMPANY_MODULES_CONFIGURED',
      resource: 'company_modules',
      resourceId: companyId,
      newValue: dto.modules,
      companyId,
      ctx,
    });

    return results;
  }

  // ─── ORGANIZATIONAL UNIT (CHILD NODE) MUTATIONS ────────────────────────────

  /**
   * Creates an operational unit (Business Unit, Plant, Dept, Cost Center, Warehouse).
   */
  async createNode(dto: CreateOrgNodeDto, ctx: RequestContext) {
    const parent = await this.prisma.organization.findUnique({
      where: { id: dto.parentId, deletedAt: null },
    });
    if (!parent) {
      throw new NotFoundException(`Parent organizational unit with ID "${dto.parentId}" not found.`);
    }

    // Determine target companyId
    const companyId = parent.type === 'LEGAL_ENTITY' ? parent.id : parent.companyId;
    if (!companyId) {
      throw new BadRequestException('Parent organization unit does not resolve to an active legal entity.');
    }

    this.assertCompanyAccess(ctx, companyId, 'createNode');

    const cleanCode = dto.code.trim().toUpperCase();

    // Check duplicate code under parent
    const existing = await this.prisma.organization.findFirst({
      where: { parentId: parent.id, code: cleanCode, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Unit with code "${cleanCode}" already exists under parent "${parent.name}".`);
    }

    const nodeId = `${dto.type.toLowerCase().slice(0, 4)}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const path = `${parent.path || parent.id}/${nodeId}`;
    const depth = (parent.depth || 0) + 1;

    const created = await this.prisma.$transaction(async (tx) => {
      const node = await tx.organization.create({
        data: {
          id: nodeId,
          parentId: parent.id,
          companyId,
          type: dto.type,
          code: cleanCode,
          name: dto.name.trim(),
          path,
          depth,
          status: 'ACTIVE',
          currency: dto.currency || parent.currency || 'BDT',
          sector: dto.sector || parent.sector,
          metadata: {
            city: dto.city,
            headPerson: dto.headPerson,
            annualBudget: dto.annualBudget,
            ...(dto.metadata || {}),
          },
        },
      });

      // Maintain closure table
      const parentAncestors = await tx.organizationClosure.findMany({
        where: { descendantId: parent.id },
      });

      const closures = parentAncestors.map((anc) => ({
        ancestorId: anc.ancestorId,
        descendantId: node.id,
        depth: anc.depth + 1,
      }));

      closures.push({
        ancestorId: node.id,
        descendantId: node.id,
        depth: 0,
      });

      await tx.organizationClosure.createMany({
        data: closures,
        skipDuplicates: true,
      });

      return node;
    });

    await this.auditService.log({
      action: 'ORGANIZATION_NODE_CREATED',
      resource: 'organization',
      resourceId: created.id,
      newValue: {
        id: created.id,
        name: created.name,
        type: created.type,
        parentId: parent.id,
        companyId,
      },
      companyId,
      organizationId: created.id,
      ctx,
    });

    return created;
  }

  /**
   * Updates an organizational unit (department, plant, cost center).
   */
  async updateNode(id: string, dto: UpdateOrgNodeDto, ctx: RequestContext) {
    const node = await this.prisma.organization.findUnique({
      where: { id, deletedAt: null },
    });
    if (!node) {
      throw new NotFoundException(`Organization node with ID "${id}" not found.`);
    }

    const companyId = node.companyId || (node.type === 'LEGAL_ENTITY' ? node.id : undefined);
    if (companyId) {
      this.assertCompanyAccess(ctx, companyId, 'updateNode');
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        code: dto.code !== undefined ? dto.code.trim().toUpperCase() : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
        metadata: {
          ...(node.metadata as any || {}),
          city: dto.city !== undefined ? dto.city : (node.metadata as any)?.city,
          headPerson: dto.headPerson !== undefined ? dto.headPerson : (node.metadata as any)?.headPerson,
          annualBudget: dto.annualBudget !== undefined ? dto.annualBudget : (node.metadata as any)?.annualBudget,
          ...(dto.metadata || {}),
        },
      },
    });

    await this.auditService.log({
      action: 'ORGANIZATION_NODE_UPDATED',
      resource: 'organization',
      resourceId: id,
      oldValue: { name: node.name, code: node.code, status: node.status },
      newValue: { name: updated.name, code: updated.code, status: updated.status },
      companyId: companyId || undefined,
      organizationId: id,
      ctx,
    });

    return updated;
  }

  /**
   * Soft deletes / archives an organizational unit.
   */
  async archiveNode(id: string, ctx: RequestContext) {
    const node = await this.prisma.organization.findUnique({
      where: { id, deletedAt: null },
      include: {
        children: { where: { deletedAt: null } },
      },
    });
    if (!node) {
      throw new NotFoundException(`Organization node with ID "${id}" not found.`);
    }

    if (node.type === 'GROUP') {
      throw new BadRequestException('Cannot archive the group root organization.');
    }

    if (node.children.length > 0) {
      throw new BadRequestException(`Cannot archive "${node.name}" because it still has ${node.children.length} active child units.`);
    }

    const companyId = node.companyId || (node.type === 'LEGAL_ENTITY' ? node.id : undefined);
    if (companyId) {
      this.assertCompanyAccess(ctx, companyId, 'archiveNode');
    }

    const archived = await this.prisma.organization.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        deletedAt: new Date(),
      },
    });

    await this.auditService.log({
      action: 'ORGANIZATION_NODE_ARCHIVED',
      resource: 'organization',
      resourceId: id,
      companyId: companyId || undefined,
      organizationId: id,
      ctx,
    });

    return { success: true, message: `Organization unit "${node.name}" archived successfully.` };
  }
}
