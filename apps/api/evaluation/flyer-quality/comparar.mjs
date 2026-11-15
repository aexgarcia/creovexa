// Compara lo que un modelo de visión leyó en el flyer con lo que el flyer debía mostrar.
// Funciones puras: no llaman a ninguna API.
import { fechasEsperadas, textosEsperados } from './datos.mjs';

const MESES = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

// Mayúsculas y espacios no cuentan (un diseño puede poner el CTA en mayúsculas);
// las tildes y la puntuación sí.
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFC')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es');
}

function moneda(texto) {
  if (/US\s*\$|USD/i.test(texto)) return 'USD';
  if (/€|EUR/i.test(texto)) return 'EUR';
  if (/S\s*\/|PEN|soles/i.test(texto)) return 'PEN';
  if (/\$/.test(texto)) return 'USD';
  return null;
}

// Extrae los importes de un texto. Acepta 1,299.00, 1.299,00, 1299 y 89.9.
// Devuelve importes en unidades menores para comparar sin errores de coma flotante.
export function importes(texto) {
  const encontrados = [];
  for (const m of String(texto).matchAll(/\d[\d.,\s]*\d|\d/g)) {
    const crudo = m[0].replace(/\s/g, '');
    let entero = crudo;
    let decimales = '';
    const decimal = crudo.match(/[.,](\d{1,2})$/);
    if (decimal) {
      entero = crudo.slice(0, -decimal[0].length);
      decimales = decimal[1];
    }
    entero = entero.replace(/[.,]/g, '');
    if (!/^\d+$/.test(entero)) continue;
    encontrados.push(Number(entero) * 100 + Number(decimales.padEnd(2, '0') || 0));
  }
  return encontrados;
}

export function leerPrecio(texto) {
  const montos = importes(texto);
  return montos.length === 1 ? { moneda: moneda(texto), montoMenor: montos[0] } : null;
}

export function leerFechas(texto) {
  const fechas = [];
  const t = normalizar(texto);
  for (const m of t.matchAll(/(\d{1,2})\s+de\s+([a-záéíóú]+)/g)) {
    const mes = MESES[m[2]];
    if (mes) fechas.push({ dia: Number(m[1]), mes });
  }
  for (const m of t.matchAll(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/g)) {
    fechas.push({ dia: Number(m[1]), mes: Number(m[2]) });
  }
  return fechas;
}

const clave = (p) => `${p.moneda ?? '?'}:${p.montoMenor}`;
const claveFecha = (f) => `${f.dia}/${f.mes}`;
// Un mismo precio puede repetirse (por ejemplo, en el botón); importa qué valores aparecen.
const mismoConjunto = (a, b) => {
  const x = new Set(a);
  const y = new Set(b);
  return x.size === y.size && [...x].every((v) => y.has(v));
};

export const claveDePrecio = clave;
export { mismoConjunto };

/**
 * Precios que la lectura ve en el flyer, con estas reglas:
 * - Un diseño puede separar el símbolo del importe ("S/" encima de "74.90"); la lectura los
 *   devuelve como bloques distintos. El símbolo suelto se aplica al importe siguiente.
 * - "500g", "100% ARÁBICA" o "200 Hz" impresos en el producto no son precios aunque la lectura
 *   los clasifique así: sin moneda y sin rol de precio, se anotan y se ignoran.
 * Devuelve [{ t, p }], con p = null si el bloque es ilegible o tiene varios importes.
 */
export function leerPrecios(delFlyer, observaciones) {
  const resultado = [];
  let monedaSuelta = null;
  for (const t of delFlyer) {
    if (!/\d/.test(t.texto)) {
      monedaSuelta = moneda(t.texto) ?? monedaSuelta;
      continue;
    }
    if (!t.tipo.startsWith('precio_')) {
      monedaSuelta = null;
      continue;
    }
    if (t.tipo === 'precio_otro' && !moneda(t.texto) && !monedaSuelta) {
      observaciones.push(`número sin moneda, no se cuenta como precio: "${t.texto}"`);
      continue;
    }
    const leido = leerPrecio(t.texto);
    const p = leido && { ...leido, moneda: leido.moneda ?? monedaSuelta };
    monedaSuelta = null;
    if (!p) observaciones.push(`precio ilegible o con varios importes: "${t.texto}"`);
    resultado.push({ t, p });
  }
  return resultado;
}

/**
 * lectura: { textos: [{ texto, tipo }], logo: { visible, texto } }
 * tipo: nombre_producto | titular | cta | precio_regular | precio_promocional | precio_otro |
 *       vigencia | logo | texto_en_el_producto | otro
 */
export function comparar(escenario, marca, lectura, zonaHoraria) {
  const esperado = textosEsperados(escenario, zonaHoraria);
  const textos = Array.isArray(lectura?.textos) ? lectura.textos : [];
  const delFlyer = textos.filter((t) => t.tipo !== 'texto_en_el_producto' && t.tipo !== 'logo');
  const todo = normalizar(delFlyer.map((t) => t.texto).join(' '));
  const observaciones = [];

  // Precios: los importes leídos deben ser exactamente los esperados, ni más ni menos.
  const esperados = [escenario.producto.precio, escenario.promocion?.precio]
    .filter(Boolean)
    .map((p) => clave({ moneda: p.moneda, montoMenor: p.montoMenor }));
  const leidos = [];
  for (const { t, p } of leerPrecios(delFlyer, observaciones)) {
    if (!p) {
      leidos.push(`ilegible:${t.texto}`);
      continue;
    }
    leidos.push(clave(p));
    const rol = escenario.promocion
      ? t.tipo === 'precio_regular'
        ? clave({ ...escenario.producto.precio })
        : t.tipo === 'precio_promocional'
          ? clave({ ...escenario.promocion.precio })
          : null
      : clave({ ...escenario.producto.precio });
    if (rol && rol !== clave(p) && esperados.includes(clave(p)))
      observaciones.push(`precio en el rol equivocado: "${t.texto}" como ${t.tipo}`);
  }
  const precios = mismoConjunto(leidos, esperados);
  if (!precios)
    observaciones.push(
      `precios leídos [${leidos.join(', ')}], esperados [${esperados.join(', ')}]`,
    );
  // Formato exacto: símbolo, separador de miles y dos decimales. Los espacios no cuentan:
  // un diseño puede pegar el símbolo o poner los céntimos como superíndice.
  const sinEspacios = (s) => normalizar(s).replace(/\s/g, '');
  const preciosExactos =
    precios &&
    [esperado.precioRegular, esperado.precioPromocional]
      .filter(Boolean)
      .every((p) => sinEspacios(todo).includes(sinEspacios(p)));

  // Fechas: mismo día y mes; si no hay promoción con fechas, no debe aparecer ninguna.
  const fechasLeidas = delFlyer
    .filter((t) => t.tipo === 'vigencia' || t.tipo === 'otro' || t.tipo === 'titular')
    .flatMap((t) => leerFechas(t.texto))
    .map(claveFecha);
  const fechasPedidas = fechasEsperadas(escenario.promocion, zonaHoraria).map(claveFecha);
  const fechas = mismoConjunto(fechasLeidas, fechasPedidas);
  if (!fechas)
    observaciones.push(
      `fechas leídas [${fechasLeidas.join(', ')}], esperadas [${fechasPedidas.join(', ')}]`,
    );

  // El nombre puede leerse como "texto en el producto" cuando el diseño lo pone junto a él.
  const todoSinLogo = normalizar(
    textos
      .filter((t) => t.tipo !== 'logo')
      .map((t) => t.texto)
      .join(' '),
  );
  const textosOk = {
    nombre: todoSinLogo.includes(normalizar(esperado.nombre)),
    titular: todo.includes(normalizar(esperado.titular)),
    cta: todo.includes(normalizar(esperado.cta)),
  };
  for (const [campo, ok] of Object.entries(textosOk))
    if (!ok) observaciones.push(`${campo} distinto o ausente: se esperaba "${esperado[campo]}"`);

  const logoLeido = normalizar(lectura?.logo?.texto);
  const logo = Boolean(lectura?.logo?.visible) && logoLeido.includes(normalizar(marca.textoLogo));
  if (!logo)
    observaciones.push(
      `logo no visible o con otro texto: se leyó "${lectura?.logo?.texto ?? ''}", se esperaba "${marca.textoLogo}"`,
    );

  return {
    // Criterio principal del ADR-0009.
    preciosYFechas: precios && fechas,
    precios,
    preciosExactos,
    fechas,
    textos: textosOk,
    logoTexto: logo,
    observaciones,
  };
}
