# Creovexa

Monorepo para la plataforma de automatización de marketing. Esta fase prepara las aplicaciones y la infraestructura de desarrollo; los módulos de negocio se implementan en las fases siguientes.

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
pnpm dev
```

`setup:env` crea `.env`, `apps/api/.env` y `apps/web/.env.local` a partir de sus ejemplos. Genera contraseñas y clave de cifrado aleatorias, conserva los archivos existentes y no imprime secretos. Estos archivos se ignoran en Git. No uses `pnpm setup`: ese es un comando propio del gestor de paquetes.

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

El healthcheck de las aplicaciones comprueba que responden por HTTP; no comprueba servicios que aún no consumen. PostgreSQL y MinIO tienen comprobaciones propias; la de n8n espera también la conexión a su base y sus migraciones.

## Comandos

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm test:e2e
pnpm build
pnpm healthcheck
pnpm healthcheck --apps-only
pnpm infra:check
pnpm infra:status
pnpm infra:down
```

`infra:check` valida Compose sin imprimir secretos ni requerir el motor en ejecución. `infra:down` conserva los volúmenes. Las credenciales de PostgreSQL y n8n deben conservarse junto con esos volúmenes: cambiar el `.env` no actualiza automáticamente usuarios existentes ni recifra credenciales guardadas.

MinIO se compila desde una versión fija del código oficial; su primer arranque necesita descargar las imágenes base y compilar Go. Consulta la justificación en [las decisiones de la fase 1](docs/phase-1.md).

## Trabajo con GitHub

El repositorio del monorepo es [aexgarcia/creovexa](https://github.com/aexgarcia/creovexa). La base inicial está publicada en `main`; los cambios siguientes se preparan en una rama por tarea y se integran mediante pull requests.

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para crear ramas, verificar cambios, abrir PR y configurar las protecciones de `main`. La [plantilla de PR](.github/pull_request_template.md) recoge el problema, los cambios y sus verificaciones.

El workflow [CI](.github/workflows/ci.yml) ejecuta formato, lint, TypeScript, pruebas unitarias y HTTP de la API, y compilación de API y web en los PR hacia `main` y en los pushes a `main`. Usa Node de `.node-version` y pnpm de `package.json`, instala con el lockfile congelado y no necesita secretos ni servicios externos para las pruebas actuales. El resultado aparece como `Quality checks`; la protección de ramas debe configurarse por separado en GitHub.

## Repositorios anteriores

El código activo está en `apps/web` y `apps/api`, versionado desde el repositorio de la raíz y conectado a GitHub mediante `origin`. Los historiales originales se conservaron localmente en `.local/legacy-git/web.git` y `.local/legacy-git/api.git`, y los lockfiles originales en `.local/legacy-lockfiles/`. Esos respaldos no se incluyen al clonar el monorepo porque `.local` está excluido de Git.

```sh
git --git-dir=.local/legacy-git/web.git log --oneline
git --git-dir=.local/legacy-git/api.git log --oneline
```

Los directorios antiguos pueden conservar metadatos Git o cachés protegidos por el entorno; están excluidos del workspace y de Git. No son las aplicaciones activas. No se eliminó ningún historial ni se publicaron cambios en los remotos originales.

## Reglas y estado

Antes de implementar funcionalidades, revisa [architecture.md](architecture.md), [fases1-4.5.md](fases1-4.5.md), [fases5-10.md](fases5-10.md) y las instrucciones `AGENTS.md` aplicables.

El estado de las verificaciones y las limitaciones del equipo se registran en [docs/phase-1.md](docs/phase-1.md).
