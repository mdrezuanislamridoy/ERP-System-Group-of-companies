import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ApiResponse<T> {
  data: T;
  page?: {
    cursor?: string;
    hasMore?: boolean;
    limit?: number;
    total?: number;
  };
  meta: {
    asOf: string;
    correlationId?: string;
    scope?: string;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const req = context.switchToHttp().getRequest<Request>();
    const correlationId = req.context?.correlationId || (req.headers['x-correlation-id'] as string);
    const activeScope = req.context?.scope?.activeCompanyId || 'Group Scope';

    return next.handle().pipe(
      map((res) => {
        // If already formatted with data and meta, pass through
        if (res && typeof res === 'object' && 'data' in res && 'meta' in res) {
          return res;
        }

        // If returned object contains items and pagination metadata
        if (res && typeof res === 'object' && 'items' in res && 'page' in res) {
          return {
            data: res.items,
            page: res.page,
            meta: {
              asOf: new Date().toISOString(),
              correlationId,
              scope: activeScope,
            },
          };
        }

        return {
          data: res,
          meta: {
            asOf: new Date().toISOString(),
            correlationId,
            scope: activeScope,
          },
        };
      }),
    );
  }
}
