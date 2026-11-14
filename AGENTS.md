# Instrucciones del proyecto Creovexa

Toda la documentación de diseño está en [SDD/](SDD/README.md). Antes de planificar, implementar o revisar cambios, lee:

1. [SDD/arquitectura/reglas-de-trabajo.md](SDD/arquitectura/reglas-de-trabajo.md): reglas de arquitectura y forma de trabajo para `apps/api` (antes `creovexa-back`) y `apps/web` (antes `creovexa-front`).
2. [SDD/arquitectura/vision.md](SDD/arquitectura/vision.md): el sistema actual y la arquitectura objetivo.
3. [SDD/fases/estado.md](SDD/fases/estado.md): estado real y hoja de ruta. Las guías originales son [fases1-4.5.md](SDD/fases/fases1-4.5.md) y [fases5-10.md](SDD/fases/fases5-10.md); donde difieran de `estado.md` o de un ADR aceptado, mandan estos últimos. Su contenido no implica ejecutar todas las fases de una vez.
4. El `contrato.md` del módulo que vayas a modificar, en [SDD/modulos/](SDD/modulos/), y el [índice de ADRs](SDD/adr/README.md).

- Aplica esas reglas durante todas las fases. Consulta tambien las instrucciones `AGENTS.md` especificas del directorio que vayas a modificar.
- Mantén la arquitectura simple: controller -> caso de uso -> contrato de repositorio, con la implementacion de infraestructura inyectada. El contrato y su implementacion no son dos intermediarios de ejecucion. Los casos de uso acceden a integraciones externas mediante ports y adapters. Agrega capas, servicios, handlers, facades o abstracciones solo cuando tengan una responsabilidad real; evita cadenas que unicamente deleguen llamadas y carpetas vacias.
- Antes de programar cada funcionalidad, inspecciona la estructura y el codigo existentes, y enumera brevemente los cambios previstos.
- Trabaja por fases e implementa unicamente el alcance solicitado. Justifica las dependencias nuevas y explica las decisiones arquitectonicas importantes siguiendo `reglas-de-trabajo.md`.
- Si detectas una decision problematica, explica el problema y propone una alternativa compatible antes de implementarla.
- Documenta en el mismo cambio: si modificas un endpoint, un port o una dependencia entre modulos, actualiza el `contrato.md` del modulo. Si tomas una decision arquitectonica, crea un ADR con el siguiente numero libre y agregalo al indice. No implementes un ADR en estado `Propuesto` sin cerrarlo antes.
- Los tests de `apps/api` viven en `apps/api/test`, nunca dentro de `src`. Los unitarios (`*.spec.ts`) replican la ruta del archivo que prueban: `src/modules/x/domain/y.ts` se prueba en `test/modules/x/domain/y.spec.ts`, e importan el codigo con el alias `#app/`. Las suites `*.e2e-spec.ts`, `*.integration-spec.ts`, `*.storage-spec.ts` y `*.render-spec.ts` y los fakes de `test/support` se mantienen en la raiz de `test`.
- Nunca versiones secretos: solo `.env.example` con valores de ejemplo. Claves, tokens, certificados y credenciales exportadas estan excluidos en `.gitignore`.
- Al terminar una fase, informa los archivos creados y modificados, las decisiones, las verificaciones realizadas y el siguiente paso recomendado. Indica cuando una verificacion no pudo ejecutarse.

Manten las reglas completas en `SDD/arquitectura/reglas-de-trabajo.md`; evita duplicarlas aqui para que ambas referencias no diverjan.
