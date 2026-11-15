# ADR-0014 · Una sola imagen por producto

- **Estado:** Aceptado (retroactivo)
- **Fecha de registro:** 2026-11-14 · decisión original: fase 6
- **Ámbito:** módulo `products`

## Contexto

La generación visual necesita una foto de referencia del producto. Permitir varias obligaría a elegir cuál usar en cada campaña.

## Decisión

Cada producto o servicio tiene **cero o una** imagen. Puede crearse sin imagen, pero generar publicidad exige exactamente una. No hay galerías ni selector de imagen principal; la campaña toma la imagen automáticamente.

Se conserva el campo `imageAssetIds` (lista) limitado a un elemento, con una restricción en base de datos, para no cambiar respuestas, snapshots ni columnas existentes. Reemplazar la imagen crea un asset nuevo; el anterior se conserva para las generaciones que lo usaron.

## Alternativas consideradas

- **Galería con imagen principal:** más flexible, pero agrega interfaz y decisiones que el flujo de generación no necesita.
- **Renombrar el campo a `imageAssetId`:** más claro, a costa de migrar snapshots y contratos ya publicados.

## Consecuencias

- El flujo de campaña no pregunta qué imagen usar.
- El nombre en plural del campo es engañoso; conviene corregirlo cuando se unifiquen los assets ([ADR-0010](../../../adr/0010-dividir-campaigns.md)).
- Si se necesitaran varias fotos de referencia para la IA, este ADR debe reemplazarse.
