import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertSalaryStructureDto {
  @ApiProperty({ example: 60000, description: 'Basic salary component' })
  @IsNumber()
  @Min(0)
  basic: number;

  @ApiProperty({ example: 25000, description: 'House rent allowance' })
  @IsNumber()
  @Min(0)
  houseRent: number;

  @ApiProperty({ example: 8000, description: 'Medical allowance' })
  @IsNumber()
  @Min(0)
  medical: number;

  @ApiProperty({ example: 5000, description: 'Conveyance allowance' })
  @IsNumber()
  @Min(0)
  conveyance: number;

  @ApiProperty({ example: 2000, description: 'Other/misc allowance' })
  @IsNumber()
  @Min(0)
  other: number;
}
