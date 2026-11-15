// Prueba por API del modelo de datos nuevo (casos.json): brief → prompt → imagen → logo
// superpuesto → verificación. Envía exactamente lo mismo que preparar-chatgpt.mjs.
//
// Uso (desde apps/api):
//   node evaluation/flyer-quality/generar.mjs                       plan y costo estimado, sin llamar a nadie
//   node evaluation/flyer-quality/generar.mjs --real                genera y verifica (CONSUME CRÉDITO)
//   ... --solo=01-cafe-promocion-navidad,02-buscaditos-promocion-oscura
//   ... --repeticiones=2                                           cada caso varias veces (consistencia)
//   ... --calidad=medium                                           por defecto low
//   ... --logo=ia                                                  la IA dibuja el logo (para comparar)
//   ... --carpeta=<nombre>                                         continúa una ejecución: salta lo hecho
//   ... --resumen=<nombre>                                         rehace resumen y revisión, sin llamadas
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ruta } from './datos.mjs';
import { cargarCasos } from './casos.mjs';
import sharp from 'sharp';
import { superponerLogo } from './logo.mjs';
import { verificarBrief } from './verificar.mjs';
import {
  configurar,
  costo,
  generarImagen,
  leerFlyer,
  revisarZonaDelLogo,
  sinClave,
} from './openai.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  }),
);
const REAL = args.real === true;
const config = configurar({ ...args, calidad: args.calidad || 'low' });
const colocacionLogo = args.logo === 'ia' ? 'IA' : 'SUPERPUESTO';
const repeticiones = Math.max(1, Number(args.repeticiones) || 1);

const leerJson = async (archivo) => {
  try {
    return JSON.parse(await readFile(archivo, 'utf8'));
  } catch {
    return null;
  }
};
const escapar = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)} %` : '—');

const preparados = await cargarCasos({ colocacionLogo });
const solo = typeof args.solo === 'string' ? args.solo.split(',') : null;
const lista = preparados
  .filter((p) => !solo || solo.includes(p.caso.id))
  .flatMap((p) =>
    Array.from({ length: repeticiones }, (_, i) => ({
      ...p,
      clave: repeticiones > 1 ? `${p.caso.id}-${i + 1}` : p.caso.id,
    })),
  );

// ---------- Resumen y revisión ----------

async function resumir(carpeta) {
  const resultados = [];
  for (const g of lista) {
    const r = await leerJson(`${carpeta}/${g.clave}.json`);
    if (r) resultados.push(r);
  }
  const ok = resultados.filter((r) => r.estado === 'verificado');
  const n = resultados.length;
  const cuenta = (f) => ok.filter(f).length;
  const textosOk = ok.reduce((s, r) => s + r.verificacion.textos.correctos, 0);
  const textosTotal = ok.reduce((s, r) => s + r.verificacion.textos.total, 0);
  const segundos = ok.map((r) => r.segundosImagen).filter(Boolean);
  const total = resultados.reduce((s, r) => s + (r.costoUsd ?? 0), 0);
  const md = [
    `# Prueba por API · ${carpeta.split(/[\\/]/).pop()}`,
    '',
    `Modelo \`${resultados[0]?.config?.modeloImagen}\` (calidad \`${resultados[0]?.config?.calidad}\`), lectura con \`${resultados[0]?.config?.modeloVision}\`, logo ${colocacionLogo === 'IA' ? 'dibujado por la IA' : 'superpuesto'}.`,
    '',
    '| Métrica | Resultado |',
    '| --- | --- |',
    `| **Precios y fechas correctos** (criterio ADR-0009: 80 %; los errores cuentan como fallo) | **${pct(
      cuenta((r) => r.verificacion.preciosYFechas),
      n,
    )}** (${cuenta((r) => r.verificacion.preciosYFechas)}/${n}) |`,
    `| Resto de textos exactos (titular, nombre, CTA, descuento, legal…) | ${pct(textosOk, textosTotal)} (${textosOk}/${textosTotal}) |`,
    `| Flyers con todos los textos exactos | ${pct(
      cuenta(
        (r) =>
          r.verificacion.preciosYFechas &&
          r.verificacion.textos.correctos === r.verificacion.textos.total &&
          !r.verificacion.logoTapaTexto,
      ),
      n,
    )} |`,
    `| Logo sin tapar texto (revisión de la esquina en la imagen de la IA) | ${pct(
      cuenta((r) => !r.verificacion.logoTapaTexto),
      n,
    )} |`,
    `| Logo directo sobre el fondo / con velo | ${cuenta((r) => r.logo?.colocacion === 'DIRECTO')} / ${cuenta((r) => r.logo?.colocacion === 'VELO')} |`,
    `| Errores del proveedor | ${resultados.filter((r) => r.estado === 'error').length} |`,
    `| Tiempo por imagen | ${segundos.length ? `${Math.min(...segundos)}–${Math.max(...segundos)} s` : '—'} |`,
    `| Costo estimado | US$ ${total.toFixed(2)} en total, US$ ${(total / Math.max(n, 1)).toFixed(3)} por flyer |`,
    '',
    'Se verifica el flyer final, con el logo ya pegado: si el logo tapó un texto, ese texto falla. La lectura automática puede equivocarse; confirma los fallos en `revision.html`.',
    '',
    '| Flyer | Precios y fechas | Textos | Logo | Observaciones |',
    '| --- | --- | --- | --- | --- |',
    ...resultados.map((r) =>
      r.estado !== 'verificado'
        ? `| ${r.clave} | error | | | ${escapar(r.error)} |`
        : `| ${r.clave} | ${r.verificacion.preciosYFechas ? 'sí' : '**no**'} | ${r.verificacion.textos.correctos}/${r.verificacion.textos.total} | ${r.logo ? `${r.logo.colocacion.toLowerCase()}${r.verificacion.logoTapaTexto ? ', **tapa texto**' : ''}` : '—'} | ${escapar(r.verificacion.observaciones.join('; '))} |`,
    ),
  ].join('\n');
  await writeFile(`${carpeta}/resumen.md`, md + '\n');

  const csv = `${carpeta}/revision-manual.csv`;
  if (!(await readFile(csv, 'utf8').catch(() => null)))
    await writeFile(
      csv,
      'flyer;texto_mal_s_n;producto_respetado_s_n;esquina_del_logo_limpia_s_n;publicaria_s_n;notas\n' +
        resultados.map((r) => `${r.clave};;;;;`).join('\n') +
        '\n',
    );

  const tarjetas = resultados
    .map((r) => {
      const esperado = (r.textosEsperados ?? [])
        .map((t) => `<li><code>${escapar(t.rol)}</code> ${escapar(t.texto)}</li>`)
        .join('');
      const leido = (r.lectura?.textos ?? [])
        .map((t) => `<li><code>${escapar(t.tipo)}</code> ${escapar(t.texto)}</li>`)
        .join('');
      const v = r.verificacion;
      return `<section><h2>${escapar(r.clave)} <small>${escapar(r.prueba)}</small></h2>
<div class="fila">
${r.estado === 'error' ? `<p class="mal">${escapar(r.error)}</p>` : `<figure><img src="${escapar(r.clave)}.png"><figcaption>Final</figcaption></figure><figure><img src="${escapar(r.clave)}.ia.png"><figcaption>Lo que generó la IA</figcaption></figure>`}
<div><h3>Esperado</h3><ul>${esperado}</ul>
${v ? `<p class="${v.preciosYFechas ? 'bien' : 'mal'}">Precios y fechas: ${v.preciosYFechas ? 'correctos' : 'incorrectos'} · textos ${v.textos.correctos}/${v.textos.total}</p><ul>${v.observaciones.map((o) => `<li>${escapar(o)}</li>`).join('')}</ul>` : ''}
${(r.avisos ?? []).map((a) => `<p class="aviso">${escapar(a)}</p>`).join('')}
<details><summary>Leído</summary><ul>${leido}</ul></details>
<details><summary>Prompt</summary><pre>${escapar(r.prompt)}</pre></details>
</div></div></section>`;
    })
    .join('\n');
  await writeFile(
    `${carpeta}/revision.html`,
    `<!doctype html><html lang="es"><meta charset="utf-8"><title>Revisión por API</title>
<style>body{font:15px system-ui;margin:24px;background:#f6f6f4;color:#222}section{background:#fff;padding:16px;margin-bottom:20px;border-radius:8px}
.fila{display:grid;grid-template-columns:420px 260px 1fr;gap:16px;align-items:start}img{max-width:100%;border:1px solid #ddd}
h2 small{font-weight:400;color:#666;font-size:14px}.bien{color:#176f2c;font-weight:600}.mal{color:#b3261e;font-weight:600}.aviso{color:#8a5a00}
code{color:#666}pre{white-space:pre-wrap;font-size:12px;background:#f3f3f3;padding:8px}</style>
<h1>Revisión de la prueba por API</h1><p>Anota tu revisión en <code>revision-manual.csv</code> (s/n). La esquina del logo está limpia si el logo no tapa nada en la imagen final.</p>
${tarjetas}</html>`,
  );
  return md;
}

// ---------- Ejecución ----------

// Revisa, en la imagen de la IA ampliada, lo que el logo va a tapar.
async function revisarEsquina(png, c) {
  const recorte = await sharp(png)
    .extract({ left: c.x, top: c.y, width: c.ancho, height: c.alto })
    .resize({ width: c.ancho * 2 })
    .png()
    .toBuffer();
  return revisarZonaDelLogo(config, recorte);
}

if (args.resumen) {
  console.log(await resumir(ruta(`resultados/${args.resumen}`)));
  process.exit(0);
}

// Rehace solo la revisión de la esquina del logo de una ejecución, sin generar imágenes.
if (args['revisar-logo']) {
  if (!REAL) {
    console.log('Rehace la revisión de la esquina del logo (unos US$ 0.001 por flyer). Agrega --real.');
    process.exit(0);
  }
  const carpeta = ruta(`resultados/${args['revisar-logo']}`);
  for (const g of lista) {
    const archivo = `${carpeta}/${g.clave}.json`;
    const r = await leerJson(archivo);
    if (r?.estado !== 'verificado' || !g.brief.logo) continue;
    const ia = await readFile(`${carpeta}/${g.clave}.ia.png`);
    const { png: _png, ...colocado } = await superponerLogo(ia, g.logo.bytes, g.brief.logo);
    const { revision, uso } = await revisarEsquina(ia, colocado.cubierta);
    r.logo = { ...colocado, revision };
    r.usoRevisionLogo = uso;
    r.verificacion = verificarBrief(g.brief, r.lectura, r.logo);
    r.costoUsd = costo(r.usoImagen, r.usoVision, uso);
    await writeFile(archivo, JSON.stringify(r, null, 2));
    console.log(`${g.clave.padEnd(36)} ${revision.hayTexto ? `tapa texto: ${revision.texto}` : 'esquina libre'}`);
  }
  console.log('\n' + (await resumir(carpeta)));
  process.exit(0);
}

// Estimación previa, con los tokens observados en la prueba anterior (una sola imagen de entrada).
const PIXELES = { CUADRADO: 1, VERTICAL: 1.25, HISTORIA: 2.25 };
const SALIDA = { low: 0.006, medium: 0.053, high: 0.211 };
const estimado = lista.reduce(
  (s, g) => s + 0.016 + (SALIDA[config.calidad] ?? 0.053) * PIXELES[g.brief.salida.formato],
  0,
);
console.log(
  `${REAL ? 'EJECUCIÓN REAL' : 'Plan (sin llamadas)'} · ${lista.length} flyers · ${config.modeloImagen} ${config.calidad} · logo ${colocacionLogo.toLowerCase()} · visión ${config.modeloVision}`,
);
console.log(`Costo estimado: unos US$ ${estimado.toFixed(2)}\n`);
for (const g of lista)
  console.log(
    `  ${g.clave.padEnd(36)} ${g.brief.salida.tamano.padEnd(10)} ${g.brief.textos.length} textos`,
  );
if (!REAL) {
  console.log('\nPara ejecutar de verdad: --real');
  process.exit(0);
}
if (!config.apiKey) {
  console.error('Falta OPENAI_API_KEY en apps/api/.env.');
  process.exit(1);
}

const nombre = args.carpeta || `api-${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}`;
const carpeta = ruta(`resultados/${nombre}`);
await mkdir(carpeta, { recursive: true });
console.log(`\nResultados en ${carpeta}\n`);

let fallosSeguidos = 0;
for (const g of lista) {
  const archivo = `${carpeta}/${g.clave}.json`;
  if ((await leerJson(archivo))?.estado === 'verificado') {
    console.log(`${g.clave.padEnd(36)} ya hecho, se salta`);
    continue;
  }
  const registro = {
    clave: g.clave,
    caso: g.caso.id,
    prueba: g.caso.prueba,
    config: sinClave(config),
    prompt: g.prompt,
    avisos: g.brief.avisos,
    textosEsperados: g.brief.textos,
  };
  try {
    const imagenes = [
      g.foto,
      ...(colocacionLogo === 'IA' ? [{ ...g.logo, tipo: 'image/png' }] : []),
    ];
    const inicio = Date.now();
    const imagen = await generarImagen(config, {
      prompt: g.prompt,
      imagenes,
      tamano: g.brief.salida.tamano,
    });
    registro.segundosImagen = Math.round((Date.now() - inicio) / 1000);
    registro.usoImagen = imagen.uso;
    await writeFile(`${carpeta}/${g.clave}.ia.png`, imagen.png);
    let final = imagen.png;
    if (g.brief.logo) {
      const { png, ...colocado } = await superponerLogo(imagen.png, g.logo.bytes, g.brief.logo);
      final = png;
      // La esquina se revisa en la imagen de la IA, ampliada, antes de que el logo la tape.
      const { revision, uso } = await revisarEsquina(imagen.png, colocado.cubierta);
      registro.logo = { ...colocado, revision };
      registro.usoRevisionLogo = uso;
    }
    await writeFile(`${carpeta}/${g.clave}.png`, final);
    const { lectura, uso } = await leerFlyer(config, final);
    registro.lectura = lectura;
    registro.usoVision = uso;
    registro.verificacion = verificarBrief(g.brief, lectura, registro.logo);
    registro.costoUsd = costo(registro.usoImagen, uso, registro.usoRevisionLogo);
    registro.estado = 'verificado';
    fallosSeguidos = 0;
    const v = registro.verificacion;
    console.log(
      `${g.clave.padEnd(36)} ${v.preciosYFechas ? 'OK   ' : 'FALLA'} textos ${v.textos.correctos}/${v.textos.total} · ${registro.segundosImagen} s · US$ ${registro.costoUsd}`,
    );
  } catch (error) {
    registro.estado = 'error';
    registro.error = `${error.estado ? `HTTP ${error.estado}: ` : ''}${error.message}`;
    console.log(`${g.clave.padEnd(36)} ERROR ${registro.error}`);
    if (++fallosSeguidos >= 3) {
      await writeFile(archivo, JSON.stringify(registro, null, 2));
      console.error(
        `\nTres errores seguidos: se detiene. Revisa el error y continúa con --carpeta=${nombre}`,
      );
      break;
    }
  }
  await writeFile(archivo, JSON.stringify(registro, null, 2));
}

console.log('\n' + (await resumir(carpeta)));
console.log(
  `\nRevisión visual: ${carpeta}${process.platform === 'win32' ? '\\' : '/'}revision.html`,
);
