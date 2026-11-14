# ADR-0008 · Cola de trabajos en PostgreSQL y worker propio; n8n opcional

- **Estado:** Aceptado, pendiente de implementar
- **Fecha:** 2026-11-14
- **Ámbito:** generación de contenido y publicación en redes
- **Reemplaza:** el plan de la fase 7 original (n8n como orquestador)

## Contexto

Generar copy, generar imagen y publicar en redes son operaciones lentas que dependen de terceros. Hoy `POST /campaigns/:id/copy` y `POST /campaigns/:id/image` hacen ese trabajo dentro del request HTTP, con una reserva de hasta 5 minutos. Si la conexión se corta o la API se reinicia, el trabajo queda a medias y el CMS no ve progreso.

El plan original delegaba la orquestación a n8n. Eso reparte el flujo entre el código y workflows JSON difíciles de probar y versionar, agrega un servicio que operar y lo convierte en punto único de fallo.

## Decisión

1. **Cola de trabajos dentro de PostgreSQL con `pg-boss`.** Los casos de uso encolan mediante un port `JobQueue`; el dominio no conoce la librería.
2. **Un proceso worker** con el mismo código que la API y otro punto de entrada (`main.worker.ts`). Consume la cola y ejecuta los casos de uso de generación y publicación. Al inicio puede correr en el mismo contenedor que la API; se separa cuando haga falta.
3. **Los endpoints que inician trabajo responden `202 Accepted`** después de registrar el cambio de estado y el trabajo en la misma transacción. El CMS consulta el estado de la campaña.
4. **Reintentos explícitos y limitados por tipo de trabajo.** La generación de imagen no se reintenta automáticamente tras una respuesta ambigua del proveedor (puede haberse cobrado). La idempotencia por generación, operación y versión que ya existe se conserva.
5. **n8n deja de ser parte del sistema.** Puede integrarse después como consumidor externo de la API o de webhooks salientes, sin ser dueño de ningún flujo.

## Alternativas consideradas

- **BullMQ:** muy probado y con buen panel, pero requiere Redis: otro servicio que pagar, respaldar y operar. Para el volumen esperado (unas 20 organizaciones) no aporta nada que PostgreSQL no cubra. Además, encolar en Redis no es transaccional con el cambio de estado en PostgreSQL.
- **n8n como orquestador (plan original):** descartado por lo indicado en el contexto.
- **Tabla de trabajos hecha a mano:** era la propuesta de [generación y publicación](../historial/propuesta-generacion-publicacion.md); `pg-boss` da lo mismo (reclamación, reintentos, vencimiento, programación) ya probado.
- **Seguir síncrono:** simple, pero no sobrevive a reinicios ni permite mostrar progreso.

## Consecuencias

- Dependencia nueva: `pg-boss`.
- Encolar es transaccional con el cambio de estado: no hay campañas en `GENERATING` sin un trabajo responsable.
- El CMS debe consultar el estado periódicamente; la experiencia pasa de "esperar la respuesta" a "ver el progreso".
- La reserva (`CampaignImageJob`) y la cola se solapan en parte; al implementar hay que decidir cuál es la fuente de verdad del bloqueo.
- El servicio `n8n` de Docker Compose y `automation/n8n` pueden retirarse.
- Si el volumen creciera mucho, migrar a BullMQ solo cambia el adapter de `JobQueue`.
