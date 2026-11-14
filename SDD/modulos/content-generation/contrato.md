# Contrato del módulo `content-generation`

Creado el 14 de noviembre de 2026 al extraerlo de `campaigns` ([ADR-0010](../../adr/0010-dividir-campaigns.md)). Si este documento y el código difieren, el código manda y este documento debe corregirse.

## Responsabilidad

Ejecutar la generación de una campaña: producir el copy y la imagen con IA, componer el flyer y guardar los archivos resultantes. Es el único módulo que conoce proveedores de IA y el renderer.

No decide estados ni aprobación, ni conoce la entidad `Campaign`: pide a `campaigns`, a través de su contrato publicado, que inicie la generación y que registre el resultado.

## Datos que posee

| Tabla | Contenido |
| --- | --- |
| `campaign_copies` | Copy validado de una generación, incluido `imagePrompt`, y su reserva |
| `campaign_image_jobs` | Reserva temporal del trabajo de imagen |

Además **escribe** en `campaign_assets` (imagen base y flyer final) y lee de vuelta la imagen base que su propia operación guardó. No lee ni escribe `campaigns` ni `generated_contents`: al confirmar la imagen pide a `campaigns` que lo haga dentro de la misma transacción.

## API HTTP

| Método y ruta | Descripción | Respuesta |
| --- | --- | --- |
| `POST /campaigns/:id/copy` | Generar el copy. Desde `DRAFT` captura el snapshot y pasa a `GENERATING` | `200` |
| `GET /campaigns/:id/copy` | Consultar el copy de la generación vigente | `200` |
| `POST /campaigns/:id/image` | Generar el flyer final. Cuerpo: `generationId` | `200` |

Hoy son síncronos: responden cuando el proveedor termina. Pasarán a `202` con [ADR-0008](../../adr/0008-cola-de-trabajos-y-worker.md).

### Códigos de error propios

| Código | Estado | Cuándo |
| --- | --- | --- |
| `COPY_BUSY` | 409 | Ya hay una generación de copy en curso |
| `COPY_TIMEOUT` | 504 | El proveedor no respondió a tiempo |
| `COPY_UNAVAILABLE` | 503 | Proveedor de copy no configurado |
| `COPY_INVALID_OUTPUT`, `COPY_REFUSED` | 502 | Respuesta inválida o rechazada por el proveedor |
| `IMAGE_COPY_REQUIRED`, `IMAGE_PRODUCT_IMAGE_REQUIRED`, `IMAGE_BUSY`, `IMAGE_STALE_RESULT` | 409 | Falta un requisito, hay otra generación en curso o el resultado llegó tarde |
| `IMAGE_UNSUPPORTED_DIMENSIONS` | 400 | La plantilla no es 1080×1080 |
| `IMAGE_TIMEOUT` | 504 | Se agotó el tiempo |
| `IMAGE_UNAVAILABLE`, `IMAGE_LOGO_UNAVAILABLE` | 503 | Proveedor, storage o logo no disponibles |
| `IMAGE_RATE_LIMITED` | 429 | El proveedor limitó las solicitudes |
| `IMAGE_INVALID_OUTPUT`, `IMAGE_REFUSED` | 502 | Resultado inválido o rechazado por el proveedor |
| `STALE_GENERATION` | 409 | Resultado de una generación que ya no es la vigente |

`CampaignImageError` está definido en `campaigns` porque la aprobación también lo usa. Formato de respuestas y errores: [ADR-0004](../../adr/0004-contrato-http-y-errores.md).

## Casos de uso

`GenerateCampaignCopy`, `GetCampaignCopy`, `GenerateCampaignImage`.

## Lo que expone a otros módulos

Nada. Ningún módulo puede importar de `content-generation`; para `campaigns` lo impide una regla de ESLint (`no-restricted-imports` en `apps/api/eslint.config.mjs`).

## Lo que consume

### De `campaigns`, solo su contrato publicado

Único import permitido: `#app/modules/campaigns/contract` ([ADR-0021](../../adr/0021-contrato-publicado-entre-modulos.md)). Una regla de ESLint rechaza cualquier otro.

| Del contrato | Para qué |
| --- | --- |
| `CampaignGenerations.view` | Conocer estado, versión, generación vigente y su snapshot, como datos planos |
| `CampaignGenerations.begin` | Iniciar la generación de una campaña en `DRAFT` |
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

- Ejecutar la generación como trabajos de la cola ([ADR-0008](../../adr/0008-cola-de-trabajos-y-worker.md)).
- Modo de IA completa con verificación ([ADR-0009](../../adr/0009-estrategia-de-generacion-del-flyer.md)).
- Regeneración de imagen e historial de versiones.
- Formatos distintos de 1080×1080; región e idioma del flyer, hoy fijos.
- Limpieza de archivos temporales.
- `PrismaCampaignRenderResources` lee `template_revisions` directamente; debe pasar por un contrato de `templates`.
