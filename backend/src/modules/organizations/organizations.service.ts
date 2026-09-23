import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScopedRepository } from '../../common/repositories/scoped.repository';
import { RequestContext } from '../../common/interfaces/request-context.interface';

@Injectable()
export class OrganizationsService extends ScopedRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * Returns full multi-level tree structure of the group.
   */
  async getHierarchyTree() {
    const root = await this.prisma.organization.findFirst({
      where: { parentId: null },
      include: {
        children: {
          include: {
            modules: true,
            children: {
              include: {
                children: true,
              },
            },
          },
        },
      },
    });

    return root;
  }

  /**
   * Returns sister concerns with activated modules and financial metrics.
   */
  async getCompanies() {
    return this.prisma.organization.findMany({
      where: { type: 'LEGAL_ENTITY' },
      include: {
        modules: true,
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
      where: filter,
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
        children: true,
        modules: true,
        parent: true,
      },
    });

    if (!node) throw new NotFoundException(`Organization node with ID ${id} not found`);
    return node;
  }
}
