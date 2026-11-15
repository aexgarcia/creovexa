# Creovexa

Monorepo para la plataforma de automatización de marketing. El dominio y su persistencia están implementados. La fase 4 incorpora los endpoints de productos y plantillas, con validación, paginación y Swagger. Campañas y publicaciones conservan su dominio y persistencia; sus endpoints corresponden a los siguientes incrementos.

## Estructura

```text
apps/
  web/                    # Next.js; antes creovexa-front
  api/                    # NestJS; antes creovexa-back
packages/
  config/                 # TypeScript, ESLint y Prettier compartidos
infrastructure/
  docker/
    compose.yaml          # PostgreSQL y MinIO locales
    minio/                # Imagen construida desde el código oficial
scripts/                  # Preparación de entorno y comprobación de salud
SDD/                      # Documentación: arquitectura, ADRs, contratos, fases e historial
pnpm-workspace.yaml
pnpm-lock.yaml
```

`packages/shared` se creará cuando exista un contrato público compartido real. El dominio de la API permanece dentro de `apps/api`; no se compartirá con el frontend por comodidad.

## Requisitos

- Node.js 24 o 25 y pnpm 12.4.2. `.node-version` conserva la versión instalada en este equipo: 25.9.0.
- Docker Desktop con motor Linux operativo y Docker Compose.
- En Windows, WSL 2 y virtualización habilitada.

## Desarrollo local

Desde la raíz:

```sh
pnpm install --frozen-lockfile
pnpm setup:env
pnpm infra:up
pnpm db:migrate
pnpm db:seed:dev
pnpm dev
```

`setup:env` crea `.env`, `apps/api/.env` y `apps/web/.env.local` a partir de sus ejemplos. Genera contraseñas aleatorias y conserva las variables existentes. Si falta `DATABASE_URL` en la API, la añade usando las credenciales de PostgreSQL del entorno raíz, sin imprimirlas. Estos archivos se ignoran en Git. No uses `pnpm setup`: ese es un comando propio del gestor de paquetes.

`db:migrate` aplica las migraciones versionadas mediante `prisma migrate deploy`; no resetea la base. El cliente Prisma se genera automáticamente al comprobar tipos, ejecutar pruebas o compilar. Consulta [persistencia comercial](SDD/historial/fase-3.md), [campañas](SDD/historial/fase-3.md) y [publicaciones](SDD/historial/fase-3.md) para sus límites y pruebas de PostgreSQL.

Las aplicaciones se ejecutan en el host con recarga automática; los dos servicios de infraestructura se ejecutan en Docker. También puedes usar `pnpm dev:web` y `pnpm dev:api` por separado.

`db:seed:dev` prepara una organización local y configura `DEV_ORGANIZATION_ID` en `apps/api/.env`; repetirlo conserva la organización existente. No añade productos ni plantillas. Reinicia la API después de ejecutarlo. Hasta incorporar autenticación en la fase 9, el catálogo funciona con esa organización fija en desarrollo; sin configuración responde 503 y no se permite habilitarla en producción. Swagger está en <http://localhost:3001/docs> y el contrato en <http://localhost:3001/openapi.json>. Consulta [la API de catálogo](SDD/historial/fase-4.md) para ejemplos y límites.

| Servicio      | Dirección             | Salud                   |
| ------------- | --------------------- | ----------------------- |
| CMS           | http://localhost:3000 | `/health`               |
| API           | http://localhost:3001 | `/health`               |
| MinIO S3      | http://localhost:9000 | `/minio/health/live`    |
| MinIO consola | http://localhost:9001 | —                       |
| PostgreSQL    | localhost:5432        | `pg_isready` en Compose |

Para MinIO, consulta `MINIO_ROOT_USER` y `MINIO_ROOT_PASSWORD` en tu `.env` local.

Los puertos de infraestructura se pueden cambiar en `.env`. El puerto de API se configura con `API_PORT` en `apps/api/.env`; actualiza `NEXT_PUBLIC_API_URL` en `apps/web/.env.local` si lo cambias. El CMS usa el puerto 3000, y `CORS_ORIGIN` limita el origen aceptado por la API. Las URLs públicas del frontend no deben contener secretos.

El healthcheck de las aplicaciones comprueba que responden por HTTP; es una comprobación de vida, no de disponibilidad de PostgreSQL. El cliente abre conexiones al ejecutar consultas y las libera al cerrar NestJS. PostgreSQL y MinIO tienen comprobaciones propias.

## Comandos

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm test:e2e
pnpm test:integration
pnpm db:validate
pnpm build
pnpm healthcheck
pnpm healthcheck --apps-only
pnpm infra:check
pnpm infra:status
pnpm infra:down
```

`infra:check` valida Compose sin imprimir secretos ni requerir el motor en ejecución. `infra:down` conserva los volúmenes. Las credenciales de PostgreSQL deben conservarse junto con su volumen: cambiar el `.env` no actualiza usuarios existentes. n8n se ha retirado de Compose conforme al ADR-0008. Los contenedores, bases y volúmenes preexistentes se conservan; su limpieza es manual.

`test:integration` requiere PostgreSQL disponible. Crea un esquema aleatorio `creovexa_test_…`, aplica las migraciones y elimina únicamente ese esquema al terminar, incluso si falla una prueba. Usa `TEST_DATABASE_URL` si está definida y, en caso contrario, `DATABASE_URL` de la API. Las pruebas unitarias y HTTP no necesitan una conexión a PostgreSQL.

MinIO se compila desde una versión fija del código oficial; su primer arranque necesita descargar las imágenes base y compilar Go. Consulta la justificación en [las decisiones de la fase 1](SDD/historial/fase-1.md).

## Trabajo con GitHub

El repositorio del monorepo es [aexgarcia/creovexa](https://github.com/aexgarcia/creovexa). La base inicial está publicada en `main`; los cambios siguientes se preparan en una rama por tarea y se integran mediante pull requests.

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para crear ramas, verificar cambios, abrir PR y configurar las protecciones de `main`. La [plantilla de PR](.github/pull_request_template.md) recoge el problema, los cambios y sus verificaciones.

El workflow [CI](.github/workflows/ci.yml) ejecuta formato, lint, TypeScript, validación del schema, pruebas unitarias, HTTP e integración con PostgreSQL, y compilación de API y web en los PR hacia `main` y en los pushes a `main`. Usa Node de `.node-version` y pnpm de `package.json`, instala con el lockfile congelado y crea un PostgreSQL desechable dentro del job. No necesita secretos de GitHub ni la base local del desarrollador. El resultado aparece como `Quality checks`; la protección de ramas debe configurarse por separado en GitHub.

## Repositorios anteriores

El código activo está en `apps/web` y `apps/api`, versionado desde el repositorio de la raíz y conectado a GitHub mediante `origin`. Los historiales originales se conservaron localmente en `.local/legacy-git/web.git` y `.local/legacy-git/api.git`, y los lockfiles originales en `.local/legacy-lockfiles/`. Esos respaldos no se incluyen al clonar el monorepo porque `.local` está excluido de Git.

```sh
git --git-dir=.local/legacy-git/web.git log --oneline
git --git-dir=.local/legacy-git/api.git log --oneline
```

Los directorios antiguos pueden conservar metadatos Git o cachés protegidos por el entorno; están excluidos del workspace y de Git. No son las aplicaciones activas. No se eliminó ningún historial ni se publicaron cambios en los remotos originales.

## Reglas y estado

Antes de implementar funcionalidades, revisa la [documentación en SDD](SDD/README.md), en especial las [reglas de trabajo](SDD/arquitectura/reglas-de-trabajo.md) y el [estado de fases](SDD/fases/estado.md), y las instrucciones `AGENTS.md` aplicables.

El historial de verificación de infraestructura está en [fase 1](SDD/historial/fase-1.md), el modelo en [dominio](SDD/arquitectura/dominio.md) y los incrementos actuales en [fase 4: API de productos y plantillas](SDD/historial/fase-4.md) y [API de campañas](SDD/historial/fase-4.md) y [aprobación y publicaciones](SDD/historial/fase-4.md).
