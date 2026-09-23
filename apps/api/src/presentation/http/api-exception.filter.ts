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
  UnsupportedTemplateDimensionsError,
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
    if (error instanceof RequestValidationError) {
      status = 400;
      code = 'VALIDATION_ERROR';
      message = error.message;
      details = error.details;
    } else if (
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
      error instanceof InvalidEntityIdError ||
      error instanceof InvalidPaginationError ||
      error instanceof InvalidMoneyAmountError ||
      error instanceof UnsupportedCurrencyError ||
      error instanceof InvalidProductError ||
      error instanceof InvalidTemplateNameError ||
      error instanceof InvalidTemplateDimensionsError ||
      error instanceof UnsupportedTemplateDimensionsError
    ) {
      status = 400;
      code = 'INVALID_INPUT';
      message = error.message;
    } else if (
      error instanceof PersistenceConflictError ||
      error instanceof PersistenceReferenceError
    ) {
      status = 409;
    } else if (error instanceof HttpException) {
      status = error.getStatus();
    } else if (error instanceof Error && 'type' in error) {
      if (error.type === 'entity.parse.failed') status = 400;
      if (error.type === 'entity.too.large') status = 413;
    }
    const fallback = httpErrors[status] ?? httpErrors[500]!;
    if (status >= 500)
      this.logger.error({ event: 'http_error', requestId: req.requestId, code: fallback.code });
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
