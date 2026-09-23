# Fase 4 · Incremento 3: API de campañas

Este incremento añade creación, listado y detalle de campañas. Continúa la base HTTP de productos y plantillas integrada en el PR #13. No agrega dependencias ni migraciones.

## Contrato

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

## Decisiones

- Se reutiliza `CreateCampaign`, que ya valida referencias y reglas de negocio. `GetCampaign` reutiliza `loadCampaign`; `ListCampaigns` transforma entidades en resultados de aplicación. No se introducen servicios que solo deleguen.
- Se amplía el contrato de repositorio con `list`. Prisma lee filas, relaciones y total en una transacción `RepeatableRead`, como en el catálogo, evitando respuestas compuestas de distintos momentos. La reconstrucción existente permite consultar campañas en cualquier estado sin ejecutar transiciones ni escribir historial.
- El controller transforma fechas validadas a `Date` y construye una respuesta HTTP explícita. El dominio conserva las reglas de oferta; duplicarlas en el controller provocaría divergencias.
- Se amplía la composición HTTP existente con `CampaignPersistenceModule` y el controller. Las mismas validaciones, logging, errores y organización de desarrollo se aplican a campañas. No se crea una segunda base HTTP ni se duplica el guard.
- Recursos ausentes o ajenos devuelven 404 (`CAMPAIGN_NOT_FOUND` o `CAMPAIGN_RESOURCE_NOT_FOUND`); las reglas de entrada y ofertas inválidas, 400. Los errores inesperados conservan la respuesta genérica sin datos internos.

## Archivos

Creados: casos de uso `get-campaign.ts`, `list-campaigns.ts`, sus pruebas `read-campaigns.spec.ts`, DTO y controller en `modules/campaigns/presentation/`, pruebas `test/campaigns.e2e-spec.ts` y este documento.

Modificados: contrato y repositorio Prisma de campañas, módulos de composición de persistencia y HTTP, mapper de errores HTTP, fake de campañas, pruebas PostgreSQL de catálogo y documentación. Los cambios previos del frontend y de formato de `campaign.ts` quedan fuera del incremento.

## Verificación

- `pnpm test`: 348 pruebas unitarias correctas, incluidas tres nuevas de consultas de campañas.
- `pnpm test:e2e`: 71 pruebas HTTP correctas, incluidas 25 nuevas para creación, lectura, paginación, aislamiento, validación de ofertas y contrato OpenAPI.
- `pnpm --filter @creovexa/api typecheck`, `lint` y `build`: correctos. `pnpm db:validate`: correcto.
- Prettier sobre código y pruebas de la API y documentación modificada: correcto. `git diff --check`: correcto. No se modificó la configuración de formato.
- `pnpm test:integration`: 60 pruebas correctas, incluidas tres nuevas para persistencia de borradores, paginación por organización y rechazo de referencias/ofertas inválidas. Se aplicaron las tres migraciones existentes en un esquema temporal, se comprobó un segundo despliegue sin pendientes y el esquema se eliminó al finalizar. El bloqueo previo de Docker quedó resuelto.

Las verificaciones se limitaron a la API y a la documentación de este incremento. Los cambios locales del CMS no se incluyen en sus resultados.

## Alcance pendiente

Este incremento se integró mediante el PR #15. El incremento siguiente incorpora [aprobación y consulta de publicaciones](phase-4-approval-publications.md), con sus contratos y verificaciones documentados por separado.

La organización fija de desarrollo sigue sin representar autenticación. La generación real, edición, aprobación, regeneración, publicación y vista previa no forman parte de este incremento. El siguiente incremento aborda aprobación y consultas de publicaciones, coordinando generación y envíos con las integraciones de fases posteriores.
