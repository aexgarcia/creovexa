export class InvalidTimestampError extends Error {
  constructor() {
    super('La fecha debe ser válida y no puede ser anterior a la última modificación.');
    this.name = 'InvalidTimestampError';
  }
}

export function timestamp(value: Date, previous?: number): number {
  const result = value instanceof Date ? value.getTime() : NaN;
  if (!Number.isFinite(result) || (previous !== undefined && result < previous)) {
    throw new InvalidTimestampError();
  }
  return result;
}
