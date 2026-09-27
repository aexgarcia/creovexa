# Fase 4.5 · Configuración de empresa persistida

Incremento en `feat/organization-settings-api`, basado en main tras integrar los PR #17 y #18.

## Contrato

- `GET /organization`: devuelve `{ data: { id, name, description, brandTone, logoAssetId, createdAt, updatedAt } }`.
- `PATCH /organization`: acepta name (hasta 200 caracteres), description (hasta 5000) y brandTone (hasta 200 o null). Los campos omitidos se conservan; nombre vacío, cuerpo vacío y campos desconocidos se rechazan.
- La organización procede de DevelopmentOrganizationGuard, igual que el catálogo existente; el cliente no envía un ID de organización. No sustituye la autenticación pendiente ni habilita acceso multiusuario en producción.
- Nombre y descripción no admiten null. brandTone null o vacío limpia el tono. logoAssetId se consulta pero no se puede modificar por este endpoint.

## Arquitectura y alcance

Se reutilizan Organization, OrganizationRepository, UpdateOrganizationProfile y el repositorio Prisma. Se añade GetOrganization y un controller con validación y documentación OpenAPI, compuesto en los módulos existentes. Los errores de organización se traducen a 400/404 en el filtro HTTP.

No se añaden tablas, migraciones, dependencias ni capas de delegación. El tono es texto libre como en el dominio, evitando limitar perfiles existentes al enum del prototipo. La alternativa de guardar color, CTA y URL de logo requeriría ampliar el modelo; se pospone para no simular persistencia ni confundir URLs con referencias de assets.

Configuración usa el cliente HTTP común y TanStack Query. Muestra carga y errores con reintento, conserva lo escrito si falla el guardado y actualiza la caché con la respuesta persistida. La pantalla deja de usar el mock; el formulario visual anterior y sus fixtures permanecen fuera del flujo activo.

## Archivos

- Nuevos: GetOrganization, requests/responses/controller HTTP, pruebas settings-api.test.mjs y esta guía.
- Modificados: módulos de composición, filtro de errores, pruebas de organización/HTTP/PostgreSQL, servicio/hooks/vista de Configuración.
- Se conserva el cambio local del usuario en fases5-10.md.

## Verificación manual

Con API, PostgreSQL y la organización de desarrollo preparados, abrir /settings, cambiar nombre/descripción/tono, guardar y recargar. Vaciar el tono debe conservar null en el backend. Una API no disponible debe mostrar error sin recuperar datos de ejemplo. La edición de logo, color y CTA sigue pendiente.

La fase 4.5 continúa: métricas reales, cuentas sociales y las capacidades pendientes de edición/preview requieren sus contratos correspondientes.

## Resultados

Pasaron formato, lint (cinco advertencias previas, sin errores), TypeScript, build de API/web y 524 pruebas: 352 unitarias de API, 17 del CMS, 92 HTTP y 63 PostgreSQL. Integración usa un esquema temporal aislado. No se realizó la comprobación manual en navegador.
