// Llamadas a OpenAI de las pruebas: generar la imagen, leerla con visión y estimar el costo.
// Lee OPENAI_API_KEY, OPENAI_IMAGE_MODEL, OPENAI_IMAGE_QUALITY y OPENAI_COPY_MODEL de apps/api/.env.
// La clave nunca se imprime ni se guarda en los resultados.
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));

export function configurar(args = {}) {
  return {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    modeloImagen: args.modelo || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
    calidad: args.calidad || process.env.OPENAI_IMAGE_QUALITY || 'medium',
    modeloVision:
      args.vision || process.env.EVAL_VISION_MODEL || process.env.OPENAI_COPY_MODEL || 'gpt-5-mini',
    timeoutImagenMs: Math.max(Number(process.env.OPENAI_IMAGE_TIMEOUT_MS) || 0, 240000),
    timeoutVisionMs: 90000,
  };
}

/** Configuración sin la clave, para guardarla en los resultados. */
export const sinClave = ({ apiKey: _clave, ...resto }) => resto;

// USD por millón de tokens. Referencia pública de noviembre de 2026; confirma con tu facturación.
const TARIFAS = {
  imagen: { textoEntrada: 5, imagenEntrada: 8, imagenSalida: 30 },
  vision: { entrada: 0.25, salida: 2 },
};

async function llamar(config, url, opciones, timeoutMs) {
  const respuesta = await fetch(url, {
    ...opciones,
    redirect: 'error',
    headers: { ...opciones.headers, Authorization: 'Bearer ' + config.apiKey },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const cuerpo = await respuesta.text();
  let json;
  try {
    json = JSON.parse(cuerpo);
  } catch {
    json = null;
  }
  if (!respuesta.ok) {
    const error = new Error(json?.error?.message ?? `HTTP ${respuesta.status}`);
    error.estado = respuesta.status;
    throw error;
  }
  return json;
}

/** imagenes: [{ bytes, tipo, nombre }], en el orden en que el prompt las nombra. */
export async function generarImagen(config, { prompt, imagenes, tamano = '1024x1024' }) {
  const body = new FormData();
  body.append('model', config.modeloImagen);
  for (const r of imagenes)
    body.append('image[]', new Blob([new Uint8Array(r.bytes)], { type: r.tipo }), r.nombre);
  body.append('prompt', prompt);
  body.append('n', '1');
  body.append('size', tamano);
  body.append('quality', config.calidad);
  body.append('output_format', 'png');
  const json = await llamar(
    config,
    'https://api.openai.com/v1/images/edits',
    { method: 'POST', body },
    config.timeoutImagenMs,
  );
  const b64 = json?.data?.[0]?.b64_json;
  if (typeof b64 !== 'string' || !b64) throw new Error('La respuesta no trae imagen');
  return { png: Buffer.from(b64, 'base64'), uso: json.usage ?? null };
}

const TIPOS = [
  'nombre_producto',
  'titular',
  'cta',
  'precio_regular',
  'precio_promocional',
  'precio_otro',
  'vigencia',
  'logo',
  'texto_en_el_producto',
  'otro',
];

/** Transcribe el flyer sin conocer los textos esperados, para no inducir la lectura. */
export async function leerFlyer(config, png) {
  const esquema = {
    type: 'object',
    additionalProperties: false,
    required: ['textos', 'logo'],
    properties: {
      textos: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['texto', 'tipo'],
          properties: { texto: { type: 'string' }, tipo: { type: 'string', enum: TIPOS } },
        },
      },
      logo: {
        type: 'object',
        additionalProperties: false,
        required: ['visible', 'texto'],
        properties: { visible: { type: 'boolean' }, texto: { type: 'string' } },
      },
    },
  };
  const json = await llamar(
    config,
    'https://api.openai.com/v1/responses',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.modeloVision,
        store: false,
        reasoning: { effort: 'low' },
        max_output_tokens: 8000,
        instructions:
          'You are a meticulous proofreader. Transcribe every piece of visible text in the advertising image EXACTLY as it is drawn, character by character: keep misspellings, missing or extra accents, wrong digits, odd spacing and punctuation. Never correct, complete or guess. If a character is unreadable, write ? in its place. One entry per visually separate text block, in reading order. Classify each block: nombre_producto (the product or service name), titular (main headline), cta (call to action / button), precio_regular (regular or crossed-out price), precio_promocional (offer price), precio_otro (any other amount), vigencia (dates or validity), logo (text that belongs to the business logo), texto_en_el_producto (text printed on the product or its packaging), otro. Also report whether a business logo is visible and its text.',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_image',
                image_url: 'data:image/png;base64,' + png.toString('base64'),
                detail: 'high',
              },
            ],
          },
        ],
        text: {
          format: { type: 'json_schema', name: 'lectura_flyer', strict: true, schema: esquema },
        },
      }),
    },
    config.timeoutVisionMs,
  );
  if (json.status !== 'completed') throw new Error('Lectura incompleta: ' + json.status);
  const texto = json.output
    ?.filter((o) => o.type === 'message')
    .flatMap((o) => o.content ?? [])
    .find((c) => c.type === 'output_text')?.text;
  if (!texto) throw new Error('La lectura no trae texto');
  return { lectura: JSON.parse(texto), uso: json.usage ?? null };
}

/**
 * Revisa el recorte de la esquina del logo en la imagen de la IA, antes de pegarlo: si hay
 * texto, el logo lo taparía. En la primera prueba por API el logo tapó "Nuevo en" y la lectura
 * del flyer completo no lo notó, porque el modelo de visión completa las letras cortadas.
 */
export async function revisarZonaDelLogo(config, png) {
  const esquema = {
    type: 'object',
    additionalProperties: false,
    required: ['hayTexto', 'texto', 'hayObjeto', 'objeto'],
    properties: {
      hayTexto: { type: 'boolean' },
      texto: { type: 'string' },
      hayObjeto: { type: 'boolean' },
      objeto: { type: 'string' },
    },
  };
  const json = await llamar(
    config,
    'https://api.openai.com/v1/responses',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.modeloVision,
        store: false,
        reasoning: { effort: 'low' },
        max_output_tokens: 2000,
        instructions:
          'This is a crop of an advertising image. Report whether it contains any text, letters or parts of letters (even cut off at the edges), and transcribe them. Separately, report whether it contains any object, product, person, icon or graphic shape, as opposed to plain or softly blurred background, and name it.',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_image',
                image_url: 'data:image/png;base64,' + png.toString('base64'),
                detail: 'high',
              },
            ],
          },
        ],
        text: {
          format: { type: 'json_schema', name: 'zona_del_logo', strict: true, schema: esquema },
        },
      }),
    },
    config.timeoutVisionMs,
  );
  if (json.status !== 'completed') throw new Error('Revisión incompleta: ' + json.status);
  const texto = json.output
    ?.filter((o) => o.type === 'message')
    .flatMap((o) => o.content ?? [])
    .find((c) => c.type === 'output_text')?.text;
  if (!texto) throw new Error('La revisión no trae texto');
  return { revision: JSON.parse(texto), uso: json.usage ?? null };
}

export function costo(usoImagen, ...usosVision) {
  const m = 1e6;
  let usd = 0;
  if (usoImagen) {
    const d = usoImagen.input_tokens_details ?? {};
    const texto = d.text_tokens ?? 0;
    const imagen = d.image_tokens ?? Math.max((usoImagen.input_tokens ?? 0) - texto, 0);
    usd +=
      (texto * TARIFAS.imagen.textoEntrada +
        imagen * TARIFAS.imagen.imagenEntrada +
        (usoImagen.output_tokens ?? 0) * TARIFAS.imagen.imagenSalida) /
      m;
  }
  for (const usoVision of usosVision.filter(Boolean))
    usd +=
      ((usoVision.input_tokens ?? 0) * TARIFAS.vision.entrada +
        (usoVision.output_tokens ?? 0) * TARIFAS.vision.salida) /
      m;
  return Math.round(usd * 10000) / 10000;
}
