# Contrato del módulo `organizations`

Actualizado el 14 de noviembre de 2026 a partir del código. Si este documento y el código difieren, el código manda y este documento debe corregirse.

## Responsabilidad

Identidad de la empresa y su perfil de marca: nombre, descripción, tono de marca y logo. No contiene usuarios, campañas ni productos.

## Datos que posee

| Tabla | Contenido |
| --- | --- |
| `organizations` | `name`, `description`, `brandTone` (opcional), `logoAssetId` (opcional) |
| `organization_logo_assets` | Un registro por logo subido; inmutable |

## API HTTP

La organización activa se resuelve en el servidor; ningún endpoint recibe `organizationId` del cliente.

| Método y ruta | Descripción | Respuesta |
| --- | --- | --- |
| `GET /organization` | Consultar la organización activa | `200` |
| `PATCH /organization` | Editar el perfil de marca | `200` |
| `POST /organization/logo` | Subir o reemplazar el logo (multipart) | `201` |
| `GET /organization/logos/:assetId` | Leer los bytes de un logo de la organización activa | `200` imagen |

### Códigos de error propios

| Código | Estado | Cuándo |
| --- | --- | --- |
| `ORGANIZATION_NOT_FOUND` | 404 | La organización activa no existe |
| `INVALID_INPUT` | 400 | Perfil inválido |
| `CONFLICT` | 409 | Edición concurrente del perfil |
| `ORGANIZATION_LOGO_INVALID_IMAGE` | 400 | El archivo no es PNG, JPEG o WebP válido |
| `ORGANIZATION_LOGO_TOO_LARGE` | 413 | Supera el tamaño permitido |
| `ORGANIZATION_LOGO_CONFLICT` | 409 | Subida concurrente |
| `ORGANIZATION_LOGO_NOT_FOUND` | 404 | Logo inexistente o de otra organización |
| `ORGANIZATION_LOGO_UNAVAILABLE` | 503 | Storage no configurado |

Formato de respuestas y errores: [ADR-0004](../../adr/0004-contrato-http-y-errores.md).

## Casos de uso

`CreateOrganization` (sin endpoint; lo usa el seed de desarrollo), `GetOrganization`, `UpdateOrganizationProfile`, `SaveOrganizationLogo`, `GetOrganizationLogo`.

## Lo que expone a otros módulos

| Contrato | Consumidor | Uso |
| --- | --- | --- |
| Port `OrganizationLogos` (`application/ports/organization-logos.ts`) | `campaigns` | Leer el logo al componer el flyer |
| Datos de organización para el snapshot | `campaigns`, mediante su port `OrganizationLookup` | Nombre, descripción, tono y logo al solicitar una generación |
| Existencia de la organización | `products` y `templates`, mediante sus ports `OrganizationLookup` | Validar pertenencia al crear |

## Lo que consume

| Dependencia | Port | Implementación actual |
| --- | --- | --- |
| Persistencia | `OrganizationRepository` | `PrismaOrganizationRepository` |
| Storage de logos | `OrganizationLogos` | `MinioOrganizationLogos`, sobre `ObjectStorage` de [assets](../assets/contrato.md) |

## Decisiones

- [ADR-0019 · Perfil de marca y logo en la organización](adr/0019-perfil-de-marca-en-la-organizacion.md)
- Transversales: [ADR-0003](../../adr/0003-aislamiento-por-organizacion.md), [ADR-0007](../../adr/0007-almacenamiento-privado-s3.md)

## Pendiente

- No hay endpoint para crear organizaciones ni para listar las de un usuario; depende de [ADR-0012](../../adr/0012-autenticacion-antes-de-publicar.md).
- Región, zona horaria e idioma de la organización, hoy fijos en el flyer.
