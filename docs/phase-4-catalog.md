# Fase 4 — Incrementos 1 y 2: API de productos y plantillas

Implementación del 21 de septiembre de 2026 en `feat/catalog-http-api`, desde `main` con el [PR #11](https://github.com/aexgarcia/creovexa/pull/11) integrado. Alcance conjunto solicitado: base HTTP, productos y plantillas. Seguimiento en la [issue #12](https://github.com/aexgarcia/creovexa/issues/12).

## Resultado

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

## Contrato HTTP

Un detalle o creación responde `{ "data": { ... } }`. Los listados devuelven `{ "data": [ ... ], "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } }`. El healthcheck conserva su contrato anterior.

`page` admite enteros decimales entre 1 y 10000; `limit`, entre 1 y 100. Los valores predeterminados son 1 y 20. Se ordena por fecha de creación descendente y luego UUID descendente para resolver empates. Una página posterior al último registro devuelve una lista vacía conservando el total. El total y los registros se consultan en la misma transacción `RepeatableRead`. Es paginación por desplazamiento: inserciones entre solicitudes pueden cambiar la posición de los elementos.

La validación rechaza campos desconocidos, importes fraccionarios o inseguros, monedas no soportadas, UUID incorrectos, arrays inválidos, valores nulos y cuerpos PATCH vacíos. En PATCH, omitir conserva el valor; `description: ""` vacía la descripción y `imageAssetIds: []` elimina las referencias. `regularPrice` se reemplaza completo, indicando importe y moneda. Nombre: hasta 200 caracteres; descripción: hasta 5000; imágenes: hasta 20 IDs únicos.

Los errores tienen `{ "error": { "code": "...", "message": "...", "details": [] }, "requestId": "..." }`; `details` solo aparece cuando hay errores de validación y contiene campos y reglas, sin los valores enviados. Los errores conocidos se traducen a 400, 404 o 409. Un error inesperado devuelve 500 con un mensaje genérico. Una API de catálogo sin contexto habilitado devuelve 503. JSON mal formado y cuerpos demasiado grandes también pasan por este formato.

Cada solicitud recibe un UUID nuevo en `X-Request-Id`. Los logs JSON registran método, patrón de ruta, estado, duración y organización resuelta; no registran bodies, query strings, cabeceras de autorización ni mensajes libres de errores internos.

## Contexto de organización durante desarrollo

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

## Arquitectura y dependencias

Los controllers validan entradas, ejecutan casos de uso y construyen respuestas HTTP explícitas. Se reutilizan `CreateProduct`, `UpdateProduct` y `CreateTemplate`; se añaden `GetProduct`, `ListProducts`, `GetTemplate` y `ListTemplates`. Las consultas retornan resultados de aplicación; los DTO de presentación no exponen entidades o modelos Prisma.

Los contratos existentes se amplían con las consultas necesarias. No se añaden servicios intermediarios, repositorios genéricos ni otra capa de consultas. El pequeño contrato de paginación se comparte porque los dos repositorios necesitan los mismos límites y estructura de resultados.

`Template.restore`, `TemplateRevision.restore` y `TemplateMapper.toDomain` validan pertenencia, identidad, contadores y fechas. Reconstruyen la revisión guardada sin generar otra identidad ni simular sucesivas ediciones. Las lecturas con la revisión usan una vista consistente de PostgreSQL. No se modifica el schema ni se requieren migraciones nuevas.

Dependencias añadidas y fijadas: `@nestjs/swagger` 12.0.1, compatible con NestJS 12; `class-validator` 0.15.1 y `class-transformer` 0.5.1 para el pipe y los DTO anidados. Se usan las integraciones mantenidas de NestJS en lugar de validadores y documentación manuales. Referencias: [validación](https://docs.nestjs.com/techniques/validation) y [OpenAPI](https://docs.nestjs.com/openapi/introduction). El tipo esperado del pipe se especifica explícitamente para que las pruebas y la compilación TypeScript validen igual. El script de telemetría opcional de `@scarf/scarf`, dependencia de Swagger UI, queda desactivado en `allowBuilds`.

## Archivos principales

Creados:

- `apps/api/src/presentation/http/`: validación, errores, contexto, logging, paginación y configuración de Swagger.
- `apps/api/src/infrastructure/catalog-http.module.ts` y `src/config/catalog-http.config.ts`.
- `apps/api/src/modules/products/presentation/` y `modules/templates/presentation/`: controllers, requests y responses.
- Casos de uso de detalle/listado en ambos módulos y `apps/api/src/domain/pagination.ts`.
- `apps/api/scripts/seed-development.mjs`.
- Pruebas de consultas, configuración, paginación y mapper; `test/catalog.e2e-spec.ts` y `test/catalog-http.integration-spec.ts`.
- Este documento.

Modificados: repositorios y fakes de productos/plantillas; reconstrucción y mapper de plantillas; composición comercial, `AppModule`, arranque y prueba de salud; scripts y dependencias; ejemplo de entorno y documentación. El ajuste local de formato de `Campaign.ts` preexistía y no pertenece a estos incrementos.

## Verificación

- Suite unitaria (`pnpm test`): 345 pruebas correctas, incluidas 19 nuevas de configuración, paginación, consultas y reconstrucción de plantillas.
- Suite HTTP (`pnpm exec vitest run --config vitest.config.e2e.ts` desde `apps/api`): 46 pruebas correctas, incluidas 45 de catálogo con casos de uso reales y fakes de repositorio, sin requerir PostgreSQL.
- `pnpm test:integration`: 57 pruebas correctas contra PostgreSQL, incluidas cinco nuevas de HTTP con persistencia real. Se aplicaron las tres migraciones existentes en un esquema temporal y se verificó un segundo despliegue sin pendientes. El esquema temporal se eliminó al terminar.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm db:validate` y `pnpm build`: correctos. `pnpm install --frozen-lockfile` también se completó correctamente con Scarf desactivado.
- El build ESM de NestJS arrancó en un puerto temporal y respondió 200 en `/health`, productos, plantillas, Swagger y OpenAPI. Se comprobaron parámetros de paginación sin duplicados y el contrato PATCH sin campos obligatorios. Las entradas inválidas devolvieron 400 y un cuerpo demasiado grande, 413 con el error uniforme.
- El seed compilado se ejecutó dos veces y conservó el mismo ID de organización. PostgreSQL local contiene esa organización de desarrollo, sin productos ni plantillas de prueba. Se configuró únicamente su ID en el `.env` ignorado de la API. No se modificó la base de n8n ni quedaron esquemas temporales.

La CI remota se ejecutará al subir el PR. Los bloqueos temporales del entorno y la colisión inicial de generación de Prisma se resolvieron antes de obtener estos resultados.

## Siguiente paso

Revisar los incrementos 1 y 2 mediante PR. Después implementar el incremento 3: creación, consulta y listado HTTP de campañas. La fase 4 continúa en curso; generación y envíos dependen de las integraciones previstas en fases posteriores.
