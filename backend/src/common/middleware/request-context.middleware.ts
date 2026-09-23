import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext } from '../interfaces/request-context.interface';

// Augment express Request
declare module 'express' {
  interface Request {
    context?: RequestContext;
  }
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    req.context = {
      correlationId,
      ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp.split(',')[0].trim(),
      userAgent,
    };

    next();
  }
}
