import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { FinanceService } from './finance.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('accounts')
  @ApiOperation({ summary: 'Get Chart of Accounts' })
  @RequirePermissions('finance.gl.read')
  async getAccounts(@Req() req: Request) {
    const companyId = req.context?.scope?.activeCompanyId || undefined;
    return this.financeService.getChartOfAccounts(companyId);
  }

  @Get('journals')
  @ApiOperation({ summary: 'Get scoped posted journal entries' })
  @RequirePermissions('finance.gl.read')
  async getJournals(@Req() req: Request) {
    return this.financeService.getJournalEntries(req.context!);
  }

  @Post('journals')
  @ApiOperation({ summary: 'Create and post balanced double-entry journal entry' })
  @RequirePermissions('finance.gl.post')
  async createJournal(@Body() dto: CreateJournalDto, @Req() req: Request) {
    return this.financeService.createJournalEntry(dto, req.context!);
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Generate calculated trial balance' })
  @RequirePermissions('finance.gl.read')
  async getTrialBalance(@Req() req: Request, @Query('companyId') companyIdQuery?: string) {
    const companyId = companyIdQuery || req.context?.scope?.activeCompanyId || 'c-foods';
    return this.financeService.getTrialBalance(companyId);
  }
}
