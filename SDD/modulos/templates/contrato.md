# Contrato del módulo `templates`

Actualizado el 14 de noviembre de 2026 a partir del código. Si este documento y el código difieren, el código manda y este documento debe corregirse.

## Responsabilidad

Plantillas de flyer de una organización: nombre y dirección de arte, versionados mediante revisiones inmutables, y el catálogo de plantillas base del sistema. No ejecuta el render ni conoce campañas.

## Datos que posee

| Tabla | Contenido |
| --- | --- |
| `templates` | `name` y `currentRevisionId` |
| `template_revisions` | `number`, `width`, `height` y `design` (JSON); inmutables. Las dimensiones salen del formato y una restricción exige que coincidan |

`design` es el value object compartido `FlyerDesign` (`src/domain/value-objects/flyer-design.ts`):

- `format`: `SQUARE` 1080 × 1080, `PORTRAIT` 1080 × 1350 o `STORY` 1080 × 1920;
- `composition`, `style`, `mode`, `background`, `logoPosition` y `textDensity`;
- `elements`: `logo`, `headline`, `subheadline`, `productName`, `regularPrice`, `promotionPrice`, `validity`, `cta`, `contact` y `legalText`, más `keyAttributes` (de 0 a 4).

No lleva colores: salen del kit de marca. Las plantillas base viven en el código (`application/base-templates.ts`), no en tablas ([ADR-0023](adr/0023-direccion-de-arte-y-plantillas-base.md)).

## API HTTP

| Método y ruta | Descripción | Respuesta |
| --- | --- | --- |
| `POST /templates` | Crear plantilla con su revisión inicial (`name` y `design` opcional; sin `dimensions`) | `201` |
| `GET /templates/base` | Listar las plantillas base del sistema | `200` |
| `POST /templates/base/:key` | Crear en la organización una copia de una plantilla base (`name` opcional) | `201` |
| `GET /templates` | Listar, paginado | `200` |
| `GET /templates/:id` | Consultar plantilla y revisión vigente | `200` |
| `PATCH /templates/:id` | Editar; crea una revisión nueva | `200` |

### Códigos de error propios

| Código | Estado | Cuándo |
| --- | --- | --- |
| `TEMPLATE_NOT_FOUND` | 404 | Inexistente o de otra organización, o plantilla base desconocida |
| `ORGANIZATION_NOT_FOUND` | 404 | La organización activa no existe |
| `INVALID_INPUT` | 400 | Nombre o diseño inválidos |
| `CONFLICT` | 409 | Edición concurrente de la revisión |

Formato de respuestas y errores: [ADR-0004](../../adr/0004-contrato-http-y-errores.md).

## Casos de uso

`CreateTemplate`, `GetTemplate`, `ListTemplates`, `UpdateTemplate`.

## Lo que expone a otros módulos

| Contrato | Consumidor | Uso |
| --- | --- | --- |
| Datos de una revisión para el snapshot | `campaigns`, mediante su port `TemplateRevisionLookup` | Dimensiones y diseño al solicitar una generación |

## Lo que consume

| Dependencia | Port | Implementación actual |
| --- | --- | --- |
| Persistencia | `TemplateRepository` | `PrismaTemplateRepository` |
| Existencia de la organización | `OrganizationLookup` | Consulta Prisma |

## Decisiones

- [ADR-0015 · Revisiones inmutables y diseño estructurado](adr/0015-revisiones-inmutables-y-diseno-estructurado.md)
- [ADR-0023 · La plantilla como dirección de arte, con plantillas base del sistema](adr/0023-direccion-de-arte-y-plantillas-base.md)

## Pendiente

- Solo se genera 1080×1080; faltan 1080×1350 y 1080×1920.
- El papel de la plantilla cambia si la IA genera el flyer completo ([ADR-0009](../../adr/0009-estrategia-de-generacion-del-flyer.md)): pasaría de definir la composición a aportar indicaciones de estilo.
- No hay eliminación ni archivado.
