// Logo superpuesto: la IA deja una esquina vacía y el sistema pega encima el logo original,
// directo sobre el fondo si contrasta o sobre un velo translúcido si no.
// La prueba en ChatGPT mostró que la IA cambia el texto pequeño de un logo (el eslogan de
// Buscaditos en 3 de 6 flyers) aunque se le pida reproducirlo exacto.
import sharp from 'sharp';

const MARGEN = 0.04; // del lado menor del lienzo, desde los bordes
// De la anchura del lienzo: 30 % en cuadrado y más en lienzos angostos (40 % en 9:16),
// para que el logo no quede diminuto en una historia.
const anchoMaximo = (ancho, alto) => 0.3 * Math.sqrt(alto / ancho);
const ALTO_MAX = 0.13; // de la altura del lienzo
const RELLENO = 0.18; // de la altura del logo, alrededor del logo dentro del velo

/**
 * Dónde y de qué tamaño va el logo (con su relleno), en píxeles, para un lienzo dado.
 * proporcionLogo: ancho / alto del logo.
 */
export function zonaDelLogo(ancho, alto, proporcionLogo, posicion) {
  const margen = Math.round(Math.min(ancho, alto) * MARGEN);
  // El logo entra en la zona máxima descontando el relleno.
  let altoLogo = (alto * ALTO_MAX) / (1 + 2 * RELLENO);
  let anchoLogo = altoLogo * proporcionLogo;
  const anchoDisponible = ancho * anchoMaximo(ancho, alto) - 2 * RELLENO * altoLogo;
  if (anchoLogo > anchoDisponible) {
    anchoLogo = anchoDisponible;
    altoLogo = anchoLogo / proporcionLogo;
  }
  const relleno = Math.round(altoLogo * RELLENO);
  const zona = {
    ancho: Math.round(anchoLogo) + 2 * relleno,
    alto: Math.round(altoLogo) + 2 * relleno,
  };
  const derecha = posicion.endsWith('DERECHA');
  const abajo = posicion.startsWith('ABAJO');
  return {
    x: derecha ? ancho - margen - zona.ancho : margen,
    y: abajo ? alto - margen - zona.alto : margen,
    ...zona,
    relleno,
    logo: { ancho: Math.round(anchoLogo), alto: Math.round(altoLogo) },
  };
}

/** La zona en porcentajes del lienzo, con holgura, para pedírsela a la IA. */
export function zonaReservada(proporcionLienzo, proporcionLogo, posicion) {
  const ancho = 1000;
  const alto = Math.round(ancho / proporcionLienzo);
  const z = zonaDelLogo(ancho, alto, proporcionLogo, posicion);
  // En la primera prueba por API la IA dejó una esquina más chica que la pedida (caso 04).
  const holgura = 0.04;
  return {
    posicion,
    anchoPct: Math.round(
      (((z.x < ancho / 2 ? z.x : ancho - z.x - z.ancho) + z.ancho) / ancho) * 100 + holgura * 100,
    ),
    altoPct: Math.round(
      (((z.y < alto / 2 ? z.y : alto - z.y - z.alto) + z.alto) / alto) * 100 + holgura * 100,
    ),
  };
}

const luminancia = (r, g, b) => {
  const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contraste = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

// Un píxel del contorno se lee si contrasta 3:1 con el fondo (WCAG para gráficos y texto
// grande) o, si ni sobre su fondo de diseño llega a eso (el amarillo de Buscaditos sobre
// blanco), si conserva el 75 % del contraste que tiene sobre ese fondo. El fondo de diseño es
// blanco para logos oscuros y negro para logos claros. El fondo bajo el logo no debe estar cargado.
const CONTRASTE_MINIMO = 3;
const FRACCION_DEL_DISENO = 0.75;
const CONTORNO_LEGIBLE = 0.85;
const FONDO_CARGADO = 0.1; // desviación de la luminancia del fondo bajo el logo

async function logoAjustado(logo, z) {
  return sharp(logo)
    .resize(z.logo.ancho, z.logo.alto, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha();
}

/**
 * Mide, sin IA, si el logo se lee pegado directo sobre el fondo: compara cada píxel del
 * contorno del logo (opaco y junto a uno transparente) con el píxel del flyer que queda debajo.
 * El relleno interior no cuenta: la crema dentro del círculo de Café Andino contrasta con el
 * círculo, no con el fondo.
 */
export async function medirLegibilidad(flyer, logo, { posicion, logoEsOscuro }) {
  const fondoDeDiseno = logoEsOscuro ? 1 : 0;
  const { width: ancho, height: alto } = await sharp(flyer).metadata();
  const meta = await sharp(logo).metadata();
  const z = zonaDelLogo(ancho, alto, meta.width / meta.height, posicion);
  const { ancho: w, alto: h } = z.logo;
  const fondo = await sharp(flyer)
    .extract({ left: z.x + z.relleno, top: z.y + z.relleno, width: w, height: h })
    .removeAlpha()
    .raw()
    .toBuffer();
  const marca = await (await logoAjustado(logo, z)).raw().toBuffer();
  const opaco = (x, y) => x >= 0 && y >= 0 && x < w && y < h && marca[(y * w + x) * 4 + 3] >= 128;
  let contorno = 0;
  let legibles = 0;
  let suma = 0;
  let suma2 = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const lf = luminancia(fondo[i * 3], fondo[i * 3 + 1], fondo[i * 3 + 2]);
      suma += lf;
      suma2 += lf * lf;
      if (!opaco(x, y)) continue;
      if (opaco(x - 1, y) && opaco(x + 1, y) && opaco(x, y - 1) && opaco(x, y + 1)) continue;
      contorno++;
      const ll = luminancia(marca[i * 4], marca[i * 4 + 1], marca[i * 4 + 2]);
      const exigido = Math.min(
        CONTRASTE_MINIMO,
        FRACCION_DEL_DISENO * contraste(ll, fondoDeDiseno),
      );
      if (contraste(ll, lf) >= exigido) legibles++;
    }
  const n = w * h;
  const desviacion = Math.sqrt(Math.max(suma2 / n - (suma / n) ** 2, 0));
  const proporcion = contorno ? legibles / contorno : 0;
  return {
    zona: z,
    contornoLegible: Math.round(proporcion * 100) / 100,
    desviacionFondo: Math.round(desviacion * 1000) / 1000,
    luminanciaFondo: suma / n,
    directo: proporcion >= CONTORNO_LEGIBLE && desviacion <= FONDO_CARGADO,
  };
}

/**
 * Pega el logo original sobre el flyer. Si contrasta con el fondo, va directo, sin placa.
 * Si no, sobre un velo: el fondo de la zona desenfocado y teñido, translúcido y sin sombra
 * (claro para logos oscuros, oscuro para logos claros). Devuelve la imagen y cómo se pegó.
 */
export async function superponerLogo(flyer, logo, { posicion, colorVelo, logoEsOscuro }) {
  const medida = await medirLegibilidad(flyer, logo, { posicion, logoEsOscuro });
  const z = medida.zona;
  const capas = [];
  if (!medida.directo) {
    const radio = Math.round(z.alto * 0.3);
    // Bordes difuminados: el velo se funde con el fondo en vez de verse como una tarjeta.
    const borde = Math.round(z.alto * 0.08);
    // Lo justo para que el logo se lea: casi transparente si el fondo ya se acerca al tono
    // del velo, más denso si es el opuesto (logo oscuro sobre un flyer oscuro).
    const lejania = logoEsOscuro ? 1 - medida.luminanciaFondo : medida.luminanciaFondo;
    const opacidad = Math.round((0.45 + 0.45 * lejania) * 100) / 100;
    const rect = (relleno) =>
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${z.ancho}" height="${z.alto}"><defs><filter id="b"><feGaussianBlur stdDeviation="${borde}"/></filter></defs><rect x="${borde * 1.5}" y="${borde * 1.5}" width="${z.ancho - borde * 3}" height="${z.alto - borde * 3}" rx="${radio}" ${relleno} filter="url(#b)"/></svg>`,
      );
    const desenfocado = await sharp(flyer)
      .extract({ left: z.x, top: z.y, width: z.ancho, height: z.alto })
      .blur(Math.max(z.alto * 0.12, 1))
      .png()
      .toBuffer();
    const velo = await sharp(desenfocado)
      .ensureAlpha()
      .composite([
        { input: rect(`fill="${colorVelo}" fill-opacity="${opacidad}"`) },
        { input: rect('fill="#fff"'), blend: 'dest-in' },
      ])
      .png()
      .toBuffer();
    capas.push({ input: velo, left: z.x, top: z.y });
  }
  capas.push({
    input: await (await logoAjustado(logo, z)).png().toBuffer(),
    left: z.x + z.relleno,
    top: z.y + z.relleno,
  });
  const png = await sharp(flyer).composite(capas).png().toBuffer();
  return {
    png,
    colocacion: medida.directo ? 'DIRECTO' : 'VELO',
    contornoLegible: medida.contornoLegible,
    desviacionFondo: medida.desviacionFondo,
    zona: { x: z.x, y: z.y, ancho: z.ancho, alto: z.alto },
    // Lo que de verdad queda tapado: el logo, o el logo con medio relleno si lleva velo (los
    // bordes del velo son difusos). Un titular que empieza justo debajo del logo no cuenta.
    cubierta: medida.directo
      ? { x: z.x + z.relleno, y: z.y + z.relleno, ancho: z.logo.ancho, alto: z.logo.alto }
      : {
          x: z.x + Math.round(z.relleno / 2),
          y: z.y + Math.round(z.relleno / 2),
          ancho: z.logo.ancho + z.relleno,
          alto: z.logo.alto + z.relleno,
        },
  };
}
