// Prepara cada caso de casos.json: kit de marca derivado, brief, prompt y foto lista para enviar.
// Lo usan preparar-chatgpt.mjs (pruebas manuales) y generar.mjs (API), para que ambos envíen
// exactamente lo mismo.
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { ruta } from './datos.mjs';
import { armarBrief } from './brief.mjs';
import { armarPrompt } from './prompt.mjs';
import { logoEsOscuro, proponerColores, tieneFondoTransparente } from './marca.mjs';

export async function cargarCasos({ colocacionLogo = 'SUPERPUESTO' } = {}) {
  const { marcas, casos } = JSON.parse(await readFile(ruta('casos.json'), 'utf8'));
  const plantillas = JSON.parse(await readFile(ruta('plantillas-base.json'), 'utf8'));
  const kits = {};
  for (const [id, m] of Object.entries(marcas)) {
    const logo = await sharp(ruta(m.logo), { density: 144 }).png().toBuffer();
    const { width, height } = await sharp(logo).metadata();
    kits[id] = {
      ...m,
      colores: await proponerColores(logo),
      logo: {
        archivo: colocacionLogo === 'IA' ? '2-logo.png' : 'logo-para-superponer.png',
        esOscuro: await logoEsOscuro(logo),
        tieneVarianteClara: false,
        proporcion: width / height,
      },
      bytesLogo: logo,
    };
  }

  return Promise.all(
    casos.map(async (caso) => {
      const marca = kits[caso.marca];
      const origen = ruta(caso.producto.foto.archivo);
      const transparente = await tieneFondoTransparente(origen);
      const extension = transparente ? 'png' : 'jpg';
      const producto = {
        ...caso.producto,
        foto: {
          ...caso.producto.foto,
          archivo: `1-foto.${extension}`,
          tieneFondoTransparente: transparente,
        },
      };
      const plantilla = { ...plantillas[caso.plantilla], ...(caso.ajustesPlantilla ?? {}) };
      const brief = armarBrief({
        marca,
        plantilla,
        producto,
        campana: caso.campana,
        textos: caso.textos,
        colocacionLogo,
      });
      // Fotos de cámara de hasta 6000 px: orientación EXIF corregida y lado mayor de 1536 px.
      const foto = sharp(origen)
        .rotate()
        .resize(1536, 1536, { fit: 'inside', withoutEnlargement: true });
      return {
        caso,
        brief,
        prompt: armarPrompt(brief),
        foto: {
          bytes: transparente
            ? await foto.png().toBuffer()
            : await foto.jpeg({ quality: 90 }).toBuffer(),
          tipo: transparente ? 'image/png' : 'image/jpeg',
          nombre: `1-foto.${extension}`,
        },
        logo: { bytes: marca.bytesLogo, nombre: marca.logo.archivo },
      };
    }),
  );
}
