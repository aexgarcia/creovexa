# ADR-0019 · Perfil de marca y logo en la organización

- **Estado:** Aceptado (retroactivo)
- **Fecha de registro:** 2026-11-14 · decisión original: fases 2 y 4.5
- **Ámbito:** módulo `organizations`

## Contexto

El copy y el flyer necesitan el nombre de la empresa, cómo se describe, en qué tono habla y su logo. Esos datos son los mismos para todas sus campañas.

## Decisión

`Organization` guarda el perfil de marca: `name`, `description`, `brandTone` opcional y la referencia a un logo. No contiene colecciones de usuarios, productos ni campañas.

El logo es un asset inmutable: subir uno nuevo crea otro registro y cambia `logoAssetId`. Las generaciones ya hechas siguen apuntando, mediante su snapshot, al logo con el que se crearon.

## Alternativas consideradas

- **Pedir tono y logo en cada campaña:** repetitivo y propenso a inconsistencias de marca.
- **Un módulo `brand` separado:** sin reglas propias que lo justifiquen por ahora.
- **Sobrescribir el logo:** una campaña aprobada cambiaría de aspecto al reemplazarlo.

## Consecuencias

- Cambiar el perfil no altera campañas ya generadas ([ADR-0016](../../campaigns/adr/0016-snapshot-inmutable-por-generacion.md)).
- Si una empresa necesitara varias marcas, habría que separar marca de organización.
- Idioma, zona horaria y formato regional todavía no forman parte del perfil.
