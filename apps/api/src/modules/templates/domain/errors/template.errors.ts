export class InvalidTemplateNameError extends Error {
  constructor() {
    super('La plantilla debe tener un nombre no vacío.');
    this.name = 'InvalidTemplateNameError';
  }
}

export class InvalidTemplateDimensionsError extends Error {
  constructor() {
    super('Las dimensiones deben ser enteros seguros positivos.');
    this.name = 'InvalidTemplateDimensionsError';
  }
}

export class UnsupportedTemplateDimensionsError extends Error {
  constructor() {
    super('El formato inicial de las plantillas es 1080 × 1080.');
    this.name = 'UnsupportedTemplateDimensionsError';
  }
}

export class InvalidTemplateRevisionError extends Error {
  constructor() {
    super('La nueva revisión requiere otra identidad y un número de revisión válido.');
    this.name = 'InvalidTemplateRevisionError';
  }
}
