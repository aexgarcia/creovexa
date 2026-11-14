# ADR-0016 · Snapshot inmutable por generación

- **Estado:** Aceptado (retroactivo)
- **Fecha de registro:** 2026-11-14 · decisión original: fases 2–3
- **Ámbito:** módulo `campaigns`

## Contexto

Generar el contenido de una campaña toma tiempo y pasa por varias etapas (copy, imagen, composición, aprobación). Mientras tanto, alguien puede cambiar el precio del producto, el logo o la plantilla. Si cada etapa leyera los datos vigentes, el copy podría anunciar un precio y el flyer otro, y una campaña aprobada podría cambiar sin que nadie lo revise.

## Decisión

Al solicitar una generación se crea una `CampaignGeneration` con un **snapshot inmutable** (`GenerationSnapshot`) que copia todo lo necesario: organización (nombre, descripción, tono, logo), producto (nombre, descripción, precio, imagen), revisión de plantilla (dimensiones y diseño), promoción, CTA e instrucciones.

Todas las etapas posteriores leen del snapshot, nunca de los módulos de origen. Cada regeneración crea una generación nueva, numerada, con su propio snapshot. El contenido generado referencia la generación que lo produjo.

Los datos de otros módulos se obtienen mediante ports de consulta (`CampaignLookups`), no importando sus entidades.

## Alternativas consideradas

- **Leer siempre los datos vigentes:** más simple, pero produce contenido incoherente y aprobaciones que ya no corresponden a lo publicado.
- **Bloquear la edición del catálogo mientras hay campañas activas:** impide el trabajo normal del negocio.

## Consecuencias

- Lo aprobado es exactamente lo que se publica, aunque el catálogo cambie después.
- Un cambio de precio no se refleja en una campaña ya generada: hay que regenerar. El CMS debe dejarlo claro.
- El snapshot es JSON; cambiar su forma requiere mantener compatibilidad con los ya guardados.
- Los assets referenciados por un snapshot no pueden borrarse mientras exista la generación; por eso los assets son inmutables ([ADR-0007](../../../adr/0007-almacenamiento-privado-s3.md)).
- Queda el historial completo de generaciones para auditoría y para volver a una versión anterior.
