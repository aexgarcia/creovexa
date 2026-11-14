# Contrato del módulo `assets`

Creado el 14 de noviembre de 2026 ([ADR-0010](../../adr/0010-dividir-campaigns.md)). Si este documento y el código difieren, el código manda y este documento debe corregirse.

## Responsabilidad

Almacenamiento privado e inmutable de archivos para todos los módulos. Es el único lugar que habla con el servicio S3-compatible (MinIO en desarrollo). No sabe qué significa cada archivo: cada módulo consumidor conserva sus reglas y su tabla de metadatos.

## Datos que posee

Ninguna tabla por ahora. Los objetos del bucket son suyos; los registros siguen en `product_image_assets`, `organization_logo_assets` y `campaign_assets`, cada uno en su módulo.

## API HTTP

Ninguna. Los archivos se leen a través de los endpoints de cada módulo dueño, que verifican la organización.

## Lo que expone a otros módulos

Port `ObjectStorage` (`application/ports/object-storage.ts`), inyectado con el token `OBJECT_STORAGE`:

| Miembro | Comportamiento |
| --- | --- |
| `bucket` | Bucket que recibe objetos nuevos; `null` si el storage no está configurado |
| `putIfAbsent({ key, bytes, contentType, sha256 })` | Escribe sin sobrescribir nunca. Devuelve `false` si la clave ya tiene un objeto |
| `read(key, maxBytes)` | Lee del bucket configurado, con límite de tamaño y de tiempo (30 s) |

Errores: `ObjectStorageError` con código `UNAVAILABLE`, `TIMEOUT`, `TOO_LARGE` o `EMPTY`. Cada consumidor los traduce a su propio error (`ProductImageError`, `OrganizationLogoError`, `CampaignImageError`); este módulo no define códigos HTTP.

| Consumidor | Adapter que lo usa | Prefijo de clave |
| --- | --- | --- |
| `products` | `MinioProductImages` | `products/<organización>/<producto>/<asset>` |
| `organizations` | `MinioOrganizationLogos` | `logos/<organización>/<asset>` |
| `campaigns` | `MinioStorageProvider` | `<organización>/<campaña>/<generación>/<operación>/<propósito>` |

## Lo que consume

| Dependencia | Implementación actual |
| --- | --- |
| Servicio S3-compatible | `S3ObjectStorage` con `@aws-sdk/client-s3` |
| Configuración | `STORAGE_CONFIG` (`STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`) |

Si faltan las credenciales, el módulo arranca igual y toda operación responde `UNAVAILABLE`. Una configuración parcial se rechaza al iniciar.

## Garantías

- Un solo cliente S3 para toda la aplicación.
- Los objetos nunca se sobrescriben ni se borran desde aquí.
- La integridad (tamaño y SHA-256) la verifica cada consumidor contra su registro.

## Decisiones

- [ADR-0007 · Almacenamiento privado S3-compatible con assets inmutables](../../adr/0007-almacenamiento-privado-s3.md)
- [ADR-0010 · Dividir `campaigns`](../../adr/0010-dividir-campaigns.md)

## Pendiente

- Unificar las tres tablas de assets en una sola con dueño; requiere migración de datos.
- Traer aquí la validación de bytes de imagen (`src/infrastructure/image-files.ts`), que hoy usan también los generadores de IA.
- Limpieza periódica de objetos huérfanos, como trabajo de la cola ([ADR-0008](../../adr/0008-cola-de-trabajos-y-worker.md)).
- Los adapters consumidores conservan el prefijo `Minio` en su nombre aunque ya no dependen de MinIO.
