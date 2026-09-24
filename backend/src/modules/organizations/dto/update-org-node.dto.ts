import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrgNodeDto {
  @ApiProperty({ example: 'Savar Processing Plant Modernized', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'PLANT-SAVAR-01', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 'ACTIVE', required: false })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  status?: string;

  @ApiProperty({ example: 'Dhaka', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Engr. M. Haque', required: false })
  @IsOptional()
  @IsString()
  headPerson?: string;

  @ApiProperty({ example: 50000000, required: false })
  @IsOptional()
  @IsNumber()
  annualBudget?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}
