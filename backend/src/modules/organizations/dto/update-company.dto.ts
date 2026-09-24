import { IsOptional, IsString, IsNumber, IsIn, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCompanyDto {
  @ApiProperty({ example: 'Okobiz Pharma Ltd', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'OKO-PHARM', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 'Healthcare & Biotech', required: false })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiProperty({ example: 'USD', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'ACTIVE', required: false })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  status?: string;

  @ApiProperty({ example: 'Okobiz Pharmaceuticals Group PLC', required: false })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiProperty({ example: 'TAX-99887766', required: false })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({ example: 'BIN-1122334455', required: false })
  @IsOptional()
  @IsString()
  binNumber?: string;

  @ApiProperty({ example: 2026, required: false })
  @IsOptional()
  @IsNumber()
  incorporatedYear?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
