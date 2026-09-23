import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stock')
  @ApiOperation({ summary: 'Get scoped warehouse stock items and valuation' })
  @RequirePermissions('inventory.stock.read')
  async getStock(@Req() req: Request) {
    return this.inventoryService.getStockItems(req.context!);
  }

  @Get('ledger/:itemId')
  @ApiOperation({ summary: 'Get append-only movements for specific stock item' })
  @RequirePermissions('inventory.stock.read')
  async getLedger(@Param('itemId') itemId: string, @Req() req: Request) {
    return this.inventoryService.getStockLedger(itemId, req.context!);
  }
}
