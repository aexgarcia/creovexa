import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { LoggerService } from '@nestjs/common';
import type { Response, NextFunction } from 'express';
import type { HttpRequest } from './request-context.js';

export const HTTP_LOGGER = Symbol('HTTP_LOGGER');
export function requestLogging(logger: LoggerService) {
  return (req: HttpRequest, res: Response, next: NextFunction): void => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    const start = performance.now();
    res.once('finish', () => {
      const route: unknown = req.route;
      const path =
        typeof route === 'object' &&
        route !== null &&
        'path' in route &&
        typeof route.path === 'string'
          ? route.path
          : 'unmatched';
      logger.log({
        event: 'http_request',
        requestId: req.requestId,
        method: req.method,
        route: path,
        statusCode: res.statusCode,
        durationMs: Math.round(performance.now() - start),
        ...(req.organizationId ? { organizationId: req.organizationId } : {}),
      });
    });
    next();
  };
}
