# Fase 2 — Incremento 3: campañas

Implementado el 18 de septiembre de 2026, siguiendo [el modelo de dominio](domain.md) y [la arquitectura](../architecture.md). Rama: `feat/campaign-domain`.

## Alcance y comportamiento

Se incorpora únicamente dominio y aplicación de campañas, con contratos de repositorio y consulta, y pruebas. No se agregan dependencias.

- `Campaign` comienza en `DRAFT`. Solicitar generación crea una operación identificada y pasa a `GENERATING`. Un resultado completo lleva a `PENDING_APPROVAL`; la aprobación exige el ID exacto del candidato.
- `Promotion` utiliza `Money`: misma moneda que el precio base, importe inferior y fechas ordenadas. Una oferta futura puede prepararse; una oferta vencida no puede crearse, solicitar generación ni aprobarse. El vencimiento es exclusivo: en el instante final ya está vencida.
- `GenerationSnapshot` conserva copias inmutables de producto, precio, oferta, marca, brief y revisión de plantilla al solicitar cada generación. La campaña sigue fijando la misma revisión de plantilla al regenerar.
- `GeneratedContent` exige titular, caption, CTA coincidente con el solicitado y al menos un ID de asset. Los hashtags son opcionales mediante una lista vacía. El contenido, sus arrays, fechas y snapshot quedan protegidos frente a mutaciones externas.
- Regenerar desde `PENDING_APPROVAL` o `APPROVED` retira candidato y aprobación del estado actual y comienza otra operación. Su resultado necesitará nueva aprobación. Las revisiones anteriores permanecen en el historial según el contrato de repositorio.
- Un resultado equivalente de la operación vigente es inocuo, incluso después de aprobarlo; no vuelve a guardar ni cambia fechas, versión o aprobación. Un resultado contradictorio o de una operación anterior se rechaza.
- Registrar un fallo de generación guarda un código controlado y pasa a `FAILED`. Repetir ese mismo fallo es inocuo. Reintentar exige una nueva operación; las respuestas tardías de la anterior ya no se aceptan.

Casos de uso implementados:

| Caso de uso                       | Entrada y responsabilidad                                                                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CreateCampaign`                  | Organización, producto, plantilla, revisión, título, CTA, instrucciones y oferta opcionales. Comprueba referencias y crea el borrador.              |
| `RequestCampaignGeneration`       | Organización y campaña. Comprueba recursos actuales, captura la entrada e inicia la primera generación o reintenta una fallida.                     |
| `RecordGeneratedCampaign`         | Organización, campaña, operación vigente y resultado estructurado. Usa el snapshot almacenado y asigna identidad y número de revisión internamente. |
| `RecordCampaignGenerationFailure` | Organización, campaña, operación vigente y código de fallo. Permite cerrar una generación fallida y reintentarla.                                   |
| `ApproveCampaign`                 | Organización, campaña e ID del contenido revisado. Comprueba candidato, estado y vigencia comercial.                                                |
| `RequestCampaignRegeneration`     | Organización y campaña. Captura los datos actuales e invalida la aprobación al guardar la nueva generación.                                         |

Los resultados de aplicación son datos planos con fechas ISO y copias separadas de los datos internos. Los errores de consulta o guardado se propagan; no se devuelve éxito cuando falla la escritura.

## Decisiones y alternativas

### Congelar datos al solicitar generación

Consultar el catálogo de nuevo al recibir el resultado podría asociar una pieza a precios o marca distintos de los usados para generarla. Se guarda la entrada al iniciar cada operación y se reutiliza al recibir el resultado y aprobarlo. El borrador solo fija referencias y brief; así recoge cambios comerciales realizados antes de solicitar generación.

Se descartó importar las entidades de catálogo, organizaciones o plantillas. Los ports del consumidor devuelven datos mínimos y verifican existencia, identidad y organización. El ID de organización delimita consultas y escrituras; la autorización de usuarios se incorporará en su fase.

### Una revisión completa por operación

Se reciben resultados completos para que nunca exista un candidato aprobable a medio generar. Los IDs y el número de revisión proceden de la aplicación, no del callback. El ID de operación permite distinguir reintentos de entrega y resultados antiguos; comparar el contenido permite rechazar confirmaciones contradictorias.

Se descartó sobrescribir el candidato con cada callback o mantener una aprobación al regenerar, porque ambas alternativas podrían autorizar contenido distinto del revisado. También se agregó `RecordCampaignGenerationFailure` para evitar dejar una operación fallida permanentemente en `GENERATING`. Recibe códigos controlados en lugar de textos libres potencialmente sensibles del proveedor.

### Guardado atómico y versión esperada

`CampaignRepository.add` inserta sin sobrescribir. `save(organizationId, campaign, expectedVersion)` exige que la versión almacenada coincida y que la actualización de campaña y la inserción de operación/contenido sean atómicas. Debe preservar el historial, rechazar colisiones de IDs y permitir solo una revisión por generación. Un conflicto se comunica mediante `ConcurrentCampaignModificationError`.

Se eligió un único contrato de guardado frente a dos escrituras independientes que podrían dejar contenido sin campaña actualizada. No se añadió una capa de servicios ni una unidad de trabajo genérica. El agregado mantiene solo la operación y el candidato vigentes para no cargar todo el historial.

Los fakes de pruebas modelan este contrato y permiten comprobar que los casos de uso pasan la versión esperada y propagan conflictos. Las transacciones, restricciones únicas y concurrencia real de PostgreSQL deben implementarse y verificarse en la fase 3.

## Archivos creados y modificados

Creado `apps/api/src/modules/campaigns/`:

- `domain/entities/campaign.ts`, `generated-content.ts` y sus pruebas.
- `domain/value-objects/promotion.ts`, `generation-snapshot.ts` y sus pruebas.
- `domain/campaign-status.ts`, `domain/errors/campaign.errors.ts` y `domain/repositories/campaign.repository.ts`.
- `application/use-cases/`: los seis casos de uso anteriores y pruebas en `create-campaign.spec.ts` y `campaign-workflow.spec.ts`.
- `application/ports/campaign-lookups.ts`, `application/errors/campaign-resource-not-found.error.ts`, `application/load-campaign-resources.ts`, `application/load-campaign.ts` y `application/campaign-result.ts`.

También creados `apps/api/test/support/campaign-fakes.ts` y este documento. Actualizados `docs/domain.md`, `docs/phase-2.md` y `docs/phase-2-templates.md` para reflejar el avance.

## Verificación

- 84 pruebas unitarias nuevas: ofertas, snapshots, revisiones, transiciones, pertenencia, callbacks duplicados/antiguos/contradictorios, aprobación exacta, regeneración, fallos, copias independientes y contrato de versión.
- `pnpm test`: 206 pruebas unitarias correctas en total.
- `pnpm test:e2e`: una prueba HTTP existente correcta.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` y `pnpm build`: correctos.
- Revisión de límites de imports: campañas utiliza su propio dominio y ports, más los contratos compartidos existentes; no importa entidades de otros módulos, NestJS, Prisma ni integraciones externas.

Pruebas y compilación necesitaron ejecución fuera del sandbox por sus procesos secundarios. El test HTTP cubre salud de la API; todavía no existen endpoints de campañas.

## Límites y siguiente paso

Solicitar generación registra la intención; todavía no genera imágenes, renderiza piezas ni contacta n8n. Los IDs de assets se validan como referencias, pero su existencia y la exactitud visual requieren almacenamiento y renderizado. No se implementan persistencia, controllers, autorización, edición del brief, consulta del historial ni publicación en este incremento.

Actualmente `FAILED` solo representa generación. Al incorporar resultados de publicación se deberá distinguir el origen del fallo y restringir cada reintento a su operación. Los estados y reglas de publicación permanecen pendientes del incremento 4.

Revisar e integrar este incremento mediante PR. Después iniciar el incremento 4: `Publication`, resultados independientes por destino, resumen de campaña, reintentos que preservan los éxitos y prevención de republicación. La fase 2 todavía no está completa.
