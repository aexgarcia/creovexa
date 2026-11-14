# Fase 4.5 · CMS

> Historial consolidado de los documentos originales `docs/phase-*.md`. Registra lo que se decidió y verificó en su momento; el estado vigente está en [estado de fases](../fases/estado.md) y en los [contratos de módulo](../modulos/).

## Fase 4.5 · CMS conectado a la API

Estado: incremento de productos, plantillas, campañas y consulta de publicaciones. La fase 4.5 continúa; no incorpora las integraciones de generación o envío de fases posteriores.

### Pantallas

| Área             | Comportamiento                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Productos        | Listado paginado, creación, consulta y edición persistidos                                                   |
| Plantillas       | Creación 1080 × 1080, edición de nombre con revisión nueva y vista del formato                               |
| Campañas         | Creación con revisión fija de plantilla, listado, detalle del contenido candidato y aprobación por contentId |
| Publicaciones    | Listado global y por campaña, estados/errores e historial paginado de intentos                               |
| Dashboard        | Totales reales, estados por plataforma y campañas recientes                                                  |
| Cuentas sociales | Disponibilidad explícita; conexión real pendiente de fase 8                                                  |
| Configuración    | Perfil de empresa persistido: nombre, descripción y tono de marca                                            |
| Login            | Pantalla informativa; autenticación pendiente                                                                |

### Implementación y decisiones

- Se incorpora el frontend existente con App Router en `apps/web/src/app`, navegación responsive, proveedores de tema y TanStack Query, componentes shadcn y organización por feature.
- `lib/api-client.ts` centraliza fetch, timeout de 15 segundos, cancelación y errores seguros con status/requestId. Las pantallas conectadas no sustituyen fallos de API por mocks.
- Productos usa los contratos HTTP, moneda y unidades menores enteras. La conversión decimal admite punto o coma sin perder centavos. PATCH conserva tipo y referencias de imágenes al omitir campos no editables.
- Plantillas solo persiste nombre y dimensiones admitidos por el backend. Las tarjetas muestran revisión y dimensiones, sin una imagen de ejemplo que parezca persistida. Se conserva el diseñador visual para su integración futura.
- Campañas fija el ID de revisión seleccionado. La promoción opcional debe ser inferior al precio regular y usar su moneda; las fechas locales se convierten a ISO con zona horaria. El backend mantiene la validación definitiva.
- La aprobación envía el identificador del contenido revisado y no se reintenta automáticamente. Un conflicto mantiene el detalle y permite actualizarlo. Los assets se muestran por referencia; su previsualización requiere almacenamiento.
- Publicaciones consulta `GET /campaigns/:id/publications`. No inventa fechas para destinos sin publicar ni presenta el último intento como un historial completo.
- Edición de campañas, generación, regeneración y envío a redes no están disponibles en las rutas conectadas. No se añadieron endpoints ni migraciones.
- Los modelos, hooks y servicios anteriores de demostración se conservan temporalmente para no descartar el trabajo visual. Campañas reales usa `campaign-api.service.ts` y claves `stored-campaigns`, separadas de los modelos simulados.
- Las dependencias del frontend existente cubren formularios (React Hook Form/Zod), caché (TanStack Query), componentes (Base UI/shadcn), iconos, notificaciones y temas. Este incremento no añade un framework de pruebas: usa el runner de Node.
- Se corrigieron los dos errores de ESLint: la selección del diálogo se deriva sin un efecto que actualice estado y la colección de cuentas usa const. Se aplicó la configuración existente de Prettier al frontend; no se modificaron sus reglas.

### Archivos principales

- Creados: árbol `apps/web/src`, componentes y pantallas del CMS, cliente HTTP, servicios/tipos/hooks de integración, `apps/web/test/*.test.mjs`, configuración shadcn y esta guía.
- Modificados: package.json raíz/web para incluir las pruebas del CMS, tsconfig para el alias a src y lockfile de las dependencias del frontend.
- Las rutas iniciales de `apps/web/app` se trasladan a `apps/web/src/app`.
- `fases5-10.md` contiene un cambio local del usuario y queda fuera del PR.
- El PR de CMS se basa en main y no incluye el PR #17 de documentación.

### Uso local

1. Iniciar PostgreSQL con la configuración de desarrollo y preparar migraciones/organización según README.
2. Configurar `NEXT_PUBLIC_API_URL=http://localhost:3001` para el frontend. Es una URL pública incorporada al build; no debe contener secretos.
3. Ejecutar `pnpm dev:api` y `pnpm dev:web`. El origen del navegador debe coincidir con CORS.
4. Crear y editar un producto; crear una plantilla; crear una campaña seleccionando ambos; recargar para comprobar persistencia.
5. Para revisar aprobación se necesita una campaña con contenido candidato: el CMS todavía no genera contenido.
6. Una API detenida debe mostrar error; no debe recuperar registros simulados.

### Verificación y límites

Las pruebas web cubren conversión exacta de importes, errores HTTP/red y cancelación, contratos de plantillas, revisión fija de campaña, promociones/fechas, aprobación con conflicto y publicaciones independientes. Se ejecutan con `pnpm --filter @creovexa/web test` y forman parte de `pnpm test`.

Las comprobaciones finales del PR se registran al cerrar el incremento. La validación manual completa en navegador sigue pendiente. Autenticación, almacenamiento, métricas reales, conexiones sociales y generación/publicación siguen fuera del alcance de este PR.

#### Cierre del PR · 27 de septiembre de 2026

- Correctos: pnpm format:check, pnpm db:validate, pnpm lint, pnpm typecheck, pnpm test, pnpm test:e2e, pnpm test:integration y pnpm build.
- Resultados: 351 pruebas unitarias de API, 15 del CMS, 79 HTTP y 62 de integración PostgreSQL.
- ESLint conserva cinco advertencias en componentes existentes (React Hook Form y etiquetas img), sin errores.
- PostgreSQL, MinIO y n8n estaban activos. Integración ejecutó las migraciones dos veces en un esquema temporal aislado y lo eliminó al terminar.
- Sigue pendiente la comprobación manual completa en navegador; no se presenta como realizada.

Configuración persistida: ver [el incremento de organización](fase-4.5.md).

Estado actualizado del cierre local y dependencias: [phase-4.5-completion.md](fase-4.5.md). No abrir nuevos PR hasta completar la fase, según instrucción del usuario.

## Fase 4.5 · Configuración de empresa persistida

Incremento en `feat/organization-settings-api`, basado en main tras integrar los PR #17 y #18.

### Contrato

- `GET /organization`: devuelve `{ data: { id, name, description, brandTone, logoAssetId, createdAt, updatedAt } }`.
- `PATCH /organization`: acepta name (hasta 200 caracteres), description (hasta 5000) y brandTone (hasta 200 o null). Los campos omitidos se conservan; nombre vacío, cuerpo vacío y campos desconocidos se rechazan.
- La organización procede de DevelopmentOrganizationGuard, igual que el catálogo existente; el cliente no envía un ID de organización. No sustituye la autenticación pendiente ni habilita acceso multiusuario en producción.
- Nombre y descripción no admiten null. brandTone null o vacío limpia el tono. logoAssetId se consulta pero no se puede modificar por este endpoint.

### Arquitectura y alcance

Se reutilizan Organization, OrganizationRepository, UpdateOrganizationProfile y el repositorio Prisma. Se añade GetOrganization y un controller con validación y documentación OpenAPI, compuesto en los módulos existentes. Los errores de organización se traducen a 400/404 en el filtro HTTP.

No se añaden tablas, migraciones, dependencias ni capas de delegación. El tono es texto libre como en el dominio, evitando limitar perfiles existentes al enum del prototipo. La alternativa de guardar color, CTA y URL de logo requeriría ampliar el modelo; se pospone para no simular persistencia ni confundir URLs con referencias de assets.

Configuración usa el cliente HTTP común y TanStack Query. Muestra carga y errores con reintento, conserva lo escrito si falla el guardado y actualiza la caché con la respuesta persistida. La pantalla deja de usar el mock; el formulario visual anterior y sus fixtures permanecen fuera del flujo activo.

### Archivos

- Nuevos: GetOrganization, requests/responses/controller HTTP, pruebas settings-api.test.mjs y esta guía.
- Modificados: módulos de composición, filtro de errores, pruebas de organización/HTTP/PostgreSQL, servicio/hooks/vista de Configuración.
- Se conserva el cambio local del usuario en fases5-10.md.

### Verificación manual

Con API, PostgreSQL y la organización de desarrollo preparados, abrir /settings, cambiar nombre/descripción/tono, guardar y recargar. Vaciar el tono debe conservar null en el backend. Una API no disponible debe mostrar error sin recuperar datos de ejemplo. La edición de logo, color y CTA sigue pendiente.

La fase 4.5 continúa: métricas reales, cuentas sociales y las capacidades pendientes de edición/preview requieren sus contratos correspondientes.

### Resultados

Pasaron formato, lint (cinco advertencias previas, sin errores), TypeScript, build de API/web y 524 pruebas: 352 unitarias de API, 17 del CMS, 92 HTTP y 63 PostgreSQL. Integración usa un esquema temporal aislado. No se realizó la comprobación manual en navegador.

## Fase 4.5 · Cierre funcional del CMS

Trabajo local en `feat/cms-phase-4-5-completion`, posterior al PR #19 ya integrado. Por instrucción del usuario, no abrir nuevos PR hasta completar la fase. Este documento registra el alcance verificable; no declara realizadas pruebas visuales ni implementadas integraciones externas.

### Matriz de cierre

| Pantalla            | Implementado                                                                                                                                                  | Dependencia pendiente                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Inicio y navegación | Entrada al CMS y rutas por feature                                                                                                                            | Diseño aprobado por el usuario; comprobación responsive detallada no registrada             |
| Dashboard           | Totales reales de productos/plantillas/campañas, pendientes de aprobación, publicaciones correctas, desglose por estado/plataforma y cinco campañas recientes | Auditoría de actividad en fase 9; no se inventan eventos ni porcentajes                     |
| Productos           | Listar, crear, consultar y editar con importes exactos, paginación y errores                                                                                  | Assets en fase 6                                                                            |
| Plantillas          | Crear, listar, renombrar mediante revisión nueva, conflicto 409 y preview de ejemplo 1080 × 1080                                                              | El preview está identificado como ejemplo; diseñador/renderizado de piezas reales en fase 6 |
| Campañas            | Crear, listar, consultar contenido candidato y aprobar el contentId mostrado                                                                                  | Generar/regenerar y preview de imagen requieren fases 5–7; publicación requiere fases 7–8   |
| Cuentas sociales    | Pantalla de plataformas y estado explícito de indisponibilidad; sin conexiones fingidas                                                                       | OAuth, credenciales y conexión efectiva en fase 8                                           |
| Publicaciones       | Listado global paginado, estado/errores por destino e historial paginado de intentos y resultados                                                             | Envío real en fases 7–8                                                                     |
| Configuración       | Nombre, descripción y tono persistidos                                                                                                                        | Logo/almacenamiento fase 6; color y CTA requieren ampliación posterior del contrato         |
| Login               | Informa de la falta de autenticación                                                                                                                          | Roles y seguridad de usuarios en fase 9                                                     |

Los estados de carga, error con reintento, vacío y éxito se mantienen en las pantallas conectadas. Los servicios de demostración anteriores permanecen como material de diseño, pero dashboard, publicaciones y cuentas sociales ya no los usan en sus rutas activas.

### Contratos añadidos

- GET /dashboard: agregaciones de toda la organización y campañas recientes. Se consulta en una transacción RepeatableRead; no se suman páginas del cliente.
- GET /publications?page&limit: lista global de destinos de la organización, con campaña, estado, fechas y errores.
- GET /publications/:id/attempts?page&limit: historial de intentos, más reciente primero, incluyendo resultado nullable. Una publicación ajena o inexistente responde 404.
- PATCH /templates/:id: name y expectedRevisionId obligatorios. Crea una revisión nueva; una revisión obsoleta responde 409. Las campañas conservan la revisión anterior.
- Swagger describe los envelopes y paginación de las nuevas consultas.

Se conservan GET /campaigns/:id/publications y los contratos existentes.

### Decisiones

Dashboard y publicaciones tienen contratos de lectura propios porque agregan datos y necesitan proyecciones paginadas. Sus adapters Prisma se inyectan en los casos de uso; no se importa Prisma desde application ni se añade un repositorio genérico.

La edición inicial de plantilla cambia el nombre y conserva dimensiones. Se añade save al contrato existente y se compara currentRevisionId dentro de la transacción antes de insertar la revisión. Se preservan todas las revisiones y las referencias de campañas. No se introducen columnas ni migraciones.

Se sustituyen las cuentas sociales de demostración por disponibilidad explícita. Implementar una conexión ficticia o adelantar OAuth para cerrar la pantalla contradiría la separación por fases.

### Archivos principales

- API: módulo dashboard (consulta, adapter y presentación); consultas de historial/intentos en publications; caso de uso UpdateTemplate, contrato y persistencia de revisión; composición Nest y traducción de errores.
- CMS: dashboard, publicaciones, pantalla de cuentas sociales, edición de plantilla, acciones pendientes de campaña e inicio.
- Pruebas: casos de uso de dashboard/historial/plantillas, integración HTTP/PostgreSQL y contratos de los servicios web.
- Documentación: esta matriz y actualización de phase-4.5-cms.md.
- Sin dependencias nuevas. La edición del usuario en fases5-10.md se mantiene fuera del commit de cierre.

### Revisión del usuario y comprobaciones manuales

El 27 de septiembre de 2026 el usuario confirmó «listo, todo bien, sigue» después de revisar la recuperación del diseño. Se registra su aceptación visual general. No hay navegador conectado a las herramientas de esta sesión; no se atribuye al agente una revisión visual ni se dan por ejecutados todos los escenarios siguientes.

1. Con API y frontend activos, entrar al CMS desde / y revisar navegación en escritorio y móvil.
2. Crear producto, plantilla y campaña; recargar y comprobar los totales del dashboard.
3. Editar el nombre de una plantilla y comprobar su nueva revisión. La campaña anterior debe conservar la revisión fijada.
4. Abrir dos vistas de la misma revisión, guardar en una y comprobar conflicto al guardar la otra.
5. Revisar publicaciones e intentos con datos de desarrollo; sin registros deben mostrarse estados vacíos.
6. Detener temporalmente la API y comprobar error/reintento sin datos de ejemplo.
7. Confirmar que redes, generación y publicación no muestran éxito ficticio.

La aceptación visual general está registrada; la ejecución individual de esta lista no está confirmada. Las dependencias de fases posteriores están delimitadas arriba según las guías del proyecto. No se considera terminada toda la funcionalidad de la plataforma por cerrar el CMS.

### Resultados de verificación

#### Recuperación de la presentación del CMS

Se reutilizan los componentes visuales originales: métricas, barras de estados, resumen por red, tabla de campañas recientes y preview de plantillas. Se recuperan tablas para campañas/publicaciones, tarjetas de redes con sus iconos y formularios con panel lateral para productos, campañas, plantillas y empresa. Los contratos HTTP, paginación, validaciones y aprobación de la revisión mostrada se conservan.

Componentes nuevos: `template-design-preview.tsx` (composición del preview original, identificado como ejemplo) y `template-visual-settings.tsx` (controles visuales pendientes deshabilitados). Cambios de presentación en `features/{dashboard,products,templates,campaigns,publications,social-accounts,settings}/components`. Sin dependencias nuevas ni cambios del backend para esta recuperación. No se garantiza una reproducción exacta de las pantallas antiguas que no estaban guardadas en Git.

Verificación de esta recuperación: TypeScript, build web y 20 pruebas web correctos; lint sin errores, con cinco advertencias preexistentes. El usuario aprobó la recuperación del diseño. No se ha registrado por separado la revisión de escritorio y móvil. Siguiente paso: preparar el PR de cierre antes de iniciar la fase 5.

Correctos: formato, TypeScript, build de API/web y 534 pruebas (357 unitarias de API, 20 del CMS, 92 HTTP y 65 PostgreSQL). Lint sin errores, con las cinco advertencias previas. Las pruebas confirman el aislamiento de dashboard/publicaciones, conservación de revisiones fijadas y conflicto de ediciones concurrentes. La integración utiliza un esquema temporal aislado y lo elimina al terminar. Aceptación visual general del usuario registrada; sin comprobación visual automatizada por ausencia de navegador conectado.

### Estado de cierre y siguiente fase

El alcance conectado del CMS queda listo para revisión en PR, con el diseño aceptado por el usuario y las dependencias posteriores delimitadas en la matriz. Esto no implica que generación, renderizado, OAuth o publicación real estén implementados. Se conserva la rama de cierre y no se mezclan cambios de la fase 5.

El siguiente incremento, después del cierre, será generación de copy: revisar los contratos y estados actuales de campaña, introducir el port CopyGenerator y el caso de uso GenerateCampaignCopy con validación de salida, persistencia y pruebas con fake; después conectar el adapter OpenAI con salida estructurada, timeout y reintentos limitados. Su diseño debe conservar precios, fechas y condiciones comerciales y no adelantar imágenes ni n8n.
