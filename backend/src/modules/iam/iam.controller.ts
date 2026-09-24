import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { IamService } from './iam.service';
import { CreateEmployeeUserDto } from './dto/create-employee-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Identity & Access Management (IAM)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/iam')
export class IamController {
  constructor(private readonly iamService: IamService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all directory users with assignments and masked sensitive attributes' })
  @RequirePermissions('iam.users.read')
  async getUsers(@Req() req: Request) {
    return this.iamService.getUsers(req.context!);
  }

  @Post('users')
  @ApiOperation({
    summary: 'Provision new employee and user account with role, department, and salary (Admin / HR only)',
  })
  @RequirePermissions('iam.users.create')
  async createUser(@Body() dto: CreateEmployeeUserDto, @Req() req: Request) {
    return this.iamService.createEmployeeUser(dto, req.context!);
  }

  @Get('roles')
  @ApiOperation({ summary: 'List roles and permission mappings' })
  @RequirePermissions('iam.roles.read')
  async getRoles() {
    return this.iamService.getRoles();
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List global permission vocabulary' })
  @RequirePermissions('org.read')
  async getPermissions() {
    return this.iamService.getPermissions();
  }
}
