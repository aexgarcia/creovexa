# ADR-0001 · Monolito modular con arquitectura hexagonal

- **Estado:** Aceptado (retroactivo)
- **Fecha de registro:** 2026-11-14 · decisión original: fases 1–2
- **Ámbito:** todo `apps/api`

## Contexto

El sistema integra varios terceros (IA, storage, redes sociales) cuyas APIs cambian y cuyos proveedores pueden sustituirse. Lo desarrolla una sola persona, para pocas organizaciones.

## Decisión

Una sola aplicación NestJS dividida en módulos de negocio bajo `src/modules`. Cada módulo se organiza en `domain`, `application`, `infrastructure` y `presentation`. El dominio y los casos de uso son TypeScript puro; todo acceso externo pasa por un contrato (repositorio o port) cuya implementación se inyecta.

No se crean carpetas ni capas sin una responsabilidad real.

## Alternativas consideradas

- **Microservicios:** aislamiento de despliegue que no se necesita; multiplica la operación para una sola persona.
- **Capas clásicas con servicios por entidad (`CampaignService`):** más rápido al inicio, pero mezcla reglas con Prisma y con clientes externos, y dificulta cambiar de proveedor de IA.

## Consecuencias

- Los casos de uso se prueban sin NestJS ni base de datos.
- Cambiar de proveedor (OpenAI ↔ Gemini) no toca dominio ni aplicación.
- Hay más archivos por funcionalidad; se acepta a cambio de límites claros.
- Los módulos pueden extraerse a servicios si algún día hiciera falta, porque ya se comunican por contratos.
