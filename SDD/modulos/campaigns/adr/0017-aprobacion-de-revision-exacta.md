# ADR-0017 · Aprobación de una revisión exacta y concurrencia optimista

- **Estado:** Aceptado (retroactivo)
- **Fecha de registro:** 2026-11-14 · decisión original: fases 2–4
- **Ámbito:** módulo `campaigns`

## Contexto

Aprobar una campaña autoriza publicar en nombre de la empresa. Entre que una persona ve la vista previa y pulsa "aprobar" puede haberse regenerado el contenido, o dos personas pueden actuar a la vez.

## Decisión

1. **Se aprueba una revisión concreta.** `POST /campaigns/:id/approve` exige el `contentId` que la persona revisó. Si ya no es el contenido candidato, responde `CONTENT_REVISION_MISMATCH`. La aprobación guarda `approvedContentId` y los destinos autorizados.
2. **Regenerar invalida la aprobación.** Cambiar la revisión exige aprobar de nuevo.
3. **No se modifica una campaña mientras se publica ni después de publicada.**
4. **Concurrencia optimista.** `Campaign` lleva una `version`; `CampaignRepository.save` recibe la versión esperada y falla con `ConcurrentCampaignModificationError` (`CAMPAIGN_CONFLICT`) si otro proceso escribió antes.
5. **Resultados fuera de tiempo se rechazan.** Un resultado de una generación que ya no es la vigente lanza `StaleGenerationResultError` (`STALE_GENERATION`).
6. **Aprobar exige el flyer.** `ApproveCampaign` comprueba que el asset final exista y sea legible.

## Alternativas consideradas

- **Aprobar "lo último" sin indicar revisión:** permite aprobar algo distinto de lo que se vio.
- **Bloqueos pesimistas:** retienen conexiones durante operaciones largas; se usan solo para la reserva breve de imagen.

## Consecuencias

- El CMS debe enviar el `contentId` mostrado y manejar los `409` recargando la campaña.
- Los trabajos en segundo plano ([ADR-0008](../../../adr/0008-cola-de-trabajos-y-worker.md)) pueden reintentarse sin riesgo de pisar un estado más nuevo.
- Todavía no se registra **quién** aprobó; depende de [ADR-0012](../../../adr/0012-autenticacion-antes-de-publicar.md).
