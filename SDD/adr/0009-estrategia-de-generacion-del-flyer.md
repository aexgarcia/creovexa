# ADR-0009 · Estrategia de generación del flyer: IA completa con verificación o composición

- **Estado:** Propuesto · se cierra tras la prueba de calidad descrita abajo
- **Fecha:** 2026-11-14
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

## Decisión propuesta

Soportar ambas como **estrategias** detrás de un mismo port de composición, con la opción A como modo principal si supera la prueba de calidad.

**Modo `AI_FULL`:**

1. El generador recibe la foto del producto y el logo como imágenes de referencia, más los textos exactos del snapshot (nombre, precios, fechas, CTA, titular).
2. **Verificación automática:** un modelo con visión lee el flyer generado y devuelve, en formato estructurado, los precios, el nombre y las fechas que ve. Se comparan contra el snapshot. Si algo no coincide, la generación falla con `IMAGE_VERIFICATION_FAILED` y no llega a aprobación.
3. **Aprobación humana obligatoria**, que ya existe.

**Modo `COMPOSED`:** el flujo híbrido actual, sin cambios. Se conserva para quien necesite exactitud garantizada o cuando el proveedor no rinda.

El modo se elige por despliegue al inicio (igual que el proveedor, [ADR-0006](0006-proveedores-de-ia-por-despliegue.md)); llevarlo a la plantilla queda como evolución posible.

## Prueba de calidad previa

Antes de aceptar este ADR: entre 15 y 20 generaciones reales en modo `AI_FULL`, con productos y precios reales, midiendo:

- porcentaje con todos los precios y fechas correctos;
- porcentaje con el logo reconocible y sin deformar;
- porcentaje con el producto fiel a la foto;
- costo y tiempo por generación.

Criterio sugerido: si menos del 80 % sale correcto al primer intento, `COMPOSED` sigue siendo el modo por defecto y `AI_FULL` queda como opción.

No se conoce todavía la tasa de acierto del modelo configurado con texto en español y precios; por eso la decisión queda propuesta.

## Alternativas descartadas

- **Solo IA completa, sin verificación:** un precio mal escrito llegaría a depender únicamente de la atención de quien aprueba.
- **Eliminar ya el compositor:** está implementado y probado; quitarlo antes de medir la opción A deja al producto sin respaldo.
- **Componer con `sharp` y SVG en lugar de Chromium:** más liviano, pero pierde el ajuste automático de texto; se reconsidera solo si `COMPOSED` queda como modo principal y Chromium resulta un problema de costo.

## Consecuencias

- La verificación suma una llamada de visión por generación (costo y latencia).
- En modo `AI_FULL` cada corrección de texto cuesta una imagen nueva.
- Los ports `ImageGenerator`, `TemplateRenderer` y `StorageProvider` casi no cambian; se agrega un port `FlyerVerifier` y un selector de estrategia.
- Si `AI_FULL` queda como modo principal, Chromium deja de ser requisito del despliegue básico.
- La regla "la IA nunca es fuente de precios" se reformula: **la IA puede dibujarlos, pero el sistema los verifica contra el snapshot antes de que una persona apruebe**.
