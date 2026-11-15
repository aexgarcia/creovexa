// Datos de marca que el sistema deriva del logo, sin IA (decisión 1 de datos-del-flyer.md).
import sharp from 'sharp';

const hex = ([r, g, b]) =>
  '#' +
  [r, g, b]
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
const luminancia = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const saturacion = ([r, g, b]) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
};
const distancia = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const mezclar = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// Píxeles opacos y no casi blancos del logo (el blanco suele ser fondo o espacio).
async function pixeles(logo) {
  const { data, info } = await sharp(logo)
    .resize(96, 96, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const lista = [];
  for (let i = 0; i < data.length; i += info.channels) {
    const color = [data[i], data[i + 1], data[i + 2]];
    if (data[i + 3] < 128 || color.every((v) => v > 235)) continue;
    lista.push(color);
  }
  return lista;
}

/** Propone los colores de marca a partir del logo. El usuario puede corregirlos. */
export async function proponerColores(logo) {
  const lista = await pixeles(logo);
  // Agrupa en cubetas de 32 niveles por canal y promedia cada cubeta.
  const cubetas = new Map();
  for (const c of lista) {
    const clave = c.map((v) => v >> 5).join(',');
    const cubeta = cubetas.get(clave) ?? { suma: [0, 0, 0], n: 0 };
    cubeta.suma = cubeta.suma.map((v, i) => v + c[i]);
    cubeta.n++;
    cubetas.set(clave, cubeta);
  }
  const grupos = [...cubetas.values()]
    .map((c) => ({ color: c.suma.map((v) => v / c.n), n: c.n }))
    .filter((g) => g.n >= lista.length * 0.02)
    .sort((a, b) => b.n - a.n);
  const distintos = [];
  for (const g of grupos)
    if (distintos.every((d) => distancia(d.color, g.color) > 60)) distintos.push(g);
  const primario = distintos[0]?.color ?? [17, 24, 39];
  const secundario = distintos[1]?.color ?? mezclar(primario, [255, 255, 255], 0.4);
  const acento =
    [...distintos].sort((a, b) => saturacion(b.color) - saturacion(a.color))[0]?.color ??
    secundario;
  return {
    primario: hex(primario),
    secundario: hex(secundario),
    acento: hex(acento),
    fondoClaro: hex(mezclar(primario, [255, 255, 255], 0.92)),
    fondoOscuro: hex(mezclar(primario, [0, 0, 0], 0.75)),
  };
}

/** El logo es oscuro si sus píxeles de color son, en promedio, poco luminosos. */
export async function logoEsOscuro(logo) {
  const lista = await pixeles(logo);
  if (!lista.length) return false;
  return lista.reduce((s, c) => s + luminancia(c), 0) / lista.length < 0.5;
}

export async function tieneFondoTransparente(imagen) {
  const { hasAlpha } = await sharp(imagen).metadata();
  if (!hasAlpha) return false;
  const { channels } = await sharp(imagen).stats();
  return channels[3].min < 255;
}
