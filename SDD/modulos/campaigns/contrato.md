# Contrato del módulo `campaigns`

Actualizado el 14 de noviembre de 2026 a partir del código del árbol de trabajo, que incluye la fase 6 sin commitear. Si este documento y el código difieren, el código manda y este documento debe corregirse.

> Este módulo se dividirá en `campaigns`, `content-generation` y `assets` ([ADR-0010](../../adr/0010-dividir-campaigns.md)). Las secciones indican a qué módulo irá cada parte.

## Responsabilidad

Hoy cubre tres cosas:

1. **Campaña** (se queda en `campaigns`): brief, oferta, estados, contenido generado, aprobación y resumen de publicación.
2. **Generación** (irá a `content-generation`): producir copy e imagen con IA y componer el flyer.
3. **Assets de campaña** (irá a `assets`): guardar y leer la imagen base y el flyer final.

## Datos que posee

| Tabla | Contenido | Destino |
| --- | --- | --- |
| `campaigns` | Brief (`title`, `instructions`, `cta`, `promotion`), referencias a producto y revisión de plantilla, `status`, generación vigente, contenido candidato y aprobado, destinos aprobados, resumen de publicación, `version` | `campaigns` |
| `campaign_generations` | Una fila por solicitud de generación, con su `snapshot` inmutable | `campaigns` |
| `generated_contents` | Contenido aprobable: `headline`, `caption`, `cta`, `hashtags`, `assetIds` | `campaigns` |
| `campaign_generation_failures` | Código de fallo por generación | `campaigns` |
| `campaign_copies` | Copy validado de una generación, incluido `imagePrompt` | `content-generation` |
| `campaign_image_jobs` | Reserva temporal del trabajo de imagen | `content-generation` |
| `campaign_assets` | Imagen base (`BASE_IMAGE`) y flyer final (`FINAL_PIECE`) | `assets` |

## Estados

`DRAFT`, `GENERATING`, `PENDING_APPROVAL`, `APPROVED`, `PUBLISHING`, `PUBLISHED`, `PARTIALLY_PUBLISHED`, `FAILED`. Diagrama en la [visión](../../arquitectura/vision.md#flujo-principal). Las transiciones las protege la entidad `Campaign`; una transición inválida lanza `InvalidCampaignTransitionError`.

## API HTTP

| Método y ruta | Descripción | Respuesta |
| --- | --- | --- |
| `POST /campaigns` | Crear campaña en `DRAFT` | `201` |
| `GET /campaigns` | Listar, paginado | `200` |
| `GET /campaigns/:id` | Consultar | `200` |
| `POST /campaigns/:id/copy` | Generar el copy. Desde `DRAFT` captura el snapshot y pasa a `GENERATING` | `200` |
| `GET /campaigns/:id/copy` | Consultar el copy de la generación vigente | `200` |
| `POST /campaigns/:id/image` | Generar el flyer final. Cuerpo: `generationId` | `200` |
| `GET /campaigns/:id/assets/:assetId` | Leer el flyer final (PNG) | `200` imagen |
| `POST /campaigns/:id/approve` | Aprobar la revisión candidata. Cuerpo: `contentId` | `200` |

`POST …/copy` y `POST …/image` hoy son síncronos: responden cuando el proveedor termina. Pasarán a `202` con [ADR-0008](../../adr/0008-cola-de-trabajos-y-worker.md).

### Códigos de error propios

| Código | Estado | Cuándo |
| --- | --- | --- |
| `CAMPAIGN_NOT_FOUND` | 404 | Inexistente o de otra organización |
| `CAMPAIGN_RESOURCE_NOT_FOUND` | 404 | Producto, plantilla o revisión referenciados no existen |
| `INVALID_INPUT` | 400 | Datos o promoción inválidos, o promoción vencida |
| `INVALID_CAMPAIGN_STATE` | 409 | La operación no corresponde al estado actual |
| `CONTENT_REVISION_MISMATCH` | 409 | Se intenta aprobar una revisión que no es la candidata |
| `CAMPAIGN_CONFLICT` | 409 | Modificación concurrente (versión) |
| `STALE_GENERATION` | 409 | Resultado de una generación que ya no es la vigente |
| `COPY_BUSY` | 409 | Ya hay una generación de copy en curso |
| `COPY_TIMEOUT` | 504 | El proveedor no respondió a tiempo |
| `COPY_UNAVAILABLE` | 503 | Proveedor de copy no configurado |
| `COPY_INVALID_OUTPUT`, `COPY_REFUSED` | 502 | Respuesta inválida o rechazada por el proveedor |
| `IMAGE_*` | 400 a 504 | Fallos de imagen: `NOT_FOUND`, `FINAL_ASSET_REQUIRED`, `COPY_REQUIRED`, `PRODUCT_IMAGE_REQUIRED`, `LOGO_UNAVAILABLE`, `UNAVAILABLE`, `UNSUPPORTED_DIMENSIONS`, `INVALID_OUTPUT`, `REFUSED`, `RATE_LIMITED`, `BUSY`, `STALE_RESULT`, `TIMEOUT` |

El estado HTTP exacto de cada `IMAGE_*` está en `ApiExceptionFilter`. Formato de respuestas y errores: [ADR-0004](../../adr/0004-contrato-http-y-errores.md).

## Casos de uso

| Caso de uso | Con endpoint | Destino |
| --- | --- | --- |
| `CreateCampaign`, `GetCampaign`, `ListCampaigns`, `ApproveCampaign` | Sí | `campaigns` |
| `RequestCampaignGeneration`, `RequestCampaignRegeneration`, `RecordGeneratedCampaign`, `RecordCampaignGenerationFailure` | No | `campaigns` |
| `GenerateCampaignCopy`, `GenerateCampaignImage` | Sí | `content-generation` |
| `GetCampaignFinalAsset` | Sí | `assets` |

La regeneración existe en dominio y aplicación, pero todavía no tiene endpoint.

## Lo que expone a otros módulos

| Contrato | Consumidor | Uso |
| --- | --- | --- |
| Existencia de la campaña | `publications`, mediante su port `PublicationCampaignLookup` | Validar pertenencia al listar publicaciones |
| `CampaignNotFoundError` | `publications` | Import directo de una clase de error; debería sustituirse por un resultado del port |

## Lo que consume

| Dependencia | Port | Implementación actual |
| --- | --- | --- |
| Persistencia de campañas | `CampaignRepository` | `PrismaCampaignRepository` |
| Datos para el snapshot | `CampaignLookups` (`OrganizationLookup`, `ProductLookup`, `TemplateRevisionLookup`) | Consultas Prisma |
| Persistencia de copy | `CampaignCopyRepository` | `PrismaCampaignCopyRepository` |
| Reserva y confirmación de imagen | `CampaignImageRepository` | `PrismaCampaignImageRepository` |
| Generación de texto | `CopyGenerator` | `OpenAICopyGenerator`, `GeminiCopyGenerator` |
| Foto de referencia | `ProductImageSource` | `StoredProductImageSource` (usa `ProductImages` de `products`) |
| Generación de imagen | `ImageGenerator` | `OpenAIImageGenerator`, `GeminiImageGenerator` |
| Composición | `TemplateRenderer` | `PlaywrightTemplateRenderer` |
| Recursos del render | `CampaignRenderResources` | `PrismaCampaignRenderResources` (usa `OrganizationLogos` de `organizations`) |
| Storage de assets | `StorageProvider`, `CampaignFinalAssets` | `MinioStorageProvider` |
| Reloj e identificadores | `Clock`, `IdGenerator` | `RuntimeModule` |

## Garantías

- **Snapshot inmutable:** una generación trabaja con los datos capturados al solicitarla ([ADR-0016](adr/0016-snapshot-inmutable-por-generacion.md)).
- **El copy no inventa datos comerciales:** `copy-policy.ts` valida la respuesta del modelo contra el snapshot antes de persistirla.
- **Una generación de imagen a la vez por campaña:** reserva de 5 minutos con recuperación al vencer.
- **Aprobación de una revisión exacta** y control de concurrencia por versión ([ADR-0017](adr/0017-aprobacion-de-revision-exacta.md)). Aprobar exige que el flyer final exista y sea legible.
- **Fallos visibles:** si la IA falla, no se sustituye el resultado por la foto original.

## Decisiones

- [ADR-0016 · Snapshot inmutable por generación](adr/0016-snapshot-inmutable-por-generacion.md)
- [ADR-0017 · Aprobación de una revisión exacta y concurrencia optimista](adr/0017-aprobacion-de-revision-exacta.md)
- Transversales: [ADR-0006](../../adr/0006-proveedores-de-ia-por-despliegue.md), [ADR-0007](../../adr/0007-almacenamiento-privado-s3.md), [ADR-0008](../../adr/0008-cola-de-trabajos-y-worker.md), [ADR-0009](../../adr/0009-estrategia-de-generacion-del-flyer.md), [ADR-0010](../../adr/0010-dividir-campaigns.md)

## Pendiente

- Endpoint de regeneración e historial de versiones con recuperación.
- Edición del brief de una campaña en `DRAFT` (el CMS tiene la pantalla; no hay `PATCH /campaigns/:id`).
- Selección de cuentas de destino al aprobar; depende de `social-accounts`.
- Solicitud de publicación; depende de la fase 8.
- Formatos distintos de 1080×1080.
