import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../users/entities/user.entity.js';

export const ROLES_KEY = 'roles';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token autentikasi tidak ditemukan');
    }
    try {
      const payload = await this.jwtService.verifyAsync(token);
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Token tidak valid atau telah kedaluwarsa');
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;
    const user = context.switchToHttp().getRequest().user;
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Peran Anda tidak diizinkan mengakses fitur ini. Silakan ganti peran di Setting.');
    }
    return true;
  }
}

