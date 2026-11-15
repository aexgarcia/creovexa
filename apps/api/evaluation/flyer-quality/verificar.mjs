// Verifica un flyer generado contra su brief. Funciones sin llamadas a la API.
import {
  claveDePrecio,
  leerFechas,
  leerPrecio,
  leerPrecios,
  mismoConjunto,
  normalizar,
} from './comparar.mjs';

const ROLES_DE_PRECIO = new Set(['precio', 'precioRegular', 'precioPromocional']);
const sinEspacios = (s) => normalizar(s).replace(/\s/g, '');

/**
 * Compara la lectura del flyer FINAL (con el logo ya pegado) con los textos del brief. Si el
 * logo tapó un texto porque la IA no dejó la esquina libre, ese texto falla aquí.
 * Criterio principal (ADR-0009): precios y fechas correctos, sin precios ni fechas de más.
 */
export function verificarBrief(brief, lectura, logo = null) {
  const textos = Array.isArray(lectura?.textos) ? lectura.textos : [];
  const delFlyer = textos.filter((t) => t.tipo !== 'texto_en_el_producto' && t.tipo !== 'logo');
  // Para los textos se busca en todo menos el logo: la lectura a veces clasifica el nombre
  // del producto como texto impreso en el producto.
  const todo = sinEspacios(
    textos
      .filter((t) => t.tipo !== 'logo')
      .map((t) => t.texto)
      .join(' '),
  );
  const observaciones = [];

  const esperados = brief.textos
    .filter((t) => ROLES_DE_PRECIO.has(t.rol))
    .map((t) => claveDePrecio(leerPrecio(t.texto)));
  const leidos = leerPrecios(delFlyer, observaciones).map(({ t, p }) =>
    p ? claveDePrecio(p) : `ilegible:${t.texto}`,
  );
  const precios = mismoConjunto(leidos, esperados);
  if (!precios)
    observaciones.push(
      `precios leídos [${leidos.join(', ')}], esperados [${esperados.join(', ')}]`,
    );

  const clave = (f) => `${f.dia}/${f.mes}`;
  const fechasPedidas = brief.textos
    .filter((t) => t.rol === 'vigencia')
    .flatMap((t) => leerFechas(t.texto))
    .map(clave);
  const fechasLeidas = delFlyer
    .filter((t) => ['vigencia', 'otro', 'titular'].includes(t.tipo))
    .flatMap((t) => leerFechas(t.texto))
    .map(clave);
  const fechas = mismoConjunto(fechasLeidas, fechasPedidas);
  if (!fechas)
    observaciones.push(
      `fechas leídas [${fechasLeidas.join(', ')}], esperadas [${fechasPedidas.join(', ')}]`,
    );

  // El resto de textos, con tildes y signos; los espacios y las mayúsculas no cuentan.
  const porRol = brief.textos
    .filter((t) => !ROLES_DE_PRECIO.has(t.rol) && t.rol !== 'vigencia')
    .map((t) => ({ rol: t.rol, texto: t.texto, ok: todo.includes(sinEspacios(t.texto)) }));
  for (const t of porRol.filter((x) => !x.ok))
    observaciones.push(`${t.rol} distinto o ausente: se esperaba "${t.texto}"`);

  // El logo no debe tapar texto de la IA. Un objeto bajo el logo se anota, pero no falla:
  // puede ser el borde difuso de la escena.
  const r = logo?.revision;
  const logoTapaTexto = Boolean(r?.hayTexto);
  if (logoTapaTexto) observaciones.push(`el logo tapa texto de la IA: "${r.texto}"`);
  if (r?.hayObjeto) observaciones.push(`bajo el logo había: ${r.objeto}`);

  return {
    preciosYFechas: precios && fechas,
    logoTapaTexto,
    precios,
    fechas,
    textos: { correctos: porRol.filter((t) => t.ok).length, total: porRol.length, porRol },
    observaciones,
  };
}
