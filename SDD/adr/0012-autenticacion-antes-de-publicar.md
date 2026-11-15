# ADR-0012 · Identidad y contexto de organización antes de publicar en redes

- **Estado:** Propuesto
- **Fecha:** 2026-11-14
- **Ámbito:** orden de fases; módulo nuevo `identity`

## Contexto

Hoy no hay usuarios. `DevelopmentOrganizationGuard` asigna a cada request la organización indicada en `DEV_ORGANIZATION_ID`. El plan original deja autenticación, roles y auditoría para la fase 9, después de la publicación en redes (fase 8).

Publicar implica conectar cuentas sociales reales y guardar sus tokens. Hacerlo sin saber quién conectó una cuenta, quién aprobó una campaña o quién pidió publicarla obliga a rehacer esas piezas al llegar a la fase 9, y deja registros sin autor.

## Decisión propuesta

Adelantar una **identidad mínima** antes de la fase 8:

- Módulo `identity` con `User` y `OrganizationMembership` (ya previstos en el [dominio](../arquitectura/dominio.md)); el rol pertenece a la membresía.
- Inicio de sesión y sesión; un guard real reemplaza a `DevelopmentOrganizationGuard` y resuelve usuario y organización activa.
- Los casos de uso que cambian estado reciben el `actorId`, para registrar quién aprobó y quién publicó.

Quedan en la fase 9 original: permisos finos por rol (`ADMIN`, `EDITOR`, `REVIEWER`), `AuditLog` completo, rate limiting y endurecimiento.

## Pendiente de decidir

Mecanismo de autenticación. Opciones a evaluar en un ADR propio al implementar: sesiones propias con cookie y contraseña, o un proveedor externo (por ejemplo OAuth con Google). Para pocas organizaciones y bajo presupuesto, las sesiones propias con cookie `httpOnly` son suficientes.

## Alternativas consideradas

- **Mantener el orden original:** se llega antes a publicar, a cambio de retrabajo y de un periodo con cuentas sociales conectadas sin control de acceso.
- **Hacer toda la fase 9 antes:** retrasa demasiado el flujo principal.

## Consecuencias

- El CMS ya tiene pantalla de `login`; se conecta a un backend real.
- La publicación y las cuentas sociales nacen con autor.
- Suma una etapa antes de ver una publicación real.
