# ADR-0015 · Plantillas con revisiones inmutables y diseño estructurado

- **Estado:** Aceptado (retroactivo)
- **Fecha de registro:** 2026-11-14 · decisión original: fases 2 y 6
- **Ámbito:** módulo `templates`

## Contexto

Una campaña aprobada no puede cambiar de aspecto porque alguien editó su plantilla. Además, el plan original preveía plantillas HTML y CSS con variables, lo que abre la puerta a inyección de HTML y a recursos externos dentro del renderer.

## Decisión

1. **Revisiones inmutables.** `Template` es la identidad; cada edición crea una `TemplateRevision` numerada y mueve `currentRevisionId`. Una campaña referencia una revisión concreta, no la plantilla.
2. **Diseño estructurado, no HTML del cliente.** La revisión guarda un `FlyerDesign`: un layout y una paleta elegidos de listas cerradas, más interruptores de qué elementos mostrar. El HTML lo produce el sistema (`campaign-flyer-html.ts`) con valores escapados y una política de seguridad que bloquea red, scripts y fuentes externas.

## Alternativas consideradas

- **Plantillas HTML y CSS editables (plan original):** máxima flexibilidad, pero exige sanear HTML arbitrario y un editor; riesgo de inyección y de SSRF desde el renderer.
- **Editar la plantilla en sitio:** más simple, pero altera campañas ya generadas o aprobadas.

## Consecuencias

- El renderer solo procesa HTML generado por el sistema.
- Agregar un layout o una paleta requiere código, no configuración.
- La variedad visual es limitada (dos layouts y dos paletas), una de las razones que motivan [ADR-0009](../../../adr/0009-estrategia-de-generacion-del-flyer.md).
- `FlyerDesign` vive en `src/domain/value-objects` porque lo usan `templates` y la composición de campañas.
