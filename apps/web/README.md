# CMS de Creovexa

Aplicación Next.js ubicada en `apps/web` (antes `creovexa-front`).

Desde la raíz del monorepo:

```sh
pnpm setup:env
pnpm dev:web
```

El CMS responde en <http://localhost:3000> y su salud HTTP en <http://localhost:3000/health>. Configura la URL pública de la API en `apps/web/.env.local`. El alias `@/*` apunta a la raíz de esta aplicación.

Las vistas se organizan por funcionalidad en `src/features`, las primitivas compartidas en `src/components/ui` y la estructura administrativa en `src/components/layout`. Antes de modificar código, consulta el `AGENTS.md` local y la documentación de la versión instalada de Next.js.

Consulta [la guía de desarrollo](../../README.md) y el [inventario de pendientes funcionales](PENDING.md) para distinguir datos reales, controles pendientes y muestras ilustrativas.
