# ADR-0023 · La plantilla como dirección de arte, con plantillas base del sistema

- **Estado:** Aceptado, implementado
- **Fecha:** 2026-11-15
- **Ámbito:** módulo `templates`; afecta al compositor de `content-generation`
- **Relacionado:** [ADR-0009](../../../adr/0009-estrategia-de-generacion-del-flyer.md), [ADR-0015](0015-revisiones-inmutables-y-diseno-estructurado.md), [datos para generar el flyer](../../../arquitectura/datos-del-flyer.md)

## Contexto

La plantilla guardaba una geometría para el compositor HTML: `layout` (dos valores), `palette` (dos paletas fijas, ambas oscuras), seis interruptores y ancho × alto libres, de los que solo se aceptaba 1080 × 1080.

Con el flyer generado por IA ([ADR-0009](../../../adr/0009-estrategia-de-generacion-del-flyer.md)), la plantilla deja de ser una maqueta. Pasa a ser la dirección de arte de la marca, lo que hace que todos los flyers de una empresa parezcan suyos. La prueba de calidad mostró qué datos necesita la IA: formato, composición, estilo, modo, fondo, dónde va el logo, cuánta densidad de texto y qué elementos llevar.

## Decisión

1. **El diseño es la dirección de arte.** `FlyerDesign` pasa a tener:
   - `format`: `SQUARE`, `PORTRAIT` o `STORY`;
   - `composition`, `style`, `mode`, `background`, `logoPosition` y `textDensity`;
   - `elements`: diez interruptores y cuántas características del producto mostrar, de 0 a 4.
   
   No lleva colores: salen del kit de marca ([ADR-0022](../../organizations/adr/0022-kit-de-marca.md)).
2. **Las dimensiones salen del formato:** 1080 × 1080, 1080 × 1350 o 1080 × 1920. La API ya no las recibe. Se siguen guardando en la revisión, y una restricción de la base de datos exige que coincidan con el formato.
3. **Plantillas base en el código.** Las cinco plantillas base son un catálogo del sistema (`templates/application/base-templates.ts`), no filas de la base de datos:
   - `GET /templates/base` las lista;
   - `POST /templates/base/:key` crea en la organización una copia propia, con su revisión inicial.
   
   El CMS carga su diseño en el formulario para ajustarlo antes de guardar.
4. **Conversión de las revisiones existentes.** La migración las convierte una sola vez: `CLASSIC` pasa a `PRODUCT_HERO`, `PRODUCT_FOCUS` a `PRODUCT_PANEL`, las dos paletas oscuras a `DARK`, y los interruptores a elementos. Para hacerlo desactiva el trigger de inmutabilidad mientras dura el cambio. No cambia ningún dato de negocio; es un cambio de forma.
5. **`COMPOSED` traduce el diseño nuevo a sus dos maquetas cuadradas:**
   - `PRODUCT_PANEL` usa la composición con el producto enmarcado y el resto la clásica;
   - `LIGHT` usa la paleta coral y `DARK`, la azul;
   - `TYPOGRAPHIC` oculta la foto;
   - los elementos ocultan lo que corresponde, incluidas las fechas.
   
   Sigue generando solo en cuadrado.

## Alternativas consideradas

- **Plantillas base como filas sin organización:** obligaría a un `organizationId` nulo en `templates` y a excepciones al aislamiento ([ADR-0003](../../../adr/0003-aislamiento-por-organizacion.md)), y sus revisiones no tendrían dueño.
- **Leer los dos formatos de diseño (versionado):** mantener el formato viejo solo para lectura obliga a cada consumidor a entender ambos. No hay datos de producción que justifiquen ese costo.
- **Borrar las plantillas existentes:** el autor lo aceptó, pero las campañas las referencian con restricción de integridad. Convertirlas es más simple y conserva el historial.
- **Seguir aceptando ancho y alto libres:** el proveedor solo genera tamaños fijos y las redes usan tres formatos.

## Consecuencias

- Las revisiones convertidas conservan su identidad y su número, así que los snapshots ya tomados siguen apuntando a la misma revisión.
- Los clientes de la API que enviaban `dimensions` reciben `VALIDATION_ERROR`; el único cliente es el CMS, que ya no las envía.
- `COMPOSED` ignora el estilo, el fondo, la posición del logo y los elementos nuevos (subtítulo, características, contacto, texto legal). Solo `AI_FULL` los usa.
- Agregar o ajustar una plantilla base es un cambio de código y no afecta a las copias ya creadas.
