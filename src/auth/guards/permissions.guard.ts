import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

interface RoleWithPermissions {
  name: string;
  permissions: string[];
}

interface UserWithRole {
  id: number;
  email: string;
  role: RoleWithPermissions;
}

interface RequestWithUser {
  user?: UserWithRole;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user?.role) {
      throw new ForbiddenException('Acces refuse - Role requis');
    }

    if (!Array.isArray(user.role.permissions)) {
      throw new ForbiddenException('Acces refuse - Permissions invalides');
    }

    const hasPermission = requiredPermissions.every((permission) =>
      user.role.permissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Acces refuse - Permissions insuffisantes');
    }

    return true;
  }
}
