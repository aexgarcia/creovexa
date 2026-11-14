# Estado de fases y hoja de ruta

Actualizado el 14 de noviembre de 2026. Las guías originales son [fases 1 a 4.5](fases1-4.5.md) y [fases 5 a 10](fases5-10.md). Este documento registra el estado real y los ajustes al plan acordados tras la [evaluación](../arquitectura/evaluacion-2026-11.md). Donde este documento y las guías originales difieran, manda este.

## Estado

| Fase | Alcance | Estado | Historial |
| --- | --- | --- | --- |
| 1 | Infraestructura base, monorepo, Docker | Hecha | [fase 1](../historial/fase-1.md) |
| 2 | Modelo de dominio | Hecha | [fase 2](../historial/fase-2.md) |
| 3 | Persistencia con Prisma | Hecha | [fase 3](../historial/fase-3.md) |
| 4 | API HTTP | Hecha | [fase 4](../historial/fase-4.md) |
| 4.5 | CMS | Hecha | [fase 4.5](../historial/fase-4.5.md) |
| 5 | Copy con IA (OpenAI y Gemini) | Hecha | [fase 5](../historial/fase-5.md) |
| 6 | Imagen y composición | **A medias** (commiteada en `feat/campaign-image-generation`) | [fase 6](../historial/fase-6.md) |
| 7 | Orquestación | Replanificada (ver abajo) | — |
| 8 | Redes sociales | Pendiente | — |
| 9 | Autenticación, seguridad y auditoría | Pendiente; se propone adelantar parte | — |
| 10 | Resiliencia y producción | Pendiente | — |

Pendiente de la fase 6 según su historial: regeneración de imagen, historial con recuperación de versiones y prueba real con un proveedor visual.

## Ajustes al plan original

| Plan original | Ajuste | Decisión |
| --- | --- | --- |
| Fase 7: n8n como orquestador | Cola de trabajos en PostgreSQL y worker propio; n8n opcional | [ADR-0008](../adr/0008-cola-de-trabajos-y-worker.md) |
| Fase 6: IA genera imagen base y Playwright compone | Se evalúa IA completa con verificación; composición como modo alternativo | [ADR-0009](../adr/0009-estrategia-de-generacion-del-flyer.md) (propuesto) |
| Fase 9: autenticación al final | Adelantar identidad y contexto de organización antes de la fase 8 | [ADR-0012](../adr/0012-autenticacion-antes-de-publicar.md) (propuesto) |

## Hoja de ruta

Cada paso es un cambio pequeño y verificable con la suite de tests existente.

### Etapa A · Documentar (hecha)

- [x] Reorganizar `SDD/` y consolidar el historial.
- [x] ADRs retroactivos y contratos por módulo.
- [x] Revisión del autor del proyecto: ADRs confirmados el 14 de noviembre de 2026.

### Etapa B · Ordenar el código

1. ~~Commitear el estado actual de la fase 6 en una rama propia, tal como está.~~ Hecho: rama `feat/campaign-image-generation`.
2. ~~Cableado NestJS por módulo ([ADR-0011](../adr/0011-cableado-nestjs-por-modulo.md)), sin cambiar comportamiento.~~ Hecho. De paso, los tests unitarios se movieron de `src/` a `test/`.
3. Extraer el módulo `assets` y unificar los tres adapters de storage ([ADR-0010](../adr/0010-dividir-campaigns.md)).
4. Extraer `content-generation` desde `campaigns` ([ADR-0010](../adr/0010-dividir-campaigns.md)).
5. Cola de trabajos y worker; los endpoints de generación pasan a responder `202` ([ADR-0008](../adr/0008-cola-de-trabajos-y-worker.md)).

### Etapa C · Cerrar la generación

6. Prueba de calidad de IA completa (15 a 20 generaciones reales) y cierre de [ADR-0009](../adr/0009-estrategia-de-generacion-del-flyer.md).
7. Implementar la estrategia elegida, regeneración e historial de versiones. Con esto se cierra la fase 6.

### Etapa D · Publicar

8. Identidad mínima: usuarios, membresías y contexto de organización real ([ADR-0012](../adr/0012-autenticacion-antes-de-publicar.md)).
9. `social-accounts` y publicación por plataforma como trabajos de la cola (fase 8).
10. Roles, auditoría y endurecimiento (resto de la fase 9).
11. Resiliencia, despliegue y revisión final (fase 10).
