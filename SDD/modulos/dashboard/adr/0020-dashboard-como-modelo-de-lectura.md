# ADR-0020 · Dashboard como modelo de lectura sin dominio

- **Estado:** Aceptado (retroactivo)
- **Fecha de registro:** 2026-11-14 · decisión original: fase 4.5
- **Ámbito:** módulo `dashboard`

## Contexto

La pantalla inicial del CMS necesita totales y conteos que cruzan productos, plantillas, campañas y publicaciones. No hay reglas de negocio: son solo consultas.

## Decisión

`dashboard` no tiene capa de dominio. Un único caso de uso, `GetDashboard`, depende del port `DashboardReader`; su implementación `PrismaDashboardReader` consulta directamente las tablas de los otros módulos, siempre filtrando por `organizationId`, y devuelve un resultado plano.

Es la única excepción permitida a la regla de que un módulo no lee las tablas de otro, y solo para lectura.

## Alternativas consideradas

- **Pedir los datos a cada módulo mediante sus casos de uso:** respeta los límites, pero carga entidades completas para contar filas y multiplica las consultas.
- **Tablas de resumen actualizadas por eventos:** justificado con mucho volumen; innecesario hoy.

## Consecuencias

- Consultas simples y rápidas.
- El lector está acoplado al esquema de otros módulos: un cambio de tabla o de estado en `campaigns` o `publications` puede romperlo. Sus pruebas de integración deben cubrirlo.
- El mismo patrón aplica a `PublicationHistoryReader`. Ningún otro módulo debe usarlo para escribir ni para tomar decisiones de negocio.
