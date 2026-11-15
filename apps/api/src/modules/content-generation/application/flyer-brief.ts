import {
  FlyerDesign,
  FORMAT_SIZES,
  type FlyerComposition,
  type FlyerDesignData,
  type FlyerFormat,
  type LogoPosition,
} from '#app/domain/value-objects/flyer-design';
import type { GenerationSnapshotData } from '#app/modules/campaigns/contract';
import { formatDiscount, formatPrice, formatValidity } from './display-texts.js';
import { reservedArea } from './logo-area.js';
import type { FlyerTexts } from './copy-policy.js';

// Brief del flyer de AI_FULL (SDD/arquitectura/datos-del-flyer.md, sección 6), portado de
// evaluation/flyer-quality/brief.mjs. Todo lo que la IA dibuja llega ya resuelto: la IA no
// calcula precios, fechas ni descuentos, ni decide qué textos aparecen.

export const FLYER_OUTPUTS: Readonly<
  Record<FlyerFormat, { aspect: string; ratio: number; generationSize: string }>
> = Object.freeze({
  SQUARE: { aspect: '1:1', ratio: 1, generationSize: '1024x1024' },
  PORTRAIT: { aspect: '4:5', ratio: 0.8, generationSize: '1024x1280' },
  STORY: { aspect: '9:16', ratio: 0.5625, generationSize: '1152x2048' },
});

// Máximo de textos en formato cuadrado según la composición. En ChatGPT, SPLIT aguantó 13
// textos; PRODUCT_HERO con 9 se vio sobrecargado. PORTRAIT suma 2; STORY suma 1 (Instagram tapa
// franjas arriba y abajo); MINIMAL resta 1. Son puntos de partida de la prueba.
const TEXT_LIMITS: Readonly<Record<FlyerComposition, number>> = {
  PRODUCT_HERO: 8,
  PRODUCT_PANEL: 8,
  SCENE: 7,
  SPLIT: 12,
  TYPOGRAPHIC: 10,
};
const FORMAT_ADJUSTMENT: Readonly<Record<FlyerFormat, number>> = {
  SQUARE: 0,
  PORTRAIT: 2,
  STORY: 1,
};
// Se quitan en este orden si se supera el límite; precios, vigencia, CTA y legal nunca.
const OPTIONAL_ROLES = ['unit', 'keyAttribute', 'contact', 'subheadline'] as const;

export type FlyerTextRole =
  | 'headline'
  | 'subheadline'
  | 'productName'
  | 'keyAttribute'
  | 'price'
  | 'regularPrice'
  | 'promotionPrice'
  | 'discount'
  | 'unit'
  | 'validity'
  | 'cta'
  | 'contact'
  | 'legal';

export interface FlyerText {
  role: FlyerTextRole;
  text: string;
  // 1 es lo más destacado; 6, la letra chica.
  importance: number;
  struck?: boolean;
  shape?: 'BUTTON' | 'BADGE';
}

export type PhotoRole = 'PRODUCT' | 'PLACE' | 'SERVICE' | 'PERSON';

export interface FlyerLogoChoice {
  assetId: string;
  // Decide el tono de la esquina y del velo; la variante clara cuenta como logo claro.
  isDark: boolean;
}

export interface FlyerBrief {
  output: {
    format: FlyerFormat;
    aspect: string;
    ratio: number;
    generationSize: string;
    width: number;
    height: number;
    locale: string;
  };
  photo: {
    role: PhotoRole;
    photoType: string | null;
    transparent: boolean;
    name: string;
    productBrand: string | null;
  };
  // null si la plantilla no lleva logo o la organización no tiene uno.
  logo: {
    position: LogoPosition;
    isDark: boolean;
    veilColor: string;
    aspectRatio: number;
    reservedArea: { widthPct: number; heightPct: number };
  } | null;
  texts: FlyerText[];
  // Cuántos flyers de ejemplo de la plantilla acompañan a la foto, solo como estilo.
  styleReferences: number;
  // Textos opcionales que se omitieron por superar el límite.
  warnings: string[];
  artDirection: {
    business: string;
    industry: string | null;
    country: string;
    brandTone: string | null;
    objective: string;
    occasion: string | null;
    composition: FlyerComposition;
    style: FlyerDesignData['style'];
    mode: FlyerDesignData['mode'];
    background: FlyerDesignData['background'];
    colors: NonNullable<GenerationSnapshotData['organization']['brandColors']> | null;
    typography: string | null;
    visualStyle: string[];
    textDensity: FlyerDesignData['textDensity'];
    templateInstructions: string | null;
    campaignInstructions: string | null;
  };
  forbiddenWords: string[];
}

// El diseño congelado; los snapshots anteriores a la dirección de arte usan el predeterminado.
export function snapshotDesign(snapshot: GenerationSnapshotData): FlyerDesignData {
  return FlyerDesign.create(snapshot.template.design ?? undefined).data;
}

/**
 * Qué logo se pega. En una plantilla oscura, un logo oscuro (o de tono desconocido) se cambia por
 * la variante clara si existe; sin ella, el compositor lo pone sobre un velo.
 */
export function chooseFlyerLogo(snapshot: GenerationSnapshotData): FlyerLogoChoice | null {
  const design = snapshotDesign(snapshot);
  if (!design.elements.logo) return null;
  const { logoAssetId, darkBackgroundLogoAssetId, logoIsDark } = snapshot.organization;
  if (design.mode === 'DARK' && logoIsDark !== false && darkBackgroundLogoAssetId)
    return { assetId: darkBackgroundLogoAssetId, isDark: false };
  if (logoAssetId) return { assetId: logoAssetId, isDark: logoIsDark ?? true };
  if (darkBackgroundLogoAssetId) return { assetId: darkBackgroundLogoAssetId, isDark: false };
  return null;
}

function photoRole(product: GenerationSnapshotData['product']): PhotoRole {
  if (product.photoType === 'PERSON') return 'PERSON';
  if (product.kind === 'SERVICE') return product.photoType === 'PLACE' ? 'PLACE' : 'SERVICE';
  return 'PRODUCT';
}

function contactText(contact: GenerationSnapshotData['organization']['contact']): string | null {
  if (!contact) return null;
  const parts = [
    contact.whatsapp && `WhatsApp ${contact.whatsapp}`,
    contact.website,
    contact.instagram,
    contact.address,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/**
 * logo: el elegido con chooseFlyerLogo y la proporción (ancho / alto) del archivo real.
 */
export function buildFlyerBrief(
  snapshot: GenerationSnapshotData,
  texts: FlyerTexts,
  logo: (FlyerLogoChoice & { aspectRatio: number }) | null,
  styleReferences = 0,
): FlyerBrief {
  const design = snapshotDesign(snapshot);
  const elements = design.elements;
  const { organization, product, promotion } = snapshot;
  const isPromotion = snapshot.objective === 'PROMOTION';
  const list: FlyerText[] = [];
  const add = (
    role: FlyerTextRole,
    text: string | null | false | undefined,
    importance: number,
    extra: Partial<FlyerText> = {},
  ) => {
    if (text) list.push({ role, text, importance, ...extra });
  };

  const name = product.shortName ?? product.name;
  add('headline', elements.headline && texts.headline, isPromotion ? 2 : 1);
  add('subheadline', elements.subheadline && texts.subheadline, 3);
  add('productName', elements.productName && name, snapshot.objective === 'LAUNCH' ? 2 : 3);
  // La plantilla dice cuántas características mostrar; el producto las guarda por prioridad.
  for (const attribute of product.keyAttributes.slice(0, elements.keyAttributes))
    add('keyAttribute', attribute, 4);

  const regular = formatPrice(product.regularPrice);
  if (promotion && elements.promotionPrice) {
    if (elements.regularPrice) {
      add('regularPrice', `Antes ${regular}`, 4, { struck: true });
      add('promotionPrice', `Ahora ${formatPrice(promotion)}`, 1);
    } else {
      add('promotionPrice', formatPrice(promotion), 1);
    }
    if (promotion.showDiscount)
      add('discount', formatDiscount(product.regularPrice, promotion), 2, { shape: 'BADGE' });
  } else if (elements.regularPrice) {
    add('price', regular, isPromotion ? 1 : 2);
  }
  const hasPrice = list.some((text) => text.role.toLowerCase().endsWith('price'));
  add('unit', hasPrice && product.unit, 5);
  add('validity', elements.validity && formatValidity(promotion, organization.region), 5);
  add('cta', elements.cta && snapshot.cta, 2, { shape: 'BUTTON' });
  add('contact', elements.contact && contactText(organization.contact), 5);
  const legal = [promotion?.conditions, organization.defaultLegalText].filter(Boolean).join(' ');
  add('legal', elements.legalText && legal, 6);

  const limit =
    TEXT_LIMITS[design.composition] +
    FORMAT_ADJUSTMENT[design.format] -
    (design.textDensity === 'MINIMAL' ? 1 : 0);
  const warnings: string[] = [];
  for (const role of OPTIONAL_ROLES) {
    while (list.length > limit) {
      const index = list.findLastIndex((text) => text.role === role);
      if (index < 0) break;
      warnings.push(
        `Se omitió ${role} "${list[index]!.text}": supera el límite de ${limit} textos`,
      );
      list.splice(index, 1);
    }
  }
  if (list.length > limit)
    warnings.push(`Tiene ${list.length} textos y el límite es ${limit}: puede verse sobrecargado`);

  const output = FLYER_OUTPUTS[design.format];
  const colors = organization.brandColors;
  return {
    output: {
      format: design.format,
      ...output,
      ...FORMAT_SIZES[design.format],
      locale: organization.region.locale,
    },
    photo: {
      role: photoRole(product),
      photoType: product.photoType,
      transparent: product.hasTransparency ?? false,
      name,
      productBrand: product.productBrand,
    },
    logo: logo && {
      position: design.logoPosition,
      isDark: logo.isDark,
      veilColor: logo.isDark ? '#FFFFFF' : (colors?.darkBackground ?? '#111111'),
      aspectRatio: logo.aspectRatio,
      reservedArea: reservedArea(output.ratio, logo.aspectRatio, design.logoPosition),
    },
    texts: list,
    styleReferences,
    warnings,
    artDirection: {
      business: organization.name,
      industry: organization.industry,
      country: organization.region.country,
      brandTone: organization.brandTone,
      objective: snapshot.objective,
      occasion: snapshot.occasion,
      composition: design.composition,
      style: design.style,
      mode: design.mode,
      background: design.background,
      colors,
      typography: organization.typography,
      visualStyle: [...organization.visualStyle],
      textDensity: design.textDensity,
      templateInstructions: design.instructions,
      campaignInstructions: snapshot.instructions || null,
    },
    forbiddenWords: [...organization.forbiddenWords],
  };
}
