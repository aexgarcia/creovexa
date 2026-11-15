import { entityId } from '#app/domain/entity-id';
import { domainFixture } from '../../../support/campaign-fakes.js';
import {
  buildFlyerBrief,
  chooseFlyerLogo,
  type FlyerBrief,
} from '#app/modules/content-generation/application/flyer-brief';
import type { GenerationSnapshotData } from '#app/modules/campaigns/contract';
import { DEFAULT_FLYER_DESIGN, type FlyerDesignData } from '#app/domain/value-objects/flyer-design';

const TEXTS = { headline: 'Tu café favorito', subheadline: 'Tres variedades de altura' };
const LOGO = entityId('00000000-0000-4000-8000-000000000a01');
const LIGHT = entityId('00000000-0000-4000-8000-000000000a02');

function snapshot(
  change: {
    design?: Partial<FlyerDesignData>;
    elements?: Partial<FlyerDesignData['elements']>;
    organization?: Partial<GenerationSnapshotData['organization']>;
    product?: Partial<GenerationSnapshotData['product']>;
    promotion?: Partial<NonNullable<GenerationSnapshotData['promotion']>> | null;
    objective?: string;
  } = {},
): GenerationSnapshotData {
  const data = domainFixture().snapshot.data;
  return {
    ...data,
    objective: (change.objective ?? data.objective) as GenerationSnapshotData['objective'],
    organization: { ...data.organization, ...change.organization },
    product: { ...data.product, ...change.product },
    promotion: change.promotion === null ? null : { ...data.promotion!, ...change.promotion },
    template: {
      ...data.template,
      design: {
        ...DEFAULT_FLYER_DESIGN,
        ...change.design,
        elements: { ...DEFAULT_FLYER_DESIGN.elements, ...change.elements },
      },
    },
  };
}

const roles = (brief: FlyerBrief) => brief.texts.map((text) => `${text.role}:${text.text}`);

describe('buildFlyerBrief', () => {
  it('resolves every text exactly, with prices, local validity and the CTA', () => {
    const brief = buildFlyerBrief(snapshot(), TEXTS, null);
    expect(roles(brief)).toEqual([
      'headline:Tu café favorito',
      'productName:Prod',
      'regularPrice:Antes S/ 20.00',
      'promotionPrice:Ahora S/ 15.00',
      'validity:Hasta el 19 de setiembre',
      'cta:Comprar ahora',
    ]);
    // En una promoción, el precio de oferta es lo más destacado.
    expect(brief.texts.find((text) => text.role === 'promotionPrice')!.importance).toBe(1);
    expect(brief.texts.find((text) => text.role === 'regularPrice')!.struck).toBe(true);
    expect(brief.output).toMatchObject({
      format: 'SQUARE',
      generationSize: '1024x1024',
      width: 1080,
      height: 1080,
    });
    expect(JSON.stringify(brief)).not.toContain(snapshot().product.id);
  });
  it('follows the template elements and drops optional texts beyond the limit', () => {
    const brief = buildFlyerBrief(
      snapshot({
        elements: {
          subheadline: true,
          keyAttributes: 2,
          legalText: true,
          contact: true,
          regularPrice: false,
        },
        promotion: { showDiscount: true, conditions: 'Solo en tienda.' },
        product: { unit: 'por kg' },
      }),
      TEXTS,
      null,
    );
    // Once textos y un límite de 8: salen la unidad, la característica y el contacto.
    expect(roles(brief)).toEqual([
      'headline:Tu café favorito',
      'subheadline:Tres variedades de altura',
      'productName:Prod',
      'promotionPrice:S/ 15.00',
      'discount:-25 %',
      'validity:Hasta el 19 de setiembre',
      'cta:Comprar ahora',
      'legal:Solo en tienda. Imágenes referenciales.',
    ]);
    expect(brief.warnings).toHaveLength(3);
  });
  it('never drops prices, validity, CTA or legal, and warns when still over the limit', () => {
    const brief = buildFlyerBrief(
      snapshot({
        design: { textDensity: 'MINIMAL', composition: 'SCENE' },
        elements: { subheadline: true, keyAttributes: 2, legalText: true, contact: true },
        product: { unit: 'por kg', keyAttributes: ['A', 'B'] },
      }),
      TEXTS,
      null,
    );
    // SCENE admite 7 en cuadrado y MINIMAL resta 1; aun sin opcionales quedan 7.
    expect(roles(brief)).toEqual([
      'headline:Tu café favorito',
      'productName:Prod',
      'regularPrice:Antes S/ 20.00',
      'promotionPrice:Ahora S/ 15.00',
      'validity:Hasta el 19 de setiembre',
      'cta:Comprar ahora',
      'legal:Imágenes referenciales.',
    ]);
    expect(brief.warnings.at(-1)).toContain('límite es 6');
  });
  it('shows the regular price as the price when there is no promotion', () => {
    const brief = buildFlyerBrief(snapshot({ promotion: null, objective: 'LAUNCH' }), TEXTS, null);
    expect(roles(brief)).toEqual([
      'headline:Tu café favorito',
      'productName:Prod',
      'price:S/ 20.00',
      'cta:Comprar ahora',
    ]);
    expect(brief.texts[0]!.importance).toBe(1);
  });
  it('reserves the logo corner and picks the veil for the logo tone', () => {
    const dark = buildFlyerBrief(snapshot(), TEXTS, {
      assetId: LOGO,
      isDark: true,
      aspectRatio: 2,
    });
    expect(dark.logo).toMatchObject({ position: 'TOP_RIGHT', isDark: true, veilColor: '#FFFFFF' });
    expect(dark.logo!.reservedArea.widthPct).toBeGreaterThan(0);
    const light = buildFlyerBrief(snapshot(), TEXTS, {
      assetId: LOGO,
      isDark: false,
      aspectRatio: 1,
    });
    expect(light.logo!.veilColor).toBe('#1E120D');
  });
  it('uses the generation size of each format', () => {
    const story = buildFlyerBrief(snapshot({ design: { format: 'STORY' } }), TEXTS, null);
    expect(story.output).toMatchObject({
      aspect: '9:16',
      generationSize: '1152x2048',
      width: 1080,
      height: 1920,
    });
  });
  it('treats a service photo as a place and a person as a person', () => {
    expect(
      buildFlyerBrief(snapshot({ product: { kind: 'SERVICE', photoType: 'PLACE' } }), TEXTS, null)
        .photo.role,
    ).toBe('PLACE');
    expect(
      buildFlyerBrief(snapshot({ product: { photoType: 'PERSON' } }), TEXTS, null).photo.role,
    ).toBe('PERSON');
  });
  it('reads snapshots stored before the art direction with the default design', () => {
    const data = domainFixture().snapshot.data;
    const legacy = { ...data, template: { ...data.template, design: null } };
    expect(buildFlyerBrief(legacy, TEXTS, null).output.format).toBe('SQUARE');
  });
});

describe('chooseFlyerLogo', () => {
  it('uses the light variant for a dark logo on a dark template', () => {
    expect(
      chooseFlyerLogo(
        snapshot({
          organization: { logoAssetId: LOGO, darkBackgroundLogoAssetId: LIGHT, logoIsDark: true },
        }),
      ),
    ).toEqual({ assetId: LIGHT, isDark: false });
  });
  it('keeps the main logo otherwise, and none if the template hides it', () => {
    expect(
      chooseFlyerLogo(
        snapshot({
          design: { mode: 'LIGHT' },
          organization: { logoAssetId: LOGO, darkBackgroundLogoAssetId: LIGHT, logoIsDark: true },
        }),
      ),
    ).toEqual({ assetId: LOGO, isDark: true });
    expect(
      chooseFlyerLogo(snapshot({ organization: { logoAssetId: LOGO, logoIsDark: false } })),
    ).toEqual({ assetId: LOGO, isDark: false });
    expect(
      chooseFlyerLogo(snapshot({ elements: { logo: false }, organization: { logoAssetId: LOGO } })),
    ).toBeNull();
    expect(chooseFlyerLogo(snapshot())).toBeNull();
  });
});
