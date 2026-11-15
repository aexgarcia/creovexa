export interface FlyerDesignData {
  readonly layout: 'CLASSIC' | 'PRODUCT_FOCUS';
  readonly palette: 'BLUE' | 'CORAL';
  readonly settings: {
    readonly showLogo: boolean;
    readonly showRegularPrice: boolean;
    readonly showPromotionPrice: boolean;
    readonly showHeadline: boolean;
    readonly showCta: boolean;
    readonly showMainImage: boolean;
  };
}

export class InvalidFlyerDesignError extends Error {
  constructor() {
    super('Selecciona un diseño, una paleta y elementos visibles válidos.');
    this.name = 'InvalidFlyerDesignError';
  }
}

export class FlyerDesign {
  private constructor(readonly data: FlyerDesignData) {
    Object.freeze(this);
  }

  static create(
    input: unknown = {
      layout: 'CLASSIC',
      palette: 'BLUE',
      settings: {
        showLogo: true,
        showRegularPrice: true,
        showPromotionPrice: true,
        showHeadline: true,
        showCta: true,
        showMainImage: true,
      },
    },
  ): FlyerDesign {
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new InvalidFlyerDesignError();
    const value = input as Record<string, unknown>;
    const keys = [
      'showLogo',
      'showRegularPrice',
      'showPromotionPrice',
      'showHeadline',
      'showCta',
      'showMainImage',
    ];
    if (
      Object.keys(value).length !== 3 ||
      !['CLASSIC', 'PRODUCT_FOCUS'].includes(value.layout as string) ||
      !['BLUE', 'CORAL'].includes(value.palette as string) ||
      !value.settings ||
      typeof value.settings !== 'object' ||
      Array.isArray(value.settings)
    )
      throw new InvalidFlyerDesignError();
    const settings = value.settings as Record<string, unknown>;
    if (
      Object.keys(settings).length !== keys.length ||
      keys.some((key) => typeof settings[key] !== 'boolean')
    )
      throw new InvalidFlyerDesignError();
    return new FlyerDesign(
      Object.freeze({
        layout: value.layout as FlyerDesignData['layout'],
        palette: value.palette as FlyerDesignData['palette'],
        settings: Object.freeze(
          Object.fromEntries(keys.map((key) => [key, settings[key]])),
        ) as unknown as FlyerDesignData['settings'],
      }),
    );
  }
}
