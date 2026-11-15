# Contrato del módulo `products`

Actualizado el 14 de noviembre de 2026 a partir del código. Si este documento y el código difieren, el código manda y este documento debe corregirse.

## Responsabilidad

Catálogo de productos y servicios de una organización: datos comerciales, precio base y su única imagen. No administra inventario, reservas ni facturación.

## Datos que posee

| Tabla | Contenido |
| --- | --- |
| `products` | `kind` (`PRODUCT` o `SERVICE`), `name`, `description`, precio (`amountMinor` + `currency`), `imageAssetIds` (cero o un elemento). Para el flyer: `shortName` (hasta 40 caracteres; sin él se usa `name`), `productBrand` (marca de un tercero), `keyAttributes` (hasta 5, de hasta 60 caracteres, sin repetir) y `unit` |
| `product_image_assets` | Un registro por imagen subida; inmutable. Incluye `photoType` (`CUTOUT`, `STUDIO`, `SCENE`, `PLACE` o `PERSON`), que indica quien la sube, y `hasTransparency`, que deriva el sistema. Ambos son nulos en imágenes anteriores a este cambio |

## API HTTP

| Método y ruta | Descripción | Respuesta |
| --- | --- | --- |
| `POST /products` | Crear producto o servicio | `201` |
| `GET /products` | Listar, paginado (`page`, `limit`) | `200` |
| `GET /products/:id` | Consultar | `200` |
| `PATCH /products/:id` | Editar datos comerciales y del flyer; `null` borra `shortName`, `productBrand` o `unit` | `200` |
| `POST /products/:id/image` | Subir o reemplazar la única imagen (multipart: `image` y `photoType`, obligatorio) | `201` |
| `GET /products/:id/images/:assetId` | Leer los bytes de una imagen | `200` imagen |

### Códigos de error propios

| Código | Estado | Cuándo |
| --- | --- | --- |
| `PRODUCT_NOT_FOUND` | 404 | Inexistente o de otra organización |
| `ORGANIZATION_NOT_FOUND` | 404 | La organización activa no existe |
| `INVALID_INPUT` | 400 | Datos, importe, moneda o tipo de foto inválidos |
| `PRODUCT_IMAGE_INVALID_IMAGE` | 400 | El archivo no es PNG, JPEG o WebP válido |
| `PRODUCT_IMAGE_TOO_LARGE` | 413 | Supera el tamaño permitido |
| `PRODUCT_IMAGE_CONFLICT` | 409 | Subida concurrente |
| `PRODUCT_IMAGE_NOT_FOUND` | 404 | Imagen inexistente o ajena |
| `PRODUCT_IMAGE_UNAVAILABLE` | 503 | Storage no configurado |

Formato de respuestas y errores: [ADR-0004](../../adr/0004-contrato-http-y-errores.md).

## Casos de uso

`CreateProduct`, `GetProduct`, `ListProducts`, `UpdateProduct`, `SaveProductImage`, `GetProductImage`.

## Lo que expone a otros módulos

| Contrato | Consumidor | Uso |
| --- | --- | --- |
| Port `ProductImages` (`application/ports/product-images.ts`) | `campaigns` | Leer la foto de referencia para la generación visual |
| Datos del producto para el snapshot | `campaigns`, mediante su port `ProductLookup` | Nombre, descripción, precio e imagen al solicitar una generación. Los datos para el flyer y el tipo de foto todavía no llegan al snapshot ([ADR-0009](../../adr/0009-estrategia-de-generacion-del-flyer.md)) |

`campaigns` importa además `ProductImageError` desde este módulo; es el único import de una clase concreta entre módulos y debería sustituirse por un resultado del port.

## Lo que consume

| Dependencia | Port | Implementación actual |
| --- | --- | --- |
| Persistencia | `ProductRepository` | `PrismaProductRepository` |
| Existencia de la organización | `OrganizationLookup` | Consulta Prisma |
| Storage de imágenes | `ProductImages` | `MinioProductImages`, sobre `ObjectStorage` de [assets](../assets/contrato.md) |

## Decisiones

- [ADR-0013 · Catálogo unificado de productos y servicios](adr/0013-catalogo-unificado.md)
- [ADR-0014 · Una sola imagen por producto](adr/0014-una-imagen-por-producto.md)
- Transversales: [ADR-0005](../../adr/0005-dinero-en-unidades-menores.md), [ADR-0007](../../adr/0007-almacenamiento-privado-s3.md)

## Pendiente

- No hay eliminación ni archivado de productos.
