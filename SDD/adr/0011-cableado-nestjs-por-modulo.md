# ADR-0011 · Un módulo NestJS por módulo de negocio

- **Estado:** Aceptado, implementado el 2026-11-14 (ver "Implementación")
- **Fecha:** 2026-11-14
- **Ámbito:** composición de dependencias en `apps/api`

## Contexto

Toda la composición de NestJS vive en `src/infrastructure/*.module.ts`: `CatalogHttpModule` registra los controllers de los seis módulos de negocio; `CommercialPersistenceModule`, `CampaignPersistenceModule` y otros registran casos de uso de varios módulos a la vez. Los repositorios se crean con `new PrismaXRepository(db)` dentro de cada factory, repetidos entre factories.

Consecuencia: los módulos están bien separados en carpetas, pero no en el arranque. No se puede ver qué expone un módulo ni levantarlo aislado en una prueba.

## Decisión

Cada módulo de negocio declara su propio módulo NestJS en `src/modules/<modulo>/<modulo>.module.ts`, que:

- registra sus controllers;
- registra sus repositorios y adapters **una vez**, como providers, bajo el token de su contrato;
- registra sus casos de uso;
- **exporta solo** lo que otros módulos pueden consumir (ports de consulta), no sus repositorios.

`src/infrastructure` queda para lo transversal: base de datos, reloj, generador de IDs, configuración, cola y HTTP común. `AppModule` importa los módulos de negocio.

Los casos de uso siguen siendo clases sin decoradores, creadas mediante factories, para mantener `application` libre de NestJS ([ADR-0001](0001-monolito-modular-hexagonal.md)).

## Alternativas consideradas

- **Mantener la composición central:** funciona, pero cada funcionalidad nueva edita archivos compartidos y oculta las dependencias entre módulos.
- **Decorar los casos de uso con `@Injectable()`:** menos factories, pero mete NestJS en la capa de aplicación.

## Consecuencias

- Cambio mecánico, sin modificar comportamiento; se valida con las suites existentes.
- Las dependencias entre módulos quedan declaradas en `imports` y `exports`, y NestJS falla al arrancar si aparece un ciclo.
- Facilita el punto de entrada del worker ([ADR-0008](0008-cola-de-trabajos-y-worker.md)), que importa solo los módulos que necesita.
- El mapeo de errores a HTTP puede repartirse por módulo ([ADR-0004](0004-contrato-http-y-errores.md)).

## Implementación

Hecho el 14 de noviembre de 2026:

- Cada módulo tiene su `<modulo>.module.ts` con sus controllers, repositorios, adapters y casos de uso. `campaigns` reúne ciclo de vida, copy e imagen hasta que se divida ([ADR-0010](0010-dividir-campaigns.md)).
- `src/infrastructure` conserva solo `DatabaseModule`, `RuntimeModule`, `StorageModule` y `HttpCommonModule` (organización activa, logger y filtro de errores).
- Cada repositorio se registra una sola vez; ya no se crean instancias con `new` dentro de las factories de casos de uso.
- Exportaciones: `organizations` expone `PrismaOrganizationLookup` y `ORGANIZATION_LOGOS`; `products` expone `PRODUCT_IMAGES`; `publications` expone `PUBLICATION_TRANSACTION`.

Pendiente de esta decisión:

- Los repositorios siguen registrados bajo su clase concreta (`PrismaCampaignRepository`), no bajo un token de contrato. Cambiarlo obliga a tocar las suites que los sustituyen; se hará junto con [ADR-0010](0010-dividir-campaigns.md).
- El mapeo de errores a HTTP sigue en un único `ApiExceptionFilter`.
