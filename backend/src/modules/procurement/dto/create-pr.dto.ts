import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePurchaseRequestDto {
  @ApiProperty({ example: 'c-foods', description: 'Company ID' })
  @IsNotEmpty()
  @IsString()
  companyId: string;

  @ApiProperty({ example: 'dept-proc-foods', required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ example: 'Procurement of Industrial Flour and Yeast', description: 'Title or description' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 450000, description: 'Total estimated amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'HIGH', required: false, enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] })
  @IsOptional()
  @IsString()
  priority?: string;
}
