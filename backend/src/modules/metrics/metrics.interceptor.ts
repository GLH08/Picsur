import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service.js';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // 排除 /metrics 端点自身
    if (url === '/metrics') {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          const duration = Date.now() - startTime;

          // 简化路由（移除动态参数）
          const route = this.simplifyRoute(url);

          this.metricsService.recordHttpRequest(
            method,
            route,
            statusCode,
            duration,
          );
        },
        error: (error) => {
          const response = context.switchToHttp().getResponse();
          const statusCode = error.status || 500;
          const duration = Date.now() - startTime;

          const route = this.simplifyRoute(url);

          this.metricsService.recordHttpRequest(
            method,
            route,
            statusCode,
            duration,
          );
        },
      }),
    );
  }

  /**
   * 简化路由，移除动态参数
   * 例如：/api/image/abc-123 -> /api/image/:id
   */
  private simplifyRoute(url: string): string {
    // 移除查询参数
    const path = url.split('?')[0];

    // 简化 UUID 格式的路径参数
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    let simplified = path.replace(uuidPattern, ':id');

    // 简化日期格式的路径参数
    const datePattern = /\d{8}/g;
    simplified = simplified.replace(datePattern, ':date');

    return simplified;
  }
}
