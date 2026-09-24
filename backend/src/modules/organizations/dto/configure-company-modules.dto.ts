import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ModuleConfigItemDto {
  @ApiProperty({ example: 'manufacturing' })
  @IsNotEmpty()
  @IsString()
  moduleKey: string;

  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'INACTIVE'] })
  @IsNotEmpty()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status: 'ACTIVE' | 'INACTIVE';

  @ApiProperty({ required: false })
  @IsOptional()
  settings?: Record<string, any>;
}

export class ConfigureCompanyModulesDto {
  @ApiProperty({ type: [ModuleConfigItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleConfigItemDto)
  modules: ModuleConfigItemDto[];
}
