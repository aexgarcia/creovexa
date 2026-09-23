import {
  createParamDecorator,
  Injectable,
  Inject,
  ServiceUnavailableException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { EntityId } from '#app/domain/entity-id';
import { CATALOG_HTTP_CONFIG, type CatalogHttpConfig } from '#app/config/catalog-http.config';

export interface HttpRequest extends Request {
  requestId?: string;
  organizationId?: EntityId;
}

@Injectable()
export class DevelopmentOrganizationGuard implements CanActivate {
  constructor(@Inject(CATALOG_HTTP_CONFIG) private readonly config: CatalogHttpConfig) {}
  canActivate(context: ExecutionContext): boolean {
    if (!this.config.organizationId) throw new ServiceUnavailableException();
    context.switchToHttp().getRequest<HttpRequest>().organizationId = this.config.organizationId;
    return true;
  }
}

export const OrganizationId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): EntityId => {
    const id = context.switchToHttp().getRequest<HttpRequest>().organizationId;
    if (!id) throw new ServiceUnavailableException();
    return id;
  },
);
