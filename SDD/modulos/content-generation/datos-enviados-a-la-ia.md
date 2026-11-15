# Datos que se envían a la IA

Actualizado el 14 de noviembre de 2026 a partir del código. Si este documento y el código difieren, manda el código y este documento debe corregirse.

Mapa de cada dato del sistema, desde que se escribe en el CMS hasta el prompt de cada llamada al proveedor. Sirve para afinar los prompts del modo `AI_FULL` ([ADR-0009](../../adr/0009-estrategia-de-generacion-del-flyer.md)) antes de implementarlo.

## Recorrido

```
CMS ─► tablas ─► snapshot (se congela al pedir la generación)
                    │
                    ├─► 1. Copy:   modelo de texto  ─► titular, caption, CTA, hashtags, imagePrompt
                    │
                    ├─► 2. Imagen: modelo de imagen ─► imagen base, sin texto      (modo COMPOSED, actual)
                    │       └─► 3. Render: Chromium compone textos, precios y logo
                    │
                    └─► AI_FULL: modelo de imagen ─► flyer completo con texto    (prototipo, evaluation/flyer-quality)
```

El **snapshot** es la foto inmutable de los datos al pedir la generación ([ADR-0016](../campaigns/adr/0016-snapshot-inmutable-por-generacion.md)). Lo que no está en el snapshot no llega a la IA, salvo el diseño de la plantilla, que el render lee de la revisión fijada en la campaña.

## Tabla maestra

✔ se envía · ✘ no se envía · — no aplica

| Dato | Dónde se edita | En el snapshot | 1. Copy | 2. Imagen (COMPOSED) | 3. Render | AI_FULL (prototipo) |
| --- | --- | --- | --- | --- | --- | --- |
| **Organización** | | | | | | |
| Nombre | Perfil de marca | ✔ | ✔ `business` | ✔ en el JSON | ✔ junto al logo | ✔ `Business:` |
| Descripción | Perfil de marca | ✔ | ✘ | ✔ en el JSON | ✘ | ✔ |
| Tono de marca | Perfil de marca | ✔ (opcional) | ✔ `brandTone` | ✔ en el JSON | ✘ | ✔ `Brand tone:` |
| Logo (imagen) | Perfil de marca | solo el ID | ✘ | ✘ solo el ID en el JSON | ✔ sobre placa blanca | ✔ imagen 2 |
| **Producto o servicio** | | | | | | |
| Tipo (`PRODUCT` / `SERVICE`) | Catálogo | **✘** | ✘ | ✘ | ✘ | ✘ |
| Nombre | Catálogo | ✔ | ✔ exacto | ✔ en el JSON | ✔ | ✔ exacto |
| Descripción | Catálogo | ✔ | ✔ | ✔ en el JSON | ✘ | ✘ |
| Precio regular | Catálogo | ✔ unidades menores | ✔ `PEN 89.90` + `amountMinor` | ✔ `amountMinor` en el JSON | ✔ `PEN 89.90` | ✔ `S/ 89.90` |
| Foto | Catálogo | solo el ID | ✘ | ✔ imagen de referencia | ✔ (la imagen base) | ✔ imagen 1 |
| **Plantilla** | | | | | | |
| Nombre | Plantillas | ✘ | ✘ | ✘ | ✘ | ✘ |
| Ancho y alto | Plantillas | ✔ | ✘ | ✔ (solo valida 1080) | ✔ | fijo 1024 × 1024 |
| Layout (`CLASSIC` / `PRODUCT_FOCUS`) | Plantillas | **✘** (se lee de la revisión) | ✘ | ✘ | ✔ | ✔ traducido a palabras |
| Paleta (`BLUE` / `CORAL`) | Plantillas | **✘** (se lee de la revisión) | ✘ | ✘ | ✔ | ✔ traducida a colores |
| Seis interruptores (`showLogo`, `showRegularPrice`, `showPromotionPrice`, `showHeadline`, `showCta`, `showMainImage`) | Plantillas | **✘** | ✘ | ✘ | ✔ | **✘ se ignoran** |
| **Campaña** | | | | | | |
| Título | Campaña | ✘ | ✘ | ✘ | ✘ | ✘ |
| Instrucciones adicionales | Campaña | ✔ | ✔ `additionalInstructions` | ✔ en el JSON | ✘ | **✘** |
| CTA | Campaña | ✔ | ✔ exacto | ✔ en el JSON | ✔ | ✔ exacto |
| Precio promocional | Campaña | ✔ | ✔ `PEN 74.90` + `amountMinor` | ✔ en el JSON | ✔ | ✔ `S/ 74.90` |
| Inicio y fin de la promoción | Campaña | ✔ **en UTC** | ✔ **en UTC** | ✔ en UTC | ✔ en hora de Lima | ✔ en hora de Lima |
| **Generado por el paso 1** | | | | | | |
| Titular | — | — | (salida) | ✔ | ✔ | ✔ (en la prueba, fijo) |
| Caption | — | — | (salida) | ✔ | ✘ | ✘ |
| Hashtags | — | — | (salida) | ✔ | ✘ | ✘ |
| `imagePrompt` | — | — | (salida) | ✔ | ✘ | ✘ |
| **Fijo en el código** | | | | | | |
| País, idioma y zona horaria (`es-PE`, `America/Lima`) | — | — | idioma español | ✘ | ✔ | ✔ "a business in Peru" |
| Calidad y tamaño de imagen | `.env` | — | — | ✔ | — | ✔ |

## Qué recibe cada llamada

### 1. Copy (`OpenAICopyGenerator` o `GeminiCopyGenerator`)

Instrucción fija en inglés (escribir en español, no inventar, precios textuales, CTA exacto, palabras prohibidas) y este JSON:

```json
{
  "product": { "id": "…", "organizationId": "…", "name": "…", "description": "…",
               "regularPrice": { "amountMinor": 8990, "currency": "PEN" }, "imageAssetIds": ["…"] },
  "requiredPriceTexts": ["PEN 89.90", "PEN 74.90"],
  "cta": "Aprovecha",
  "business": "Café Andino",
  "brandTone": "Cálido, cercano y artesanal…",
  "promotion": { "amountMinor": 7490, "currency": "PEN", "startsAt": null, "endsAt": "2027-01-01T04:59:00.000Z" },
  "additionalInstructions": "…"
}
```

Gemini recibe lo mismo menos `requiredPriceTexts` y `cta`. Ninguno de los dos recibe la descripción de la organización.

### 2. Imagen base (`OpenAIImageGenerator`, modo actual)

- **Imagen:** la foto del producto.
- **Prompt:** instrucción fija ("crea una imagen publicitaria, conserva el producto, **no dibujes texto, precios ni logo**, deja espacio") más un JSON con `imagePrompt`, el copy completo (titular, caption, CTA, hashtags) y **el snapshot entero**, IDs internos incluidos.
- **Parámetros:** `size=1024x1024`, `quality` de `.env`, `output_format=png`.

Gemini recibe lo mismo, con la foto en línea.

### 3. Render (`PlaywrightTemplateRenderer`)

No es IA. Toma la imagen base, el titular, el CTA, los precios, las fechas, el nombre de la organización y el logo, y los compone con el layout, la paleta y los interruptores de la plantilla.

### AI_FULL (prototipo en `apps/api/evaluation/flyer-quality/ejecutar.mjs`)

- **Imágenes:** 1, la foto del producto (corregida la orientación y reducida a 1536 px); 2, el logo en PNG.
- **Prompt:** la plantilla de la sección siguiente, con los textos ya formateados.
- **Parámetros:** `size=1024x1024`, `quality` (en la prueba, `low`), `output_format=png`.

## Problemas encontrados

Ordenados por impacto. Ninguno está corregido todavía.

1. **Las fechas llegan al copy en UTC.** "Hasta el 31 de diciembre a las 23:59" de Lima se envía como `2027-01-01T04:59:00.000Z`. El modelo puede escribir "hasta el 1 de enero de 2027" en el caption, y la validación del copy no revisa fechas. Hay que enviar la fecha ya formateada en la zona del negocio, como hace el render.
2. **El tipo producto o servicio no está en el snapshot.** Para un servicio, la foto es un ambiente (un consultorio), no "el producto"; aun así el prompt dice "conserva el producto idéntico". El prompt debería cambiar según el tipo.
3. **AI_FULL ignora los interruptores de la plantilla.** Si la plantilla oculta el precio regular o el CTA, el prototipo los dibuja igual.
4. **AI_FULL no envía las instrucciones de la campaña.** El brief creativo que se escribe por campaña se pierde. Deben ir como contexto, sin poder anular las reglas.
5. **Dos formatos de precio.** El copy y el render usan `PEN 89.90`; AI_FULL usa `S/ 89.90`. El caption y el flyer no coinciden. Hay que unificar en `S/ 89.90`.
6. **El diseño de la plantilla no está en el snapshot.** El render lo lee de la revisión fijada, que es inmutable, así que hoy funciona; pero si AI_FULL lo usa en el prompt, debería quedar congelado junto con el resto.
7. **La imagen base recibe datos que no usa.** IDs internos, caption y hashtags no ayudan a una imagen sin texto y solo agregan ruido al prompt.
8. **La descripción de la organización no llega al copy**, pero sí a la imagen. Probablemente debería ser al revés, o a ambos.

## Plantilla del prompt AI_FULL

Es la versión actual del prototipo, con las variables marcadas `{así}`. Para probar en ChatGPT, reemplaza las variables y adjunta primero la foto y después el logo.

```text
Design a finished square advertising flyer for social media, for a business in Peru.

Image 1 is the product photo. Keep the product identical: same shape, proportions, colors, materials and any text or logo printed on it. Do not redesign it, do not add or remove items.
Image 2 is the business logo. Place it once, in a corner, on a solid white rounded plate with generous padding, so it is fully legible on any background. Reproduce the logo exactly as supplied: same shapes, same original colors, same letters. Never recolor, invert, lighten, outline, redraw, restyle, translate or complete it. Every letter of the logo, including small ones, must be sharp and readable.

Render EXACTLY these Spanish texts, character by character, with the same accents, punctuation, spaces and digits:
- Product name: "{producto.nombre}"
- Headline: "{titular}"
- Regular price, smaller and struck through: "Antes {precio regular}"      ← solo con promoción
- Offer price, the largest and most prominent text: "Ahora {precio promocional}"   ← solo con promoción
- Price, large and prominent: "{precio regular}"                          ← solo sin promoción
- Validity, small: "{vigencia}"                                           ← solo si hay fechas
- Call to action, inside a button: "{cta}"

Do not add any other text, number, price, date, percentage, discount, website, phone number, social handle or claim. Text already printed on the product itself must stay as it is in the photo.

Business: {organización.nombre}. {organización.descripción} Brand tone: {organización.tono}
Style: {paleta}. Layout: {layout}.
Clean, modern, professional typography; every text perfectly legible.
```

| Variable | Origen | Formato |
| --- | --- | --- |
| `{producto.nombre}` | Catálogo | Tal cual |
| `{titular}` | En producción, el paso de copy; en la prueba, fijo en `escenarios.json` | Tal cual |
| `{precio regular}`, `{precio promocional}` | Catálogo y campaña, en unidades menores | `S/ 1,299.00`, `US$ 59.99`, `€ 99.00` |
| `{vigencia}` | Inicio y fin de la promoción | `Hasta el 31 de diciembre`, `Del 1 de diciembre al 15 de diciembre`, `Desde el 1 de diciembre`; en hora de Lima, sin año |
| `{cta}` | Campaña | Tal cual |
| `{organización.*}` | Perfil de marca | Tal cual |
| `{paleta}` | `BLUE`: deep navy background (#101321) with electric blue accents (#4b63fb) and white text · `CORAL`: deep burgundy background (#251214) with coral accents (#c74335) and warm white text | |
| `{layout}` | `CLASSIC`: the product photo is the large hero of the composition; headline at the top, prices and call to action at the bottom, always with strong contrast over the image · `PRODUCT_FOCUS`: the product sits centered and large on a clean panel; texts arranged around it without covering the product | |

Las versiones ya armadas de los 17 escenarios están en `apps/api/evaluation/flyer-quality/resultados/simulacion/*.prompt.txt`, junto a la foto que se envía.

## Cómo probar en ChatGPT

- **Un chat nuevo por prueba.** La conversación anterior influye en el resultado.
- **Adjunta las imágenes en el mismo orden:** foto y después logo. El prompt habla de "image 1" e "image 2".
- **Cambia una sola cosa por vez** respecto del prompt base, y anota qué cambió y qué pasó.
- **No cuenta para la métrica del ADR.** ChatGPT puede reescribir el prompt y no permite fijar calidad ni tamaño. Lo que funcione se traslada a `ejecutar.mjs` y se confirma con la API antes de cerrar el ADR.
