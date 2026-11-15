// Pega el logo original sobre un flyer generado (por ChatGPT o por la API), en la esquina
// que el brief del caso reservó. Es lo mismo que hará el sistema en producción.
// Uso (desde apps/api):
//   node evaluation/flyer-quality/componer-logo.mjs <caso> <imagen>
//   node evaluation/flyer-quality/componer-logo.mjs 01-cafe-promocion-navidad "evaluation/flyer-quality/chatgpt/resultados/Mi flyer.png"
// Deja el resultado junto a la imagen, con el sufijo "-con-logo".
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ruta } from './datos.mjs';
import { superponerLogo } from './logo.mjs';

const [caso, imagen] = process.argv.slice(2);
if (!caso || !imagen) {
  console.error('Uso: node evaluation/flyer-quality/componer-logo.mjs <caso> <imagen>');
  process.exit(1);
}
const carpeta = ruta(`chatgpt/${caso}/`);
const brief = JSON.parse(await readFile(`${carpeta}brief.json`, 'utf8'));
if (!brief.logo) {
  console.error(
    'Este caso se preparó con --logo=ia o sin logo: no hay esquina reservada. Vuelve a prepararlo sin --logo=ia.',
  );
  process.exit(1);
}
const resultado = await superponerLogo(
  await readFile(imagen),
  await readFile(`${carpeta}${brief.logo.archivo}`),
  // Los briefs preparados antes de la versión con velo traen colorPlaca.
  {
    ...brief.logo,
    colorVelo: brief.logo.colorVelo ?? brief.logo.colorPlaca,
    logoEsOscuro:
      brief.logo.logoEsOscuro ?? (brief.logo.colorVelo ?? brief.logo.colorPlaca) === '#FFFFFF',
  },
);
const { dir, name } = path.parse(imagen);
const destino = path.join(dir, `${name}-con-logo.png`);
await writeFile(destino, resultado.png);
console.log(`${destino} · logo ${resultado.colocacion.toLowerCase()} (contorno legible ${Math.round(resultado.contornoLegible * 100)} %)`);
