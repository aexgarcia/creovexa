# Contribuir a Creovexa

Trabajamos con `main` como base estable y una rama corta por tarea. Cada cambio se integra mediante un pull request (PR).

## Antes de empezar

Consulta [architecture.md](architecture.md), la fase correspondiente en [fases1-4.5.md](fases1-4.5.md) o [fases5-10.md](fases5-10.md), y los archivos `AGENTS.md` aplicables. Esas referencias definen la arquitectura y el alcance; esta guía describe el flujo de GitHub.

Prepara el entorno siguiendo el [README](README.md#desarrollo-local). Usa la versión de Node indicada en `.node-version` y la versión de pnpm declarada en `package.json`, que también utiliza CI.

Para funcionalidades o correcciones, crea una issue con el problema, el resultado esperado y criterios de aceptación. Una fase puede necesitar varias issues y varios PR pequeños.

## Crear una rama

Con los cambios anteriores guardados y el directorio de trabajo limpio:

```sh
git switch main
git pull --ff-only
git switch -c feat/organization-domain
```

Elige un nombre breve con uno de estos prefijos:

| Prefijo     | Uso                                | Ejemplo                    |
| ----------- | ---------------------------------- | -------------------------- |
| `feat/`     | Funcionalidad                      | `feat/organization-domain` |
| `fix/`      | Corrección de un error             | `fix/campaign-status`      |
| `chore/`    | Herramientas o configuración       | `chore/github-workflow`    |
| `docs/`     | Documentación                      | `docs/local-setup`         |
| `refactor/` | Mejoras sin cambiar comportamiento | `refactor/product-mapping` |

Implementa una tarea acotada por rama. Si necesitas comentarios antes de terminar, abre el PR como borrador.

## Verificar y guardar los cambios

Desde la raíz, ejecuta las mismas comprobaciones que CI:

```sh
pnpm format:check
pnpm db:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:integration
pnpm build
```

Para corregir formato, ejecuta `pnpm exec prettier --write` seguido de las rutas modificadas. Revisa el diff antes de incluir archivos:

```sh
git status --short
git diff
git add apps/api
git diff --cached
git commit -m "feat(organizations): agregar dominio inicial"
git push -u origin feat/organization-domain
```

Adapta las rutas, el mensaje y la rama a tu tarea. Incluye solo sus archivos; conserva los secretos en los archivos de entorno ignorados por Git. Si cambian dependencias, incluye el manifiesto y `pnpm-lock.yaml`.

Usa mensajes con el formato `tipo(alcance): descripción`; el alcance es opcional. Por ejemplo: `fix(api): validar puerto` o `chore: configurar CI`. No hay herramientas adicionales que impongan este formato.

## Abrir y revisar el PR

En [Pull requests](https://github.com/aexgarcia/creovexa/pulls), crea un PR con destino `main` y tu rama como origen. Completa la plantilla, explica las pruebas realizadas y vincula la issue con `Closes #123` cuando corresponda.

Revisa **Files changed** y espera a que **Quality checks** termine correctamente. Corrige cualquier fallo antes de integrar. Los nuevos commits que subas a la misma rama actualizan el PR. Si hay colaboradores, solicita revisión; si trabajas solo, revisa el diff y los resultados de CI antes de fusionar.

Usa **Squash and merge**, con un título descriptivo para el commit resultante, y elimina la rama remota al terminar. Actualiza después tu copia local:

```sh
git switch main
git pull --ff-only
```

Crea la siguiente rama desde ese `main` actualizado.

## Verificaciones automáticas

[CI](.github/workflows/ci.yml) se ejecuta en los PR hacia `main`, en los pushes a `main` y mediante ejecución manual cuando el workflow esté en la rama predeterminada. Comprueba todo el monorepo, incluso cuando solo cambia documentación.

Un solo job instala las dependencias con `--frozen-lockfile` y ejecuta formato, validación del schema, lint, tipos, pruebas unitarias, HTTP e integración de la API y compilación de ambas aplicaciones. Así evitamos duplicar instalaciones para el tamaño actual del proyecto. La caché de pnpm usa el lockfile; las versiones de Node y pnpm provienen de los archivos existentes.

Las verificaciones no requieren secretos de GitHub. El job inicia un PostgreSQL desechable para `test:integration`; localmente este comando utiliza un esquema temporal en la conexión configurada. La prueba e2e sigue cubriendo el arranque HTTP y `/health` de la API de forma independiente de PostgreSQL. MinIO, n8n y navegación del CMS permanecen fuera de estas pruebas.

El workflow solo necesita permiso de lectura sobre el repositorio y no despliega aplicaciones.

## Configuración inicial en GitHub

Después de la primera ejecución de CI, configura en los ajustes del repositorio, si el plan lo permite:

- PR obligatorio para integrar en `main`.
- `Quality checks` como comprobación obligatoria.
- Bloqueo de force pushes y de eliminación de `main`.
- Resolución de conversaciones antes de integrar.
- Squash merge habilitado y eliminación automática de ramas fusionadas.

Si trabajas solo, no exijas aprobaciones de otro revisor. Cuando haya colaboradores, puedes exigir una aprobación. Estas opciones se configuran en GitHub; agregar el workflow no activa la protección de ramas.

## Referencias

- [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow).
- [Protección de ramas y disponibilidad según el plan](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/about-protected-branches).
- [actions/checkout](https://github.com/actions/checkout), [actions/setup-node](https://github.com/actions/setup-node) y [pnpm/action-setup](https://github.com/pnpm/action-setup).
