import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ConfigureCompanyModulesDto } from './dto/configure-company-modules.dto';
import { CreateOrgNodeDto } from './dto/create-org-node.dto';
import { UpdateOrgNodeDto } from './dto/update-org-node.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  // ─── READ QUERIES ──────────────────────────────────────────────────────────

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

  // ─── COMPANY (LEGAL ENTITY) MANAGEMENT ─────────────────────────────────────

  @Post('companies')
  @ApiOperation({ summary: 'Create new sister concern / legal entity under holding group' })
  @ApiResponse({ status: 201, description: 'Sister concern successfully registered' })
  @RequirePermissions('company.manage')
  async createCompany(@Body() dto: CreateCompanyDto, @Req() req: Request) {
    return this.orgService.createCompany(dto, req.context!);
  }

  @Patch('companies/:id')
  @ApiOperation({ summary: 'Update sister concern profile, sector, status or tax details' })
  @RequirePermissions('company.manage')
  async updateCompany(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @Req() req: Request,
  ) {
    return this.orgService.updateCompany(id, dto, req.context!);
  }

  @Put('companies/:id/modules')
  @ApiOperation({ summary: 'Configure enabled modules and feature gates for a sister concern' })
  @RequirePermissions('company.manage')
  async configureCompanyModules(
    @Param('id') id: string,
    @Body() dto: ConfigureCompanyModulesDto,
    @Req() req: Request,
  ) {
    return this.orgService.configureCompanyModules(id, dto, req.context!);
  }

  // ─── ORGANIZATIONAL UNIT MANAGEMENT ────────────────────────────────────────

  @Post('nodes')
  @ApiOperation({ summary: 'Create new child unit (Business Unit, Branch/Plant, Department, Cost Center)' })
  @RequirePermissions('org.write')
  async createNode(@Body() dto: CreateOrgNodeDto, @Req() req: Request) {
    return this.orgService.createNode(dto, req.context!);
  }

  @Patch('nodes/:id')
  @ApiOperation({ summary: 'Update organizational unit details' })
  @RequirePermissions('org.write')
  async updateNode(
    @Param('id') id: string,
    @Body() dto: UpdateOrgNodeDto,
    @Req() req: Request,
  ) {
    return this.orgService.updateNode(id, dto, req.context!);
  }

  @Delete('nodes/:id')
  @ApiOperation({ summary: 'Archive / soft-delete an organizational unit' })
  @RequirePermissions('org.write')
  async archiveNode(@Param('id') id: string, @Req() req: Request) {
    return this.orgService.archiveNode(id, req.context!);
  }
}
