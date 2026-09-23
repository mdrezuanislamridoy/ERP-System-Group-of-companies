import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';

@Module({
  imports: [JwtModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
