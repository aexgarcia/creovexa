import { InvalidTemplateDimensionsError } from '../errors/template.errors.js';

export class TemplateDimensions {
  private constructor(
    readonly width: number,
    readonly height: number,
  ) {
    Object.freeze(this);
  }

  static create(width: number, height: number): TemplateDimensions {
    if (
      !Number.isSafeInteger(width) ||
      width <= 0 ||
      !Number.isSafeInteger(height) ||
      height <= 0
    ) {
      throw new InvalidTemplateDimensionsError();
    }
    return new TemplateDimensions(width, height);
  }

  equals(other: TemplateDimensions): boolean {
    return this.width === other.width && this.height === other.height;
  }
}
