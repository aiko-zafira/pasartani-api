import { applyDecorators, createParamDecorator, ExecutionContext, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Role } from '../../users/entities/user.entity.js';
import { JwtAuthGuard, RolesGuard, ROLES_KEY } from '../guards/auth.guards,.js';

export interface AuthUser {
  id: number;
  email: string;
  role: Role | null;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});

export function LoggedIn() {
  return applyDecorators(
    UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Token belum disertakan / tidak valid' }),
  );
}

export function RequireRoles(...roles: Role[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    SetMetadata(ROLES_KEY, roles),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Belum login' }),
    ApiForbiddenResponse({ description: 'Peran pengguna tidak sesuai' }),
  );
}