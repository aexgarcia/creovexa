# Contrato del módulo `publications`

Actualizado el 14 de noviembre de 2026 a partir del código. Si este documento y el código difieren, el código manda y este documento debe corregirse.

## Responsabilidad

Resultado de publicar una campaña aprobada en cada destino social: estado, intentos y referencia de la publicación externa. No modifica el contenido aprobado ni contiene clientes de redes sociales.

**Estado actual:** existen el dominio, la persistencia y las consultas. Todavía **no hay envío real** a ninguna red ni endpoint para solicitar una publicación (fase 8).

## Datos que posee

| Tabla | Contenido |
| --- | --- |
| `publications` | Una fila por campaña, contenido aprobado y cuenta social: `platform`, `status`, intento vigente, `externalPostId`, `failureCode`, `publishedAt`, `version` |
| `publication_attempts` | Un registro por intento de envío |
| `publication_attempt_results` | Resultado de cada intento |

Estados (`PublicationStatus`): `PENDING`, `PUBLISHING`, `PUBLISHED`, `FAILED`.
Plataformas (`SocialPlatform`): `FACEBOOK`, `INSTAGRAM`, `TIKTOK`.
Fallos (`PublicationFailureCode`): `REJECTED`, `ACCOUNT_UNAVAILABLE`, `RATE_LIMITED`.

Una restricción única impide dos publicaciones para la misma campaña, contenido aprobado y cuenta social.

## API HTTP

| Método y ruta | Descripción | Respuesta |
| --- | --- | --- |
| `GET /campaigns/:id/publications` | Estados y último intento por destino de una campaña | `200` |
| `GET /publications` | Historial de publicaciones de la organización, paginado | `200` |
| `GET /publications/:id/attempts` | Intentos de una publicación | `200` |

### Códigos de error propios

| Código | Estado | Cuándo |
| --- | --- | --- |
| `PUBLICATION_NOT_FOUND` | 404 | Inexistente o de otra organización |
| `CAMPAIGN_NOT_FOUND` | 404 | La campaña consultada no existe |

Formato de respuestas y errores: [ADR-0004](../../adr/0004-contrato-http-y-errores.md).

## Casos de uso

`ListCampaignPublications`, `ListPublicationHistory`, `ListPublicationAttempts`. Los dos últimos leen mediante `PublicationHistoryReader`, un lector de consulta sin entidades.

Comportamiento disponible en el dominio y aún sin caso de uso: `Publication.startAttempt`, `recordSuccess` y `recordFailure`.

## Lo que expone a otros módulos

Nada todavía. `campaigns` mantiene su propio resumen (`publicationProgress`) y no importa este módulo en código de producción.

## Lo que consume

| Dependencia | Port | Implementación actual |
| --- | --- | --- |
| Persistencia | `PublicationRepository` | `PrismaPublicationRepository` |
| Historial | `PublicationHistoryReader` | `PrismaPublicationHistoryReader` |
| Existencia de la campaña | `PublicationCampaignLookup` | `PrismaPublicationCampaignLookup` |
| Transacción entre publicación y campaña | `PublicationTransaction` (`src/application/ports`) | Prisma |

Importa además `CampaignNotFoundError` desde `campaigns`; debería sustituirse por un error propio o por un resultado del port.

## Decisiones

- [ADR-0018 · Una publicación por destino con intentos independientes](adr/0018-publicacion-por-destino-con-intentos.md)

## Pendiente (fase 8)

- Módulo `social-accounts`: conexión de cuentas y manejo seguro de tokens.
- Port `SocialPublisher` con capacidades por plataforma y adapters de Meta y TikTok.
- Casos de uso `PublishCampaign` y `PublishToPlatform`, ejecutados como trabajos de la cola ([ADR-0008](../../adr/0008-cola-de-trabajos-y-worker.md)).
- Endpoint para solicitar y reintentar la publicación.
- Acceso de las redes al flyer: hoy el storage es privado ([ADR-0007](../../adr/0007-almacenamiento-privado-s3.md)) y las APIs sociales suelen pedir una URL pública o la subida de los bytes.
