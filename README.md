# Creovexa

Monorepo para la plataforma de automatización de marketing. El dominio de la fase 2 está implementado. La fase 3 incorpora persistencia de organizaciones, catálogo, plantillas, campañas y publicaciones, con snapshots, historial de intentos, control de versión y transacciones entre campaña y destinos. Los endpoints de negocio corresponden a la fase 4.

## Estructura

```text
apps/
  web/                    # Next.js; antes creovexa-front
  api/                    # NestJS; antes creovexa-back
packages/
  config/                 # TypeScript, ESLint y Prettier compartidos
automation/
  n8n/                    # Documentación; workflows desde la fase 7
infrastructure/
  docker/
    compose.yaml          # PostgreSQL, MinIO y n8n locales
    postgres/             # Inicialización de la base independiente de n8n
    minio/                # Imagen construida desde el código oficial
scripts/                  # Preparación de entorno y comprobación de salud
docs/                     # Decisiones y validación de cada fase
architecture.md           # Reglas de arquitectura
fases1-4.5.md              # Alcance y orden de fases iniciales
fases5-10.md               # Alcance y orden de fases posteriores
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
pnpm dev
```

`setup:env` crea `.env`, `apps/api/.env` y `apps/web/.env.local` a partir de sus ejemplos. Genera contraseñas y clave de cifrado aleatorias y conserva las variables existentes. Si falta `DATABASE_URL` en la API, la añade usando las credenciales de PostgreSQL del entorno raíz, sin imprimirlas. Estos archivos se ignoran en Git. No uses `pnpm setup`: ese es un comando propio del gestor de paquetes.

`db:migrate` aplica las migraciones versionadas mediante `prisma migrate deploy`; no resetea la base ni modifica la base independiente de n8n. El cliente Prisma se genera automáticamente al comprobar tipos, ejecutar pruebas o compilar. Consulta [persistencia comercial](docs/phase-3-commercial.md), [campañas](docs/phase-3-campaigns.md) y [publicaciones](docs/phase-3-publications.md) para sus límites y pruebas de PostgreSQL.

Las aplicaciones se ejecutan en el host con recarga automática; los tres servicios de infraestructura se ejecutan en Docker. También puedes usar `pnpm dev:web` y `pnpm dev:api` por separado.

| Servicio      | Dirección             | Salud                   |
| ------------- | --------------------- | ----------------------- |
| CMS           | http://localhost:3000 | `/health`               |
| API           | http://localhost:3001 | `/health`               |
| n8n           | http://localhost:5678 | `/healthz/readiness`    |
| MinIO S3      | http://localhost:9000 | `/minio/health/live`    |
| MinIO consola | http://localhost:9001 | —                       |
| PostgreSQL    | localhost:5432        | `pg_isready` en Compose |

En la primera visita a n8n se crea el usuario propietario desde su interfaz. Para MinIO, consulta `MINIO_ROOT_USER` y `MINIO_ROOT_PASSWORD` en tu `.env` local.

Los puertos de infraestructura se pueden cambiar en `.env`. El puerto de API se configura con `API_PORT` en `apps/api/.env`; actualiza `NEXT_PUBLIC_API_URL` en `apps/web/.env.local` si lo cambias. El CMS usa el puerto 3000, y `CORS_ORIGIN` limita el origen aceptado por la API. Las URLs públicas del frontend no deben contener secretos.

El healthcheck de las aplicaciones comprueba que responden por HTTP; es una comprobación de vida, no de disponibilidad de PostgreSQL. El cliente abre conexiones al ejecutar consultas y las libera al cerrar NestJS. PostgreSQL y MinIO tienen comprobaciones propias; la de n8n espera también la conexión a su base y sus migraciones.

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

`infra:check` valida Compose sin imprimir secretos ni requerir el motor en ejecución. `infra:down` conserva los volúmenes. Las credenciales de PostgreSQL y n8n deben conservarse junto con esos volúmenes: cambiar el `.env` no actualiza automáticamente usuarios existentes ni recifra credenciales guardadas.

`test:integration` requiere PostgreSQL disponible. Crea un esquema aleatorio `creovexa_test_…`, aplica las migraciones y elimina únicamente ese esquema al terminar, incluso si falla una prueba. Usa `TEST_DATABASE_URL` si está definida y, en caso contrario, `DATABASE_URL` de la API. Las pruebas unitarias y HTTP no necesitan una conexión a PostgreSQL.

MinIO se compila desde una versión fija del código oficial; su primer arranque necesita descargar las imágenes base y compilar Go. Consulta la justificación en [las decisiones de la fase 1](docs/phase-1.md).

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

Antes de implementar funcionalidades, revisa [architecture.md](architecture.md), [fases1-4.5.md](fases1-4.5.md), [fases5-10.md](fases5-10.md) y las instrucciones `AGENTS.md` aplicables.

El historial de verificación de infraestructura está en [fase 1](docs/phase-1.md), el modelo en [dominio](docs/domain.md) y el incremento actual en [fase 3: persistencia de publicaciones](docs/phase-3-publications.md).
