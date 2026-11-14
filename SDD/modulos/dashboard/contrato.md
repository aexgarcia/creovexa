# Contrato del módulo `dashboard`

Actualizado el 14 de noviembre de 2026 a partir del código. Si este documento y el código difieren, el código manda y este documento debe corregirse.

## Responsabilidad

Indicadores de solo lectura de la organización activa para la pantalla inicial del CMS. No tiene dominio ni escribe datos.

## Datos que posee

Ninguno. Lee tablas de `products`, `templates`, `campaigns` y `publications`.

## API HTTP

| Método y ruta | Descripción | Respuesta |
| --- | --- | --- |
| `GET /dashboard` | Indicadores de la organización activa | `200` |

Contenido de la respuesta (`DashboardResult`):

- `totals`: `products`, `templates`, `campaigns`, `published`, `pendingApproval`.
- `campaignsByStatus`: cantidad por estado.
- `publicationsByPlatform`: cantidad por plataforma y estado.
- `recentCampaigns`: `id`, `title`, `status`, `createdAt`.

No define códigos de error propios. Formato de respuestas: [ADR-0004](../../adr/0004-contrato-http-y-errores.md).

## Casos de uso

`GetDashboard`.

## Lo que expone a otros módulos

Nada.

## Lo que consume

| Dependencia | Port | Implementación actual |
| --- | --- | --- |
| Lectura agregada | `DashboardReader` | `PrismaDashboardReader` |

## Decisiones

- [ADR-0020 · Dashboard como modelo de lectura](adr/0020-dashboard-como-modelo-de-lectura.md)
