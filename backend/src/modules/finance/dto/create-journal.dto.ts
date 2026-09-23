import { IsNotEmpty, IsString, IsArray, ValidateNested, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class JournalLineDto {
  @ApiProperty({ example: '1110', description: 'Account code' })
  @IsNotEmpty()
  @IsString()
  accountCode: string;

  @ApiProperty({ example: 50000, description: 'Debit amount' })
  @IsNumber()
  debit: number;

  @ApiProperty({ example: 0, description: 'Credit amount' })
  @IsNumber()
  credit: number;

  @ApiProperty({ example: 'Cost center ID', required: false })
  @IsOptional()
  @IsString()
  costCenterId?: string;

  @ApiProperty({ example: 'Cash deposit from sales', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateJournalDto {
  @ApiProperty({ example: 'c-foods', description: 'Company ID' })
  @IsNotEmpty()
  @IsString()
  companyId: string;

  @ApiProperty({ example: 'REF-2026-001', required: false })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ example: 'Daily Cash Revenue Posting', required: false })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiProperty({ type: [JournalLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}
