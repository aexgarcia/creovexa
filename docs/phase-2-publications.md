# Fase 2 — Incremento 4: resultados por destino

Implementado el 19 de septiembre de 2026, siguiendo [el modelo de dominio](domain.md) y [la arquitectura](../architecture.md). Completa los cuatro incrementos de código previstos para la fase 2.

Rama de trabajo: `feat/publication-domain`. Depende del incremento 3, guardado en el commit `7659f62` de `feat/campaign-domain`. La revisión se organiza en dos PR dependientes: campañas hacia `main` y publicaciones sobre la rama de campañas hasta integrar el primer incremento.

## Comportamiento implementado

`Publication` representa un único destino de una revisión aprobada de campaña. Conserva organización, campaña, contenido aprobado, cuenta social y plataforma por identidad; no importa las entidades de otros módulos.

- Comienza en `PENDING`. `startAttempt` crea un intento con UUID, número y fecha y pasa a `PUBLISHING`.
- `recordSuccess` registra un identificador externo no vacío y la fecha de confirmación. `PUBLISHED` es terminal y no admite otro intento.
- `recordFailure` recibe un código de fallo confirmado: `REJECTED`, `ACCOUNT_UNAVAILABLE` o `RATE_LIMITED`. Se permite reintentar desde `FAILED` con otro ID de intento, manteniendo publicación, cuenta y revisión.
- Repetir una confirmación equivalente devuelve la misma versión sin cambiar sus fechas. Las confirmaciones contradictorias y las de intentos anteriores se rechazan.
- Las instancias anteriores, fechas y metadatos de intento permanecen intactos. Cada cambio efectivo incrementa la versión.

`Campaign` completa su ciclo de publicación:

| Operación                                    | Regla                                                                                                                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `approve(contentId, at, socialAccountIds)`   | Fija una revisión exacta y cuentas sin duplicados. Una aprobación sin cuentas conserva el flujo de revisión de contenido, pero no habilita publicación.                                             |
| `startPublication(publications, at)`         | Exige `APPROVED`, oferta no vencida y una publicación nueva en `PENDING` por cada cuenta aprobada. Rechaza cambios de organización, campaña, contenido o destinos.                                  |
| `recordPublicationSummary(publications, at)` | Comprueba un resumen completo con versiones por publicación. Mantiene `PUBLISHING` si hay destinos pendientes o en curso; al terminar todos produce `PUBLISHED`, `PARTIALLY_PUBLISHED` o `FAILED`.  |
| `retryPublication(publications, at)`         | Solo desde un resultado de publicación parcial o fallido. Exige nuevos intentos en los destinos fallidos y preserva exactamente los exitosos, la aprobación y las cuentas. Revalida el vencimiento. |

`CampaignFailureOrigin` distingue generación y publicación. Un fallo de publicación no permite regenerar ni aprobar contenido nuevo. Una campaña en curso o publicada no permite iniciar otra publicación, regenerar ni cambiar la revisión.

Los resultados de un envío iniciado válidamente pueden registrarse después del vencimiento; el vencimiento bloquea nuevos inicios o reintentos, no la recepción de confirmaciones.

## Decisiones y alternativas

### Una publicación por cuenta y un resumen de campaña

Una misma campaña puede tener éxito en una cuenta y fallar en otra. Cada `Publication` protege su intento y resultado; `PublicationProgress` conserva únicamente identidades, estados y versiones por destino para validar el resumen de campaña.

Se descartó un único estado global sin detalle porque ocultaría éxitos parciales y facilitaría repetir envíos ya exitosos. También se evitó que `Campaign` contenga o importe entidades `Publication`; recibe el contrato de datos planos `CampaignPublication`, propio del consumidor.

`PublicationStatus` se comparte en `src/domain` como vocabulario pequeño utilizado realmente por ambos módulos. La alternativa sería duplicar los mismos cuatro estados y sus conversiones sin una diferencia de negocio actual. Las plataformas permanecen dentro de publicaciones.

### Destinos vinculados a la aprobación

Elegir nuevas cuentas después de aprobar alteraría el alcance autorizado. El dominio fija sus IDs junto con el contenido y exige el mismo conjunto al publicar. Regenerar limpia la aprobación y sus destinos.

El caso de uso existente `ApproveCampaign` continúa aprobando solo contenido. La selección de cuentas en aplicación se incorporará junto con un port que valide existencia, pertenencia y conexión. En esta fase, las pruebas ejercitan la aprobación con destinos directamente sobre el dominio; no se expone una entrada de cuentas sin validación externa ni se agregan CRUD de cuentas sociales.

### Versiones y resultados fuera de orden

El resumen debe incluir todas las publicaciones fijadas al iniciar. Comprueba identidad y versión por destino y acepta listas en distinto orden. Una versión anterior se rechaza; con la misma versión solo se acepta el mismo estado. Los estados exitosos no retroceden y un fallo solo se reabre mediante la operación de reintento.

Se descartaron contadores sueltos de éxitos y fallos porque no permitirían verificar qué cuenta terminó o detectar una respuesta antigua. Reintentar exige versiones nuevas en `PUBLISHING` para todos los destinos fallidos y conserva las versiones exitosas.

### Fallos confirmados y resultados inciertos

Los códigos de fallo de publicación representan resultados conocidos. No se clasifica automáticamente un timeout de red como fallo reintentable: el proveedor podría haber publicado. El tratamiento de resultados inciertos, la reconciliación y los contratos de proveedores se incorporarán en las fases 7–8, como prevé el modelo.

La entidad evita repetir operaciones sobre su estado actual. La unicidad histórica de IDs e intentos, los constraints por campaña/contenido/cuenta, los bloqueos por versión y la idempotencia de envíos reales requieren persistencia e integración. No se promete entrega exactamente una vez con pruebas en memoria.

## Archivos creados y modificados

Creados:

- `apps/api/src/domain/publication-status.ts`.
- `apps/api/src/modules/publications/domain/entities/publication.ts` y `publication.spec.ts`.
- `apps/api/src/modules/publications/domain/social-platform.ts`.
- `apps/api/src/modules/publications/domain/errors/publication.errors.ts`.
- `apps/api/src/modules/campaigns/domain/value-objects/publication-progress.ts`.
- `apps/api/src/modules/campaigns/domain/entities/campaign-publication.spec.ts`.
- `apps/api/test/support/publication-fixtures.ts`.
- Este documento.

Modificados:

- `apps/api/src/modules/campaigns/domain/entities/campaign.ts`: aprobación de destinos, inicio, resumen, reintento y aislamiento del origen de fallos.
- `apps/api/src/modules/campaigns/domain/campaign-status.ts`: estados de publicación y origen de fallo.
- `apps/api/src/modules/campaigns/domain/errors/campaign.errors.ts`: errores de resumen inválido y antiguo.
- `apps/api/src/modules/campaigns/application/campaign-result.ts`: destinos, origen de fallo y resumen en datos planos independientes.
- `docs/domain.md`, `docs/phase-2.md`, `docs/phase-2-templates.md` y `docs/phase-2-campaigns.md`: estado de implementación y siguiente paso.

No se agregaron dependencias, repositorios sin consumidores, casos de uso de envío, infraestructura ni controllers.

## Verificación

- 43 pruebas unitarias nuevas, incluyendo flujos con las entidades reales de ambos módulos y proyecciones de datos en los fixtures.
- `pnpm test`: 249 pruebas unitarias correctas.
- `pnpm test:e2e`: una prueba HTTP existente correcta.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` y `pnpm build`: correctos.
- Revisión de imports: los módulos no importan entidades internas entre sí ni dependen de NestJS, Prisma, variables de entorno o clientes externos.

Se verificaron éxito parcial y total, fallo total, operaciones prohibidas, separación del origen de fallos, revisión y destinos exactos, versiones antiguas/contradictorias, duplicados, reintentos, vencimiento e inmutabilidad. El test HTTP sigue cubriendo salud de la API; no hay endpoints de publicación.

Pruebas y compilación requirieron ejecución fuera del sandbox por sus procesos secundarios. No se verificaron transacciones ni concurrencia real en PostgreSQL, existencia/conexión de cuentas o envíos a proveedores, porque corresponden a implementaciones posteriores.

## Cierre de fase y siguiente paso

Los cuatro incrementos de la fase 2 están implementados en dominio y aplicación dentro del alcance acordado. Usuarios, membresías y cuentas sociales permanecen definidos conceptualmente para sus fases; generación, renderizado y publicación reales todavía no están conectados.

Primero revisar e integrar campañas y publicaciones mediante PR. Como la rama de publicaciones parte del commit de campañas, revisar el incremento 4 contra `feat/campaign-domain` permite ver solo sus cambios; después de integrar campañas se puede cambiar la base a `main`.

El siguiente desarrollo es la fase 3: diseñar el schema de Prisma a partir de las entidades, definir reconstrucción y mappers explícitos, implementar repositorios, migrations y pruebas de integración. Será necesario garantizar la unicidad de publicaciones y operaciones y persistir de forma consistente las transiciones de campaña y publicaciones. Los casos de uso de coordinación y envío real continúan previstos para las fases 7–8.
