import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  MinLength,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeUserDto {
  @ApiProperty({ example: 'EMP-10025', description: 'Official corporate employee ID / badge number' })
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @ApiProperty({ example: 'Tariq', description: 'First name' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Mahmud', description: 'Last name' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'tariq.mahmud@okobiz-foods.com', description: 'Official corporate email' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+880-1712-334455', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'NID-9928318821', required: false })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiProperty({ example: 'TIN-445566778', required: false })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({ example: 'c-foods', description: 'Company ID (Legal Entity)' })
  @IsNotEmpty()
  @IsString()
  companyId: string;

  @ApiProperty({ example: 'dept-fin-foods', description: 'Department or Branch organization node ID' })
  @IsNotEmpty()
  @IsString()
  organizationId: string;

  @ApiProperty({ example: 'procurement-officer', description: 'Role key to assign (e.g. employee, procurement-officer, department-manager)' })
  @IsNotEmpty()
  @IsString()
  roleKey: string;

  @ApiProperty({ example: 'Senior Accounts Officer', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 125000, description: 'Base monthly compensation (BDT)', required: false })
  @IsOptional()
  @IsNumber()
  baseSalary?: number;

  @ApiProperty({ example: 'Standard Chartered Bank', required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ example: '01-9988776-01', required: false })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiProperty({ example: 'SecureP@ss2026!', description: 'Initial account password (min 8 chars)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  initialPassword: string;

  @ApiProperty({ example: 'SUBTREE', enum: ['SELF', 'NODE', 'SUBTREE', 'CROSS'], required: false })
  @IsOptional()
  @IsIn(['SELF', 'NODE', 'SUBTREE', 'CROSS'])
  scopeMode?: 'SELF' | 'NODE' | 'SUBTREE' | 'CROSS';
}
