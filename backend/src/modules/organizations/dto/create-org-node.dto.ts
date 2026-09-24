import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrgType } from '@prisma/client';

export class CreateOrgNodeDto {
  @ApiProperty({ example: 'c-foods', description: 'Parent organization node ID' })
  @IsNotEmpty()
  @IsString()
  parentId: string;

  @ApiProperty({
    example: 'BRANCH_PLANT',
    enum: ['BUSINESS_UNIT', 'BRANCH_PLANT', 'DEPARTMENT', 'COST_CENTER', 'PROFIT_CENTER', 'WAREHOUSE', 'FACTORY'],
  })
  @IsNotEmpty()
  @IsIn([
    'BUSINESS_UNIT',
    'BRANCH_PLANT',
    'DEPARTMENT',
    'COST_CENTER',
    'PROFIT_CENTER',
    'WAREHOUSE',
    'FACTORY',
  ])
  type: OrgType;

  @ApiProperty({ example: 'PLANT-SAVAR-01' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 'Savar Processing Plant' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Dhaka', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Operating Plant', required: false })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiProperty({ example: 'Engr. M. Haque', required: false })
  @IsOptional()
  @IsString()
  headPerson?: string;

  @ApiProperty({ example: 45000000, required: false, description: 'Annual budget allocation for cost center' })
  @IsOptional()
  @IsNumber()
  annualBudget?: number;

  @ApiProperty({ example: 'BDT', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}
