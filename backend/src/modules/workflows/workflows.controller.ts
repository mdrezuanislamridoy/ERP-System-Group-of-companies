import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { WorkflowsService } from './workflows.service';
import { WorkflowActionDto } from './dto/workflow-action.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Approvals & Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/approvals')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get('inbox')
  @ApiOperation({ summary: 'Get unified approval inbox for authenticated user' })
  async getInbox(@Req() req: Request) {
    return this.workflowsService.getInbox(req.context!);
  }

  @Post('tasks/:taskId/action')
  @ApiOperation({ summary: 'Approve or reject a workflow task' })
  async actionTask(
    @Param('taskId') taskId: string,
    @Body() dto: WorkflowActionDto,
    @Req() req: Request,
  ) {
    return this.workflowsService.actionTask(taskId, dto.action, dto.comments, req.context!);
  }
}
