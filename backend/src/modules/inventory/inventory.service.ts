import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScopedRepository } from '../../common/repositories/scoped.repository';
import { RequestContext } from '../../common/interfaces/request-context.interface';

@Injectable()
export class InventoryService extends ScopedRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getStockItems(ctx: RequestContext) {
    const filter = this.buildScopeFilter(ctx, 'companyId');

    return this.prisma.stockItem.findMany({
      where: filter,
      orderBy: { product: 'asc' },
    });
  }

  async getStockLedger(itemId: string, ctx: RequestContext) {
    const filter = this.buildScopeFilter(ctx, 'companyId');

    return this.prisma.stockLedger.findMany({
      where: {
        AND: [filter, { itemId }],
      },
      orderBy: { postedAt: 'desc' },
    });
  }
}
