# Contrato del módulo `campaigns`

Actualizado el 14 de noviembre de 2026, después de extraer `content-generation` y `assets` ([ADR-0010](../../adr/0010-dividir-campaigns.md)). Si este documento y el código difieren, el código manda y este documento debe corregirse.

## Responsabilidad

La campaña y su ciclo de vida: brief, oferta, estados, contenido generado, aprobación y resumen de publicación. Protege las reglas de qué puede pasar en cada estado.

No llama a proveedores de IA, no renderiza ni escribe archivos: eso es de [content-generation](../content-generation/contrato.md).

## Datos que posee

| Tabla | Contenido |
| --- | --- |
| `campaigns` | Brief (`title`, `instructions`, `cta`, `promotion`), referencias a producto y revisión de plantilla, `status`, generación vigente, contenido candidato y aprobado, destinos aprobados, resumen de publicación, `version` |
| `campaign_generations` | Una fila por solicitud de generación, con su `snapshot` inmutable |
| `generated_contents` | Contenido aprobable: `headline`, `caption`, `cta`, `hashtags`, `assetIds` |
| `campaign_generation_failures` | Código de fallo por generación |
| `campaign_assets` (solo lectura) | Imagen base y flyer final. Los escribe `content-generation` |

## Estados

`DRAFT`, `GENERATING`, `PENDING_APPROVAL`, `APPROVED`, `PUBLISHING`, `PUBLISHED`, `PARTIALLY_PUBLISHED`, `FAILED`. Diagrama en la [visión](../../arquitectura/vision.md#flujo-principal). Las transiciones las protege la entidad `Campaign`; una transición inválida lanza `InvalidCampaignTransitionError`.

## API HTTP

| Método y ruta | Descripción | Respuesta |
| --- | --- | --- |
| `POST /campaigns` | Crear campaña en `DRAFT` | `201` |
| `GET /campaigns` | Listar, paginado | `200` |
| `GET /campaigns/:id` | Consultar | `200` |
| `GET /campaigns/:id/assets/:assetId` | Leer el flyer final de la revisión candidata (PNG) | `200` imagen |
| `POST /campaigns/:id/approve` | Aprobar la revisión candidata. Cuerpo: `contentId` | `200` |

Los endpoints de generación (`…/copy`, `…/image`) están en [content-generation](../content-generation/contrato.md).

### Códigos de error propios

| Código | Estado | Cuándo |
| --- | --- | --- |
| `CAMPAIGN_NOT_FOUND` | 404 | Inexistente o de otra organización |
| `CAMPAIGN_RESOURCE_NOT_FOUND` | 404 | Producto, plantilla o revisión referenciados no existen |
| `INVALID_INPUT` | 400 | Datos o promoción inválidos, o promoción vencida |
| `INVALID_CAMPAIGN_STATE` | 409 | La operación no corresponde al estado actual |
| `CONTENT_REVISION_MISMATCH` | 409 | Se intenta aprobar una revisión que no es la candidata |
| `CAMPAIGN_CONFLICT` | 409 | Modificación concurrente (versión) |
| `IMAGE_NOT_FOUND` | 404 | El asset pedido no es el flyer de la revisión candidata |
| `IMAGE_FINAL_ASSET_REQUIRED` | 409 | Se intenta aprobar sin un flyer final legible |

Formato de respuestas y errores: [ADR-0004](../../adr/0004-contrato-http-y-errores.md).

## Casos de uso

| Caso de uso | Con endpoint |
| --- | --- |
| `CreateCampaign`, `GetCampaign`, `ListCampaigns`, `ApproveCampaign`, `GetCampaignFinalAsset` | Sí |
| `RequestCampaignGeneration`, `RequestCampaignRegeneration`, `RecordGeneratedCampaign`, `RecordCampaignGenerationFailure` | No |

La regeneración existe en dominio y aplicación, pero todavía no tiene endpoint.

## Lo que expone a otros módulos

| Contrato | Consumidor | Uso |
| --- | --- | --- |
| **Contrato publicado** `contract.ts`: port `CampaignGenerations` (`view`, `begin`, `assertPromotionActive`, `lock`, `recordContent`), datos planos y errores compartidos | `content-generation` | Ejecutar la generación sin conocer la entidad `Campaign` ([ADR-0021](../../adr/0021-contrato-publicado-entre-modulos.md)) |
| Existencia de la campaña | `publications`, mediante su port `PublicationCampaignLookup` | Validar pertenencia al listar publicaciones |
| `CampaignNotFoundError` | `publications` | Import directo de una clase de error; debería sustituirse por un resultado del port |

`contract.ts` es el único archivo de este módulo que otro puede importar, y `CAMPAIGN_GENERATIONS` lo único que `CampaignsModule` exporta. Lo implementa `PublishedCampaignGenerations`, que traduce entre el agregado y los datos planos. Cambiar el contrato exige revisar a sus consumidores.

`campaigns` no importa nada de `content-generation`; una regla de ESLint lo impide.

## Lo que consume

| Dependencia | Port | Implementación actual |
| --- | --- | --- |
| Persistencia | `CampaignRepository` | `PrismaCampaignRepository` |
| Datos para el snapshot | `CampaignLookups` (`OrganizationLookup`, `ProductLookup`, `TemplateRevisionLookup`) | `PrismaCampaignLookups` |
| Persistencia dentro de la transacción de otro módulo | `CampaignWorkspace` | `PrismaCampaignWorkspace` |
| Lectura del flyer final | `CampaignFinalAssets` | `StoredCampaignAssets`, sobre `ObjectStorage` de [assets](../assets/contrato.md) |
| Reloj e identificadores | `Clock`, `IdGenerator` | `RuntimeModule` |

## Garantías

- **Snapshot inmutable:** una generación trabaja con los datos capturados al solicitarla ([ADR-0016](adr/0016-snapshot-inmutable-por-generacion.md)).
- **Aprobación de una revisión exacta** y control de concurrencia por versión ([ADR-0017](adr/0017-aprobacion-de-revision-exacta.md)). Aprobar exige que el flyer final exista y sea legible.
- **Lectura verificada:** un asset solo se entrega si pertenece a la organización, coincide en tamaño y SHA-256 con su registro y es un PNG de las dimensiones registradas.

## Decisiones

- [ADR-0016 · Snapshot inmutable por generación](adr/0016-snapshot-inmutable-por-generacion.md)
- [ADR-0017 · Aprobación de una revisión exacta y concurrencia optimista](adr/0017-aprobacion-de-revision-exacta.md)
- Transversales: [ADR-0007](../../adr/0007-almacenamiento-privado-s3.md), [ADR-0010](../../adr/0010-dividir-campaigns.md), [ADR-0021](../../adr/0021-contrato-publicado-entre-modulos.md)

## Pendiente

- Endpoint de regeneración e historial de versiones con recuperación.
- Edición del brief de una campaña en `DRAFT` (el CMS tiene la pantalla; no hay `PATCH /campaigns/:id`).
- Selección de cuentas de destino al aprobar; depende de `social-accounts`.
- Solicitud de publicación; depende de la fase 8.
- `CampaignImageError` mezcla fallos de generación con dos fallos de lectura; separarlo cambia códigos HTTP y se hará con aviso al CMS.
