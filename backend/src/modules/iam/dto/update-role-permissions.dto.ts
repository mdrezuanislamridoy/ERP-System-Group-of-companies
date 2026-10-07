import { ArrayUnique, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    example: ['org.read', 'finance.gl.read', 'hr.payroll.read'],
    description: 'Full replacement set of permission keys this role should hold',
    type: [String],
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionKeys: string[];
}
