import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'EMP-10001',
    description: 'Employee ID (or corporate email/login ID)',
  })
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @ApiProperty({
    example: 'password123',
    description: 'User account password',
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({ required: false, description: 'Alias for employeeId' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class SwitchContextDto {
  @ApiProperty({ example: 'c-foods', description: 'Target Company ID or Organization ID to switch context into' })
  @IsNotEmpty()
  @IsString()
  organizationId: string;
}
