import {
  CopyGenerationError,
  InvalidFlyerTextError,
} from '#app/modules/content-generation/application/ports/copy-generator';
import { CampaignImageError } from '#app/modules/campaigns/application/errors/campaign-image.error';
import { InvalidFlyerDesignError } from '#app/domain/value-objects/flyer-design';
import { ProductImageError } from '#app/modules/products/application/errors/product-image.error';
import { TemplateStyleReferenceError } from '#app/modules/templates/application/errors/template-style-reference.error';
import { OrganizationLogoError } from '#app/modules/organizations/application/errors/organization-logo.error';
import { StaleGenerationResultError } from '#app/modules/campaigns/domain/errors/campaign.errors';
import { PublicationNotFoundError } from '#app/modules/publications/application/publication-history-reader';
import { TemplateRevisionConflictError } from '#app/modules/templates/domain/errors/template.errors';
import {
  OrganizationNotFoundError,
  InvalidOrganizationProfileError,
  OrganizationProfileConflictError,
} from '#app/modules/organizations/domain/errors/organization.errors';
import {
  Catch,
  HttpException,
  Inject,
  type ArgumentsHost,
  type ExceptionFilter,
  type LoggerService,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvalidEntityIdError } from '#app/domain/entity-id';
import { InvalidPaginationError } from '#app/domain/pagination';
import { InvalidMoneyAmountError, UnsupportedCurrencyError } from '#app/domain/value-objects/money';
import {
  InvalidProductError,
  ProductNotFoundError,
} from '#app/modules/products/domain/errors/product.errors';
import {
  TemplateNotFoundError,
  InvalidTemplateNameError,
  InvalidTemplateDimensionsError,
} from '#app/modules/templates/domain/errors/template.errors';
import { ProductOrganizationNotFoundError } from '#app/modules/products/application/errors/product-organization-not-found.error';
import { TemplateOrganizationNotFoundError } from '#app/modules/templates/application/errors/template-organization-not-found.error';
import {
  PersistenceConflictError,
  PersistenceReferenceError,
} from '#app/infrastructure/persistence/persistence.errors';
import { RequestValidationError, type ValidationDetail } from './request-validation.js';
import { HTTP_LOGGER } from './http-logging.js';
import type { HttpRequest } from './request-context.js';
import {
  CampaignNotFoundError,
  InvalidCampaignTransitionError,
  ContentRevisionMismatchError,
  ConcurrentCampaignModificationError,
  InvalidCampaignError,
  InvalidPromotionError,
  PromotionExpiredError,
} from '#app/modules/campaigns/domain/errors/campaign.errors';
import { CampaignResourceNotFoundError } from '#app/modules/campaigns/application/errors/campaign-resource-not-found.error';

const httpErrors: Record<number, { code: string; message: string }> = {
  400: { code: 'INVALID_REQUEST', message: 'La solicitud no es válida.' },
  404: { code: 'NOT_FOUND', message: 'No se encontró el recurso.' },
  409: { code: 'CONFLICT', message: 'La escritura entra en conflicto con otro registro.' },
  413: { code: 'PAYLOAD_TOO_LARGE', message: 'La solicitud supera el tamaño permitido.' },
  415: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'El tipo de contenido no está soportado.' },
  503: {
    code: 'CATALOG_UNAVAILABLE',
    message: 'La API de catálogo no está habilitada en este entorno.',
  },
  500: { code: 'INTERNAL_ERROR', message: 'No se pudo completar la solicitud.' },
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(@Inject(HTTP_LOGGER) private readonly logger: LoggerService) {}
  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const req = context.getRequest<HttpRequest>();
    const res = context.getResponse<Response>();
    let status = 500;
    let code: string | undefined;
    let message: string | undefined;
    let details: ValidationDetail[] | undefined;
    if (error instanceof TemplateStyleReferenceError) {
      status = { INVALID_IMAGE: 400, TOO_LARGE: 413, NOT_FOUND: 404, LIMIT: 409, UNAVAILABLE: 503 }[
        error.code
      ];
      code = 'TEMPLATE_STYLE_REFERENCE_' + error.code;
      message = error.message;
    } else if (error instanceof ProductImageError || error instanceof OrganizationLogoError) {
      status =
        error.code === 'INVALID_IMAGE'
          ? 400
          : error.code === 'TOO_LARGE'
            ? 413
            : error.code === 'CONFLICT'
              ? 409
              : error.code === 'NOT_FOUND'
                ? 404
                : 503;
      code =
        (error instanceof ProductImageError ? 'PRODUCT_IMAGE_' : 'ORGANIZATION_LOGO_') + error.code;
      message = error.message;
    } else if (error instanceof CampaignImageError) {
      status =
        error.code === 'NOT_FOUND'
          ? 404
          : [
                'COPY_REQUIRED',
                'PRODUCT_IMAGE_REQUIRED',
                'FINAL_ASSET_REQUIRED',
                'BUSY',
                'STALE_RESULT',
              ].includes(error.code)
            ? 409
            : error.code === 'UNSUPPORTED_DIMENSIONS'
              ? 400
              : error.code === 'TIMEOUT'
                ? 504
                : ['UNAVAILABLE', 'LOGO_UNAVAILABLE'].includes(error.code)
                  ? 503
                  : error.code === 'RATE_LIMITED'
                    ? 429
                    : 502;
      code = 'IMAGE_' + error.code;
      message = error.message;
    } else if (error instanceof CopyGenerationError) {
      status =
        error.code === 'BUSY'
          ? 409
          : error.code === 'TIMEOUT'
            ? 504
            : error.code === 'UNAVAILABLE'
              ? 503
              : 502;
      code = 'COPY_' + error.code;
      message = error.message;
    } else if (error instanceof StaleGenerationResultError) {
      status = 409;
      code = 'STALE_GENERATION';
      message = error.message;
    } else if (error instanceof RequestValidationError) {
      status = 400;
      code = 'VALIDATION_ERROR';
      message = error.message;
      details = error.details;
    } else if (
      error instanceof PublicationNotFoundError ||
      error instanceof CampaignNotFoundError ||
      error instanceof CampaignResourceNotFoundError
    ) {
      status = 404;
      code =
        error instanceof PublicationNotFoundError
          ? 'PUBLICATION_NOT_FOUND'
          : error instanceof CampaignNotFoundError
            ? 'CAMPAIGN_NOT_FOUND'
            : 'CAMPAIGN_RESOURCE_NOT_FOUND';
      message = error.message;
    } else if (
      error instanceof OrganizationNotFoundError ||
      error instanceof ProductNotFoundError ||
      error instanceof TemplateNotFoundError ||
      error instanceof ProductOrganizationNotFoundError ||
      error instanceof TemplateOrganizationNotFoundError
    ) {
      status = 404;
      code =
        error instanceof ProductNotFoundError
          ? 'PRODUCT_NOT_FOUND'
          : error instanceof TemplateNotFoundError
            ? 'TEMPLATE_NOT_FOUND'
            : 'ORGANIZATION_NOT_FOUND';
      message = error.message;
    } else if (
      error instanceof InvalidOrganizationProfileError ||
      error instanceof InvalidFlyerTextError ||
      error instanceof InvalidFlyerDesignError ||
      error instanceof InvalidEntityIdError ||
      error instanceof InvalidCampaignError ||
      error instanceof InvalidPromotionError ||
      error instanceof PromotionExpiredError ||
      error instanceof InvalidPaginationError ||
      error instanceof InvalidMoneyAmountError ||
      error instanceof UnsupportedCurrencyError ||
      error instanceof InvalidProductError ||
      error instanceof InvalidTemplateNameError ||
      error instanceof InvalidTemplateDimensionsError
    ) {
      status = 400;
      code = 'INVALID_INPUT';
      message = error.message;
    } else if (
      error instanceof InvalidCampaignTransitionError ||
      error instanceof ContentRevisionMismatchError ||
      error instanceof ConcurrentCampaignModificationError ||
      error instanceof TemplateRevisionConflictError ||
      error instanceof OrganizationProfileConflictError ||
      error instanceof PersistenceConflictError ||
      error instanceof PersistenceReferenceError
    ) {
      status = 409;
      if (error instanceof InvalidCampaignTransitionError) code = 'INVALID_CAMPAIGN_STATE';
      if (error instanceof ContentRevisionMismatchError) code = 'CONTENT_REVISION_MISMATCH';
      if (error instanceof ConcurrentCampaignModificationError) code = 'CAMPAIGN_CONFLICT';
    } else if (error instanceof HttpException) {
      status = error.getStatus();
    } else if (error instanceof Error && 'type' in error) {
      if (error.type === 'entity.parse.failed') status = 400;
      if (error.type === 'entity.too.large') status = 413;
    }
    const fallback = httpErrors[status] ?? httpErrors[500]!;
    if (status >= 500)
      this.logger.error({
        event: 'http_error',
        requestId: req.requestId,
        code: code ?? fallback.code,
      });
    res.status(status).json({
      error: {
        code: code ?? fallback.code,
        message: message ?? fallback.message,
        ...(details ? { details } : {}),
      },
      requestId: req.requestId,
    });
  }
}
