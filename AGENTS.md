# Instrucciones del proyecto Creovexa

Antes de planificar, implementar o revisar cambios, lee [architecture.md](architecture.md), ubicado junto a este archivo. Es la referencia de arquitectura y forma de trabajo para este espacio de trabajo, incluyendo `apps/api` (antes `creovexa-back`) y `apps/web` (antes `creovexa-front`).

El orden y alcance del desarrollo estan definidos en [fases1-4.5.md](fases1-4.5.md) y [fases5-10.md](fases5-10.md). Consulta la fase correspondiente antes de trabajar; estas guias sustituyen propuestas previas de fases. Su contenido no implica ejecutar todas las fases de una vez.

- Aplica sus reglas durante todas las fases. Consulta tambien las instrucciones `AGENTS.md` especificas del directorio que vayas a modificar.
- Mantén la arquitectura simple: controller -> caso de uso -> contrato de repositorio, con la implementacion de infraestructura inyectada. El contrato y su implementacion no son dos intermediarios de ejecucion. Los casos de uso acceden a integraciones externas mediante ports y adapters. Agrega capas, servicios, handlers, facades o abstracciones solo cuando tengan una responsabilidad real; evita cadenas que unicamente deleguen llamadas y carpetas vacias.
- Antes de programar cada funcionalidad, inspecciona la estructura y el codigo existentes, y enumera brevemente los cambios previstos.
- Trabaja por fases e implementa unicamente el alcance solicitado. Justifica las dependencias nuevas y explica las decisiones arquitectonicas importantes siguiendo `architecture.md`.
- Si detectas una decision problematica, explica el problema y propone una alternativa compatible antes de implementarla.
- Al terminar una fase, informa los archivos creados y modificados, las decisiones, las verificaciones realizadas y el siguiente paso recomendado. Indica cuando una verificacion no pudo ejecutarse.

Manten las reglas completas en `architecture.md`; evita duplicarlas aqui para que ambas referencias no diverjan.
