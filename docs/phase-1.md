# Fase 1: base del proyecto

## Decisiones

### pnpm workspaces

Dos gestores y lockfiles separados dificultaban ejecutar y reproducir el proyecto. El workspace reúne las aplicaciones y una configuración compartida con un solo lockfile. pnpm workspaces es suficiente para las dos aplicaciones actuales. Turborepo agregaría otra herramienta sin una necesidad actual de caché de tareas o ejecución distribuida; no se incorporó.

### Migración de los proyectos

`creovexa-front` pasó a `apps/web` y `creovexa-back` a `apps/api`. Se conservaron los archivos de origen y las versiones principales de sus frameworks. Sus historiales se respaldaron bajo `.local/legacy-git/` y se inicializó Git en la raíz, sin commits, remotos nuevos ni push. Mantener repositorios anidados impediría versionar sus archivos normalmente desde la raíz; por ello, las aplicaciones activas no contienen `.git` propio.

Las dependencias antiguas del backend incluían junctions hacia otra ubicación de Windows. Se reinstalaron mediante pnpm en el workspace. Los directorios originales que conservan metadatos protegidos o dependencias antiguas están ignorados y no participan en las tareas.

### Configuración y dependencias

`@creovexa/config` centraliza TypeScript, ESLint y Prettier. Se agregaron `@eslint/js`, `typescript-eslint` y `globals` para configurar ESLint en el backend; sustituyen Oxlint conforme a la fase solicitada. El frontend conserva la configuración específica de Next.js. Prettier se ejecuta desde la raíz.

La API conserva TypeScript 6 y el frontend TypeScript 5 según sus bases originales. Ambos heredan comprobaciones estrictas comunes. El alias `@/*` pertenece a la web; `#app/*` usa imports nativos de Node en la API y resolución de TypeScript, sin un resolver adicional de producción.

Vite resuelve los aliases de TypeScript de forma nativa; se retiró `vite-tsconfig-paths`, cuyo parser requería TypeScript 5 y generaba un conflicto con TypeScript 6. Se retiró la integración inicial de Nest Observe con claves de ejemplo y su herramienta de despliegue: el arranque usa el logger JSON de NestJS sin exigir otra cuenta externa.

La configuración de API se carga y valida en un único proveedor de composición. Usa funciones nativas de Node para `.env` y validaciones concretas de puerto, host y origen. No se agregó una librería de configuración para tres valores. Las configuraciones de base de datos, IA, storage e integraciones se incorporarán a la API cuando sus módulos las consuman; actualmente las variables de infraestructura pertenecen a Compose.

### Healthchecks

`GET /health` en NestJS y Next.js comprueba disponibilidad HTTP. El controller de salud responde directamente porque no hay reglas de negocio que justifiquen un servicio o caso de uso. Los controllers de negocio futuros seguirán delegando en casos de uso.

### Infraestructura local

PostgreSQL, MinIO y n8n se ejecutan con Docker Compose; Next.js y NestJS se ejecutan en el host. Se evita introducir imágenes y ciclos de reconstrucción de las aplicaciones en esta fase. El despliegue de todas las aplicaciones en contenedores queda para la revisión de producción.

PostgreSQL usa un volumen persistente y una base/usuario distintos para n8n. Los scripts de inicialización solo se ejecutan al crear el volumen. El usuario administrativo de PostgreSQL se utiliza para inicialización local; la API aún no conecta a la base. Se incorporará un usuario de aplicación con permisos adecuados al implementar persistencia.

MinIO publica ahora su distribución comunitaria desde código fuente. La etiqueta de imagen anterior no pudo descargarse y la release posterior corrige un problema de seguridad. Se conserva el proveedor solicitado construyendo `RELEASE.2025-10-15T17-29-55Z` desde su fuente oficial, con un contenedor sin privilegios de root. La alternativa de usar una imagen comunitaria de terceros agregaría un proveedor no solicitado. La imagen se compiló y arrancó correctamente con Docker el 17 de septiembre de 2026.

La configuración es para desarrollo local: puertos publicados en loopback, cookies de n8n sin HTTPS solo en localhost, contraseñas y clave de cifrado generadas en archivos de entorno ignorados por Git. No contiene una configuración de producción ni credenciales de redes sociales.

## Verificación

Verificado en este equipo el 16 de septiembre de 2026:

| Comprobación                    | Resultado                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| Instalación del workspace       | Correcta; cuatro paquetes y un solo lockfile                                        |
| `pnpm peers check`              | Sin incompatibilidades de peer dependencies                                         |
| `pnpm typecheck`                | API y web correctas                                                                 |
| `pnpm lint`                     | API, web, scripts y configuración correctos                                         |
| `pnpm format:check`             | Correcto                                                                            |
| `pnpm test`                     | 12 pruebas de configuración correctas                                               |
| `pnpm test:e2e`                 | Una prueba de arranque y salud HTTP correcta                                        |
| `pnpm build`                    | NestJS y Next.js compilaron correctamente                                           |
| `pnpm dev`                      | Ambas aplicaciones iniciaron con recarga automática                                 |
| `pnpm healthcheck --apps-only`  | Web y API: OK                                                                       |
| Petición a `/` del CMS          | HTTP 200                                                                            |
| Salud de API con origen del CMS | HTTP 200 y cabecera CORS correspondiente                                            |
| `pnpm setup:env` repetido       | Conservó los tres archivos existentes, comprobado por hash                          |
| `pnpm infra:check`              | Compose válido sin mostrar valores secretos                                         |
| Imágenes base                   | Manifests de PostgreSQL, n8n y Go disponibles en los registros                      |
| Historiales originales          | Ambos respaldos superaron `git fsck --full`                                         |
| Exclusión de secretos           | Los tres archivos locales de entorno están ignorados; sus ejemplos son versionables |

Vitest y los compiladores necesitaron ejecutarse fuera del sandbox, que inicialmente bloqueaba sus procesos secundarios. Las pruebas anteriores corresponden a las ejecuciones que sí pudieron completarse.

En la verificación inicial, Docker Desktop no pudo iniciar porque la virtualización no estaba habilitada. Ese bloqueo se resolvió y las comprobaciones pendientes se completaron el 17 de septiembre de 2026.

### Validación de Docker completada

| Comprobación                          | Resultado                                                                |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Motor Docker Desktop                  | Operativo con contenedores Linux                                         |
| `pnpm infra:check`                    | Compose válido                                                           |
| Construcción de MinIO                 | Correcta desde el Dockerfile existente                                   |
| `pnpm infra:up` y `pnpm infra:status` | PostgreSQL, MinIO y n8n en estado `healthy`                              |
| Inicialización SQL                    | Bases `creovexa` y `creovexa_n8n`, con sus propietarios correspondientes |
| Migraciones de n8n                    | 139 tablas en el esquema público de su base y readiness correcto         |
| `pnpm dev`                            | API y CMS iniciaron correctamente                                        |
| `pnpm healthcheck`                    | Web, API, MinIO y n8n: OK                                                |

El primer arranque detectó que otro proceso local ocupaba los puertos 9000 y 9001. Se cambiaron únicamente `MINIO_PORT=9100` y `MINIO_CONSOLE_PORT=9101` en el `.env` local, excluido de Git. Los ejemplos conservan los puertos predeterminados; cada equipo puede adaptarlos sin modificar Compose. En este equipo, la API de MinIO está en `http://localhost:9100` y su consola en `http://localhost:9101`.

Se conservaron las credenciales existentes y los volúmenes. Esta validación cierra las comprobaciones de arranque y salud pendientes de la fase 1; las operaciones de almacenamiento y los workflows de negocio se verificarán al implementar sus integraciones.

## Archivos creados y modificados

- Raíz: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.env.example`, `.gitignore`, `.gitattributes`, `.editorconfig`, `.node-version`, `.prettierignore`, configuraciones de ESLint/Prettier y `README.md`; actualizado `AGENTS.md` con las nuevas rutas.
- `packages/config/`: manifiesto y configuraciones comunes de TypeScript, ESLint y Prettier.
- `apps/api/`: trasladado el proyecto; actualizados manifiesto, TypeScript, Vitest, arranque, módulo raíz, prueba HTTP y README; agregados proveedor de configuración, sus pruebas, controller de salud, ESLint y ejemplo de entorno. Retirados los archivos de ejemplo `AppService`/`AppController`, su prueba, la configuración de Oxlint y el Prettier duplicado.
- `apps/web/`: trasladado el proyecto; actualizados manifiesto, TypeScript, configuración de Next.js, metadatos, fuentes locales y README; agregados `/health` y ejemplo de entorno. Aplicado el formato común a los archivos existentes.
- `infrastructure/docker/`: Compose, inicialización PostgreSQL e imagen de MinIO.
- `automation/n8n/README.md`, `scripts/setup-env.mjs`, `scripts/healthcheck.mjs` y este documento.

No se implementaron módulos de negocio, Prisma, integraciones de IA ni workflows. Las reglas originales y los archivos de fases se conservaron sin modificaciones.

## Siguiente paso

Proponer el modelo de dominio de la fase 2 antes de implementarlo. Para volver a preparar el entorno local, iniciar Docker Desktop, ejecutar `pnpm infra:up` y `pnpm dev`, y comprobar `pnpm healthcheck`.

## Referencias consultadas

- [pnpm workspaces](https://pnpm.io/workspaces).
- [Orden de arranque y healthchecks en Docker Compose](https://docs.docker.com/compose/how-tos/startup-order/).
- [Instalación de n8n en Docker](https://docs.n8n.io/hosting/installation/docker/).
- [MinIO: compilación desde fuente](https://github.com/minio/minio#install-from-source).
- [MinIO: release con corrección de seguridad](https://github.com/minio/minio/releases/tag/RELEASE.2025-10-15T17-29-55Z).
- Documentación de Next.js incluida en el paquete instalado: `apps/web/node_modules/next/dist/docs/`.
