# ADR-0010 · Dividir `campaigns` en `campaigns`, `content-generation` y `assets`

- **Estado:** Aceptado, implementado el 2026-11-14 con pendientes menores (ver "Implementación")
- **Fecha:** 2026-11-14
- **Ámbito:** `apps/api/src/modules`

## Contexto

`campaigns` reúne 4,760 de las ~8,400 líneas de los módulos y 57 archivos. Además del ciclo de vida de la campaña contiene la política y los adapters de copy, los adapters de imagen, la composición HTML, el renderer Playwright, el storage S3 y la lectura de assets. Son razones de cambio distintas: un proveedor de IA nuevo no debería tocar el módulo que protege la aprobación.

El storage está triplicado: `minio-storage-provider.ts` en `campaigns`, `minio-product-images.ts` en `products` y `minio-organization-logos.ts` en `organizations`, con tres tablas de assets.

## Decisión

Tres módulos con responsabilidades separadas:

| Módulo | Contiene | No contiene |
| --- | --- | --- |
| `campaigns` | `Campaign`, `GeneratedContent`, snapshot, promoción, estados, aprobación y resumen de publicación | Llamadas a IA, render ni storage |
| `content-generation` | Casos de uso `GenerateCampaignCopy` y `GenerateCampaignImage`, política de copy, ports `CopyGenerator`, `ImageGenerator`, `TemplateRenderer`, y sus adapters | Reglas de aprobación o publicación |
| `assets` | Port único de almacenamiento, adapter S3, validación de bytes y registro de assets con su dueño | Reglas de negocio de quien usa el asset |

Dependencias permitidas: `content-generation` → `campaigns` (lee el snapshot y registra el resultado mediante un port) y `content-generation`, `products`, `organizations`, `publications` → `assets`. `campaigns` no depende de ninguno de los dos módulos nuevos.

Orden de ejecución: primero `assets` (elimina duplicación sin cambiar comportamiento), después `content-generation`.

## Alternativas consideradas

- **Dejar `campaigns` como está:** cada fase nueva (regeneración, verificación, formatos) seguiría engordándolo.
- **Subcarpetas dentro de `campaigns`:** ordena los archivos pero no impide que el dominio de campaña y los adapters se sigan mezclando.
- **Mantener un storage por módulo:** aislamiento aparente, a cambio de triplicar validación, idempotencia y limpieza.

## Consecuencias

- Refactor amplio de imports y de cableado; conviene hacerlo después de [ADR-0011](0011-cableado-nestjs-por-modulo.md).
- Unificar las tablas de assets requiere una migración de datos; puede hacerse en un segundo paso, unificando primero solo el adapter.
- El [contrato de campaigns](../modulos/campaigns/contrato.md) se dividirá en tres contratos cuando se ejecute.
- El documento de [dominio](../arquitectura/dominio.md) indicaba que no habría un módulo `generated-contents`; eso se mantiene: `GeneratedContent` sigue perteneciendo a `campaigns`. Lo que sale es la **ejecución** de la generación.

## Implementación

**Paso 1, hecho el 14 de noviembre de 2026: módulo `assets`.**

- Port `ObjectStorage` y adapter `S3ObjectStorage`: un solo cliente S3 para toda la aplicación.
- `MinioProductImages`, `MinioOrganizationLogos` y `MinioStorageProvider` ya no crean su cliente ni repiten la lectura con límites; delegan en el port y conservan solo sus reglas y sus metadatos.
- `StorageModule` se eliminó; `AssetsModule` entrega la configuración y el port.
- Sin cambios de esquema ni de comportamiento observable. Detalle en el [contrato de assets](../modulos/assets/contrato.md).

**Paso 2, hecho el 14 de noviembre de 2026: módulo `content-generation`.**

- Se movieron 26 archivos de `campaigns` (casos de uso de copy e imagen, política de copy, ports, adapters de IA, renderer, repositorios de copy e imagen y sus dos controllers) con sus pruebas. `campaigns` pasó de unas 4,800 a unas 2,600 líneas.
- `campaigns` conserva la **lectura** de assets (`StoredCampaignAssets`, port `CampaignFinalAssets`), porque la aprobación la necesita; `content-generation` conserva la **escritura**. El endpoint `GET /campaigns/:id/assets/:assetId` quedó en `CampaignsController`, con la misma ruta.
- Dependencia en un solo sentido, `content-generation` → `campaigns`, vigilada por una regla `no-restricted-imports` de ESLint.
- Sin cambios de rutas, de códigos de error ni de esquema. Detalle en el [contrato de content-generation](../modulos/content-generation/contrato.md).

Diferencia con la decisión original: se preveía que `content-generation` registrara el resultado "mediante un port". En la práctica usa directamente la entidad `Campaign` y su repositorio, porque el contenido generado, el cambio de estado y el cierre de la reserva deben confirmarse en una sola transacción. Queda documentado como la única excepción permitida a la regla de no importar el dominio de otro módulo.

**Corrección posterior:** la excepción descrita arriba se eliminó el mismo día con [ADR-0021](0021-contrato-publicado-entre-modulos.md). `content-generation` ya no usa la entidad `Campaign` ni su repositorio; habla con `campaigns` solo a través de su contrato publicado.

Pendiente:

- Unificar las tres tablas de assets y mover la validación de bytes a `assets`.
- Renombrar los adapters con prefijo `Minio`.
- Separar `CampaignImageError` en errores de lectura (campaña) y de generación.
- Registrar los repositorios bajo tokens de contrato ([ADR-0011](0011-cableado-nestjs-por-modulo.md)).
