// Carga y formato de los escenarios. Lo comparten validar.mjs y ejecutar.mjs para que
// los textos que se piden al generador y los que se verifican sean exactamente los mismos.
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const BASE = new URL('./', import.meta.url);
export const ruta = (relativa) => fileURLToPath(new URL(relativa, BASE));

export const SIMBOLO = { PEN: 'S/', USD: 'US$', EUR: '€' };

export async function cargarEscenarios() {
  return JSON.parse(await readFile(ruta('escenarios.json'), 'utf8'));
}

export function precio({ montoMenor, moneda }) {
  const texto = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(montoMenor / 100);
  return `${SIMBOLO[moneda]} ${texto}`;
}

export function fecha(iso, zonaHoraria) {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'long',
    timeZone: zonaHoraria,
  }).format(new Date(iso));
}

export function vigencia(promocion, zonaHoraria) {
  if (!promocion) return null;
  const { inicio, fin } = promocion;
  if (inicio && fin) return `Del ${fecha(inicio, zonaHoraria)} al ${fecha(fin, zonaHoraria)}`;
  if (fin) return `Hasta el ${fecha(fin, zonaHoraria)}`;
  if (inicio) return `Desde el ${fecha(inicio, zonaHoraria)}`;
  return null;
}

// Día y mes (1-12) de cada fecha de la promoción, en la zona horaria del negocio.
export function fechasEsperadas(promocion, zonaHoraria) {
  if (!promocion) return [];
  const partes = (iso) => {
    const p = new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'numeric',
      timeZone: zonaHoraria,
    }).formatToParts(new Date(iso));
    return {
      dia: Number(p.find((x) => x.type === 'day').value),
      mes: Number(p.find((x) => x.type === 'month').value),
    };
  };
  return [promocion.inicio, promocion.fin].filter(Boolean).map(partes);
}

// Lo que el flyer debe mostrar exactamente.
export function textosEsperados(escenario, zonaHoraria) {
  const { producto, promocion, texto } = escenario;
  return {
    nombre: producto.nombre,
    titular: texto.titular,
    cta: texto.cta,
    precioRegular: precio(producto.precio),
    precioPromocional: promocion ? precio(promocion.precio) : null,
    vigencia: vigencia(promocion, zonaHoraria),
  };
}

// Una entrada por generación: los escenarios con repeticiones aparecen varias veces.
export function generaciones(escenarios) {
  return escenarios.flatMap((e) =>
    Array.from({ length: e.repeticiones ?? 1 }, (_, i) => ({
      escenario: e,
      intento: i + 1,
      clave: (e.repeticiones ?? 1) > 1 ? `${e.id}-${i + 1}` : e.id,
    })),
  );
}

export async function existe(relativa) {
  try {
    await access(ruta(relativa));
    return true;
  } catch {
    return false;
  }
}
