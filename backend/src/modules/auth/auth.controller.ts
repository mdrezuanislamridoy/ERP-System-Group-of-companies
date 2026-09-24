import { Controller, Post, Body, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, SwitchContextDto } from './dto/auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Sign in to Okobiz Enterprise ERP with brute-force protection' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const identifier = dto.employeeId || dto.userId;
    return this.authService.login(identifier, dto.password, req.context);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.rotateRefreshToken(dto.refreshToken, req.context);
  }

  @Post('switch-context')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Switch active company or organization context' })
  async switchContext(@Body() dto: SwitchContextDto, @Req() req: Request) {
    return this.authService.switchContext(req.context!.user!.id, dto.organizationId, req.context);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sign out and revoke active session' })
  async logout(@Req() req: Request) {
    const sessionId = (req.context as any)?.sessionId;
    return this.authService.logout(sessionId, req.context);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all active login sessions and devices' })
  async getSessions(@Req() req: Request) {
    return this.authService.getSessions(req.context!.user!.id);
  }

  @Post('sessions/:sessionId/revoke')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke a specific device session' })
  async revokeSession(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.authService.revokeSession(req.context!.user!.id, sessionId);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile, active scope, and granted permissions' })
  async getMe(@Req() req: Request) {
    return this.authService.getMe(req.context!);
  }
}
