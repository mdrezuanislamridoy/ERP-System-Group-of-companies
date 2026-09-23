import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ProcurementService } from './procurement.service';
import { CreatePurchaseRequestDto } from './dto/create-pr.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/procurement')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Get('requests')
  @ApiOperation({ summary: 'Get scoped purchase requests' })
  @RequirePermissions('org.read')
  async getPurchaseRequests(@Req() req: Request) {
    return this.procurementService.getPurchaseRequests(req.context!);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Create purchase request with automated approval workflow' })
  @RequirePermissions('procurement.pr.create')
  async createPurchaseRequest(@Body() dto: CreatePurchaseRequestDto, @Req() req: Request) {
    return this.procurementService.createPurchaseRequest(dto, req.context!);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get scoped purchase orders' })
  @RequirePermissions('org.read')
  async getPurchaseOrders(@Req() req: Request) {
    return this.procurementService.getPurchaseOrders(req.context!);
  }

  @Get('suppliers')
  @ApiOperation({ summary: 'Get list of registered suppliers' })
  async getSuppliers() {
    return this.procurementService.getSuppliers();
  }
}
