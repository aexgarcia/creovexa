# Fase 4.5 · Cierre funcional del CMS

Trabajo local en `feat/cms-phase-4-5-completion`, posterior al PR #19 ya integrado. Por instrucción del usuario, no abrir nuevos PR hasta completar la fase. Este documento registra el alcance verificable; no declara realizadas pruebas visuales ni implementadas integraciones externas.

## Matriz de cierre

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

## Contratos añadidos

- GET /dashboard: agregaciones de toda la organización y campañas recientes. Se consulta en una transacción RepeatableRead; no se suman páginas del cliente.
- GET /publications?page&limit: lista global de destinos de la organización, con campaña, estado, fechas y errores.
- GET /publications/:id/attempts?page&limit: historial de intentos, más reciente primero, incluyendo resultado nullable. Una publicación ajena o inexistente responde 404.
- PATCH /templates/:id: name y expectedRevisionId obligatorios. Crea una revisión nueva; una revisión obsoleta responde 409. Las campañas conservan la revisión anterior.
- Swagger describe los envelopes y paginación de las nuevas consultas.

Se conservan GET /campaigns/:id/publications y los contratos existentes.

## Decisiones

Dashboard y publicaciones tienen contratos de lectura propios porque agregan datos y necesitan proyecciones paginadas. Sus adapters Prisma se inyectan en los casos de uso; no se importa Prisma desde application ni se añade un repositorio genérico.

La edición inicial de plantilla cambia el nombre y conserva dimensiones. Se añade save al contrato existente y se compara currentRevisionId dentro de la transacción antes de insertar la revisión. Se preservan todas las revisiones y las referencias de campañas. No se introducen columnas ni migraciones.

Se sustituyen las cuentas sociales de demostración por disponibilidad explícita. Implementar una conexión ficticia o adelantar OAuth para cerrar la pantalla contradiría la separación por fases.

## Archivos principales

- API: módulo dashboard (consulta, adapter y presentación); consultas de historial/intentos en publications; caso de uso UpdateTemplate, contrato y persistencia de revisión; composición Nest y traducción de errores.
- CMS: dashboard, publicaciones, pantalla de cuentas sociales, edición de plantilla, acciones pendientes de campaña e inicio.
- Pruebas: casos de uso de dashboard/historial/plantillas, integración HTTP/PostgreSQL y contratos de los servicios web.
- Documentación: esta matriz y actualización de phase-4.5-cms.md.
- Sin dependencias nuevas. La edición del usuario en fases5-10.md se mantiene fuera del commit de cierre.

## Revisión del usuario y comprobaciones manuales

El 27 de septiembre de 2026 el usuario confirmó «listo, todo bien, sigue» después de revisar la recuperación del diseño. Se registra su aceptación visual general. No hay navegador conectado a las herramientas de esta sesión; no se atribuye al agente una revisión visual ni se dan por ejecutados todos los escenarios siguientes.

1. Con API y frontend activos, entrar al CMS desde / y revisar navegación en escritorio y móvil.
2. Crear producto, plantilla y campaña; recargar y comprobar los totales del dashboard.
3. Editar el nombre de una plantilla y comprobar su nueva revisión. La campaña anterior debe conservar la revisión fijada.
4. Abrir dos vistas de la misma revisión, guardar en una y comprobar conflicto al guardar la otra.
5. Revisar publicaciones e intentos con datos de desarrollo; sin registros deben mostrarse estados vacíos.
6. Detener temporalmente la API y comprobar error/reintento sin datos de ejemplo.
7. Confirmar que redes, generación y publicación no muestran éxito ficticio.

La aceptación visual general está registrada; la ejecución individual de esta lista no está confirmada. Las dependencias de fases posteriores están delimitadas arriba según las guías del proyecto. No se considera terminada toda la funcionalidad de la plataforma por cerrar el CMS.

## Resultados de verificación

### Recuperación de la presentación del CMS

Se reutilizan los componentes visuales originales: métricas, barras de estados, resumen por red, tabla de campañas recientes y preview de plantillas. Se recuperan tablas para campañas/publicaciones, tarjetas de redes con sus iconos y formularios con panel lateral para productos, campañas, plantillas y empresa. Los contratos HTTP, paginación, validaciones y aprobación de la revisión mostrada se conservan.

Componentes nuevos: `template-design-preview.tsx` (composición del preview original, identificado como ejemplo) y `template-visual-settings.tsx` (controles visuales pendientes deshabilitados). Cambios de presentación en `features/{dashboard,products,templates,campaigns,publications,social-accounts,settings}/components`. Sin dependencias nuevas ni cambios del backend para esta recuperación. No se garantiza una reproducción exacta de las pantallas antiguas que no estaban guardadas en Git.

Verificación de esta recuperación: TypeScript, build web y 20 pruebas web correctos; lint sin errores, con cinco advertencias preexistentes. El usuario aprobó la recuperación del diseño. No se ha registrado por separado la revisión de escritorio y móvil. Siguiente paso: preparar el PR de cierre antes de iniciar la fase 5.

Correctos: formato, TypeScript, build de API/web y 534 pruebas (357 unitarias de API, 20 del CMS, 92 HTTP y 65 PostgreSQL). Lint sin errores, con las cinco advertencias previas. Las pruebas confirman el aislamiento de dashboard/publicaciones, conservación de revisiones fijadas y conflicto de ediciones concurrentes. La integración utiliza un esquema temporal aislado y lo elimina al terminar. Aceptación visual general del usuario registrada; sin comprobación visual automatizada por ausencia de navegador conectado.

## Estado de cierre y siguiente fase

El alcance conectado del CMS queda listo para revisión en PR, con el diseño aceptado por el usuario y las dependencias posteriores delimitadas en la matriz. Esto no implica que generación, renderizado, OAuth o publicación real estén implementados. Se conserva la rama de cierre y no se mezclan cambios de la fase 5.

El siguiente incremento, después del cierre, será generación de copy: revisar los contratos y estados actuales de campaña, introducir el port CopyGenerator y el caso de uso GenerateCampaignCopy con validación de salida, persistencia y pruebas con fake; después conectar el adapter OpenAI con salida estructurada, timeout y reintentos limitados. Su diseño debe conservar precios, fechas y condiciones comerciales y no adelantar imágenes ni n8n.
