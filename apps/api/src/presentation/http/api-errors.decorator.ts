import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { ErrorResponse } from './error-response.dto.js';

export function ApiErrors() {
  return applyDecorators(
    ApiBadRequestResponse({ type: ErrorResponse }),
    ApiNotFoundResponse({ type: ErrorResponse }),
    ApiConflictResponse({ type: ErrorResponse }),
    ApiServiceUnavailableResponse({ type: ErrorResponse }),
    ApiInternalServerErrorResponse({ type: ErrorResponse }),
  );
}
