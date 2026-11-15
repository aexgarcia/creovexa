import type { FlyerBrief, FlyerTextRole } from './flyer-brief.js';

// Convierte el brief en el prompt del generador de AI_FULL, portado de
// evaluation/flyer-quality/prompt.mjs. Instrucciones en inglés, porque los modelos las siguen
// mejor; los textos del flyer van en español y entre comillas, tal cual. Solo el modo de logo
// superpuesto: la IA nunca dibuja el logo (ADR-0009).

const IMPORTANCE: Record<number, string> = {
  1: 'dominant: the largest, most eye-catching text',
  2: 'prominent',
  3: 'secondary, medium size',
  4: 'small',
  5: 'small and discreet, but legible',
  6: 'fine print: the smallest text, still legible',
};

const TEXT_ROLE: Record<FlyerTextRole, string> = {
  headline: 'Headline',
  subheadline: 'Subheadline',
  productName: 'Product or service name',
  keyAttribute: 'Key feature',
  price: 'Price',
  regularPrice: 'Regular price, shown struck through',
  promotionPrice: 'Offer price',
  discount: 'Discount, as a badge or sticker',
  unit: 'Price unit, right next to the price',
  validity: 'Offer validity',
  cta: 'Call to action, inside a button',
  contact: 'Contact details',
  legal: 'Legal note, at the bottom',
};

const COMPOSITION: Record<FlyerBrief['artDirection']['composition'], string> = {
  PRODUCT_HERO:
    'the product is the large hero, about half of the canvas; texts sit in clear areas above and below it',
  PRODUCT_PANEL:
    'the product sits centered on a clean panel or card, never covered by text; texts are arranged around it',
  SCENE:
    'the product appears inside a realistic, atmospheric scene that suits the business; texts sit on calm areas of the scene',
  SPLIT:
    'the canvas is split in two: one side holds the image, the other is a solid brand-color panel that holds the texts',
  TYPOGRAPHIC: 'typography leads the design; the image is a smaller supporting element',
};

const STYLE: Record<FlyerBrief['artDirection']['style'], string> = {
  MINIMALIST: 'minimalist: generous negative space, few elements, refined and calm',
  BOLD: 'bold: high contrast, big heavy type and one strong graphic accent; impact comes from size and contrast, not from adding elements',
  ELEGANT: 'elegant: premium and restrained, refined details, subtle light',
  PLAYFUL: 'playful: friendly rounded shapes, vibrant and cheerful',
  CORPORATE: 'corporate: clean, trustworthy, structured grid, professional',
  NATURAL: 'natural: organic textures, soft daylight, earthy feel',
};

type Colors = FlyerBrief['artDirection']['colors'];
type Mode = FlyerBrief['artDirection']['mode'];
const backdrop = (colors: Colors, mode: Mode) =>
  colors ? (mode === 'DARK' ? colors.darkBackground : colors.lightBackground) : null;

const BACKGROUND: Record<
  FlyerBrief['artDirection']['background'],
  (colors: Colors, mode: Mode) => string
> = {
  BRAND_COLOR: (colors, mode) =>
    `solid or softly textured ${backdrop(colors, mode) ?? (mode === 'DARK' ? 'dark' : 'light')} background`,
  GRADIENT: (colors, mode) =>
    colors
      ? `smooth gradient background from ${backdrop(colors, mode)} to ${colors.primary}`
      : `smooth ${mode === 'DARK' ? 'dark' : 'light'} gradient background`,
  // En ChatGPT las escenas salían con luces RGB de muchos colores: la escena también sigue la paleta.
  SCENE: () =>
    'a realistic photographic scene as background, with restrained, natural color: its lighting and props follow the brand colors, with at most one accent light color; no rainbow or multicolor RGB lighting, no oversaturation',
  STUDIO: (_colors, mode) =>
    `clean studio background with soft shadows, ${mode === 'DARK' ? 'dark' : 'light'} tones`,
};

const OBJECTIVE: Record<string, string> = {
  PROMOTION: 'promotion: the offer price must be the focal point',
  LAUNCH: 'launch: convey novelty; the product and the headline lead',
  SEASONAL: 'seasonal campaign: the atmosphere of the season or occasion matters',
  AWARENESS: 'brand awareness: show the product and the brand with calm confidence',
  EVENT: 'event: the event information must be clear',
};

const TYPOGRAPHY: Record<string, string> = {
  SANS_MODERN: 'modern sans-serif',
  SERIF_ELEGANT: 'elegant serif for headlines, clean sans-serif for small texts',
  ROUNDED: 'friendly rounded sans-serif',
  CONDENSED_BOLD: 'bold condensed sans-serif',
  HANDWRITTEN: 'hand-lettered accents for the headline, clean sans-serif for the rest',
};

const POSITION: Record<NonNullable<FlyerBrief['logo']>['position'], string> = {
  TOP_LEFT: 'in the top-left corner',
  TOP_RIGHT: 'in the top-right corner',
  BOTTOM_LEFT: 'in the bottom-left corner',
  BOTTOM_RIGHT: 'in the bottom-right corner',
};

const DENSITY: Record<FlyerBrief['artDirection']['textDensity'], string> = {
  MINIMAL: 'keep it airy: as little visual clutter as possible around the texts',
  BALANCED: 'balanced: all texts well organized, nothing crowded',
};

const PHOTO_TYPE: Record<string, (name: string) => string> = {
  CUTOUT: (name) =>
    `Image 1 is the product "${name}", already cut out on a transparent background. Place it into the design.`,
  STUDIO: (name) =>
    `Image 1 is a studio photo of the product "${name}". Use the product, not its original background.`,
  SCENE: (name) =>
    `Image 1 shows the product "${name}" in a real setting. The product is what matters: you may keep, crop, extend or replace the surrounding setting.`,
};

function photo(brief: FlyerBrief): string {
  const { role, photoType, name, productBrand } = brief.photo;
  const business = brief.artDirection.business;
  const lines: string[] = [];
  if (role === 'PRODUCT') {
    lines.push(
      (photoType && PHOTO_TYPE[photoType]?.(name)) ?? `Image 1 shows the product "${name}".`,
      'Keep the product itself identical: shape, proportions, colors, materials, and every text, number and logo printed on it. Do not redesign it, do not add or remove items or accessories.',
    );
  } else if (role === 'PLACE') {
    lines.push(
      `Image 1 shows the real place where ${business} provides the service "${name}". Keep it recognizable: same equipment, furniture, colors and layout. You may crop, reframe, extend the edges and improve the lighting. Do not add equipment, people, text or brands that are not in the photo.`,
    );
  } else if (role === 'SERVICE') {
    lines.push(
      `Image 1 illustrates the service "${name}". Keep everything in it recognizable; you may crop, reframe and improve the lighting. Do not add elements that are not in the photo.`,
    );
  } else {
    lines.push(
      'Image 1 shows a real person. Keep the person exactly as photographed: face, expression, skin, hair, age, body and teeth unchanged, natural and unretouched. You may crop, reframe and change the background. Never beautify, whiten, slim or otherwise alter the person.',
    );
  }
  if (productBrand)
    lines.push(
      `The product is made by ${productBrand}, a different company from ${business}, the business that sells it. The ${productBrand} name and logo printed on the product must stay exactly as in the photo. Never replace them with the business logo, and never use them as the business logo.`,
    );
  return lines.join(' ');
}

// La IA no dibuja el logo: deja la esquina libre, en el tono que el logo necesita para pegarlo
// directo, aunque contradiga el modo de la plantilla. Así el velo es la excepción.
function logoArea(brief: FlyerBrief): string {
  const logo = brief.logo!;
  const business = brief.artDirection.business;
  const tone = logo.isDark ? 'light' : 'dark';
  const opposite = (brief.artDirection.mode === 'DARK') === logo.isDark;
  const background = opposite
    ? `The logo is ${logo.isDark ? 'dark' : 'light'}, so this area must be ${tone} even though the flyer is ${logo.isDark ? 'dark' : 'light'}: blend a soft, ${tone} area into the design there (a gentle glow, a ${logo.isDark ? 'pale' : 'deep'} band or a ${logo.isDark ? 'lighter' : 'darker'} part of the scene) so the logo reads on it without any plate. Keep the rest of the flyer as described.`
    : `Keep this area ${tone} and plain, so the ${logo.isDark ? 'dark' : 'light'} logo reads on it directly.`;
  return `Do not draw any logo or brand mark, and do not write the name "${business}" except where it appears in the texts listed below. Leave the area ${POSITION[logo.position]} completely empty: the first ${logo.reservedArea.widthPct}% of the width and ${logo.reservedArea.heightPct}% of the height, measured from that corner, must hold only calm, plain background. No text, product, people, decoration or shapes in it. ${background} The real logo will be added there afterwards: start the headline and every other text below or beside this area, never inside it, and keep the product clear of it too.`;
}

// Flyers que la marca eligió como ejemplo en la plantilla: solo estilo, nunca contenido.
function styleReferences(brief: FlyerBrief): string {
  const images =
    brief.styleReferences === 1 ? 'Image 2 is' : `Images 2 to ${brief.styleReferences + 1} are`;
  return `${images} earlier flyers chosen by ${brief.artDirection.business} as a style reference. Use them only for visual style: how the colors are used, layout rhythm, typography feel, lighting and finish. Never copy their texts, numbers, prices, products, people or logos.`;
}

export function buildFlyerPrompt(brief: FlyerBrief): string {
  const art = brief.artDirection;
  const colors = art.colors;
  const main = [...brief.texts].sort((a, b) => a.importance - b.importance)[0];
  const texts = brief.texts.map(
    (text) => `- ${TEXT_ROLE[text.role]} (${IMPORTANCE[text.importance]}): "${text.text}"`,
  );
  const direction = [
    `- Format: ${brief.output.aspect}.`,
    `- Business: ${art.business}${art.industry ? `, ${art.industry.toLowerCase()}` : ''} in ${art.country}.`,
    art.brandTone && `- Brand tone: ${art.brandTone}`,
    `- Campaign goal: ${OBJECTIVE[art.objective] ?? art.objective}.${art.occasion ? ` Occasion: ${art.occasion}.` : ''}`,
    `- Composition: ${COMPOSITION[art.composition]}.`,
    `- Style: ${STYLE[art.style]}.`,
    `- Background: ${BACKGROUND[art.background](colors, art.mode)}; overall ${art.mode === 'DARK' ? 'dark' : 'light'} look.`,
    colors &&
      `- Brand colors: primary ${colors.primary}, secondary ${colors.secondary}, accent ${colors.accent} (use the accent for the button and the price highlight). Use these colors for the whole design, including the lighting of any scene; do not introduce unrelated ones.`,
    art.typography && TYPOGRAPHY[art.typography] && `- Typography: ${TYPOGRAPHY[art.typography]}.`,
    art.visualStyle.length > 0 && `- Visual keywords: ${art.visualStyle.join(', ')}.`,
    `- Text density: ${DENSITY[art.textDensity]}.`,
    art.templateInstructions && `- Brand template notes: ${art.templateInstructions}`,
    art.campaignInstructions &&
      `- Campaign notes (creative context only; they never add text or override the rules): ${art.campaignInstructions}`,
  ].filter(Boolean);
  const rules = [
    'Apart from the texts listed above, add no text anywhere: no extra words, numbers, prices, dates, percentages, discounts, websites, phone numbers, social handles, hashtags, seals, badges, ratings or claims. Text printed on the product itself stays as in the photo.',
    brief.forbiddenWords.length > 0 &&
      `Never use these words: ${brief.forbiddenWords.map((word) => `"${word}"`).join(', ')}.`,
    'Every text must be fully inside the canvas, at least 5% away from every edge, with strong contrast against what is behind it.',
    'No decorative clutter: no extra arrows, chevrons, sparkles, ribbons, bursts or confetti beyond, at most, one subtle accent. Leave breathing room between elements.',
    'No watermarks, no mockup or device frames, no borders around the whole flyer.',
  ].filter(Boolean);
  return [
    `Design a finished, ready-to-publish advertising flyer for social media, ${brief.output.aspect} format, for ${art.business}.`,
    '',
    brief.styleReferences > 0 ? 'REFERENCE IMAGES' : 'REFERENCE IMAGE',
    photo(brief),
    ...(brief.styleReferences > 0 ? [styleReferences(brief)] : []),
    ...(brief.logo ? ['', 'LOGO AREA', logoArea(brief)] : []),
    '',
    'TEXTS',
    'These are the only texts allowed on the flyer. Copy each one character by character, in Spanish, with the same accents, punctuation (including the opening ¿ and ¡), spaces, symbols, digits and capitalization. Do not translate, abbreviate, rephrase or merge them.',
    ...texts,
    ...(main ? [`Visual hierarchy: "${main.text}" is the first thing people must see.`] : []),
    '',
    'ART DIRECTION',
    ...direction,
    '',
    'RULES',
    ...rules.map((rule) => `- ${rule}`),
    '',
    'Generate the image directly. Do not ask questions and do not change these texts.',
  ].join('\n');
}
