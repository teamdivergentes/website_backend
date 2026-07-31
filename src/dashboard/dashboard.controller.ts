import { Controller, ForbiddenException, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { DashboardService, DraftSummary, TodoCounters } from './dashboard.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role?: { permissions?: string[] };
  };
}

/**
 * Donnees du dashboard admin.
 *
 * `JwtAuthGuard` est global (AppModule) : ces routes sont authentifiees. Elles
 * n'utilisent volontairement pas `PermissionsGuard` — chaque bloc se retire
 * tout seul quand la permission manque, plutot que de faire echouer l'ensemble
 * de la reponse pour un bloc inaccessible.
 */
@Controller('api/admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resume')
  getResume(@Req() req: AuthenticatedRequest): Promise<{ drafts: DraftSummary[] }> {
    const user = this.requireUser(req);
    return this.dashboardService.getResume(user.id, user.permissions);
  }

  @Get('todo')
  getTodo(@Req() req: AuthenticatedRequest): Promise<TodoCounters> {
    const user = this.requireUser(req);
    return this.dashboardService.getTodo(user.permissions);
  }

  /** Identite et permissions de l'appelant, telles que posees par la strategie JWT. */
  private requireUser(req: AuthenticatedRequest): { id: number; permissions: string[] } {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Acces refuse - Authentification requise');
    }
    return { id: user.id, permissions: user.role?.permissions ?? [] };
  }
}
