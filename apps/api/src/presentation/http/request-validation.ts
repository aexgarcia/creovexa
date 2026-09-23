import { BadRequestException, ValidationPipe, type Type } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export interface ValidationDetail {
  field: string;
  rules: string[];
}
export class RequestValidationError extends BadRequestException {
  constructor(readonly details: ValidationDetail[]) {
    super('La solicitud contiene campos inválidos.');
  }
}
function details(errors: ValidationError[], parent = ''): ValidationDetail[] {
  return errors.flatMap((error) => {
    const field = parent ? parent + '.' + error.property : error.property;
    return [
      ...(error.constraints ? [{ field, rules: Object.keys(error.constraints) }] : []),
      ...details(error.children ?? [], field),
    ];
  });
}

/** Explicit metatype keeps validation identical with TypeScript and the test transpiler. */
export function validateRequest(type: Type<unknown>): ValidationPipe {
  return new ValidationPipe({
    expectedType: type,
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
    exceptionFactory: (errors) => new RequestValidationError(details(errors)),
  });
}
