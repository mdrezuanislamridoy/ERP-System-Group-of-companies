import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Okobiz Pharma Ltd', description: 'Trade name of the legal entity' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'OKO-PHARM', description: 'Unique enterprise alphanumeric company code' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 'Healthcare & Pharma', required: false })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiProperty({ example: 'BDT', default: 'BDT', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

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

  @ApiProperty({ example: 'ACTIVE', default: 'ACTIVE', required: false })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  status?: string;

  @ApiProperty({
    example: ['FINANCE', 'HR', 'PROCUREMENT', 'INVENTORY', 'WORKFLOW'],
    description: 'Initial modules to enable for this sister concern',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];
}
