import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WorkflowActionDto {
  @ApiProperty({ example: 'APPROVE', enum: ['APPROVE', 'REJECT'] })
  @IsNotEmpty()
  @IsIn(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @ApiProperty({ example: 'Reviewed and approved for bulk purchasing.', required: false })
  @IsOptional()
  @IsString()
  comments?: string;
}
