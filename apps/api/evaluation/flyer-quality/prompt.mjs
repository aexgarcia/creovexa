// Convierte el brief en el prompt del generador de imagen. Instrucciones en inglés (los
// modelos las siguen mejor); los textos del flyer, en español y entre comillas, tal cual.

const IMPORTANCIA = {
  1: 'dominant: the largest, most eye-catching text',
  2: 'prominent',
  3: 'secondary, medium size',
  4: 'small',
  5: 'small and discreet, but legible',
  6: 'fine print: the smallest text, still legible',
};

const ROL_TEXTO = {
  titular: 'Headline',
  subtitulo: 'Subheadline',
  nombreProducto: 'Product or service name',
  atributo: 'Key feature',
  precio: 'Price',
  precioRegular: 'Regular price, shown struck through',
  precioPromocional: 'Offer price',
  descuento: 'Discount, as a badge or sticker',
  unidad: 'Price unit, right next to the price',
  vigencia: 'Offer validity',
  cta: 'Call to action, inside a button',
  contacto: 'Contact details',
  legal: 'Legal note, at the bottom',
};

const COMPOSICION = {
  PRODUCTO_PROTAGONISTA:
    'the product is the large hero, about half of the canvas; texts sit in clear areas above and below it',
  PRODUCTO_EN_PANEL:
    'the product sits centered on a clean panel or card, never covered by text; texts are arranged around it',
  ESCENA_AMBIENTADA:
    'the product appears inside a realistic, atmospheric scene that suits the business; texts sit on calm areas of the scene',
  DIVIDIDA:
    'the canvas is split in two: one side holds the image, the other is a solid brand-color panel that holds the texts',
  TIPOGRAFICA: 'typography leads the design; the image is a smaller supporting element',
};

const ESTILO = {
  MINIMALISTA: 'minimalist: generous negative space, few elements, refined and calm',
  AUDAZ:
    'bold: high contrast, big heavy type and one strong graphic accent; impact comes from size and contrast, not from adding elements',
  ELEGANTE: 'elegant: premium and restrained, refined details, subtle light',
  DIVERTIDO: 'playful: friendly rounded shapes, vibrant and cheerful',
  CORPORATIVO: 'corporate: clean, trustworthy, structured grid, professional',
  NATURAL: 'natural: organic textures, soft daylight, earthy feel',
};

const FONDO = {
  COLOR_DE_MARCA: (c, modo) =>
    `solid or softly textured ${modo === 'OSCURO' ? c.fondoOscuro : c.fondoClaro} background`,
  DEGRADADO: (c, modo) =>
    `smooth gradient background from ${modo === 'OSCURO' ? c.fondoOscuro : c.fondoClaro} to ${c.primario}`,
  // La prueba en ChatGPT dio escenas con luces RGB de muchos colores: la escena también sigue la paleta.
  ESCENA: () =>
    'a realistic photographic scene as background, with restrained, natural color: its lighting and props follow the brand colors, with at most one accent light color; no rainbow or multicolor RGB lighting, no oversaturation',
  ESTUDIO: (c, modo) =>
    `clean studio background with soft shadows, ${modo === 'OSCURO' ? 'dark' : 'light'} tones`,
};

const OBJETIVO = {
  PROMOCION: 'promotion: the offer price must be the focal point',
  LANZAMIENTO: 'launch: convey novelty; the product and the headline lead, there is no price',
  TEMPORADA: 'seasonal campaign: the atmosphere of the season or occasion matters',
  RECORDACION: 'brand awareness: show the product and the brand with calm confidence',
  EVENTO: 'event: the event information must be clear',
};

const TIPOGRAFIA = {
  SANS_MODERNA: 'modern sans-serif',
  SERIF_ELEGANTE: 'elegant serif for headlines, clean sans-serif for small texts',
  REDONDEADA: 'friendly rounded sans-serif',
  CONDENSADA_AUDAZ: 'bold condensed sans-serif',
  MANUSCRITA: 'hand-lettered accents for the headline, clean sans-serif for the rest',
};

const POSICION = {
  ARRIBA_IZQUIERDA: 'in the top-left corner',
  ARRIBA_DERECHA: 'in the top-right corner',
  ABAJO_IZQUIERDA: 'in the bottom-left corner',
  ABAJO_DERECHA: 'in the bottom-right corner',
};

const DENSIDAD = {
  MINIMA: 'keep it airy: as little visual clutter as possible around the texts',
  EQUILIBRADA: 'balanced: all texts well organized, nothing crowded',
};

function foto(ref, negocio) {
  const conservarProducto =
    'Keep the product itself identical: shape, proportions, colors, materials, and every text, number and logo printed on it. Do not redesign it, do not add or remove items or accessories.';
  const lineas = {
    PRODUCTO:
      {
        RECORTADA: `Image 1 is the product "${ref.nombre}", already cut out on a transparent background. Place it into the design.`,
        ESTUDIO: `Image 1 is a studio photo of the product "${ref.nombre}". Use the product, not its original background.`,
        AMBIENTE: `Image 1 shows the product "${ref.nombre}" in a real setting. The product is what matters: you may keep, crop, extend or replace the surrounding setting.`,
      }[ref.tipoFoto] ?? `Image 1 shows the product "${ref.nombre}".`,
    LUGAR: `Image 1 shows the real place where ${negocio} provides the service "${ref.nombre}". Keep it recognizable: same equipment, furniture, colors and layout. You may crop, reframe, extend the edges and improve the lighting. Do not add equipment, people, text or brands that are not in the photo.`,
    SERVICIO: `Image 1 illustrates the service "${ref.nombre}". Keep everything in it recognizable; you may crop, reframe and improve the lighting. Do not add elements that are not in the photo.`,
    PERSONA: `Image 1 shows a real person. Keep the person exactly as photographed: face, expression, skin, hair, age, body and teeth unchanged, natural and unretouched. You may crop, reframe and change the background. Never beautify, whiten, slim or otherwise alter the person.`,
  };
  const texto = [lineas[ref.rol]];
  if (ref.rol === 'PRODUCTO') texto.push(conservarProducto);
  if (ref.marcaDelProducto)
    texto.push(
      `The product is made by ${ref.marcaDelProducto}, a different company from ${negocio}, the business that sells it. The ${ref.marcaDelProducto} name and logo printed on the product must stay exactly as in the photo. Never replace them with the business logo, and never use them as the business logo.`,
    );
  return texto.join(' ');
}

function logo(ref, negocio, colores) {
  const presentacion = {
    PLACA_BLANCA:
      'Put it on a solid white rounded plate with generous padding, so it stands out from the background.',
    PLACA_OSCURA: `Put it on a solid ${colores.fondoOscuro} rounded plate with generous padding, so it stands out from the background.`,
    DIRECTO:
      'Place it directly on a calm, light area of the background with clear contrast; no plate.',
    VARIANTE_CLARA:
      'It is the light version of the logo, made for dark backgrounds: place it directly, no plate.',
  }[ref.presentacion];
  return `Image 2 is the logo of ${negocio}. Place it once, ${POSICION[ref.posicion]}. ${presentacion} Reproduce it exactly as supplied: same shapes, same original colors, same letters. Never recolor, invert, lighten, outline, redraw, restyle, translate, crop or complete it. Every letter of the logo, including the small ones, must be sharp and readable.`;
}

// Logo superpuesto: la IA no lo dibuja; deja la esquina libre, en el tono que el logo necesita
// para pegarlo directo, sin placa.
function areaDelLogo(logo, negocio, modo) {
  const tono = logo.logoEsOscuro ? 'light' : 'dark';
  const contrario = (modo === 'OSCURO') === logo.logoEsOscuro;
  const fondo = contrario
    ? `The logo is ${logo.logoEsOscuro ? 'dark' : 'light'}, so this area must be ${tono} even though the flyer is ${logo.logoEsOscuro ? 'dark' : 'light'}: blend a soft, ${tono} area into the design there (a gentle glow, a ${logo.logoEsOscuro ? 'pale' : 'deep'} band or a ${logo.logoEsOscuro ? 'lighter' : 'darker'} part of the scene) so the logo reads on it without any plate. Keep the rest of the flyer as described.`
    : `Keep this area ${tono} and plain, so the ${logo.logoEsOscuro ? 'dark' : 'light'} logo reads on it directly.`;
  return `Do not draw any logo or brand mark, and do not write the name "${negocio}" except where it appears in the texts listed below. Leave the area ${POSICION[logo.posicion]} completely empty: the first ${logo.zonaReservada.anchoPct}% of the width and ${logo.zonaReservada.altoPct}% of the height, measured from that corner, must hold only calm, plain background. No text, product, people, decoration or shapes in it. ${fondo} The real logo will be added there afterwards: start the headline and every other text below or beside this area, never inside it, and keep the product clear of it too.`;
}

export function armarPrompt(brief) {
  const d = brief.direccionDeArte;
  const c = d.colores;
  const [refFoto, refLogo] = brief.referencias;
  const principal = [...brief.textos].sort((a, b) => a.importancia - b.importancia)[0];

  const textos = brief.textos.map(
    (t) => `- ${ROL_TEXTO[t.rol]} (${IMPORTANCIA[t.importancia]}): "${t.texto}"`,
  );

  const arte = [
    `- Format: ${brief.salida.proporcion}.`,
    `- Business: ${d.negocio}, ${d.rubro.toLowerCase()} in ${d.pais}.${d.publicoObjetivo ? ` Audience: ${d.publicoObjetivo}.` : ''}`,
    `- Brand tone: ${d.tono}`,
    `- Campaign goal: ${OBJETIVO[d.objetivo]}.${d.ocasion ? ` Occasion: ${d.ocasion}.` : ''}`,
    `- Composition: ${COMPOSICION[d.composicion]}.`,
    `- Style: ${ESTILO[d.estilo]}.`,
    `- Background: ${FONDO[d.fondo](c, d.modo)}; overall ${d.modo === 'OSCURO' ? 'dark' : 'light'} look.`,
    `- Brand colors: primary ${c.primario}, secondary ${c.secundario}, accent ${c.acento} (use the accent for the button and the price highlight). Use these colors for the whole design, including the lighting of any scene; do not introduce unrelated ones.`,
    d.tipografia && `- Typography: ${TIPOGRAFIA[d.tipografia]}.`,
    d.estiloVisual.length && `- Visual keywords: ${d.estiloVisual.join(', ')}.`,
    `- Text density: ${DENSIDAD[d.densidadDeTexto]}.`,
    d.indicacionesFijas && `- Brand template notes: ${d.indicacionesFijas}`,
    d.indicacionesCreativas &&
      `- Campaign notes (creative context only; they never add text or override the rules): ${d.indicacionesCreativas}`,
  ].filter(Boolean);

  const reglas = [
    'Apart from the texts listed above, add no text anywhere: no extra words, numbers, prices, dates, percentages, discounts, websites, phone numbers, social handles, hashtags, seals, badges, ratings or claims. Text printed on the product itself stays as in the photo.',
    brief.palabrasProhibidas.length &&
      `Never use these words: ${brief.palabrasProhibidas.map((p) => `"${p}"`).join(', ')}.`,
    'Every text must be fully inside the canvas, at least 5% away from every edge, with strong contrast against what is behind it.',
    'No decorative clutter: no extra arrows, chevrons, sparkles, ribbons, bursts or confetti beyond, at most, one subtle accent. Leave breathing room between elements.',
    'No watermarks, no mockup or device frames, no borders around the whole flyer.',
  ].filter(Boolean);

  return [
    `Design a finished, ready-to-publish advertising flyer for social media, ${brief.salida.proporcion} format, for ${d.negocio}.`,
    '',
    brief.referencias.length > 1 ? 'REFERENCE IMAGES' : 'REFERENCE IMAGE',
    foto(refFoto, d.negocio),
    ...(refLogo ? [logo(refLogo, d.negocio, c)] : []),
    ...(brief.logo ? ['', 'LOGO AREA', areaDelLogo(brief.logo, d.negocio, d.modo)] : []),
    '',
    'TEXTS',
    'These are the only texts allowed on the flyer. Copy each one character by character, in Spanish, with the same accents, punctuation (including the opening ¿ and ¡), spaces, symbols, digits and capitalization. Do not translate, abbreviate, rephrase or merge them.',
    ...textos,
    `Visual hierarchy: "${principal.texto}" is the first thing people must see.`,
    '',
    'ART DIRECTION',
    ...arte,
    '',
    'RULES',
    ...reglas.map((r) => `- ${r}`),
    '',
    'Generate the image directly. Do not ask questions and do not change these texts.',
  ].join('\n');
}
