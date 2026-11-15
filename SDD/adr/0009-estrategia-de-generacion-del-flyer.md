# ADR-0009 · Estrategia de generación del flyer: IA completa con verificación o composición

- **Estado:** Aceptado
- **Fecha:** 2026-11-14 · propuesto y cerrado tras la prueba de calidad del mismo día
- **Ámbito:** generación visual (fase 6)

## Contexto

El flujo implementado es híbrido: la IA genera una imagen base a partir de la foto del producto y después `PlaywrightTemplateRenderer` compone encima, con HTML y CSS, los textos, precios, fechas, CTA y logo exactos. La regla original era que la IA nunca fuera la fuente final de precios ni fechas.

El objetivo de producto es otro: que la IA reciba todos los datos y genere **el flyer completo**, con el texto integrado en el diseño. El híbrido garantiza exactitud, pero el resultado se percibe como una plantilla sobre una imagen, y obliga a ejecutar Chromium, pesado para un servidor económico.

## Opciones

| | A · IA completa | B · Híbrido (actual) |
| --- | --- | --- |
| Calidad visual | Alta; texto integrado al diseño | Limitada por la plantilla |
| Precio, fechas y logo exactos | No garantizado | Garantizado |
| Infraestructura | Una llamada a la API del proveedor | Chromium en el servidor |
| Costo de corregir un texto | Otra generación de imagen | Ninguno |
| Variedad entre campañas | Alta | Dos layouts y dos paletas |

## Prueba de calidad

Se pedían entre 15 y 20 generaciones reales. Se hicieron 36 por API y 14 en ChatGPT, con `gpt-image-2` en calidad `low` y lectura con `gpt-5-mini`. Los datos, los scripts y la forma de repetirla están en [`apps/api/evaluation/flyer-quality`](../../apps/api/evaluation/flyer-quality/README.md).

| Ronda | Qué se probó | Precios y fechas | Otros textos | Hallazgo |
| --- | --- | --- | --- | --- |
| 1 · API, 17 flyers | Datos actuales del sistema; la IA dibuja el logo | 17/17 | Nombre, titular y CTA exactos en 17/17 | El logo salió recoloreado o ilegible sobre fondos oscuros: su texto se leyó bien solo en el 59 % |
| 2 · ChatGPT, 7 casos | [Modelo de datos nuevo](../arquitectura/datos-del-flyer.md); la IA dibuja el logo | Sin errores | Sin errores | El eslogan del logo de Buscaditos cambió en 3 de 6 flyers. El café, con muchos elementos, se vio sobrecargado |
| 3 · API, 11 flyers | Logo original pegado por el sistema sobre una placa | 8/8 en la corrida completa | 47/47 | En 1 de 8 la IA no dejó libre la esquina y la placa tapó el titular sin que la verificación lo notara |
| 4 · API, 8 flyers | Logo directo o con velo; revisión de la esquina | 8/8 | 47/47 | 4 logos directos y 4 con velo; ningún texto tapado. El autor publicaría los 8 |

En todas las rondas: ningún error del proveedor; de 11 a 17 s y unos US$ 0.025 por flyer, con la verificación incluida. Las rondas 2 a 4 respetaron el producto y su foto, con detalles menores: un producto recortado en el borde, un ícono con letras que nadie pidió y un texto impreso del producto que se perdió. La revisión humana los detecta.

El criterio era el 80 % de precios y fechas correctos al primer intento. Salió el 100 % en las 36 generaciones por API.

## Decisión

`AI_FULL` es el modo principal. `COMPOSED` se conserva como alternativa, detrás del mismo port de composición.

**Modo `AI_FULL`:**

1. **Brief y prompt.** El sistema resuelve el kit de marca, el producto, la plantilla y la campaña en un brief: textos exactos con su jerarquía, formato, dirección de arte y restricciones. Con el brief arma el prompt. Los campos y las reglas están en [datos para generar el flyer](../arquitectura/datos-del-flyer.md).
2. **Generación.** El modelo de imagen recibe **solo la foto del producto** y el prompt, en calidad baja por defecto. El logo no se envía: la IA deja vacía una esquina, en el tono que el logo necesita.
3. **Logo superpuesto.** El sistema pega el logo original, sin recolorearlo ni redibujarlo:
   - directo sobre el fondo, si el contorno del logo contrasta con lo que dibujó la IA;
   - si no, sobre un velo translúcido de bordes difusos.
4. **Verificación automática.** Antes de pasar a aprobación:
   - un modelo de visión transcribe el flyer final sin conocer los textos esperados, y el sistema compara precios, fechas y textos con el snapshot;
   - otra lectura revisa el recorte de la esquina en la imagen de la IA: si hay texto, el logo lo taparía.
   
   Si algo no coincide, la generación falla con `IMAGE_VERIFICATION_FAILED` y no llega a aprobación. No se reintenta sola, por la misma razón que en [ADR-0008](0008-cola-de-trabajos-y-worker.md): cada intento se cobra. Quien la pidió puede regenerarla.
5. **Aprobación humana obligatoria**, que ya existe.

**Modo `COMPOSED`:** el flujo híbrido actual, sin cambios. Queda para quien necesite exactitud garantizada sin regenerar, o si el proveedor deja de rendir.

El modo se elige por despliegue al inicio, igual que el proveedor ([ADR-0006](0006-proveedores-de-ia-por-despliegue.md)). Llevarlo a la plantilla queda como evolución posible.

## Alternativas descartadas

- **Solo IA completa, sin verificación:** un precio mal escrito dependería únicamente de la atención de quien aprueba. La prueba no encontró errores de precio, pero sí un logo que tapaba el titular y que solo una revisión dirigida detectó.
- **Que la IA dibuje el logo:** lo recolorea, lo vuelve ilegible sobre fondos oscuros y cambia el texto pequeño (rondas 1 y 2).
- **Pegar el logo sobre una placa sólida:** se lee siempre, pero el autor la descartó porque se ve como una tarjeta encima del diseño.
- **Eliminar ya el compositor:** está implementado y probado; quitarlo deja al producto sin respaldo.

## Consecuencias

- Cada generación suma dos lecturas de visión, el flyer y la esquina: menos de US$ 0.002 y unos segundos más.
- Cada corrección de texto cuesta una imagen nueva, unos US$ 0.025 en calidad baja.
- Se agregan los ports `FlyerVerifier` (lectura de visión) y un compositor del logo con `sharp`, ya dependencia de `apps/api`. `ImageGenerator` pasa a recibir el brief. `TemplateRenderer` queda solo para `COMPOSED`.
- El modelo de datos crece según [datos para generar el flyer](../arquitectura/datos-del-flyer.md): kit de marca con colores propuestos desde el logo, tipo de foto, nombre corto, marca del producto, atributos clave, plantillas con composición y estilo, y objetivo de la campaña.
- Un logo oscuro en una plantilla oscura se resuelve mejor con la variante clara del kit de marca. Sin ella, queda el velo.
- Con `AI_FULL` como modo principal, Chromium deja de ser requisito del despliegue básico.
- La regla "la IA nunca es fuente de precios" se reformula: **la IA puede dibujarlos, pero el sistema los verifica contra el snapshot antes de que una persona apruebe**. El logo nunca lo dibuja la IA.
