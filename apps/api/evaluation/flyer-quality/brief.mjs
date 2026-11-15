// Arma el brief del flyer (SDD/arquitectura/datos-del-flyer.md, sección 6) a partir de los
// datos de marca, producto, plantilla y campaña. Todo lo que la IA dibuja llega ya resuelto:
// la IA no calcula precios, fechas ni descuentos, ni decide qué textos aparecen.
import { precio, vigencia } from './datos.mjs';
import { zonaReservada } from './logo.mjs';

export const FORMATOS = {
  CUADRADO: { proporcion: '1:1', relacion: 1, tamano: '1024x1024' },
  VERTICAL: { proporcion: '4:5', relacion: 0.8, tamano: '1024x1280' },
  HISTORIA: { proporcion: '9:16', relacion: 0.5625, tamano: '1152x2048' },
};

// Máximo de textos (sin contar el logo) en formato cuadrado, según la composición. En ChatGPT,
// DIVIDIDA aguantó 13 textos con buen resultado; PRODUCTO_PROTAGONISTA con 9 se vio sobrecargado.
// VERTICAL suma 2; HISTORIA suma 1 (Instagram tapa franjas arriba y abajo); MINIMA resta 1.
// Son puntos de partida: se ajustan con más pruebas.
export const LIMITE_DE_TEXTOS = {
  PRODUCTO_PROTAGONISTA: 8,
  PRODUCTO_EN_PANEL: 8,
  ESCENA_AMBIENTADA: 7,
  DIVIDIDA: 12,
  TIPOGRAFICA: 10,
};
const AJUSTE_FORMATO = { CUADRADO: 0, VERTICAL: 2, HISTORIA: 1 };

// Porcentaje hacia abajo: anunciar más descuento del real sería publicidad engañosa.
export function descuento(regular, promocional) {
  return `-${Math.floor((1 - promocional.montoMenor / regular.montoMenor) * 100)} %`;
}

// Cómo va el logo, sin pedirle a la IA que lo adapte (no se recolorea nunca).
export function presentacionLogo({ esOscuro, tieneVarianteClara }, plantilla) {
  if (plantilla.fondo === 'ESCENA') return esOscuro ? 'PLACA_BLANCA' : 'PLACA_OSCURA';
  if (plantilla.modo === 'OSCURO') {
    if (!esOscuro) return 'DIRECTO';
    return tieneVarianteClara ? 'VARIANTE_CLARA' : 'PLACA_BLANCA';
  }
  return esOscuro ? 'DIRECTO' : 'PLACA_OSCURA';
}

function rolDeLaFoto(producto) {
  if (producto.foto.tipo === 'PERSONA') return 'PERSONA';
  if (producto.tipo === 'SERVICE') return producto.foto.tipo === 'LUGAR' ? 'LUGAR' : 'SERVICIO';
  return 'PRODUCTO';
}

function contacto(datos) {
  if (!datos) return null;
  const partes = [
    datos.whatsapp && `WhatsApp ${datos.whatsapp}`,
    datos.telefono && `Tel. ${datos.telefono}`,
    datos.web,
    datos.instagram,
    datos.direccion,
  ].filter(Boolean);
  return partes.length ? partes.join(' · ') : null;
}

/**
 * marca: kit de marca con `colores` y `logo.esOscuro` ya derivados.
 * Devuelve el brief y la lista de archivos que acompañan al prompt, en orden.
 */
export function armarBrief({
  marca,
  plantilla,
  producto,
  campana,
  textos,
  colocacionLogo = 'SUPERPUESTO',
}) {
  const el = plantilla.elementos;
  const promo = campana.promocion;
  const zona = marca.region.zonaHoraria;
  const lista = [];
  const agregar = (rol, texto, importancia, extra = {}) =>
    texto && lista.push({ rol, texto, importancia, ...extra });
  const esPromocion = campana.objetivo === 'PROMOCION';

  agregar('titular', el.titular && textos.titular, esPromocion ? 2 : 1);
  agregar('subtitulo', el.subtitulo && textos.subtitulo, 3);
  agregar(
    'nombreProducto',
    el.nombreProducto && producto.nombreCorto,
    campana.objetivo === 'LANZAMIENTO' ? 2 : 3,
  );
  // La plantilla dice cuántas características mostrar; el producto las guarda por prioridad.
  for (const a of (producto.atributosClave ?? []).slice(0, Number(el.atributos) || 0))
    agregar('atributo', a, 4);

  const regular = precio(producto.precio);
  if (promo && el.precioPromocional) {
    if (el.precioRegular) {
      agregar('precioRegular', `Antes ${regular}`, 4, { tachado: true });
      agregar('precioPromocional', `Ahora ${precio(promo.precio)}`, 1);
    } else {
      agregar('precioPromocional', precio(promo.precio), 1);
    }
    if (promo.mostrarDescuento)
      agregar('descuento', descuento(producto.precio, promo.precio), 2, { forma: 'INSIGNIA' });
  } else if (el.precioRegular) {
    agregar('precio', regular, esPromocion ? 1 : 2);
  }
  const conPrecio = lista.some((t) => t.rol.startsWith('precio'));
  agregar('unidad', conPrecio && producto.unidad, 5, { junto: 'precio' });
  agregar('vigencia', el.vigencia && promo && vigencia(promo, zona), 5);
  agregar('cta', el.cta && campana.cta, 2, { forma: 'BOTON' });
  agregar('contacto', el.contacto && contacto(marca.contacto), 5);
  const legal = [promo?.condiciones, marca.textoLegalPorDefecto].filter(Boolean).join(' ');
  agregar('legal', el.textoLegal && legal, 6);

  // Límite de textos: el café en cuadrado con 9 textos se vio sobrecargado. Se quitan solo
  // textos opcionales, en este orden; precios, vigencia, CTA y legal nunca se quitan.
  const limite =
    LIMITE_DE_TEXTOS[plantilla.composicion] +
    AJUSTE_FORMATO[plantilla.formato] -
    (plantilla.densidadDeTexto === 'MINIMA' ? 1 : 0);
  const avisos = [];
  for (const rol of ['unidad', 'atributo', 'contacto', 'subtitulo']) {
    while (lista.length > limite) {
      const i = lista.findLastIndex((t) => t.rol === rol);
      if (i < 0) break;
      avisos.push(`Se omitió ${rol} "${lista[i].texto}": supera el límite de ${limite} textos`);
      lista.splice(i, 1);
    }
  }
  if (lista.length > limite)
    avisos.push(
      `Tiene ${lista.length} textos y el límite es ${limite}: el flyer puede verse sobrecargado`,
    );

  const formato = FORMATOS[plantilla.formato];
  const referencias = [
    {
      imagen: 1,
      rol: rolDeLaFoto(producto),
      tipoFoto: producto.foto.tipo,
      fondoTransparente: producto.foto.tieneFondoTransparente ?? false,
      nombre: producto.nombreCorto,
      marcaDelProducto: producto.marcaDelProducto ?? null,
      archivo: producto.foto.archivo,
    },
  ];
  let logo = null;
  if (el.logo && colocacionLogo === 'IA')
    referencias.push({
      imagen: 2,
      rol: 'LOGO',
      presentacion: presentacionLogo(marca.logo, plantilla),
      posicion: plantilla.posicionLogo,
      archivo: marca.logo.archivo,
    });
  else if (el.logo)
    // La IA solo reserva la esquina; el sistema pega el logo original después.
    logo = {
      colocacion: 'SUPERPUESTO',
      posicion: plantilla.posicionLogo,
      logoEsOscuro: marca.logo.esOscuro,
      colorVelo: marca.logo.esOscuro ? '#FFFFFF' : marca.colores.fondoOscuro,
      proporcionLogo: marca.logo.proporcion,
      zonaReservada: zonaReservada(formato.relacion, marca.logo.proporcion, plantilla.posicionLogo),
      archivo: marca.logo.archivo,
    };

  return {
    salida: { formato: plantilla.formato, ...formato, idioma: marca.region.idioma },
    referencias,
    logo,
    textos: lista,
    avisos,
    direccionDeArte: {
      negocio: marca.nombre,
      rubro: marca.rubro,
      pais: marca.region.pais,
      publicoObjetivo: marca.publicoObjetivo ?? null,
      tono: marca.tono,
      objetivo: campana.objetivo,
      ocasion: campana.ocasion ?? null,
      composicion: plantilla.composicion,
      estilo: plantilla.estilo,
      modo: plantilla.modo,
      fondo: plantilla.fondo,
      colores: marca.colores,
      tipografia: marca.tipografia ?? null,
      estiloVisual: marca.estiloVisual ?? [],
      densidadDeTexto: plantilla.densidadDeTexto,
      indicacionesFijas: plantilla.indicacionesFijas ?? null,
      indicacionesCreativas: campana.indicacionesCreativas ?? null,
    },
    palabrasProhibidas: marca.palabrasProhibidas ?? [],
  };
}
