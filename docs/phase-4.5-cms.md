# Fase 4.5 · CMS conectado a la API

Estado: incremento de productos, plantillas, campañas y consulta de publicaciones. La fase 4.5 continúa; no incorpora las integraciones de generación o envío de fases posteriores.

## Pantallas

| Área             | Comportamiento                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| Productos        | Listado paginado, creación, consulta y edición persistidos                                                       |
| Plantillas       | Creación 1080 × 1080, listado y detalle de revisión persistidos; edición visual pendiente                        |
| Campañas         | Creación con revisión fija de plantilla, listado, detalle del contenido candidato y aprobación por contentId     |
| Publicaciones    | Consulta paginada por campaña: estado por destino, último intento, error, ID externo y fecha real de publicación |
| Dashboard        | Demostración identificada; métricas y actividades simuladas                                                      |
| Cuentas sociales | Demostración identificada; no vincula cuentas reales                                                             |
| Configuración    | Perfil de empresa persistido: nombre, descripción y tono de marca                                                |
| Login            | Pantalla informativa; autenticación pendiente                                                                    |

## Implementación y decisiones

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

## Archivos principales

- Creados: árbol `apps/web/src`, componentes y pantallas del CMS, cliente HTTP, servicios/tipos/hooks de integración, `apps/web/test/*.test.mjs`, configuración shadcn y esta guía.
- Modificados: package.json raíz/web para incluir las pruebas del CMS, tsconfig para el alias a src y lockfile de las dependencias del frontend.
- Las rutas iniciales de `apps/web/app` se trasladan a `apps/web/src/app`.
- `fases5-10.md` contiene un cambio local del usuario y queda fuera del PR.
- El PR de CMS se basa en main y no incluye el PR #17 de documentación.

## Uso local

1. Iniciar PostgreSQL con la configuración de desarrollo y preparar migraciones/organización según README.
2. Configurar `NEXT_PUBLIC_API_URL=http://localhost:3001` para el frontend. Es una URL pública incorporada al build; no debe contener secretos.
3. Ejecutar `pnpm dev:api` y `pnpm dev:web`. El origen del navegador debe coincidir con CORS.
4. Crear y editar un producto; crear una plantilla; crear una campaña seleccionando ambos; recargar para comprobar persistencia.
5. Para revisar aprobación se necesita una campaña con contenido candidato: el CMS todavía no genera contenido.
6. Una API detenida debe mostrar error; no debe recuperar registros simulados.

## Verificación y límites

Las pruebas web cubren conversión exacta de importes, errores HTTP/red y cancelación, contratos de plantillas, revisión fija de campaña, promociones/fechas, aprobación con conflicto y publicaciones independientes. Se ejecutan con `pnpm --filter @creovexa/web test` y forman parte de `pnpm test`.

Las comprobaciones finales del PR se registran al cerrar el incremento. La validación manual completa en navegador sigue pendiente. Autenticación, almacenamiento, métricas reales, conexiones sociales y generación/publicación siguen fuera del alcance de este PR.

### Cierre del PR · 27 de septiembre de 2026

- Correctos: pnpm format:check, pnpm db:validate, pnpm lint, pnpm typecheck, pnpm test, pnpm test:e2e, pnpm test:integration y pnpm build.
- Resultados: 351 pruebas unitarias de API, 15 del CMS, 79 HTTP y 62 de integración PostgreSQL.
- ESLint conserva cinco advertencias en componentes existentes (React Hook Form y etiquetas img), sin errores.
- PostgreSQL, MinIO y n8n estaban activos. Integración ejecutó las migraciones dos veces en un esquema temporal aislado y lo eliminó al terminar.
- Sigue pendiente la comprobación manual completa en navegador; no se presenta como realizada.

Configuración persistida: ver [el incremento de organización](phase-4.5-organization-settings.md).
