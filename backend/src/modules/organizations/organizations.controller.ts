import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Get('tree')
  @ApiOperation({ summary: 'Get full organizational hierarchy tree (Group -> Companies -> Plants/Branches -> Depts)' })
  @RequirePermissions('org.read')
  async getTree() {
    return this.orgService.getHierarchyTree();
  }

  @Get('companies')
  @ApiOperation({ summary: 'Get list of all legal entities / sister concerns' })
  @RequirePermissions('org.read')
  async getCompanies() {
    return this.orgService.getCompanies();
  }

  @Get('nodes')
  @ApiOperation({ summary: 'Get nodes filtered by caller active organizational scope' })
  @RequirePermissions('org.read')
  async getScopedNodes(@Req() req: Request) {
    return this.orgService.getScopedNodes(req.context!);
  }

  @Get('nodes/:id')
  @ApiOperation({ summary: 'Get specific organization node details' })
  @RequirePermissions('org.read')
  async getNodeById(@Param('id') id: string) {
    return this.orgService.getNodeById(id);
  }
}
