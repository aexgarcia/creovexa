# Fase 4 · API HTTP

> Historial consolidado de los documentos originales `docs/phase-*.md`. Registra lo que se decidió y verificó en su momento; el estado vigente está en [estado de fases](../fases/estado.md) y en los [contratos de módulo](../modulos/).

## Fase 4 — Incrementos 1 y 2: API de productos y plantillas

Implementación del 21 de septiembre de 2026 en `feat/catalog-http-api`, desde `main` con el [PR #11](https://github.com/aexgarcia/creovexa/pull/11) integrado. Alcance conjunto solicitado: base HTTP, productos y plantillas. Seguimiento en la [issue #12](https://github.com/aexgarcia/creovexa/issues/12).

### Resultado

| Método | Ruta             | Resultado                                                  |
| ------ | ---------------- | ---------------------------------------------------------- |
| POST   | `/products`      | Crea un producto o servicio, 201.                          |
| GET    | `/products`      | Lista el catálogo paginado, 200.                           |
| GET    | `/products/:id`  | Consulta un producto, 200 o 404.                           |
| PATCH  | `/products/:id`  | Edita datos comerciales conservando identidad y tipo, 200. |
| POST   | `/templates`     | Crea una plantilla con revisión inicial, 201.              |
| GET    | `/templates`     | Lista plantillas paginadas con su revisión vigente, 200.   |
| GET    | `/templates/:id` | Consulta una plantilla y su revisión vigente, 200 o 404.   |

Las plantillas conservan el formato inicial 1080 × 1080 definido por el dominio. No hay edición de plantillas, renderer ni endpoints de campañas/publicaciones en estos incrementos.

### Contrato HTTP

Un detalle o creación responde `{ "data": { ... } }`. Los listados devuelven `{ "data": [ ... ], "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } }`. El healthcheck conserva su contrato anterior.

`page` admite enteros decimales entre 1 y 10000; `limit`, entre 1 y 100. Los valores predeterminados son 1 y 20. Se ordena por fecha de creación descendente y luego UUID descendente para resolver empates. Una página posterior al último registro devuelve una lista vacía conservando el total. El total y los registros se consultan en la misma transacción `RepeatableRead`. Es paginación por desplazamiento: inserciones entre solicitudes pueden cambiar la posición de los elementos.

La validación rechaza campos desconocidos, importes fraccionarios o inseguros, monedas no soportadas, UUID incorrectos, arrays inválidos, valores nulos y cuerpos PATCH vacíos. En PATCH, omitir conserva el valor; `description: ""` vacía la descripción y `imageAssetIds: []` elimina las referencias. `regularPrice` se reemplaza completo, indicando importe y moneda. Nombre: hasta 200 caracteres; descripción: hasta 5000; imágenes: hasta 20 IDs únicos.

Los errores tienen `{ "error": { "code": "...", "message": "...", "details": [] }, "requestId": "..." }`; `details` solo aparece cuando hay errores de validación y contiene campos y reglas, sin los valores enviados. Los errores conocidos se traducen a 400, 404 o 409. Un error inesperado devuelve 500 con un mensaje genérico. Una API de catálogo sin contexto habilitado devuelve 503. JSON mal formado y cuerpos demasiado grandes también pasan por este formato.

Cada solicitud recibe un UUID nuevo en `X-Request-Id`. Los logs JSON registran método, patrón de ruta, estado, duración y organización resuelta; no registran bodies, query strings, cabeceras de autorización ni mensajes libres de errores internos.

### Contexto de organización durante desarrollo

Las entidades y repositorios ya exigen organización, pero autenticación y membresías corresponden a la fase 9. Aceptar un ID enviado libremente por el cliente permitiría cambiar de organización sin comprobar pertenencia. Se usa temporalmente `DEV_ORGANIZATION_ID` del servidor y un guard de presentación. El cliente no puede sustituirlo mediante cuerpo, query o cabecera.

Sin esa variable, el catálogo responde 503 y `/health` sigue disponible. Solo se permite configurarla con `NODE_ENV` ausente, `development` o `test`; se rechaza al arrancar en producción u otros entornos. Esto es un modo local, no autenticación. En la fase 9, el guard se reemplazará por identidad y membresía verificadas, conservando los casos de uso y las consultas por organización.

`pnpm db:seed:dev` compila la API, crea una organización local si hace falta y guarda su ID en el `.env` ignorado de la API. Si ya existe, conserva su perfil. No crea catálogo de ejemplo ni borra datos. Resuelve la preparación local sin introducir endpoints de administración antes de definir permisos.

```sh
pnpm setup:env
pnpm infra:up
pnpm db:migrate
pnpm db:seed:dev
pnpm dev:api
```

Abre <http://localhost:3001/docs> para probar los endpoints. El contrato JSON está en <http://localhost:3001/openapi.json>. Tras cambiar `DEV_ORGANIZATION_ID`, reinicia la API.

Ejemplo de cuerpo para `POST /products`:

```json
{
  "kind": "PRODUCT",
  "name": "Café",
  "regularPrice": { "amountMinor": 1990, "currency": "PEN" }
}
```

Ejemplo de cuerpo para `POST /templates`:

```json
{
  "name": "Promoción cuadrada",
  "dimensions": { "width": 1080, "height": 1080 }
}
```

### Arquitectura y dependencias

Los controllers validan entradas, ejecutan casos de uso y construyen respuestas HTTP explícitas. Se reutilizan `CreateProduct`, `UpdateProduct` y `CreateTemplate`; se añaden `GetProduct`, `ListProducts`, `GetTemplate` y `ListTemplates`. Las consultas retornan resultados de aplicación; los DTO de presentación no exponen entidades o modelos Prisma.

Los contratos existentes se amplían con las consultas necesarias. No se añaden servicios intermediarios, repositorios genéricos ni otra capa de consultas. El pequeño contrato de paginación se comparte porque los dos repositorios necesitan los mismos límites y estructura de resultados.

`Template.restore`, `TemplateRevision.restore` y `TemplateMapper.toDomain` validan pertenencia, identidad, contadores y fechas. Reconstruyen la revisión guardada sin generar otra identidad ni simular sucesivas ediciones. Las lecturas con la revisión usan una vista consistente de PostgreSQL. No se modifica el schema ni se requieren migraciones nuevas.

Dependencias añadidas y fijadas: `@nestjs/swagger` 12.0.1, compatible con NestJS 12; `class-validator` 0.15.1 y `class-transformer` 0.5.1 para el pipe y los DTO anidados. Se usan las integraciones mantenidas de NestJS en lugar de validadores y documentación manuales. Referencias: [validación](https://docs.nestjs.com/techniques/validation) y [OpenAPI](https://docs.nestjs.com/openapi/introduction). El tipo esperado del pipe se especifica explícitamente para que las pruebas y la compilación TypeScript validen igual. El script de telemetría opcional de `@scarf/scarf`, dependencia de Swagger UI, queda desactivado en `allowBuilds`.

### Archivos principales

Creados:

- `apps/api/src/presentation/http/`: validación, errores, contexto, logging, paginación y configuración de Swagger.
- `apps/api/src/infrastructure/catalog-http.module.ts` y `src/config/catalog-http.config.ts`.
- `apps/api/src/modules/products/presentation/` y `modules/templates/presentation/`: controllers, requests y responses.
- Casos de uso de detalle/listado en ambos módulos y `apps/api/src/domain/pagination.ts`.
- `apps/api/scripts/seed-development.mjs`.
- Pruebas de consultas, configuración, paginación y mapper; `test/catalog.e2e-spec.ts` y `test/catalog-http.integration-spec.ts`.
- Este documento.

Modificados: repositorios y fakes de productos/plantillas; reconstrucción y mapper de plantillas; composición comercial, `AppModule`, arranque y prueba de salud; scripts y dependencias; ejemplo de entorno y documentación. El ajuste local de formato de `Campaign.ts` preexistía y no pertenece a estos incrementos.

### Verificación

- Suite unitaria (`pnpm test`): 345 pruebas correctas, incluidas 19 nuevas de configuración, paginación, consultas y reconstrucción de plantillas.
- Suite HTTP (`pnpm exec vitest run --config vitest.config.e2e.ts` desde `apps/api`): 46 pruebas correctas, incluidas 45 de catálogo con casos de uso reales y fakes de repositorio, sin requerir PostgreSQL.
- `pnpm test:integration`: 57 pruebas correctas contra PostgreSQL, incluidas cinco nuevas de HTTP con persistencia real. Se aplicaron las tres migraciones existentes en un esquema temporal y se verificó un segundo despliegue sin pendientes. El esquema temporal se eliminó al terminar.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm db:validate` y `pnpm build`: correctos. `pnpm install --frozen-lockfile` también se completó correctamente con Scarf desactivado.
- El build ESM de NestJS arrancó en un puerto temporal y respondió 200 en `/health`, productos, plantillas, Swagger y OpenAPI. Se comprobaron parámetros de paginación sin duplicados y el contrato PATCH sin campos obligatorios. Las entradas inválidas devolvieron 400 y un cuerpo demasiado grande, 413 con el error uniforme.
- El seed compilado se ejecutó dos veces y conservó el mismo ID de organización. PostgreSQL local contiene esa organización de desarrollo, sin productos ni plantillas de prueba. Se configuró únicamente su ID en el `.env` ignorado de la API. No se modificó la base de n8n ni quedaron esquemas temporales.

La CI remota se ejecutará al subir el PR. Los bloqueos temporales del entorno y la colisión inicial de generación de Prisma se resolvieron antes de obtener estos resultados.

### Siguiente paso

Los incrementos 1 y 2 se integraron mediante el PR #13. El incremento 3 añade [creación, consulta y listado HTTP de campañas](fase-4.md), con el estado de sus verificaciones en ese documento. La fase 4 continúa en curso; generación y envíos dependen de las integraciones previstas en fases posteriores.

## Fase 4 · Incremento 3: API de campañas

Este incremento añade creación, listado y detalle de campañas. Continúa la base HTTP de productos y plantillas integrada en el PR #13. No agrega dependencias ni migraciones.

### Contrato

| Método | Ruta                         | Resultado                                         |
| ------ | ---------------------------- | ------------------------------------------------- |
| POST   | `/campaigns`                 | 201, campaña en `DRAFT` con versión 0             |
| GET    | `/campaigns?page=1&limit=20` | 200, página de campañas de la organización        |
| GET    | `/campaigns/:id`             | 200, campaña; 404 si no existe en la organización |

La creación recibe `productId`, `templateId`, `templateRevisionId`, `title`, `cta`, `instructions` opcional y `promotion` opcional. La revisión debe pertenecer a la plantilla y todos los recursos deben pertenecer a la organización configurada en el servidor. No se acepta un estado o una organización enviados por el cliente.

`title` y `cta` admiten hasta 200 caracteres; `instructions`, hasta 5000. Los campos opcionales se omiten cuando no se utilizan; `null` no sustituye la omisión. Una promoción requiere `amountMinor` entero seguro no negativo y `currency`, con precio menor al habitual y la misma moneda. `startsAt` y `endsAt`, si se indican, son fechas ISO 8601 completas con segundos y zona horaria (`Z` u offset), con hasta tres decimales. El dominio valida el orden del período y el vencimiento. Las fechas de respuesta se normalizan a UTC.

Ejemplo de cuerpo, sustituyendo los UUID por los obtenidos en productos y plantillas:

```json
{
  "productId": "00000000-0000-4000-8000-000000000003",
  "templateId": "00000000-0000-4000-8000-000000000004",
  "templateRevisionId": "00000000-0000-4000-8000-000000000005",
  "title": "Oferta de temporada",
  "cta": "Comprar ahora",
  "instructions": "Destacar el precio de la oferta",
  "promotion": { "amountMinor": 1500, "currency": "PEN" }
}
```

Las respuestas usan `{ data }` y `{ data, meta }`. Presentan IDs, título, instrucciones, CTA, promoción, estado, versión y fechas. No exponen el modelo Prisma ni el estado interno de generación. La vista previa de contenido y las publicaciones se añadirán con sus contratos en el siguiente incremento.

La paginación mantiene los límites existentes (página 1–10000, tamaño 1–100), orden `createdAt DESC, id DESC` y total de la organización incluso en páginas vacías. No incluye filtros adicionales. Swagger documenta los tres endpoints en `/docs` y `/openapi.json`.

### Decisiones

- Se reutiliza `CreateCampaign`, que ya valida referencias y reglas de negocio. `GetCampaign` reutiliza `loadCampaign`; `ListCampaigns` transforma entidades en resultados de aplicación. No se introducen servicios que solo deleguen.
- Se amplía el contrato de repositorio con `list`. Prisma lee filas, relaciones y total en una transacción `RepeatableRead`, como en el catálogo, evitando respuestas compuestas de distintos momentos. La reconstrucción existente permite consultar campañas en cualquier estado sin ejecutar transiciones ni escribir historial.
- El controller transforma fechas validadas a `Date` y construye una respuesta HTTP explícita. El dominio conserva las reglas de oferta; duplicarlas en el controller provocaría divergencias.
- Se amplía la composición HTTP existente con `CampaignPersistenceModule` y el controller. Las mismas validaciones, logging, errores y organización de desarrollo se aplican a campañas. No se crea una segunda base HTTP ni se duplica el guard.
- Recursos ausentes o ajenos devuelven 404 (`CAMPAIGN_NOT_FOUND` o `CAMPAIGN_RESOURCE_NOT_FOUND`); las reglas de entrada y ofertas inválidas, 400. Los errores inesperados conservan la respuesta genérica sin datos internos.

### Archivos

Creados: casos de uso `get-campaign.ts`, `list-campaigns.ts`, sus pruebas `read-campaigns.spec.ts`, DTO y controller en `modules/campaigns/presentation/`, pruebas `test/campaigns.e2e-spec.ts` y este documento.

Modificados: contrato y repositorio Prisma de campañas, módulos de composición de persistencia y HTTP, mapper de errores HTTP, fake de campañas, pruebas PostgreSQL de catálogo y documentación. Los cambios previos del frontend y de formato de `campaign.ts` quedan fuera del incremento.

### Verificación

- `pnpm test`: 348 pruebas unitarias correctas, incluidas tres nuevas de consultas de campañas.
- `pnpm test:e2e`: 71 pruebas HTTP correctas, incluidas 25 nuevas para creación, lectura, paginación, aislamiento, validación de ofertas y contrato OpenAPI.
- `pnpm --filter @creovexa/api typecheck`, `lint` y `build`: correctos. `pnpm db:validate`: correcto.
- Prettier sobre código y pruebas de la API y documentación modificada: correcto. `git diff --check`: correcto. No se modificó la configuración de formato.
- `pnpm test:integration`: 60 pruebas correctas, incluidas tres nuevas para persistencia de borradores, paginación por organización y rechazo de referencias/ofertas inválidas. Se aplicaron las tres migraciones existentes en un esquema temporal, se comprobó un segundo despliegue sin pendientes y el esquema se eliminó al finalizar. El bloqueo previo de Docker quedó resuelto.

Las verificaciones se limitaron a la API y a la documentación de este incremento. Los cambios locales del CMS no se incluyen en sus resultados.

### Alcance pendiente

Este incremento se integró mediante el PR #15. El incremento siguiente incorpora [aprobación y consulta de publicaciones](fase-4.md), con sus contratos y verificaciones documentados por separado.

La organización fija de desarrollo sigue sin representar autenticación. La generación real, edición, aprobación, regeneración, publicación y vista previa no forman parte de este incremento. El siguiente incremento aborda aprobación y consultas de publicaciones, coordinando generación y envíos con las integraciones de fases posteriores.

## Fase 4 · Incremento 4: aprobación y consultas de publicaciones

Integrado mediante el PR #16. Continúa la API de campañas integrada en el PR #15. Añade aprobación de contenido y consulta paginada de publicaciones. No agrega dependencias ni migraciones.

### Contrato HTTP

| Método | Ruta                                          | Resultado                                      |
| ------ | --------------------------------------------- | ---------------------------------------------- |
| POST   | `/campaigns/:id/approve`                      | 200, campaña aprobada                          |
| GET    | `/campaigns/:id/publications?page=1&limit=20` | 200, `{ data, meta }` con destinos persistidos |

La aprobación recibe únicamente `{ "contentId": "UUID del candidato" }`. Reutiliza `ApproveCampaign`: solo acepta `PENDING_APPROVAL`, exige que el ID coincida con el candidato vigente, comprueba el vencimiento de la oferta y guarda mediante la versión leída. No crea publicaciones ni envía contenido a redes. Las cuentas de destino se resolverán con la integración de publicación; no se acepta una lista de cuentas sin validación.

Las respuestas de campañas incorporan `candidateContent` y `approvedContentId`, ambos anulables. El candidato muestra ID, revisión, headline, caption, CTA, hashtags, IDs de assets y fecha de creación; no expone snapshots internos. Permite revisar e identificar el contenido que se está aprobando. Los assets siguen siendo referencias, no URLs de imágenes renderizadas.

Una aprobación repetida devuelve 409, pues la campaña ya salió de `PENDING_APPROVAL`; no incrementa de nuevo la versión. Un candidato obsoleto devuelve `CONTENT_REVISION_MISMATCH`; un estado incompatible, `INVALID_CAMPAIGN_STATE`; un conflicto optimista, `CAMPAIGN_CONFLICT`. Las ofertas vencidas conservan 400. Las entradas mal formadas y campos adicionales se rechazan antes del caso de uso. Campañas inexistentes o ajenas devuelven 404.

Las publicaciones muestran ID, campaña, contenido aprobado, cuenta social, plataforma, estado, último intento (ID, número y fecha), ID remoto, código de fallo, fecha de publicación, versión y fechas. No se exponen credenciales ni errores crudos de proveedores. El endpoint consulta el último estado de cada destino, no el historial completo de intentos.

La lista usa los límites de paginación existentes y orden `createdAt ASC, id ASC`, consistente con el repositorio de publicaciones. Filas y total se consultan en la misma transacción `RepeatableRead`. Una campaña propia sin publicaciones devuelve una lista vacía con total cero; una campaña ajena o inexistente devuelve 404, incluso si la página solicitada está vacía.

### Arquitectura

- Se reutiliza el caso de uso de aprobación y su control de concurrencia. La capa HTTP solo valida, invoca el caso de uso y construye el DTO de respuesta.
- `ListCampaignPublications` pertenece al módulo de publicaciones y usa su contrato de repositorio. El port `PublicationCampaignLookup` consulta la existencia y pertenencia de la campaña mediante un adapter Prisma que selecciona solo el ID. Evita cargar un agregado de campañas o acoplar sus entidades al módulo de publicaciones.
- `pageByCampaign` se añade para las lecturas HTTP; `listByCampaign` se conserva para las operaciones transaccionales que necesitan todos los destinos. Paginar esas operaciones alteraría las invariantes del resumen de campaña.
- La composición reutiliza el módulo HTTP, el mapper de errores y el contexto de organización de desarrollo. No hay cambios de autenticación.

### Archivos

Creados: caso de uso, port y resultado de aplicación en `modules/publications/application/`; adapter `prisma-publication-campaign-lookup.ts`; controller y responses en `modules/publications/presentation/`; pruebas unitarias de consulta y fake de repositorio para consultas; este documento.

Modificados: requests, responses y controller de campañas; repositorio de publicaciones y su contrato; módulos de composición de publicaciones y HTTP; mapper de errores; pruebas HTTP y PostgreSQL; documentación. El PR #16 también incluyó ajustes previos de formato en `campaign.ts` y comentarios en `campaign.repository.ts`. Los cambios locales del CMS siguen separados.

### Verificación

- `pnpm test`: 351 pruebas unitarias correctas, incluidas tres nuevas del caso de uso de consulta.
- `pnpm test:e2e`: 79 pruebas HTTP correctas, incluidas ocho nuevas para aprobación, conflictos, validación, paginación y aislamiento.
- `pnpm test:integration`: 62 pruebas PostgreSQL correctas, incluidas dos nuevas para aprobación concurrente y consultas HTTP de destinos persistidos. Se aplicaron las tres migraciones en un esquema temporal, se verificó un segundo despliegue sin pendientes y el esquema se eliminó al terminar.
- `pnpm --filter @creovexa/api typecheck`, `lint` y `build`: correctos.
- Prettier sobre código/pruebas de API y documentación modificada, y `git diff --check`: correctos. No cambió la configuración de formato.

Las verificaciones corresponden a la API y documentación del incremento; los cambios locales del CMS no están incluidos en estos resultados.

### Pendientes de fase

La fase 4 sigue abierta. No se exponen todavía `/generate`, `/regenerate` ni `/publish`: requieren coordinar los casos de uso con las integraciones de generación y envío. No se incorporan endpoints que simulen el éxito de esas operaciones. La consulta actual tampoco equivale al historial completo de intentos ni a una vista previa renderizada. El siguiente paso se detalla en la [propuesta de contratos de generación y publicación](propuesta-generacion-publicacion.md), conforme a las fases 5–8.
