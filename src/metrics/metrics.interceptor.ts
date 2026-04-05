import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const end = this.metricsService.httpRequestDuration.startTimer();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = ctx.getResponse<Response>();
          const route = req.route?.path || req.path;
          const labels = {
            method: req.method,
            route,
            status_code: String(res.statusCode),
          };
          end(labels);
          this.metricsService.httpRequestsTotal.inc(labels);
        },
        error: () => {
          const res = ctx.getResponse<Response>();
          const route = req.route?.path || req.path;
          const labels = {
            method: req.method,
            route,
            status_code: String(res.statusCode || 500),
          };
          end(labels);
          this.metricsService.httpRequestsTotal.inc(labels);
        },
      }),
    );
  }
}
