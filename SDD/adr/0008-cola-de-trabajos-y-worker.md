# ADR-0008 · Cola de trabajos en PostgreSQL y worker propio; n8n opcional

- **Estado:** Aceptado, implementado el 2026-11-14 (ver "Implementación")
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

## Implementación

Hecho el 14 de noviembre de 2026.

**Piezas**

| Pieza | Dónde | Qué hace |
| --- | --- | --- |
| Port `JobQueue` | `src/application/ports/job-queue.ts` | `enqueue(job, transaction?)` y `process(name, handler)` |
| Port `UnitOfWork` | `src/application/ports/unit-of-work.ts` | Una transacción en la que participan varios ports, mediante el `TransactionContext` de [ADR-0021](0021-contrato-publicado-entre-modulos.md) |
| `PgBossJobQueue` | `src/infrastructure/jobs` | Adapter de `pg-boss` 12.38.2. Encola con el mismo cliente de la transacción de Prisma |
| `JobsModule` | `src/infrastructure/jobs` | Cola, unidad de trabajo y configuración (`JOB_WORKER`, `JOB_SCHEMA`) |
| `main.worker.ts` / `WorkerModule` | `src/` | Proceso sin HTTP que solo ejecuta trabajos |

**Flujo**

1. `POST /campaigns/:id/copy` o `…/image` comprueba en el momento lo que puede fallar de forma predecible (estado, copy previo, foto, proveedor configurado) y responde con el error correspondiente, como antes.
2. Si todo está en orden, en **una sola transacción**: la campaña pasa a `GENERATING` (si estaba en `DRAFT`), la fila del trabajo queda en `QUEUED` y se encola el trabajo. Responde `202` con `status: PENDING`.
3. El worker toma el trabajo y ejecuta los mismos casos de uso de antes (`GenerateCampaignCopy`, `GenerateCampaignImage`), con sus reservas, idempotencia y control de versión intactos.
4. Si falla, `GenerationJobs` guarda el código del error (`failure_code`) para que el CMS lo muestre. El mensaje interno nunca se expone.
5. El CMS consulta `GET …/copy` o `GET …/image` cada 2 segundos mientras el estado sea `PENDING` o `RUNNING`.

**Decisiones de detalle**

- **Política `exclusive` por generación** (`singletonKey` = `generationId`): pedir dos veces no crea dos trabajos.
- **Sin reintentos automáticos** (`retryLimit: 0`). El usuario reintenta desde el CMS. Evita pagar dos veces una imagen tras una respuesta ambigua del proveedor.
- **La reserva propia sigue siendo la fuente de verdad del bloqueo**, no la cola: la cola decide *cuándo* se ejecuta; `campaign_copies` y `campaign_image_jobs` deciden *si* el resultado puede confirmarse. Así un trabajo duplicado o tardío no puede pisar uno más nuevo.
- **Un trabajo de una generación ya reemplazada termina sin error**: no hay nada que reportar.
- **`JOB_WORKER=true` por defecto**: la propia API ejecuta trabajos y basta un contenedor. Para separar, la API usa `JOB_WORKER=false` y se lanza `start:worker`.
- **Tablas de la cola en su propio schema** (`pgboss`, o `JOB_SCHEMA`). `pg-boss` limita el nombre a 50 caracteres; los tests le asignan uno corto.
- Migración `20261114000000_generation_failure_codes`: columna `failure_code` y estado `QUEUED` en las dos tablas de trabajo.

**Verificación**

- Unitarios: solicitud, consulta de estado, idempotencia, registro de fallos y configuración.
- Integración con `pg-boss` real: un trabajo encolado en una transacción revertida **no existe**; uno confirmado sí; misma clave, un solo trabajo; el worker recibe el payload.
- Las suites HTTP de copy y flyer ejecutan el flujo completo con una cola en memoria que el test vacía como lo haría el worker.
- Prueba de humo: API y worker arrancan por separado y el worker registra ambas colas. No se ejecutó una generación real (consume crédito del proveedor).

**Pendiente**

- Retirar el servicio `n8n` de Docker Compose y `automation/n8n`.
- Limpieza periódica (objetos huérfanos, archivos temporales) como trabajos programados.
- La publicación en redes (fase 8) usará la misma cola.
