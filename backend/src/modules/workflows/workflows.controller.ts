import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { WorkflowsService } from './workflows.service';
import { WorkflowActionDto } from './dto/workflow-action.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Approvals & Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/approvals')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get('inbox')
  @ApiOperation({ summary: 'Get unified approval inbox for authenticated user' })
  @RequirePermissions('workflow.approvals.read')
  async getInbox(@Req() req: Request) {
    return this.workflowsService.getInbox(req.context!);
  }

  @Post('tasks/:taskId/action')
  @ApiOperation({ summary: 'Approve or reject a workflow task' })
  @RequirePermissions('workflow.approvals.action')
  async actionTask(
    @Param('taskId') taskId: string,
    @Body() dto: WorkflowActionDto,
    @Req() req: Request,
  ) {
    return this.workflowsService.actionTask(taskId, dto.action, dto.comments, req.context!);
  }
}
