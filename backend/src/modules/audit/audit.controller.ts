import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Retrieve scoped audit trail logs' })
  @RequirePermissions('audit.logs.read')
  async getLogs(@Req() req: Request, @Query('limit') limit?: string) {
    const lim = limit ? parseInt(limit, 10) : 50;
    return this.auditService.getLogs(req.context!, lim);
  }

  @Get('verify')
  @ApiOperation({ summary: 'Verify cryptographic integrity of audit log hash chain' })
  @RequirePermissions('audit.logs.read')
  async verifyChain(@Req() req: Request) {
    const companyId = req.context?.scope?.activeCompanyId || undefined;
    return this.auditService.verifyChain(companyId);
  }
}
