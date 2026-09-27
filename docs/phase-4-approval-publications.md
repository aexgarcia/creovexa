# Fase 4 · Incremento 4: aprobación y consultas de publicaciones

Integrado mediante el PR #16. Continúa la API de campañas integrada en el PR #15. Añade aprobación de contenido y consulta paginada de publicaciones. No agrega dependencias ni migraciones.

## Contrato HTTP

| Método | Ruta                                          | Resultado                                      |
| ------ | --------------------------------------------- | ---------------------------------------------- |
| POST   | `/campaigns/:id/approve`                      | 200, campaña aprobada                          |
| GET    | `/campaigns/:id/publications?page=1&limit=20` | 200, `{ data, meta }` con destinos persistidos |

La aprobación recibe únicamente `{ "contentId": "UUID del candidato" }`. Reutiliza `ApproveCampaign`: solo acepta `PENDING_APPROVAL`, exige que el ID coincida con el candidato vigente, comprueba el vencimiento de la oferta y guarda mediante la versión leída. No crea publicaciones ni envía contenido a redes. Las cuentas de destino se resolverán con la integración de publicación; no se acepta una lista de cuentas sin validación.

Las respuestas de campañas incorporan `candidateContent` y `approvedContentId`, ambos anulables. El candidato muestra ID, revisión, headline, caption, CTA, hashtags, IDs de assets y fecha de creación; no expone snapshots internos. Permite revisar e identificar el contenido que se está aprobando. Los assets siguen siendo referencias, no URLs de imágenes renderizadas.

Una aprobación repetida devuelve 409, pues la campaña ya salió de `PENDING_APPROVAL`; no incrementa de nuevo la versión. Un candidato obsoleto devuelve `CONTENT_REVISION_MISMATCH`; un estado incompatible, `INVALID_CAMPAIGN_STATE`; un conflicto optimista, `CAMPAIGN_CONFLICT`. Las ofertas vencidas conservan 400. Las entradas mal formadas y campos adicionales se rechazan antes del caso de uso. Campañas inexistentes o ajenas devuelven 404.

Las publicaciones muestran ID, campaña, contenido aprobado, cuenta social, plataforma, estado, último intento (ID, número y fecha), ID remoto, código de fallo, fecha de publicación, versión y fechas. No se exponen credenciales ni errores crudos de proveedores. El endpoint consulta el último estado de cada destino, no el historial completo de intentos.

La lista usa los límites de paginación existentes y orden `createdAt ASC, id ASC`, consistente con el repositorio de publicaciones. Filas y total se consultan en la misma transacción `RepeatableRead`. Una campaña propia sin publicaciones devuelve una lista vacía con total cero; una campaña ajena o inexistente devuelve 404, incluso si la página solicitada está vacía.

## Arquitectura

- Se reutiliza el caso de uso de aprobación y su control de concurrencia. La capa HTTP solo valida, invoca el caso de uso y construye el DTO de respuesta.
- `ListCampaignPublications` pertenece al módulo de publicaciones y usa su contrato de repositorio. El port `PublicationCampaignLookup` consulta la existencia y pertenencia de la campaña mediante un adapter Prisma que selecciona solo el ID. Evita cargar un agregado de campañas o acoplar sus entidades al módulo de publicaciones.
- `pageByCampaign` se añade para las lecturas HTTP; `listByCampaign` se conserva para las operaciones transaccionales que necesitan todos los destinos. Paginar esas operaciones alteraría las invariantes del resumen de campaña.
- La composición reutiliza el módulo HTTP, el mapper de errores y el contexto de organización de desarrollo. No hay cambios de autenticación.

## Archivos

Creados: caso de uso, port y resultado de aplicación en `modules/publications/application/`; adapter `prisma-publication-campaign-lookup.ts`; controller y responses en `modules/publications/presentation/`; pruebas unitarias de consulta y fake de repositorio para consultas; este documento.

Modificados: requests, responses y controller de campañas; repositorio de publicaciones y su contrato; módulos de composición de publicaciones y HTTP; mapper de errores; pruebas HTTP y PostgreSQL; documentación. El PR #16 también incluyó ajustes previos de formato en `campaign.ts` y comentarios en `campaign.repository.ts`. Los cambios locales del CMS siguen separados.

## Verificación

- `pnpm test`: 351 pruebas unitarias correctas, incluidas tres nuevas del caso de uso de consulta.
- `pnpm test:e2e`: 79 pruebas HTTP correctas, incluidas ocho nuevas para aprobación, conflictos, validación, paginación y aislamiento.
- `pnpm test:integration`: 62 pruebas PostgreSQL correctas, incluidas dos nuevas para aprobación concurrente y consultas HTTP de destinos persistidos. Se aplicaron las tres migraciones en un esquema temporal, se verificó un segundo despliegue sin pendientes y el esquema se eliminó al terminar.
- `pnpm --filter @creovexa/api typecheck`, `lint` y `build`: correctos.
- Prettier sobre código/pruebas de API y documentación modificada, y `git diff --check`: correctos. No cambió la configuración de formato.

Las verificaciones corresponden a la API y documentación del incremento; los cambios locales del CMS no están incluidos en estos resultados.

## Pendientes de fase

La fase 4 sigue abierta. No se exponen todavía `/generate`, `/regenerate` ni `/publish`: requieren coordinar los casos de uso con las integraciones de generación y envío. No se incorporan endpoints que simulen el éxito de esas operaciones. La consulta actual tampoco equivale al historial completo de intentos ni a una vista previa renderizada. El siguiente paso se detalla en la [propuesta de contratos de generación y publicación](generation-publication-contracts.md), conforme a las fases 5–8.
