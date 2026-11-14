# Evaluación de arquitectura · noviembre 2026

Fecha: 14 de noviembre de 2026. Alcance: código de `apps/api` tal como estaba en el árbol de trabajo (rama `feat/gemini-copy-provider`, con la fase 6 sin commitear), el esquema Prisma y la estructura de `apps/web`.

Método: lectura del código y medición de tamaños e imports. **No se ejecutaron los tests ni la aplicación.**

## Conclusión

La base es buena y no requiere rehacerse. Las capas están bien separadas y el modelo de datos ya soporta varias organizaciones. Los problemas son de organización del código y de ejecución (trabajo lento dentro del request), y conviene corregirlos antes de las fases 7 a 10.

## Fortalezas

| Aspecto | Evidencia |
| --- | --- |
| Capas limpias | Ningún archivo de `domain` o `application` importa `@nestjs`, `PrismaService` ni el cliente generado |
| Aislamiento por organización | Todas las tablas llevan `organization_id` con claves foráneas compuestas |
| Límites entre módulos | En código de producción solo hay 4 imports entre módulos, todos hacia `application/ports` o errores |
| Generación robusta | Snapshot inmutable, reserva con vencimiento, versión optimista, storage idempotente |
| Pruebas | 41 archivos `*.spec.ts` más suites de integración, storage, render y e2e |
| Configuración | Variables validadas al arrancar, separadas por dominio en `src/config` |

## Hallazgos

### H1 · `campaigns` concentra demasiado (alto) · resuelto el 2026-11-14

4,760 de las ~8,400 líneas de los módulos (sin specs). Contiene ciclo de vida de campaña, política y generación de copy, generación de imagen, composición HTML, renderer Playwright, storage MinIO y lectura de assets. Decisión: [ADR-0010](../adr/0010-dividir-campaigns.md).

### H2 · Storage triplicado (medio) · adapter unificado el 2026-11-14

Tres adapters S3 independientes: `minio-storage-provider.ts` (campañas), `minio-product-images.ts` y `minio-organization-logos.ts`, con tres tablas de assets. Se unifica en el módulo `assets` de [ADR-0010](../adr/0010-dividir-campaigns.md).

### H3 · Cableado NestJS fuera de los módulos (medio) · resuelto el 2026-11-14

Todos los módulos NestJS están en `src/infrastructure/*.module.ts`. `CatalogHttpModule` registra los controllers de los seis módulos y los repositorios se crean con `new` dentro de cada factory, repetidos entre módulos. Decisión: [ADR-0011](../adr/0011-cableado-nestjs-por-modulo.md).

### H4 · Generación síncrona dentro del request (alto)

`POST /campaigns/:id/copy` y `POST /campaigns/:id/image` esperan a la IA (y a Chromium) antes de responder; la reserva de imagen dura hasta 5 minutos. Un corte de conexión o un reinicio deja el trabajo a medias y el CMS no ve progreso. Decisión: [ADR-0008](../adr/0008-cola-de-trabajos-y-worker.md).

### H5 · Sin autenticación ni usuarios (alto antes de producción)

`DevelopmentOrganizationGuard` asigna a todo request la organización de `DEV_ORGANIZATION_ID`. No existen usuarios, sesiones ni roles, y el plan los deja para la fase 9, después de publicar en redes. Propuesta: [ADR-0012](../adr/0012-autenticacion-antes-de-publicar.md).

### H6 · Estrategia de imagen sin definir (alto, decisión de producto)

El flujo actual genera una imagen base con IA y compone encima texto, precios y logo con Playwright. El objetivo deseado es que la IA genere el flyer completo. Propuesta: [ADR-0009](../adr/0009-estrategia-de-generacion-del-flyer.md).

### H7 · Valores regionales fijos en el flyer (bajo)

`campaign-flyer-html.ts` fija `es-PE`, `America/Lima` y textos en español; el caso de uso solo acepta 1080×1080. Aceptable hoy; debe salir de la organización o de la plantilla antes de atender clientes de otra región o de agregar formatos verticales.

### H8 · Relación `campaigns` ↔ `publications` (bajo)

No hay ciclo de imports en producción: `publications` usa un error de `campaigns` y un port de consulta. Pero el estado de publicación vive en dos lugares: `Campaign.publicationProgress` (resumen) y `Publication` (detalle). Es una decisión válida ([ADR-0018](../modulos/publications/adr/0018-publicacion-por-destino-con-intentos.md)); hay que mantener a `publications` como dueño del detalle y a `campaigns` como consumidor del resumen.

> Corrección: en la conversación inicial se describió esto como una dependencia circular a nivel de dominio. Al revisar los imports, el único cruce desde `campaigns` hacia `publications` está en archivos de prueba.

### H9 · Higiene del repositorio (bajo)

- La fase 6 estaba sin commitear sobre una rama cuyo nombre corresponde al copy de fase 5. Resuelto el 2026-11-14: rama `feat/campaign-image-generation`.
- `automation/n8n` solo contiene un README y Docker Compose levanta un servicio `n8n` que ya no es parte del plan.
- `IMAGE_PROVIDER` y `COPY_PROVIDER` conviven con adapters de dos proveedores; correcto, pero el `.env.example` debe indicar cuáles son obligatorios.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La IA escribe mal un precio o una fecha en el flyer | Verificación automática + aprobación humana ([ADR-0009](../adr/0009-estrategia-de-generacion-del-flyer.md)) |
| Costo de IA sin control por organización | Registrar cada generación (ya existe `CampaignGeneration`) y agregar un límite por organización cuando haya más de un cliente |
| Objetos huérfanos en storage | Limpieza periódica en el worker que compare contra las tablas de assets |
| Chromium en un VPS pequeño | Evitarlo en el camino principal si la IA completa pasa la prueba de calidad |
| Refactor grande con un solo desarrollador | Hacerlo por pasos pequeños, con la suite de tests como red (ver [hoja de ruta](../fases/estado.md)) |

## Qué no hacer todavía

- Microservicios, event bus o CQRS completo: el volumen no lo justifica.
- Kubernetes: un VPS con Docker Compose alcanza.
- Proveedor de IA configurable por organización: se decidió por despliegue ([ADR-0006](../adr/0006-proveedores-de-ia-por-despliegue.md)).
- Galerías de imágenes, campañas con varios productos o facturación.
