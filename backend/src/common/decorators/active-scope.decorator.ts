import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const ActiveScope = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const scope = request.context?.scope;
    return data && scope ? scope[data] : scope;
  },
);
