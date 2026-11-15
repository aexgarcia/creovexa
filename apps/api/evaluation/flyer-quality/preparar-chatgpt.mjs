// Prepara los casos de casos.json para probarlos a mano en ChatGPT, sin gastar crédito de la API.
// Uso (desde apps/api):
//   node evaluation/flyer-quality/preparar-chatgpt.mjs              logo superpuesto (por defecto)
//   node evaluation/flyer-quality/preparar-chatgpt.mjs --logo=ia    la IA dibuja el logo (modo anterior)
//   ... --solo=01-cafe-promocion-navidad,06-sonrisa-servicio-lugar
// Por cada caso crea chatgpt/<caso>/ con prompt.txt, brief.json, las imágenes que se adjuntan
// (1-foto y, con --logo=ia, 2-logo.png) y logo-para-superponer.png, que NO se adjunta.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { ruta } from './datos.mjs';
import { cargarCasos } from './casos.mjs';

const opcion = (nombre) =>
  process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3);
const solo = opcion('solo')?.split(',');
const colocacionLogo = opcion('logo') === 'ia' ? 'IA' : 'SUPERPUESTO';

for (const { caso, brief, prompt, foto, logo } of await cargarCasos({ colocacionLogo })) {
  if (solo && !solo.includes(caso.id)) continue;
  const carpeta = ruta(`chatgpt/${caso.id}/`);
  // Solo se reemplaza la carpeta del caso: chatgpt/resultados/ guarda las pruebas hechas a mano.
  await rm(carpeta, { recursive: true, force: true });
  await mkdir(carpeta, { recursive: true });
  await writeFile(`${carpeta}${foto.nombre}`, foto.bytes);
  await writeFile(`${carpeta}${logo.nombre}`, logo.bytes);
  await writeFile(`${carpeta}brief.json`, JSON.stringify(brief, null, 2) + '\n');
  await writeFile(`${carpeta}prompt.txt`, prompt + '\n');
  const textoLogo = brief.logo
    ? `logo superpuesto ${brief.logo.zonaReservada.anchoPct}×${brief.logo.zonaReservada.altoPct} %`
    : `logo ${brief.referencias[1]?.presentacion ?? '—'}`;
  console.log(
    `${caso.id.padEnd(34)} ${brief.salida.proporcion.padEnd(5)} ${String(brief.textos.length).padStart(2)} textos · ${textoLogo}`,
  );
  for (const aviso of brief.avisos) console.log(`${' '.repeat(35)}! ${aviso}`);
}
console.log(`\nListo en ${ruta('chatgpt/')}`);
if (colocacionLogo === 'SUPERPUESTO')
  console.log(
    'Adjunta solo 1-foto. Después pega el logo con:\n  node evaluation/flyer-quality/componer-logo.mjs <caso> <imagen de ChatGPT>',
  );
