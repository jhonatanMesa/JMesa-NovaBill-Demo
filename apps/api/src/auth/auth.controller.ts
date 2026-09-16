import { Inject, Body, Controller, Get, Post, Req, Res, UseGuards, Module } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthGuard, AuthRequest, clearCookies, setCookies } from '../security';
import { LoginDto, RecoveryDto, RegisterDto } from '../dto';
import { AuthService } from './auth.service';
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly service: AuthService) {}
  @Post('register')
  @ApiOperation({ summary: 'Registrar empresa ficticia y su administrador' })
  @ApiResponse({ status: 201, description: 'Usuario público; sesión en cookies HttpOnly' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const s = await this.service.register(dto);
    setCookies(res, s.access, s.refresh);
    return s.user;
  }
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión; JWT 15 min y refresh 7 días' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const s = await this.service.login(dto);
    setCookies(res, s.access, s.refresh);
    return s.user;
  }
  @Post('refresh')
  @ApiOperation({ summary: 'Rotar el refresh token de un solo uso' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const s = await this.service.refresh(req.cookies?.nb_refresh);
    setCookies(res, s.access, s.refresh);
    return s.user;
  }
  @Post('logout')
  @ApiOperation({ summary: 'Revocar todas las sesiones del usuario actual' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.service.logout(req.cookies?.nb_refresh);
    clearCookies(res);
    return result;
  }
  @Post('recovery')
  @ApiOperation({ summary: 'Recuperación simulada; no envía email ni cambia credenciales' })
  recovery(@Body() dto: RecoveryDto) {
    return this.service.recovery(dto.email);
  }
  @Get('profile')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Perfil de la sesión autenticada' })
  profile(@Req() req: AuthRequest) {
    return req.actor;
  }
}
@Module({ controllers: [AuthController], providers: [AuthService] })
export class AuthModule {}
