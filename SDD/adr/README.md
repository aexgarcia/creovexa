# Decisiones de arquitectura (ADR)

Índice de todas las decisiones. La numeración es global. Los ADR transversales están en esta carpeta; los propios de un módulo, en `modulos/<modulo>/adr/`.

## Estados

| Estado | Significado |
| --- | --- |
| Aceptado (retroactivo) | Decisión ya implementada, documentada después a partir del código y del historial |
| Aceptado, pendiente de implementar | Decidido; el código todavía no lo refleja |
| Propuesto | En evaluación; no implementar sin cerrarlo |
| Reemplazado por ADR-XXXX | Ya no vigente |

> Los ADR retroactivos se reconstruyeron el 14 de noviembre de 2026. Las secciones "Alternativas consideradas" reflejan lo que consta en el historial o se deduce del diseño; si la razón original fue otra, se corrige el ADR.

## Transversales

| ADR | Decisión | Estado |
| --- | --- | --- |
| [0001](0001-monolito-modular-hexagonal.md) | Monolito modular con arquitectura hexagonal | Aceptado (retroactivo) |
| [0002](0002-postgresql-y-prisma-en-infraestructura.md) | PostgreSQL con Prisma confinado a infraestructura | Aceptado (retroactivo) |
| [0003](0003-aislamiento-por-organizacion.md) | Aislamiento de datos por organización | Aceptado (retroactivo) |
| [0004](0004-contrato-http-y-errores.md) | Contrato HTTP uniforme y errores explícitos | Aceptado (retroactivo) |
| [0005](0005-dinero-en-unidades-menores.md) | Dinero en unidades menores con moneda explícita | Aceptado (retroactivo) |
| [0006](0006-proveedores-de-ia-por-despliegue.md) | Proveedores de IA detrás de ports, elegidos por despliegue | Aceptado (retroactivo) |
| [0007](0007-almacenamiento-privado-s3.md) | Almacenamiento privado S3-compatible con assets inmutables | Aceptado (retroactivo) |
| [0008](0008-cola-de-trabajos-y-worker.md) | Cola de trabajos en PostgreSQL y worker propio; n8n opcional | Aceptado, implementado |
| [0009](0009-estrategia-de-generacion-del-flyer.md) | Estrategia de generación del flyer: IA completa con verificación o composición | Aceptado |
| [0010](0010-dividir-campaigns.md) | Dividir `campaigns` en `campaigns`, `content-generation` y `assets` | Aceptado, implementado |
| [0011](0011-cableado-nestjs-por-modulo.md) | Un módulo NestJS por módulo de negocio | Aceptado, implementado |
| [0012](0012-autenticacion-antes-de-publicar.md) | Identidad y contexto de organización antes de publicar en redes | **Propuesto** |
| [0021](0021-contrato-publicado-entre-modulos.md) | Contrato publicado y aislamiento estricto entre `content-generation` y `campaigns` | Aceptado, implementado |

## Por módulo

| ADR | Módulo | Decisión | Estado |
| --- | --- | --- | --- |
| [0013](../modulos/products/adr/0013-catalogo-unificado.md) | `products` | Catálogo unificado de productos y servicios | Aceptado (retroactivo) |
| [0014](../modulos/products/adr/0014-una-imagen-por-producto.md) | `products` | Una sola imagen por producto | Aceptado (retroactivo) |
| [0015](../modulos/templates/adr/0015-revisiones-inmutables-y-diseno-estructurado.md) | `templates` | Revisiones inmutables y diseño estructurado | Aceptado (retroactivo) |
| [0016](../modulos/campaigns/adr/0016-snapshot-inmutable-por-generacion.md) | `campaigns` | Snapshot inmutable por generación | Aceptado (retroactivo) |
| [0017](../modulos/campaigns/adr/0017-aprobacion-de-revision-exacta.md) | `campaigns` | Aprobación de una revisión exacta y concurrencia optimista | Aceptado (retroactivo) |
| [0018](../modulos/publications/adr/0018-publicacion-por-destino-con-intentos.md) | `publications` | Una publicación por destino con intentos independientes | Aceptado (retroactivo) |
| [0019](../modulos/organizations/adr/0019-perfil-de-marca-en-la-organizacion.md) | `organizations` | Perfil de marca y logo en la organización | Aceptado (retroactivo) |
| [0020](../modulos/dashboard/adr/0020-dashboard-como-modelo-de-lectura.md) | `dashboard` | Dashboard como modelo de lectura sin dominio | Aceptado (retroactivo) |
| [0022](../modulos/organizations/adr/0022-kit-de-marca.md) | `organizations` | Kit de marca: rubro, región y colores propuestos desde el logo | Aceptado, implementado |

## Plantilla

```markdown
# ADR-00NN · Título de la decisión

- **Estado:** Propuesto
- **Fecha:** AAAA-MM-DD
- **Ámbito:** módulo o "transversal"

## Contexto
Qué problema hay y qué lo hace necesario decidir ahora.

## Decisión
Qué se hará, en términos que se puedan comprobar en el código.

## Alternativas consideradas
Qué otras opciones había y por qué no se eligieron.

## Consecuencias
Qué mejora, qué cuesta y qué queda pendiente.
```

El próximo número libre es **0022**.
