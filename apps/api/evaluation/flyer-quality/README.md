# Prueba de calidad del flyer con IA completa

Datos para la prueba que cierra [ADR-0009](../../../../SDD/adr/0009-estrategia-de-generacion-del-flyer.md): entre 15 y 20 generaciones reales en modo `AI_FULL` para medir si la IA escribe bien precios, fechas y logo.

No forma parte de los tests automáticos: consume crédito del proveedor y se ejecuta a mano.

## Contenido

| Archivo | Qué es | ¿Va a git? |
| --- | --- | --- |
| `escenarios.json` | 15 escenarios (17 generaciones con las repeticiones): marca, producto, precio, promoción, plantilla y textos | Sí |
| `logos/*.svg` | Logos ficticios de las tres marcas de prueba | Sí |
| `fotos/` | Fotos de producto. Algunas `.jpg` son PNG por dentro; la prueba debe detectar el formato por contenido, no por extensión | No: pueden ser de clientes o tener derechos |
| `logos/png/`, `resultados/` | Generados | No |
| `validar.mjs` | Revisa los datos sin llamar a ninguna IA | Sí |

```sh
# desde apps/api
node evaluation/flyer-quality/validar.mjs
```

Comprueba montos, monedas, vigencia de las promociones, largo de los textos y fotos faltantes. Convierte los logos a PNG e imprime, por escenario, **los textos exactos que el flyer debe mostrar**; la verificación automática comparará contra esos textos.

## Probar prompts en ChatGPT (modelo de datos nuevo)

Usa los datos propuestos en [datos para generar el flyer](../../../../SDD/arquitectura/datos-del-flyer.md): kit de marca, plantillas base, producto con tipo de foto y campaña con objetivo.

| Archivo | Qué hace |
| --- | --- |
| `casos.json` | Marcas y 7 casos con los datos nuevos |
| `plantillas-base.json` | Las 5 plantillas base del sistema |
| `marca.mjs` | Propone colores desde el logo y detecta si es oscuro (sin IA) |
| `brief.mjs` | Arma el brief: decide textos, formato, presentación del logo y descuento |
| `prompt.mjs` | Convierte el brief en el prompt |
| `preparar-chatgpt.mjs` | Genera una carpeta por caso para ChatGPT |

```sh
# desde apps/api
node evaluation/flyer-quality/preparar-chatgpt.mjs
node evaluation/flyer-quality/preparar-chatgpt.mjs --solo=01-cafe-promocion-navidad
```

En `chatgpt/<caso>/` quedan `prompt.txt`, `1-foto.*`, `brief.json` y `logo-para-superponer.png`.

1. En ChatGPT: chat nuevo, adjunta **solo** `1-foto` y pega el prompt. La IA deja vacía la esquina del logo.
2. Guarda la imagen en `chatgpt/resultados/` y pega el logo original:

   ```sh
   node evaluation/flyer-quality/componer-logo.mjs 01-cafe-promocion-navidad "evaluation/flyer-quality/chatgpt/resultados/<imagen>.png"
   ```

   Deja `<imagen>-con-logo.png` al lado.

Con `--logo=ia` se preparan los casos al modo anterior: se adjunta también `2-logo.png` y la IA dibuja el logo. `preparar-chatgpt.mjs` nunca borra `chatgpt/resultados/`.

Para cambiar el prompt, edita `prompt.mjs` (redacción) o `brief.mjs` (qué se envía) y vuelve a ejecutar; no edites los `prompt.txt` a mano, o el cambio no llegará al sistema.

## Probar por API (modelo de datos nuevo)

`generar.mjs` envía exactamente lo mismo que `preparar-chatgpt.mjs` (los dos usan `casos.mjs`), pega el logo original con `logo.mjs` y verifica el flyer final con `verificar.mjs`.

```sh
# desde apps/api
node evaluation/flyer-quality/generar.mjs                      # plan y costo estimado, sin llamadas
node evaluation/flyer-quality/generar.mjs --real               # 8 flyers en calidad low: CONSUME CRÉDITO
node evaluation/flyer-quality/generar.mjs --real --repeticiones=2   # cada caso dos veces
node evaluation/flyer-quality/generar.mjs --real --carpeta=<nombre> # continúa una ejecución cortada
node evaluation/flyer-quality/generar.mjs --resumen=<nombre>   # rehace resumen y revisión sin llamadas
node evaluation/flyer-quality/generar.mjs --real --revisar-logo=<nombre>   # rehace solo la revisión de la esquina del logo
```

En `resultados/api-<fecha>/` quedan, por flyer, la imagen de la IA (`.ia.png`), el flyer final con el logo (`.png`) y un JSON con prompt, lectura, verificación, tokens y costo; además `resumen.md`, `revision.html` y `revision-manual.csv`.

El logo va directo sobre el fondo si contrasta con lo que dibujó la IA, o sobre un velo translúcido si no (`logo.mjs`). Antes de pegarlo, un modelo de visión revisa el recorte de esa esquina en la imagen de la IA: si hay texto, el flyer falla con "el logo tapa texto". Después se lee y verifica el **flyer final**.

## Ejecutar la prueba

```sh
# desde apps/api
node evaluation/flyer-quality/ejecutar.mjs                    # simulación: arma solicitudes, no llama a nadie
node evaluation/flyer-quality/ejecutar.mjs --real             # genera y verifica: CONSUME CRÉDITO
node evaluation/flyer-quality/ejecutar.mjs --real --solo=CA-02   # solo un escenario
node evaluation/flyer-quality/ejecutar.mjs --real --carpeta=<nombre>   # continúa una ejecución cortada
node evaluation/flyer-quality/ejecutar.mjs --resumen=<nombre> # recalcula con tu revisión manual
```

Por cada generación:

1. Envía a `/v1/images/edits` la foto del producto y el logo como referencias, con los textos exactos (`OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_QUALITY`, 1024 × 1024). Sin reintentos.
2. Un modelo de visión (`OPENAI_COPY_MODEL`, o `EVAL_VISION_MODEL`) **transcribe** el flyer sin conocer los textos esperados, para no inducirlo.
3. `comparar.mjs` contrasta la lectura con lo esperado: importes y moneda, día y mes de la vigencia, ningún precio ni fecha de más; nombre, titular y CTA con tildes (las mayúsculas no cuentan).

Se detiene tras tres errores seguidos. En `resultados/<fecha>/` quedan los PNG, un JSON por generación, `resumen.md` con las métricas del ADR y `revision.html` para la revisión visual. El logo sin deformar y la fidelidad del producto se anotan a mano en `revision-manual.csv` (`s`/`n`) y se suman con `--resumen`.

La lectura automática puede equivocarse: antes de cerrar el ADR, confirma en `revision.html` los casos marcados como fallo.

## Qué cubren los escenarios

| Riesgo | Escenarios |
| --- | --- |
| Precio sin promoción (línea base) | CA-01, CA-04, VO-04, SP-02, SP-04 |
| Precio regular y promocional juntos | CA-02, CA-03, CA-05, VO-01, VO-02, VO-03, VO-05, VO-06, SP-01, SP-03 |
| Separador de miles (`S/ 3,499.00`) | VO-02, VO-04 |
| Céntimos poco comunes (`37.45`, `29.95`) | CA-05 |
| Dígitos fáciles de confundir (`99.90` / `89.90`) | VO-05 |
| USD y EUR | VO-03, VO-06 |
| Solo fin, inicio y fin, solo inicio | CA-02 · CA-03, SP-03 · VO-05 |
| Tildes, ñ y signos `¡ ¿` | CA-04 y los logos |
| Nombre de producto muy largo | VO-04 |
| Un número en el titular que no es precio (`50 %`) | SP-03 |
| Servicios en lugar de productos | SP-01 a SP-04 |
| Empaque con texto propio | CA-01, CA-02 |
| Foto de ambiente o fondo cargado | CA-03, CA-04 |
| Foto PNG recortada con transparencia | VO-05 |
| Foto de baja resolución | VO-06 |
| Consistencia: el mismo escenario dos veces | VO-01, SP-01 |
| Logo con tilde, logo real con eslogan pequeño, formas curvas | Café Andino, Buscaditos, Sonrisa Plena |

Formato esperado: `S/`, `US$` y `€`, coma para miles y punto para decimales; fechas en español de Perú, sin año.

## Fotos

Las 13 están en `fotos/` (fuera de git). Varias son fotos reales de cámara de hasta 6000 × 7500 px: la prueba las reduce antes de enviarlas al proveedor. `reloj-original.png` es la fuente de `reloj-baja.jpg`.

Para reemplazar una, usa el nombre exacto. JPEG, PNG o WebP de hasta el tamaño que acepta el catálogo. Mejor fotos reales de productos tuyos o de clientes que imágenes de stock perfectas: la prueba mide lo que va a pasar en producción.

| Archivo | Qué debe mostrar |
| --- | --- |
| `mouse.jpg` | Ya está: la foto del producto del catálogo local |
| `cafe-grano.jpg` | Bolsa de café **con etiqueta y texto visibles** |
| `torta.jpg` | Torta de chocolate en una mesa o vitrina (foto de ambiente) |
| `desayuno.jpg` | Mesa con varios platos y fondo cargado |
| `taza.jpg` | Una taza sobre fondo blanco o liso |
| `laptop.jpg` | Una laptop |
| `audifonos.jpg` | Audífonos de diadema |
| `monitor.jpg` | Un monitor |
| `cargador.png` | Cargador **recortado, con fondo transparente** |
| `reloj-baja.jpg` | Smartwatch en **baja resolución** (unos 400 px de lado) |
| `consultorio.jpg` | Sillón o consultorio dental |
| `sonrisa.jpg` | Una persona sonriendo |
| `ortodoncia.jpg` | Brackets, radiografía o similar |

Si una foto real no coincide con el producto del escenario, cambia `nombre` y `descripcion` en `escenarios.json` en lugar de buscar otra foto, y vuelve a ejecutar `validar.mjs`.

Las promociones vencen entre el 30 de noviembre y el 31 de diciembre de 2026; si la prueba se corre después, `validar.mjs` lo avisa.
