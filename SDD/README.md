# Documentación de Creovexa (SDD)

Toda la documentación de diseño del sistema vive en esta carpeta. El código es la fuente de verdad del comportamiento; estos documentos explican **qué existe, por qué se decidió así y qué falta**.

## Mapa

| Carpeta | Contenido | Cuándo se actualiza |
| --- | --- | --- |
| [arquitectura/](arquitectura/) | [Visión del sistema](arquitectura/vision.md), [modelo de dominio](arquitectura/dominio.md), [evaluación de noviembre 2026](arquitectura/evaluacion-2026-11.md), [datos para generar el flyer](arquitectura/datos-del-flyer.md) (propuesta) y [reglas de trabajo](arquitectura/reglas-de-trabajo.md) | Cuando cambia la estructura del sistema |
| [adr/](adr/) | Índice de todas las decisiones de arquitectura (ADR) y las decisiones transversales | Cada decisión nueva o reemplazada |
| [modulos/](modulos/) | Un `contrato.md` por módulo (API HTTP, qué expone y qué consume) y sus ADRs propios | En el mismo cambio que modifica el módulo |
| [fases/](fases/) | [Estado y hoja de ruta](fases/estado.md) y las guías originales de fases | Al cerrar o replanificar una fase |
| [guias/](guias/) | Guías operativas (configuración de proveedores, etc.) | Cuando cambia la operación |
| [historial/](historial/) | Bitácora consolidada de cada fase ya ejecutada | Solo se agrega; no se reescribe |

## Reglas de la documentación

1. **Un contrato por módulo.** Si un cambio agrega o modifica un endpoint, un port o una dependencia entre módulos, el `contrato.md` del módulo se actualiza en el mismo cambio.
2. **Una decisión, un ADR.** Los ADR usan numeración global (`ADR-0001`, `ADR-0002`…). Los transversales están en `adr/`; los propios de un módulo, en `modulos/<modulo>/adr/`. El [índice](adr/README.md) lista todos.
3. **Los ADR no se editan para cambiar la decisión.** Se crea uno nuevo que reemplaza al anterior y se marca el antiguo como `Reemplazado por ADR-XXXX`.
4. **El historial no se corrige.** Describe lo que se hizo en su momento. El estado vigente está en los contratos y en [fases/estado.md](fases/estado.md).
5. **Idioma:** español. Los nombres de código (clases, endpoints, variables) se escriben tal como están en el código.

## Por dónde empezar

- Para entender el sistema: [visión](arquitectura/vision.md) → [dominio](arquitectura/dominio.md) → contrato del módulo que te interese.
- Para saber qué sigue: [estado y hoja de ruta](fases/estado.md).
- Para saber por qué algo es como es: [índice de ADRs](adr/README.md).
