# Datos para generar el flyer

- **Estado:** Decisiones cerradas el 2026-11-14 (ver [Decisiones](#decisiones)). En implementación. Hecho: el kit de marca de la fase 1 (rubro, región, colores y `esOscuro`, [ADR-0022](../modulos/organizations/adr/0022-kit-de-marca.md)) y los datos del producto (`nombreCorto`, `marcaDelProducto`, `atributosClave`, `unidad`, `foto.tipo` y `tieneFondoTransparente`). Hecho también: la plantilla como dirección de arte y las plantillas base ([ADR-0023](../modulos/templates/adr/0023-direccion-de-arte-y-plantillas-base.md)); los nombres en el código están en inglés (`SQUARE`, `PRODUCT_HERO`, `BOLD`…). Del kit de marca de la fase 2: tipografía, estilo visual, contacto, texto legal y palabras prohibidas. Pendiente: variante clara del logo e isotipo, referencias de estilo e indicaciones fijas de la plantilla, campaña y copy.
- **Fecha:** 2026-11-14
- **Relacionado:** [ADR-0009](../adr/0009-estrategia-de-generacion-del-flyer.md), [datos que se envían hoy](../modulos/content-generation/datos-enviados-a-la-ia.md)

## Objetivo

Definir qué datos necesita la IA para que un flyer sea publicable sin retoques, partiendo de lo que ya se guarda y sin atarse a lo que el sistema envía hoy. Primero se fijan los datos; los prompts se arman después sobre esta base.

## Principios

1. **Dos capas.** Lo que cada módulo guarda (datos de negocio, editados en el CMS) y el **brief** que se envía al generador, que el sistema arma ya resuelto.
2. **La IA no calcula nada.** Precios formateados, porcentaje de descuento, fechas en hora local y textos legales llegan escritos tal como deben verse.
3. **Cada texto del flyer tiene un rol y un nivel de importancia.** La IA decide el diseño, no qué decir ni cuánto destacar cada cosa.
4. **Nada interno.** Ni IDs, ni unidades menores, ni el caption o los hashtags del post.
5. **La plantilla es la dirección de arte** reutilizable de la marca, no una geometría fija. Es lo que justifica mantener el módulo: con IA completa, la plantilla es lo que hace que todos los flyers de una empresa parezcan de la misma marca.

Marcas usadas en los JSON:

- `[existe]` ya se guarda.
- `[cambia]` se guarda, pero cambia su forma.
- `[nuevo]` no existe.
- `[derivado]` lo calcula el sistema; nadie lo escribe.
- `[se descarta]` deja de enviarse o de guardarse.

## 1. Organización: kit de marca

Se completa una vez y vale para todas las campañas.

```jsonc
{
  "nombre": "Café Andino",                                   // [existe]
  "descripcion": "Cafetería y tostaduría de café peruano…",  // [existe] para el copy; al flyer solo va el rubro
  "rubro": "Cafetería",                                      // [nuevo] orienta el estilo visual mejor que la descripción
  "publicoObjetivo": "Jóvenes profesionales de Lima",        // [nuevo] opcional
  "tono": "Cálido, cercano y artesanal",                     // [existe] brandTone

  "region": {                                                // [nuevo] hoy está fijo en el código
    "pais": "PE",
    "idioma": "es-PE",
    "zonaHoraria": "America/Lima",
    "monedaPorDefecto": "PEN"
  },

  "logo": {
    "principal": "asset",                                    // [existe]
    "paraFondoOscuro": "asset | null",                       // [nuevo] versión clara del logo
    "isotipo": "asset | null",                               // [nuevo] solo el símbolo, para espacios pequeños
    "esOscuro": true                                         // [derivado] por la luminancia del PNG; decide placa o variante
  },

  "colores": {                                               // [nuevo] reemplaza las paletas fijas BLUE / CORAL;
                                                             // el sistema los propone desde el logo y el usuario puede corregirlos
    "primario": "#5B3A29",
    "secundario": "#C98B4E",
    "acento": "#E4572E",
    "fondoClaro": "#F7F1E8",
    "fondoOscuro": "#1E120D"
  },
  "tipografia": "SERIF_ELEGANTE",                            // [nuevo] SANS_MODERNA | SERIF_ELEGANTE | REDONDEADA | CONDENSADA_AUDAZ | MANUSCRITA
  "estiloVisual": ["artesanal", "cálido", "fotografía natural"], // [nuevo] hasta 5 palabras clave

  "contacto": {                                              // [nuevo] opcional; solo se muestra si la plantilla lo pide
    "whatsapp": "+51 999 999 999",
    "web": "cafeandino.pe",
    "instagram": "@cafeandino",
    "direccion": "Av. Larco 123, Miraflores"
  },
  "textoLegalPorDefecto": "Imágenes referenciales.",         // [nuevo] opcional
  "palabrasProhibidas": ["gratis"]                           // [nuevo] opcional; se suman a las del sistema
}
```

**Por qué:**

- **Logo oscuro y colores de marca.** La prueba mostró el logo de la tienda de tecnología (entonces VOLTA) ilegible sobre fondo oscuro, y otros flyers con el logo recoloreado. Con `paraFondoOscuro` o `esOscuro`, el sistema decide entre la placa o la variante, y la IA nunca tiene que ajustar el logo.
- **Colores de marca.** Con las paletas fijas, dos empresas distintas obtienen el mismo azul. Los colores de marca hacen que cada flyer parezca de su marca.
- **Región.** Hoy Perú y el formato de los precios están fijos en el código. Con la región por organización, otro país es configuración, no código.

## 2. Producto o servicio

```jsonc
{
  "tipo": "PRODUCT",                                         // [existe] pero no llega a la IA; debe llegar (cambia el prompt)
  "nombre": "Pack café de altura BAO Café 3 × 500 g",        // [existe] nombre completo, para el copy y el catálogo
  "nombreCorto": "Pack BAO Café 3 × 500 g",                  // [nuevo] máx. 40 caracteres; es el que va al flyer
  "marcaDelProducto": "BAO Café",                            // [nuevo] opcional, lo indica el usuario: marca de un tercero que vende la tienda
  "categoria": "Café en grano",                              // [nuevo] opcional
  "descripcion": "Tradicional en grano, especialidad…",      // [existe] para el copy; no va al flyer
  "atributosClave": [                                        // [nuevo] hasta 5, por prioridad, escritos y verificados por el usuario;
                                                             // la plantilla decide cuántos se muestran
    "100 % arábica",
    "Café de altura de Veracruz"
  ],
  "precio": { "montoMenor": 8990, "moneda": "PEN" },         // [existe]
  "unidad": "por pack",                                      // [nuevo] opcional: "por kg", "por sesión", "c/u"
  "foto": {
    "asset": "asset",                                        // [existe] una sola foto (ADR-0014)
    "tipo": "AMBIENTE",                                      // [nuevo] obligatorio al subir la foto, lo indica el usuario:
                                                             //   RECORTADA | ESTUDIO | AMBIENTE | LUGAR | PERSONA
    "tieneFondoTransparente": false                          // [derivado] canal alfa del PNG
  }
}
```

**Por qué:**

- **`tipo` y `foto.tipo`.** Con un servicio (el consultorio) o una foto con personas, "conserva el producto idéntico" no tiene sentido. El prompt necesita saber qué hay en la foto para decidir qué conservar y qué puede recomponer.
- **`nombreCorto`.** El nombre del monitor, de 84 caracteres, llenó dos líneas del flyer. El catálogo necesita el nombre largo; el flyer, uno corto.
- **`marcaDelProducto`.** En CA-01 las bolsas son de BAO Café y la tienda es Café Andino. Decirle a la IA cuál es cuál evita que mezcle los logos y refuerza que el empaque no se toca.
- **`atributosClave`.** Hoy la IA solo tiene la descripción libre y la instrucción de "no inventar beneficios". Si el flyer debe mostrar beneficios, que sean estos y nada más.

## 3. Plantilla: dirección de arte

Hoy guarda `layout` (2 valores), `palette` (2 valores), 6 interruptores y ancho × alto libres. Propuesta:

```jsonc
{
  "nombre": "Promo oscura",                                  // [existe] no se envía
  "formato": "CUADRADO",                                     // [cambia] reemplaza ancho × alto: CUADRADO (1:1) | VERTICAL (4:5) | HISTORIA (9:16)
  "composicion": "PRODUCTO_PROTAGONISTA",                    // [cambia] reemplaza layout:
                                                             //   PRODUCTO_PROTAGONISTA (era CLASSIC) | PRODUCTO_EN_PANEL (era PRODUCT_FOCUS)
                                                             //   | ESCENA_AMBIENTADA | DIVIDIDA | TIPOGRAFICA
  "estilo": "AUDAZ",                                         // [nuevo] MINIMALISTA | AUDAZ | ELEGANTE | DIVERTIDO | CORPORATIVO | NATURAL
  "modo": "OSCURO",                                          // [nuevo] OSCURO | CLARO; con los colores de marca reemplaza a palette
  "fondo": "COLOR_DE_MARCA",                                 // [nuevo] COLOR_DE_MARCA | DEGRADADO | ESCENA | ESTUDIO
  "posicionLogo": "ARRIBA_DERECHA",                          // [nuevo]
  "densidadDeTexto": "EQUILIBRADA",                          // [nuevo] MINIMA | EQUILIBRADA

  "elementos": {                                             // [cambia] amplía los 6 interruptores
    "logo": true,                                            // existe (showLogo)
    "titular": true,                                         // existe (showHeadline)
    "subtitulo": false,                                      // nuevo
    "nombreProducto": true,                                  // nuevo; hoy siempre aparece
    "atributos": 2,                                          // nuevo: cuántas características mostrar (0 a 4)
    "precioRegular": true,                                   // existe (showRegularPrice)
    "precioPromocional": true,                               // existe (showPromotionPrice)
    "vigencia": true,                                        // nuevo; hoy siempre aparece si hay fechas
    "cta": true,                                             // existe (showCta)
    "contacto": false,                                       // nuevo
    "textoLegal": true                                       // nuevo
  },

  "referenciasDeEstilo": ["asset"],                          // [nuevo] 0 a 2 flyers de ejemplo; se usan solo como estilo
  "indicacionesFijas": "Fondo con textura de papel kraft"    // [nuevo] opcional, máx. 300 caracteres
}
```

Se descartan:

- **`palette` (BLUE / CORAL):** la reemplazan los colores de marca y `modo`.
- **`showMainImage`:** con IA completa la foto siempre se usa; un flyer sin foto es la composición `TIPOGRAFICA`.
- **Ancho y alto libres:** solo hay tres formatos útiles para redes, y el proveedor solo genera tamaños fijos.

**Por qué conviene mantener el módulo:** sin plantillas, cada campaña tendría que repetir estilo, composición, modo y elementos, y cada flyer de la misma empresa saldría distinto. La plantilla es la memoria visual de la marca: se define una vez («Promo oscura», «Lanzamiento claro», «Historia de temporada») y se reutiliza. Con `referenciasDeEstilo`, además, la empresa puede fijar el estilo de un flyer que ya le gustó.

### Plantillas base

El sistema trae plantillas predeterminadas como ejemplo. No pertenecen a ninguna organización: una empresa las usa tal cual o las duplica para ajustarlas. Ninguna lleva colores propios; toman los del kit de marca, así que la misma plantilla base se ve distinta en cada empresa.

```jsonc
[
  {
    "clave": "PROMOCION_DESTACADA",
    "nombre": "Promoción destacada",
    "pensadaPara": "Precio especial de un producto",
    "formato": "CUADRADO", "composicion": "PRODUCTO_PROTAGONISTA", "estilo": "AUDAZ",
    "modo": "OSCURO", "fondo": "COLOR_DE_MARCA", "posicionLogo": "ARRIBA_DERECHA", "densidadDeTexto": "EQUILIBRADA",
    "elementos": { "logo": true, "titular": true, "subtitulo": false, "nombreProducto": true, "atributos": 0,
                   "precioRegular": true, "precioPromocional": true, "vigencia": true, "cta": true,
                   "contacto": false, "textoLegal": true }
  },
  {
    "clave": "PRODUCTO_EN_VITRINA",
    "nombre": "Producto en vitrina",
    "pensadaPara": "Mostrar un producto con su precio, sin promoción",
    "formato": "CUADRADO", "composicion": "PRODUCTO_EN_PANEL", "estilo": "MINIMALISTA",
    "modo": "CLARO", "fondo": "ESTUDIO", "posicionLogo": "ARRIBA_IZQUIERDA", "densidadDeTexto": "MINIMA",
    "elementos": { "logo": true, "titular": true, "subtitulo": false, "nombreProducto": true, "atributos": 3,
                   "precioRegular": true, "precioPromocional": true, "vigencia": false, "cta": true,
                   "contacto": false, "textoLegal": false }
  },
  {
    "clave": "LANZAMIENTO",
    "nombre": "Lanzamiento",
    "pensadaPara": "Presentar algo nuevo; el protagonista es la novedad, no el precio",
    "formato": "VERTICAL", "composicion": "ESCENA_AMBIENTADA", "estilo": "ELEGANTE",
    "modo": "OSCURO", "fondo": "ESCENA", "posicionLogo": "ARRIBA_IZQUIERDA", "densidadDeTexto": "MINIMA",
    "elementos": { "logo": true, "titular": true, "subtitulo": true, "nombreProducto": true, "atributos": 3,
                   "precioRegular": false, "precioPromocional": false, "vigencia": false, "cta": true,
                   "contacto": false, "textoLegal": false }
  },
  {
    "clave": "SERVICIO_PROFESIONAL",
    "nombre": "Servicio profesional",
    "pensadaPara": "Clínicas, estudios, talleres y otros servicios",
    "formato": "CUADRADO", "composicion": "DIVIDIDA", "estilo": "CORPORATIVO",
    "modo": "CLARO", "fondo": "COLOR_DE_MARCA", "posicionLogo": "ARRIBA_IZQUIERDA", "densidadDeTexto": "EQUILIBRADA",
    "elementos": { "logo": true, "titular": true, "subtitulo": true, "nombreProducto": true, "atributos": 2,
                   "precioRegular": true, "precioPromocional": true, "vigencia": true, "cta": true,
                   "contacto": true, "textoLegal": true }
  },
  {
    "clave": "HISTORIA_DE_TEMPORADA",
    "nombre": "Historia de temporada",
    "pensadaPara": "Historias de Instagram y fechas especiales",
    "formato": "HISTORIA", "composicion": "ESCENA_AMBIENTADA", "estilo": "DIVERTIDO",
    "modo": "CLARO", "fondo": "ESCENA", "posicionLogo": "ARRIBA_DERECHA", "densidadDeTexto": "MINIMA",
    "elementos": { "logo": true, "titular": true, "subtitulo": false, "nombreProducto": true, "atributos": 0,
                   "precioRegular": true, "precioPromocional": true, "vigencia": true, "cta": true,
                   "contacto": false, "textoLegal": true }
  }
]
```

Una plantilla base es de solo lectura. Al duplicarla, la copia pertenece a la organización y tiene revisiones como cualquier plantilla ([ADR-0015](../modulos/templates/adr/0015-revisiones-inmutables-y-diseno-estructurado.md)).

## 4. Campaña

```jsonc
{
  "titulo": "Promo café diciembre",                          // [existe] interno, no se envía
  "objetivo": "PROMOCION",                                   // [nuevo] PROMOCION | LANZAMIENTO | TEMPORADA | RECORDACION | EVENTO
  "ocasion": "Navidad",                                      // [nuevo] opcional
  "producto": "ref",                                         // [existe]
  "plantilla": "ref",                                        // [existe] revisión fijada
  "cta": "Aprovecha",                                        // [existe]
  "promocion": {
    "precio": { "montoMenor": 7490, "moneda": "PEN" },       // [existe]
    "inicio": null,                                          // [existe]
    "fin": "2026-12-31T23:59:00-05:00",                      // [existe]
    "condiciones": "Válido solo en tienda. Hasta agotar stock.", // [nuevo] opcional, máx. 120 caracteres
    "mostrarDescuento": false                                // [nuevo] lo decide el usuario en cada campaña;
                                                             // el porcentaje ("-17 %") lo calcula el sistema
  },
  "indicacionesCreativas": "Ambiente navideño sutil, sin Papá Noel" // [cambia] hoy "instructions"; máx. 500 caracteres,
                                                             // solo como contexto visual; no puede cambiar textos ni reglas
}
```

**Por qué:**

- **`objetivo` y `ocasion`.** Cambian el diseño más que cualquier otro dato: un lanzamiento destaca la novedad; una promoción, el precio; Navidad, la ambientación.
- **`condiciones`.** Hoy no hay dónde ponerlas. Sin ellas, el usuario las escribiría en las instrucciones y la IA podría dibujarlas mal o no dibujarlas.

## 5. Textos del flyer (salida del paso de copy)

Hoy el paso de copy produce titular, caption, CTA, hashtags e `imagePrompt`. Para el flyer solo sirven los textos cortos, separados del post:

```jsonc
{
  "flyer": {
    "titular": "Tu café favorito, a mejor precio",           // máx. 45 caracteres
    "subtitulo": "Tres variedades de café de altura"         // máx. 70 caracteres, opcional
  },
  "publicacion": {                                           // solo para el post, nunca al generador de imagen
    "caption": "…",
    "hashtags": ["#CafeDeAltura"]
  }
  // imagePrompt [se descarta]: la dirección de arte sale de la plantilla y el kit de marca
}
```

**Flujo propuesto:** primero el copy, luego el usuario revisa o corrige el titular y el subtítulo, y recién entonces se genera la imagen. Corregir un texto antes cuesta nada; después cuesta otra imagen.

## 6. Brief que recibe el generador

El sistema lo arma con todo lo anterior. Solo incluye los textos cuyo elemento está activo en la plantilla, y la insignia de descuento solo si la campaña la pide. Es lo que después se convierte en prompt.

```jsonc
{
  "salida": { "formato": "CUADRADO", "tamano": "1024x1024", "idioma": "es-PE" },

  "referencias": [
    {
      "imagen": 1, "rol": "PRODUCTO", "tipo": "PRODUCT", "tipoFoto": "AMBIENTE",
      "marcaDelProducto": "BAO Café",
      "conservar": ["forma", "proporciones", "colores", "texto y logos impresos"]
    },
    { "imagen": 3, "rol": "ESTILO", "uso": "solo estilo visual; no copiar textos, productos ni logos" }
  ],

  "logo": {                                                  // no se envía a la IA: se pega después (ver abajo)
    "colocacion": "SUPERPUESTO", "posicion": "ARRIBA_DERECHA",
    "logoEsOscuro": true,                                    // la IA deja la esquina clara (u oscura si es false)
    "colorVelo": "#FFFFFF",                                 // solo si el logo no contrasta con lo que dibujó la IA
    "zonaReservada": { "anchoPct": 37, "altoPct": 21 }    // la IA deja esta esquina vacía
  },

  "textos": [                                                // importancia: 1 = lo más destacado
    { "rol": "titular",           "texto": "Tu café favorito, a mejor precio", "importancia": 2 },
    { "rol": "nombreProducto",    "texto": "Pack BAO Café 3 × 500 g",          "importancia": 3 },
    { "rol": "precioRegular",     "texto": "Antes S/ 89.90", "tachado": true,  "importancia": 4 },
    { "rol": "precioPromocional", "texto": "Ahora S/ 74.90",                   "importancia": 1 },
    { "rol": "insigniaDescuento", "texto": "-17 %",                            "importancia": 3 },
    { "rol": "vigencia",          "texto": "Hasta el 31 de diciembre",         "importancia": 5 },
    { "rol": "cta",               "texto": "Aprovecha", "forma": "BOTON",      "importancia": 2 },
    { "rol": "legal",             "texto": "Válido solo en tienda. Hasta agotar stock. Imágenes referenciales.", "importancia": 6 }
  ],

  "direccionDeArte": {
    "rubro": "Cafetería",
    "tono": "Cálido, cercano y artesanal",
    "objetivo": "PROMOCION",
    "ocasion": "Navidad",
    "composicion": "PRODUCTO_EN_PANEL",
    "estilo": "ELEGANTE",
    "modo": "OSCURO",
    "fondo": "COLOR_DE_MARCA",
    "colores": { "primario": "#5B3A29", "secundario": "#C98B4E", "acento": "#E4572E", "fondo": "#1E120D" },
    "tipografia": "SERIF_ELEGANTE",
    "estiloVisual": ["artesanal", "cálido", "fotografía natural"],
    "densidadDeTexto": "EQUILIBRADA",
    "indicacionesFijas": "Fondo con textura de papel kraft",
    "indicacionesCreativas": "Ambiente navideño sutil, sin Papá Noel"
  },

  "restricciones": [
    "Ningún texto, número, precio, fecha, porcentaje, contacto ni afirmación fuera de 'textos'",
    "El logo no se recolorea ni se redibuja",
    "El texto impreso en el producto queda como en la foto",
    "Palabras prohibidas: gratis"
  ]
}
```

**Implementación de referencia:** `apps/api/evaluation/flyer-quality/brief.mjs` arma el brief, `prompt.mjs` lo convierte en prompt y `marca.mjs` deriva los colores y la luminancia del logo. Las reglas que no son obvias:

- **Logo superpuesto** (decidido tras la prueba en ChatGPT, donde la IA cambió el eslogan de Buscaditos en 3 de 6 flyers): la IA no recibe el logo; deja vacía la esquina de la plantilla y el sistema pega el logo original con `sharp`, directo sobre el fondo si el contorno del logo contrasta con lo que hay debajo (3:1, o el 75 % del contraste que tiene sobre su fondo de diseño, en el 85 % del contorno, y fondo sin carga). Si no, sobre un velo: el fondo desenfocado y teñido, de bordes difusos y opacidad según lo que falte de contraste (blanco para logo oscuro, fondo oscuro de la marca para logo claro). El prompt pide la esquina en el tono que el logo necesita, también cuando contradice el modo de la plantilla (logo oscuro en flyer oscuro), para que el velo sea la excepción. Un modelo de visión revisa el recorte de la esquina en la imagen de la IA antes de pegar el logo: si hay texto, el flyer falla (en la primera prueba por API el logo tapó "Nuevo en" y la lectura del flyer completo no lo notó). Un logo oscuro en plantillas oscuras se resuelve mejor con la variante clara del kit de marca. La zona mide hasta el 13 % del alto y el 30 % del ancho en cuadrado, más en formatos angostos (40 % en 9:16). Implementación: `logo.mjs` y `componer-logo.mjs`. El modo anterior, con la IA dibujando el logo, sigue disponible para comparar.
- **Límite de textos:** depende de la composición (cuadrado: 8 en producto protagonista o en panel, 7 en escena, 12 en dividida, 10 en tipográfica), suma 2 en vertical y 1 en historia, y resta 1 con densidad mínima. Si se supera, se omiten en este orden unidad, características, contacto y subtítulo, con aviso; precios, vigencia, CTA y texto legal nunca se omiten.
- **Sin decoración de relleno:** el prompt prohíbe flechas, destellos, cintas y confeti añadidos, que sobrecargaban el flyer del café.
- **Descuento:** se redondea hacia abajo (`-16 %` para 89.90 → 74.90), porque anunciar más descuento del real sería engañoso.
- **Importancia:** en una promoción, el precio de oferta es el texto principal; en el resto de objetivos, el titular.
- **Formatos:** `CUADRADO` 1024 × 1024, `VERTICAL` 1024 × 1280, `HISTORIA` 1152 × 2048.

Para medir: el verificador compara el flyer contra `textos`. Cada rol sabe si es precio, fecha o texto, así que la comparación deja de adivinar qué es cada cosa.

## Qué se descarta

| Dato | Dónde | Decisión |
| --- | --- | --- |
| `palette` BLUE / CORAL | Plantilla | Se reemplaza por colores de marca y `modo` |
| `showMainImage` | Plantilla | Se elimina; sin foto es la composición `TIPOGRAFICA` |
| Ancho y alto libres | Plantilla | Se reemplazan por `formato` |
| `imagePrompt` | Salida del copy | Se deja de generar |
| Caption y hashtags | Envío a la imagen | Solo para la publicación |
| IDs internos y `amountMinor` | Envío a la IA | Nunca se envían |
| Descripción larga del producto | Envío al flyer | Solo al copy; al flyer van `atributosClave` |
| Título de la campaña | Envío a la IA | Interno |

## Prioridad sugerida

**Fase 1: lo mínimo para flyers publicables sin retoques.** Resuelve lo que falló o faltó en la prueba:

- **Kit de marca:** `rubro`, `region`, colores de marca y `logo.esOscuro` (derivado).
- **Producto:** que `tipo` llegue a la IA, `nombreCorto`, `marcaDelProducto`, `foto.tipo` y `atributosClave`.
- **Plantilla:** `formato`, `composicion` ampliada, `estilo`, `modo`, `posicionLogo` y `elementos` ampliados.
- **Campaña:** `objetivo` y `promocion.condiciones`.
- **Copy:** separar los textos del flyer del post, con titular y subtítulo, y revisarlos antes de generar la imagen.

**Fase 2: mejora y personalización.**

- **Kit de marca:** `logo.paraFondoOscuro`, `isotipo`, `tipografia`, `estiloVisual`, `contacto`, `textoLegalPorDefecto` y `palabrasProhibidas`.
- **Plantilla:** `referenciasDeEstilo` e `indicacionesFijas`.
- **Campaña:** `ocasion`.
- **Producto:** `unidad`.
- **Campaña:** `promocion.mostrarDescuento`.
- **Plantillas base** del sistema.

## Decisiones

Cerradas el 14 de noviembre de 2026.

1. **Colores de marca: los propone el sistema a partir del logo** y el usuario puede corregirlos. Al subir el logo se reduce la imagen, se ignoran los píxeles transparentes y casi blancos, y se agrupan los colores restantes. El dominante es el primario, el siguiente el secundario y el más saturado el acento. Los fondos claro y oscuro se derivan del primario. No usa IA ni tiene costo por llamada.
2. **`marcaDelProducto` y `foto.tipo` los indica el usuario.** No se infieren, así que no hay llamada de visión extra al subir la foto. `foto.tipo` es obligatorio; `marcaDelProducto` es opcional. `tieneFondoTransparente` sí lo deriva el sistema, porque leer el canal alfa no cuesta nada.
3. **Hay plantillas base del sistema como ejemplo,** de solo lectura y duplicables (ver [Plantillas base](#plantillas-base)).
4. **El porcentaje de descuento lo activa el usuario en cada campaña** (`promocion.mostrarDescuento`). El porcentaje lo calcula el sistema, nunca la IA. Deja de ser un elemento de la plantilla.
