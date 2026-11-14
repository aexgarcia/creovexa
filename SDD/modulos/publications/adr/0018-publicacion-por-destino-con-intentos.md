# ADR-0018 · Una publicación por destino con intentos independientes

- **Estado:** Aceptado (retroactivo)
- **Fecha de registro:** 2026-11-14 · decisión original: fases 2–3
- **Ámbito:** módulos `publications` y `campaigns`

## Contexto

Una campaña se publica en varias redes. Es normal que una funcione y otra falle (por ejemplo Facebook e Instagram bien, TikTok rechazado). Además, un reintento no debe publicar dos veces el mismo contenido.

## Decisión

1. **Una `Publication` por destino.** Cada combinación de campaña, contenido aprobado y cuenta social es un agregado propio, con su estado, su versión y su resultado. Una restricción única en base de datos impide duplicarla.
2. **Intentos registrados.** Cada envío es un `PublicationAttempt` con su resultado. Solo el intento vigente puede registrar éxito o fallo; un resultado de un intento anterior lanza `StalePublicationAttemptError`.
3. **La campaña guarda solo un resumen.** `Campaign.publicationProgress` deriva el estado global: `PUBLISHED` si todos los destinos tuvieron éxito, `PARTIALLY_PUBLISHED` si algunos, `FAILED` si ninguno. `publications` es dueño del detalle.
4. **Publicación y resumen se guardan juntos** mediante el port `PublicationTransaction`, para que no diverjan.

## Alternativas consideradas

- **Estado de publicación solo en la campaña:** no permite reintentar un destino sin tocar los demás ni conservar el historial de intentos.
- **Una publicación con una lista interna de destinos:** obliga a cargar y bloquear todos los destinos para actualizar uno.
- **Resumen calculado al leer, sin guardarlo:** evita duplicar estado, pero complica las transiciones de `Campaign` y los listados.

## Consecuencias

- Los fallos parciales son un estado normal y visible, no un error global.
- Los reintentos son seguros: la unicidad por destino y el intento vigente dan idempotencia.
- El estado vive en dos lugares (detalle y resumen). Regla: el resumen solo se escribe junto con las publicaciones, nunca por separado.
- Los códigos de fallo son un conjunto cerrado (`REJECTED`, `ACCOUNT_UNAVAILABLE`, `RATE_LIMITED`); se ampliarán al integrar las APIs reales.
