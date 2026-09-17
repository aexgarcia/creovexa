# CMS de Creovexa

Aplicación Next.js ubicada en `apps/web` (antes `creovexa-front`).

Desde la raíz del monorepo:

```sh
pnpm setup:env
pnpm dev:web
```

El CMS responde en <http://localhost:3000> y su salud HTTP en <http://localhost:3000/health>. Configura la URL pública de la API en `apps/web/.env.local`. El alias `@/*` apunta a la raíz de esta aplicación.

La fase 1 conserva la página inicial. Las pantallas del CMS se implementarán en la fase 4.5. Antes de modificar código, consulta el `AGENTS.md` local y la documentación de la versión instalada de Next.js.

Consulta [la guía de desarrollo](../../README.md) y [las decisiones de la fase 1](../../docs/phase-1.md).
