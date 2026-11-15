// Prueba de calidad del modo AI_FULL (ADR-0009): la IA genera el flyer completo con el
// texto integrado, y un modelo de visión lee lo que quedó escrito para compararlo.
//
// Uso (desde apps/api):
//   node evaluation/flyer-quality/ejecutar.mjs                 simula: arma las solicitudes, no llama a nadie
//   node evaluation/flyer-quality/ejecutar.mjs --real          genera y verifica (CONSUME CRÉDITO)
//   ... --solo=CA-01,VO-02                                     solo esos escenarios
//   ... --carpeta=2026-11-14T15-00                             continúa una ejecución: salta lo ya hecho
//   ... --verificar=2026-11-14T15-00 --real                    vuelve a leer flyers ya generados (solo visión)
//   ... --resumen=2026-11-14T15-00                             recalcula el resumen con tu revisión manual
//
// Lee OPENAI_API_KEY, OPENAI_IMAGE_MODEL, OPENAI_IMAGE_QUALITY y OPENAI_COPY_MODEL de apps/api/.env.
// La clave nunca se imprime ni se guarda en los resultados.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { cargarEscenarios, generaciones, ruta, textosEsperados } from './datos.mjs';
import { comparar } from './comparar.mjs';
import { configurar, costo, generarImagen, leerFlyer, sinClave } from './openai.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  }),
);
const REAL = args.real === true;
const config = configurar(args);

const PALETAS = {
  BLUE: 'deep navy background (#101321) with electric blue accents (#4b63fb) and white text',
  CORAL: 'deep burgundy background (#251214) with coral accents (#c74335) and warm white text',
};
const LAYOUTS = {
  CLASSIC:
    'the product photo is the large hero of the composition; headline at the top, prices and call to action at the bottom, always with strong contrast over the image',
  PRODUCT_FOCUS:
    'the product sits centered and large on a clean panel; texts arranged around it without covering the product',
};

const { escenarios, marcas, zonaHoraria } = await cargarEscenarios();

function instrucciones(escenario) {
  const marca = marcas[escenario.marca];
  const t = textosEsperados(escenario, zonaHoraria);
  const precios = t.precioPromocional
    ? [
        `- Regular price, smaller and struck through: "Antes ${t.precioRegular}"`,
        `- Offer price, the largest and most prominent text: "Ahora ${t.precioPromocional}"`,
      ]
    : [`- Price, large and prominent: "${t.precioRegular}"`];
  return [
    'Design a finished square advertising flyer for social media, for a business in Peru.',
    '',
    'Image 1 is the product photo. Keep the product identical: same shape, proportions, colors, materials and any text or logo printed on it. Do not redesign it, do not add or remove items.',
    // La prueba completa mostró logos oscuros ilegibles sobre fondos oscuros y logos
    // recoloreados por la IA. La placa blanca resuelve ambos sin tocar el logo.
    'Image 2 is the business logo. Place it once, in a corner, on a solid white rounded plate with generous padding, so it is fully legible on any background. Reproduce the logo exactly as supplied: same shapes, same original colors, same letters. Never recolor, invert, lighten, outline, redraw, restyle, translate or complete it. Every letter of the logo, including small ones, must be sharp and readable.',
    '',
    'Render EXACTLY these Spanish texts, character by character, with the same accents, punctuation, spaces and digits:',
    `- Product name: "${t.nombre}"`,
    `- Headline: "${t.titular}"`,
    ...precios,
    ...(t.vigencia ? [`- Validity, small: "${t.vigencia}"`] : []),
    `- Call to action, inside a button: "${t.cta}"`,
    '',
    'Do not add any other text, number, price, date, percentage, discount, website, phone number, social handle or claim. Text already printed on the product itself must stay as it is in the photo.',
    '',
    `Business: ${marca.nombre}. ${marca.descripcion} Brand tone: ${marca.tono}`,
    `Style: ${PALETAS[escenario.plantilla.palette]}. Layout: ${LAYOUTS[escenario.plantilla.layout]}.`,
    'Clean, modern, professional typography; every text perfectly legible.',
  ].join('\n');
}

// Fotos de cámara de hasta 6000 px: se corrige la orientación EXIF y se reducen a 1536 px.
async function referencias(escenario) {
  const foto = sharp(ruta(escenario.producto.foto)).rotate().resize(1536, 1536, {
    fit: 'inside',
    withoutEnlargement: true,
  });
  const { hasAlpha } = await sharp(ruta(escenario.producto.foto)).metadata();
  const producto = hasAlpha
    ? { bytes: await foto.png().toBuffer(), tipo: 'image/png', nombre: 'producto.png' }
    : {
        bytes: await foto.jpeg({ quality: 90 }).toBuffer(),
        tipo: 'image/jpeg',
        nombre: 'producto.jpg',
      };
  const logo = {
    bytes: await sharp(ruta(marcas[escenario.marca].logo), { density: 144 }).png().toBuffer(),
    tipo: 'image/png',
    nombre: 'logo.png',
  };
  return { producto, logo };
}

async function leerJson(archivo) {
  try {
    return JSON.parse(await readFile(archivo, 'utf8'));
  } catch {
    return null;
  }
}

// ---------- Resumen y revisión ----------

const pct = (n, d) => (d ? `${Math.round((n / d) * 100)} %` : '—');
const escapar = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );

async function revisionManual(carpeta) {
  const csv = await readFile(`${carpeta}/revision-manual.csv`, 'utf8').catch(() => '');
  const filas = csv.split(/\r?\n/).slice(1).filter(Boolean);
  return Object.fromEntries(
    filas.map((f) => {
      const [clave, logo, producto, ...notas] = f.split(';');
      const si = (v) =>
        /^s/i.test(v?.trim() ?? '') ? true : /^n/i.test(v?.trim() ?? '') ? false : null;
      return [clave, { logo: si(logo), producto: si(producto), notas: notas.join(';').trim() }];
    }),
  );
}

async function resumir(carpeta) {
  const lista = generaciones(escenarios);
  const resultados = [];
  for (const g of lista) {
    const r = await leerJson(`${carpeta}/${g.clave}.json`);
    if (!r) continue;
    // La comparación se recalcula con la lectura guardada: corregir comparar.mjs
    // no obliga a volver a pagar la generación ni la lectura.
    if (r.estado === 'verificado' && r.lectura) {
      const e = g.escenario;
      r.comparacion = comparar(e, marcas[e.marca], r.lectura, zonaHoraria);
      await writeFile(`${carpeta}/${g.clave}.json`, JSON.stringify(r, null, 2));
    }
    resultados.push({ ...r, generacion: g });
  }
  const manual = await revisionManual(carpeta);
  const ok = resultados.filter((r) => r.estado === 'verificado');
  const n = ok.length;
  const cuenta = (f) => ok.filter(f).length;
  const revisados = ok.filter(
    (r) => manual[r.clave]?.logo !== undefined && manual[r.clave]?.logo !== null,
  );
  const productoRev = ok.filter(
    (r) => manual[r.clave]?.producto !== null && manual[r.clave]?.producto !== undefined,
  );
  const segundos = ok.map((r) => r.segundosImagen).filter(Boolean);
  const costoTotal = resultados.reduce((s, r) => s + (r.costoUsd ?? 0), 0);
  const md = [
    `# Resultado de la prueba AI_FULL · ${carpeta.split(/[\\/]/).pop()}`,
    '',
    `Modelo de imagen \`${resultados[0]?.config?.modeloImagen ?? config.modeloImagen}\` (calidad \`${resultados[0]?.config?.calidad ?? config.calidad}\`), lectura con \`${resultados[0]?.config?.modeloVision ?? config.modeloVision}\`.`,
    '',
    `Generaciones verificadas: ${n} de ${lista.length}. Fallidas: ${resultados.filter((r) => r.estado === 'error').length}.`,
    '',
    '| Métrica (ADR-0009) | Resultado |',
    '| --- | --- |',
    // Un error del proveedor también es un flyer que no salió al primer intento.
    `| **Precios y fechas correctos al primer intento** (criterio: 80 %; los errores cuentan como fallo) | **${pct(
      cuenta((r) => r.comparacion.preciosYFechas),
      resultados.length,
    )}** (${cuenta((r) => r.comparacion.preciosYFechas)}/${resultados.length}) |`,
    `| Precios correctos | ${pct(
      cuenta((r) => r.comparacion.precios),
      n,
    )} |`,
    `| Precios con el formato exacto (\`S/ 1,299.00\`) | ${pct(
      cuenta((r) => r.comparacion.preciosExactos),
      n,
    )} |`,
    `| Fechas correctas | ${pct(
      cuenta((r) => r.comparacion.fechas),
      n,
    )} |`,
    `| Nombre del producto exacto | ${pct(
      cuenta((r) => r.comparacion.textos.nombre),
      n,
    )} |`,
    `| Titular exacto | ${pct(
      cuenta((r) => r.comparacion.textos.titular),
      n,
    )} |`,
    `| CTA exacto | ${pct(
      cuenta((r) => r.comparacion.textos.cta),
      n,
    )} |`,
    `| Logo con su texto (automático) | ${pct(
      cuenta((r) => r.comparacion.logoTexto),
      n,
    )} |`,
    `| Logo reconocible y sin deformar (manual) | ${revisados.length ? `${pct(revisados.filter((r) => manual[r.clave].logo).length, revisados.length)} de ${revisados.length} revisados` : 'pendiente'} |`,
    `| Producto fiel a la foto (manual) | ${productoRev.length ? `${pct(productoRev.filter((r) => manual[r.clave].producto).length, productoRev.length)} de ${productoRev.length} revisados` : 'pendiente'} |`,
    `| Tiempo por imagen | ${segundos.length ? `${Math.min(...segundos)}–${Math.max(...segundos)} s, media ${Math.round(segundos.reduce((a, b) => a + b, 0) / segundos.length)} s` : '—'} |`,
    `| Costo estimado | US$ ${costoTotal.toFixed(2)} en total, US$ ${(costoTotal / Math.max(resultados.length, 1)).toFixed(3)} por generación |`,
    '',
    'El costo se calcula con los tokens que informa la API y las tarifas de `ejecutar.mjs`; confírmalo en tu facturación.',
    '',
    '## Por generación',
    '',
    '| Generación | Precios y fechas | Textos | Logo | Observaciones |',
    '| --- | --- | --- | --- | --- |',
    ...resultados.map((r) =>
      r.estado !== 'verificado'
        ? `| ${r.clave} | error | | | ${escapar(r.error)} |`
        : `| ${r.clave} | ${r.comparacion.preciosYFechas ? 'sí' : '**no**'} | ${Object.values(r.comparacion.textos).filter(Boolean).length}/3 | ${r.comparacion.logoTexto ? 'sí' : 'no'} | ${escapar(r.comparacion.observaciones.join('; '))} |`,
    ),
  ].join('\n');
  await writeFile(`${carpeta}/resumen.md`, md + '\n');
  await escribirRevision(carpeta, resultados);
  return md;
}

async function escribirRevision(carpeta, resultados) {
  const csv = `${carpeta}/revision-manual.csv`;
  const previo = await readFile(csv, 'utf8').catch(() => null);
  if (!previo)
    await writeFile(
      csv,
      'generacion;logo_reconocible_s_n;producto_fiel_s_n;notas\n' +
        resultados.map((r) => `${r.clave};;;`).join('\n') +
        '\n',
    );
  const tarjetas = resultados
    .map((r) => {
      const e = r.generacion.escenario;
      const t = textosEsperados(e, zonaHoraria);
      const esperado = [
        t.nombre,
        t.titular,
        t.precioPromocional ? `Antes ${t.precioRegular}` : t.precioRegular,
        t.precioPromocional && `Ahora ${t.precioPromocional}`,
        t.vigencia,
        t.cta,
      ].filter(Boolean);
      const leido = (r.lectura?.textos ?? [])
        .map((x) => `<li><code>${escapar(x.tipo)}</code> ${escapar(x.texto)}</li>`)
        .join('');
      return `<section><h2>${r.clave} <small>${escapar(e.prueba)}</small></h2>
<div class="fila">
<figure><img src="../../${e.producto.foto}"><figcaption>Foto</figcaption></figure>
<figure><img src="../../logos/png/${e.marca}.png" class="logo"><figcaption>Logo</figcaption></figure>
<figure class="flyer">${r.estado === 'error' ? `<p class="mal">${escapar(r.error)}</p>` : `<img src="${r.clave}.png">`}<figcaption>Flyer</figcaption></figure>
<div><h3>Esperado</h3><ul>${esperado.map((x) => `<li>${escapar(x)}</li>`).join('')}</ul>
<h3>Leído</h3><ul>${leido}</ul>
${r.comparacion ? `<p class="${r.comparacion.preciosYFechas ? 'bien' : 'mal'}">Precios y fechas: ${r.comparacion.preciosYFechas ? 'correctos' : 'incorrectos'}</p><ul>${r.comparacion.observaciones.map((o) => `<li>${escapar(o)}</li>`).join('')}</ul>` : ''}
</div></div></section>`;
    })
    .join('\n');
  await writeFile(
    `${carpeta}/revision.html`,
    `<!doctype html><html lang="es"><meta charset="utf-8"><title>Revisión AI_FULL</title>
<style>body{font:15px system-ui;margin:24px;background:#f6f6f4;color:#222}section{background:#fff;padding:16px;margin-bottom:20px;border-radius:8px}
.fila{display:grid;grid-template-columns:200px 160px 520px 1fr;gap:16px;align-items:start}img{max-width:100%;border:1px solid #ddd}.logo{background:#fff}
h2 small{font-weight:400;color:#666;font-size:14px}.bien{color:#176f2c;font-weight:600}.mal{color:#b3261e;font-weight:600}code{color:#666}</style>
<h1>Revisión de la prueba AI_FULL</h1><p>Anota en <code>revision-manual.csv</code> si el logo es reconocible y si el producto es fiel a la foto (s/n), y ejecuta <code>--resumen</code>.</p>
${tarjetas}</html>`,
  );
}

// ---------- Ejecución ----------

if (args.resumen) {
  console.log(await resumir(ruta(`resultados/${args.resumen}`)));
  process.exit(0);
}

const solo = typeof args.solo === 'string' ? new Set(args.solo.split(',')) : null;
const lista = generaciones(escenarios).filter((g) => !solo || solo.has(g.escenario.id));
const nombre =
  args.verificar || args.carpeta || new Date().toISOString().slice(0, 16).replace(/:/g, '-');
const carpeta = ruta(`resultados/${REAL ? nombre : 'simulacion'}`);
await mkdir(carpeta, { recursive: true });

if (REAL && !config.apiKey) {
  console.error('Falta OPENAI_API_KEY en apps/api/.env.');
  process.exit(1);
}
console.log(
  `${REAL ? 'EJECUCIÓN REAL' : 'Simulación (sin llamadas)'} · ${lista.length} generaciones · ${config.modeloImagen} ${config.calidad} · visión ${config.modeloVision}`,
);
console.log(`Resultados en ${carpeta}\n`);

let fallosSeguidos = 0;
for (const g of lista) {
  const { escenario, clave } = g;
  const archivo = `${carpeta}/${clave}.json`;
  const previo = await leerJson(archivo);
  if (REAL && !args.verificar && previo?.estado === 'verificado') {
    console.log(`${clave.padEnd(8)} ya hecho, se salta`);
    continue;
  }
  const prompt = instrucciones(escenario);
  const base = { clave, escenario: escenario.id, config: sinClave(config), prompt };

  if (!REAL) {
    const refs = await referencias(escenario);
    await writeFile(`${carpeta}/${clave}.prompt.txt`, prompt + '\n');
    await writeFile(
      `${carpeta}/${clave}.producto.${refs.producto.tipo.split('/')[1]}`,
      refs.producto.bytes,
    );
    console.log(
      `${clave.padEnd(8)} producto ${(refs.producto.bytes.length / 1024).toFixed(0)} KB · logo ${(refs.logo.bytes.length / 1024).toFixed(0)} KB · prompt ${prompt.length} caracteres`,
    );
    continue;
  }

  const registro = { ...base, ...(args.verificar ? previo : {}), clave };
  try {
    let png;
    if (args.verificar) {
      png = await readFile(`${carpeta}/${clave}.png`);
    } else {
      const refs = await referencias(escenario);
      const inicio = Date.now();
      const imagen = await generarImagen(config, { prompt, imagenes: [refs.producto, refs.logo] });
      registro.segundosImagen = Math.round((Date.now() - inicio) / 1000);
      registro.usoImagen = imagen.uso;
      png = imagen.png;
      await writeFile(`${carpeta}/${clave}.png`, png);
    }
    const { lectura, uso } = await leerFlyer(config, png);
    registro.lectura = lectura;
    registro.usoVision = uso;
    registro.comparacion = comparar(escenario, marcas[escenario.marca], lectura, zonaHoraria);
    registro.costoUsd = costo(registro.usoImagen, uso);
    registro.estado = 'verificado';
    delete registro.error;
    fallosSeguidos = 0;
    const c = registro.comparacion;
    console.log(
      `${clave.padEnd(8)} ${c.preciosYFechas ? 'OK   ' : 'FALLA'} precios ${c.precios ? 'sí' : 'no'} · fechas ${c.fechas ? 'sí' : 'no'} · textos ${Object.values(c.textos).filter(Boolean).length}/3 · ${registro.segundosImagen ?? '-'} s · US$ ${registro.costoUsd}`,
    );
  } catch (error) {
    registro.estado = registro.lectura && args.verificar ? registro.estado : 'error';
    registro.error = `${error.estado ? `HTTP ${error.estado}: ` : ''}${error.message}`;
    console.log(`${clave.padEnd(8)} ERROR ${registro.error}`);
    if (++fallosSeguidos >= 3) {
      await writeFile(archivo, JSON.stringify(registro, null, 2));
      console.error(
        '\nTres errores seguidos: se detiene para no seguir intentando. Revisa el error y continúa con --carpeta=' +
          nombre,
      );
      break;
    }
  }
  await writeFile(archivo, JSON.stringify(registro, null, 2));
}

if (REAL) {
  console.log('\n' + (await resumir(carpeta)));
  console.log(
    `\nRevisión visual: ${carpeta}${process.platform === 'win32' ? '\\' : '/'}revision.html`,
  );
} else {
  console.log(`\nRevisa las instrucciones en ${carpeta}. Para ejecutar de verdad: --real`);
}
