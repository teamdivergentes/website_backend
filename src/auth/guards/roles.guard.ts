import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface UserWithRole {
  id: number;
  email: string;
  role: { name: string };
}

interface RequestWithUser {
  user?: UserWithRole;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Acces refuse - Role requis');
    }

    const hasRole = requiredRoles.some((role) => user.role.name === role);

    if (!hasRole) {
      throw new ForbiddenException('Acces refuse - Permissions insuffisantes');
    }

    return true;
  }
}
