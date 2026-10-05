import { IsInt, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RunPayrollDto {
  @ApiProperty({ example: 'c-foods', description: 'Company to run payroll for' })
  @IsString()
  companyId: string;

  @ApiProperty({ example: 9, minimum: 1, maximum: 12, description: 'Pay period month (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth: number;

  @ApiProperty({ example: 2026, description: 'Pay period fiscal year' })
  @IsInt()
  periodYear: number;
}
