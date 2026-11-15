// Revisa los escenarios de la prueba de calidad del flyer (ADR-0009) sin llamar a ninguna IA.
// Uso: node evaluation/flyer-quality/validar.mjs  (desde apps/api)
// Convierte los logos a PNG, comprueba datos, fechas y fotos, e imprime los textos que
// cada flyer debe mostrar exactamente: es lo que la verificación comparará después.
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import {
  cargarEscenarios,
  existe,
  generaciones,
  ruta,
  SIMBOLO,
  textosEsperados,
} from './datos.mjs';

const { escenarios, marcas, zonaHoraria } = await cargarEscenarios();
const ahora = Date.now();
const errores = [];
const faltantes = new Set();

await mkdir(ruta('logos/png/'), { recursive: true });
for (const [id, marca] of Object.entries(marcas)) {
  await sharp(ruta(marca.logo), { density: 144 })
    .png()
    .toFile(ruta(`logos/png/${id}.png`));
}

const ids = new Set();
for (const e of escenarios) {
  const fallo = (texto) => errores.push(`${e.id}: ${texto}`);
  if (ids.has(e.id)) fallo('id repetido');
  ids.add(e.id);
  if (!marcas[e.marca]) fallo(`marca desconocida ${e.marca}`);
  const { producto, promocion, texto } = e;
  for (const [campo, valor] of [
    ['nombre', producto.nombre],
    ['titular', texto.titular],
    ['cta', texto.cta],
  ]) {
    if (!valor?.trim() || valor.length > 200) fallo(`${campo} vacío o de más de 200 caracteres`);
  }
  if (!SIMBOLO[producto.precio.moneda]) fallo('moneda no soportada');
  if (!(producto.precio.montoMenor > 0)) fallo('precio regular inválido');
  if (promocion) {
    if (promocion.precio.moneda !== producto.precio.moneda) fallo('la promoción cambia de moneda');
    if (promocion.precio.montoMenor >= producto.precio.montoMenor)
      fallo('la promoción no es menor que el precio regular');
    const inicio = promocion.inicio && Date.parse(promocion.inicio);
    const fin = promocion.fin && Date.parse(promocion.fin);
    if (inicio && fin && fin <= inicio) fallo('la promoción termina antes de empezar');
    if (fin && fin <= ahora) fallo('la promoción ya venció');
  }
  if (!(await existe(producto.foto))) faltantes.add(producto.foto);
}

for (const e of escenarios) {
  const t = textosEsperados(e, zonaHoraria);
  const lineas = [
    t.nombre,
    t.titular,
    t.cta,
    t.precioPromocional ? `Antes ${t.precioRegular}` : t.precioRegular,
    t.precioPromocional && `Ahora ${t.precioPromocional}`,
    t.vigencia,
  ].filter(Boolean);
  console.log(`${e.id.padEnd(6)} ${marcas[e.marca]?.nombre ?? '?'} · ${e.prueba}`);
  for (const linea of lineas) console.log(`         ${linea}`);
}

console.log(
  `\n${escenarios.length} escenarios, ${generaciones(escenarios).length} generaciones en total.`,
);
console.log('Logos convertidos a PNG en evaluation/flyer-quality/logos/png/.');
if (faltantes.size) {
  console.log(`\nFaltan ${faltantes.size} fotos en evaluation/flyer-quality/:`);
  for (const f of [...faltantes].sort()) console.log(`  - ${f}`);
}
if (errores.length) {
  console.error('\nErrores en los datos:');
  for (const e of errores) console.error(`  - ${e}`);
  process.exitCode = 1;
} else {
  console.log('\nDatos válidos.');
}
