# Contrato del módulo `content-generation`

Creado el 14 de noviembre de 2026 al extraerlo de `campaigns` ([ADR-0010](../../adr/0010-dividir-campaigns.md)). Si este documento y el código difieren, el código manda y este documento debe corregirse.

## Responsabilidad

Ejecutar la generación de una campaña: producir el copy y la imagen con IA, componer el flyer y guardar los archivos resultantes. Es el único módulo que conoce proveedores de IA y el renderer.

No decide estados ni aprobación, ni conoce la entidad `Campaign`: pide a `campaigns`, a través de su contrato publicado, que inicie la generación y que registre el resultado.

## Datos que posee

| Tabla | Contenido |
| --- | --- |
| `campaign_copies` | Copy validado de una generación, incluido `imagePrompt`, su reserva, su estado (`QUEUED`, `RUNNING`, `READY`, `FAILED`) y `failure_code` |
| `campaign_image_jobs` | Reserva del trabajo de imagen, su estado y `failure_code` |
| Colas `generate-campaign-copy` y `generate-campaign-image` | Trabajos pendientes en el schema de `pg-boss` |

Además **escribe** en `campaign_assets` (imagen base y flyer final) y lee de vuelta la imagen base que su propia operación guardó. No lee ni escribe `campaigns` ni `generated_contents`: al confirmar la imagen pide a `campaigns` que lo haga dentro de la misma transacción.

## API HTTP

| Método y ruta | Descripción | Respuesta |
| --- | --- | --- |
| `POST /campaigns/:id/copy` | Solicitar el copy. Desde `DRAFT` captura el snapshot y pasa a `GENERATING` | `202` |
| `GET /campaigns/:id/copy` | Estado del trabajo y copy de la generación vigente | `200` |
| `POST /campaigns/:id/image` | Solicitar el flyer final. Cuerpo: `generationId` | `202` |
| `GET /campaigns/:id/image` | Estado del trabajo y flyer de la generación vigente | `200` |

La generación se ejecuta en segundo plano ([ADR-0008](../../adr/0008-cola-de-trabajos-y-worker.md)). Un `202` significa que el trabajo quedó registrado de forma durable, no que terminó. Pedir de nuevo mientras está pendiente no crea otro trabajo; si ya terminó, responde el resultado.

Respuesta de copy:

```json
{ "data": { "generationId": "…", "status": "READY", "failureCode": null,
            "copy": { "headline": "…", "caption": "…", "cta": "…", "hashtags": [], "imagePrompt": "…" } } }
```

Respuesta de imagen:

```json
{ "data": { "generationId": "…", "status": "READY", "failureCode": null,
            "contentId": "…", "finalAssetUrl": "/campaigns/…/assets/…" } }
```

| `status` | Significado | Campos con valor |
| --- | --- | --- |
| `PENDING` | Registrado, esperando al worker | — |
| `RUNNING` | El worker lo está ejecutando | — |
| `READY` | Terminado | `copy`, o `contentId` y `finalAssetUrl` |
| `FAILED` | Falló; se puede volver a solicitar | `failureCode` (`TIMEOUT`, `UNAVAILABLE`, `RATE_LIMITED`, `INVALID_OUTPUT`, `REFUSED`, `LOGO_UNAVAILABLE`, `FAILED`…) |

`data: null` indica que todavía no se solicitó nada para la generación vigente. Una reserva que venció sin terminar se informa como `FAILED` con `TIMEOUT`.

**Cambio respecto a la versión síncrona:** `POST` respondía `200` con el resultado y `GET /copy` devolvía los campos del copy en la raíz de `data`. El CMS se actualizó en el mismo cambio.

### Códigos de error propios

Al solicitar, solo pueden ocurrir los errores que se comprueban antes de encolar. Los del proveedor (`TIMEOUT`, `INVALID_OUTPUT`, `REFUSED`, `RATE_LIMITED`) llegan después como `failureCode` del estado.

| Código | Estado | Cuándo |
| --- | --- | --- |
| `COPY_UNAVAILABLE` | 503 | Proveedor de copy no configurado |
| `IMAGE_COPY_REQUIRED`, `IMAGE_PRODUCT_IMAGE_REQUIRED` | 409 | Falta el copy o la foto del producto |
| `IMAGE_INVALID_OUTPUT` | 502 | El copy guardado no coincide con el snapshot |
| `IMAGE_UNSUPPORTED_DIMENSIONS` | 400 | La plantilla no es 1080×1080 |
| `IMAGE_UNAVAILABLE` | 503 | Proveedor, renderer o storage no configurados |
| `INVALID_CAMPAIGN_STATE` | 409 | La campaña no está en un estado que admita la solicitud |
| `STALE_GENERATION` | 409 | El `generationId` enviado no es el vigente |
| `INVALID_INPUT` | 400 | Promoción vencida |

`CampaignImageError` está definido en `campaigns` porque la aprobación también lo usa. Formato de respuestas y errores: [ADR-0004](../../adr/0004-contrato-http-y-errores.md).

## Casos de uso

| Caso de uso | Lo usa |
| --- | --- |
| `RequestCampaignCopy`, `RequestCampaignImage` | Los `POST`: comprueban y encolan en una transacción |
| `GetCampaignCopy`, `GetCampaignImage` | Los `GET`: estado del trabajo y resultado |
| `GenerateCampaignCopy`, `GenerateCampaignImage` | El worker: hacen el trabajo, igual que antes |
| `GenerationJobs` | El worker: ejecuta cada trabajo y guarda el `failure_code` si falla |

`checkImagePreconditions` reúne las comprobaciones de imagen que hacen tanto la solicitud (para responder al momento) como el trabajo (porque la campaña pudo cambiar mientras esperaba).

## Lo que expone a otros módulos

Nada. Ningún módulo puede importar de `content-generation`; para `campaigns` lo impide una regla de ESLint (`no-restricted-imports` en `apps/api/eslint.config.mjs`).

## Lo que consume

### De `campaigns`, solo su contrato publicado

Único import permitido: `#app/modules/campaigns/contract` ([ADR-0021](../../adr/0021-contrato-publicado-entre-modulos.md)). Una regla de ESLint rechaza cualquier otro.

| Del contrato | Para qué |
| --- | --- |
| `CampaignGenerations.view` | Conocer estado, versión, generación vigente y su snapshot, como datos planos |
| `CampaignGenerations.begin` | Iniciar la generación de una campaña en `DRAFT`, opcionalmente dentro de su transacción |
| `CampaignGenerations.assertPromotionActive` | No generar para una promoción vencida |
| `CampaignGenerations.lock` | Serializar el trabajo y confirmar que la generación sigue vigente, dentro de su transacción |
| `CampaignGenerations.recordContent` | Registrar el contenido y pasar a `PENDING_APPROVAL`, dentro de su transacción |
| `CampaignImageError`, `InvalidCampaignTransitionError`, `StaleGenerationResultError` | Errores del lenguaje compartido |
| Tipos `GenerationSnapshotData`, `StoredCampaignAsset`, `CampaignImageSelection` | Datos planos |

### De otros módulos

| Dependencia | Port | Implementación actual |
| --- | --- | --- |
| Foto de referencia | `ProductImageSource` | `StoredProductImageSource`, sobre `ProductImages` de [products](../products/contrato.md) |
| Logo | `CampaignRenderResources` | `PrismaCampaignRenderResources`, sobre `OrganizationLogos` de [organizations](../organizations/contrato.md) |
| Storage | `StorageProvider` | `MinioStorageProvider`, sobre `ObjectStorage` de [assets](../assets/contrato.md) |

### Externas

| Dependencia | Port | Implementación actual |
| --- | --- | --- |
| Generación de texto | `CopyGenerator` | `OpenAICopyGenerator`, `GeminiCopyGenerator` |
| Generación de imagen | `ImageGenerator` | `OpenAIImageGenerator`, `GeminiImageGenerator` |
| Composición | `TemplateRenderer` | `PlaywrightTemplateRenderer` con `campaign-flyer-html.ts` |
| Persistencia propia | `CampaignCopyRepository`, `CampaignImageRepository` | Repositorios Prisma |
| Archivos temporales | — | `LocalImageArtifacts` en `.local/image-artifacts` |
| Cola de trabajos | `JobQueue` | `PgBossJobQueue` ([ADR-0008](../../adr/0008-cola-de-trabajos-y-worker.md)) |
| Transacción compartida | `UnitOfWork` | `PrismaUnitOfWork` |

Configuración: `COPY_PROVIDER`, `IMAGE_PROVIDER` y las variables de cada proveedor ([ADR-0006](../../adr/0006-proveedores-de-ia-por-despliegue.md)); `RENDER_TIMEOUT_MS`.

## Garantías

- **El copy no inventa datos comerciales:** `copy-policy.ts` valida la respuesta del modelo contra el snapshot antes de persistirla.
- **Una generación de imagen a la vez por campaña:** reserva de 5 minutos con recuperación al vencer.
- **Confirmación atómica:** contenido generado, cambio a `PENDING_APPROVAL` y cierre de la reserva se guardan en una sola transacción, que este módulo abre y en la que `campaigns` participa; un trabajo cuya reserva venció no puede confirmar.
- **Fallos visibles:** si la IA falla, no se sustituye el resultado por la foto original.
- **Sin reintento automático de imagen:** una respuesta ambigua puede haberse cobrado.

## Decisiones

- [ADR-0006 · Proveedores de IA por despliegue](../../adr/0006-proveedores-de-ia-por-despliegue.md)
- [ADR-0009 · Estrategia de generación del flyer](../../adr/0009-estrategia-de-generacion-del-flyer.md) (propuesto)
- [ADR-0010 · Dividir `campaigns`](../../adr/0010-dividir-campaigns.md)
- [ADR-0021 · Contrato publicado y aislamiento estricto](../../adr/0021-contrato-publicado-entre-modulos.md)

## Pendiente

- Modo de IA completa con verificación ([ADR-0009](../../adr/0009-estrategia-de-generacion-del-flyer.md)).
- Corregir los problemas de [datos enviados a la IA](datos-enviados-a-la-ia.md#problemas-encontrados), en especial las fechas en UTC que recibe el copy.
- Regeneración de imagen e historial de versiones.
- Formatos distintos de 1080×1080; región e idioma del flyer, hoy fijos.
- Limpieza de archivos temporales.
- `PrismaCampaignRenderResources` lee `template_revisions` directamente; debe pasar por un contrato de `templates`.
