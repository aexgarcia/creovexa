# Contratos propuestos de generación y publicación

Estado: diseño para los incrementos siguientes, después del PR #16. **No son endpoints ni ports implementados.** Las guías `fases1-4.5.md` y `fases5-10.md` mantienen el orden de desarrollo. Este documento concreta los límites entre las funcionalidades pendientes de fase 4 y las integraciones de fases 5–8; no autoriza implementarlas todas juntas.

## Diferencias con el código actual

`RequestCampaignGeneration` y `RequestCampaignRegeneration` capturan un snapshot, cambian el estado y persisten una generación. Todavía no programan trabajo externo. Exponerlos directamente como una generación aceptada dejaría campañas en `GENERATING` sin un ejecutor responsable.

`GeneratedContent.create` exige un asset y el CTA exacto del snapshot. El resultado textual de fase 5 aún no dispone de imagen; además, `imagePrompt` no tiene un campo persistido. Propuesta: persistir un resultado textual provisional asociado a `generationId` dentro del contexto de campañas, con unicidad por generación. No crear contenido aprobable con assets ficticios ni relajar sus invariantes. En fase 6, componer ese resultado con el asset final para crear `GeneratedContent` y pasar a `PENDING_APPROVAL`. Esta adaptación requiere un cambio de modelo y migración en su propio incremento.

`ApproveCampaign` aprueba el contenido sin cuentas de destino. El dominio sí puede registrar destinos y exige que las publicaciones coincidan con ellos. Antes del envío real se debe extender la aprobación para validar y guardar cuentas de la organización, habilitadas y compatibles. Las aprobaciones actuales con destinos vacíos no habilitarán publicación. Cambiar destinos requerirá una operación explícita de reaprobación; no se modificarán silenciosamente al publicar.

## API pública pendiente

Se propone exigir `Idempotency-Key` y un cuerpo con `expectedVersion` entero no negativo. El ámbito de una clave será organización, campaña y operación. La misma clave con el mismo cuerpo devuelve la aceptación original; con otro cuerpo, 409. Dos solicitudes nuevas concurrentes se arbitran mediante la versión persistida. Estos mecanismos aún no existen y deben implementarse antes de exponer los endpoints.

| Endpoint propuesto               | Entrada adicional                  | Precondición                                        | Aceptación propuesta                                    |
| -------------------------------- | ---------------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| `POST /campaigns/:id/generate`   | Ninguna                            | `DRAFT`; referencias y oferta válidas               | 202 con `campaignId`, `generationId` y versión aceptada |
| `POST /campaigns/:id/regenerate` | Ninguna para regeneración completa | Estado permitido por `Campaign.requestRegeneration` | 202 con nueva generación; aprobación previa invalidada  |
| `POST /campaigns/:id/publish`    | `approvedContentId`                | `APPROVED`, contenido y destinos aprobados vigentes | 202 con `campaignId` e IDs de publicaciones aceptadas   |

El cliente no envía precios, snapshots, URLs arbitrarias de callbacks ni credenciales. La API resuelve la organización y obtiene los datos comerciales persistidos. Regeneración parcial de imagen tendrá su contrato propio en fase 6, preservando el historial y la revisión exacta del copy reutilizado.

Un 202 significará que el trabajo quedó **registrado de forma durable**, no que OpenAI o una red social lo completaron. Se propone guardar cambio de estado, recibo de idempotencia y mensaje pendiente en una misma transacción PostgreSQL. Un ejecutor entrega el mensaje fuera de esa transacción, con reclamación temporal y reintentos limitados. No hace falta introducir un broker: una tabla de trabajos pendientes es suficiente inicialmente. Esta persistencia adicional debe implementarse y probarse; no se puede garantizar la entrega con un simple POST externo después del commit.

Errores propuestos: 400 para entrada inválida; 404 para campaña ajena o inexistente; 409 para versión, estado, contenido o clave incompatibles; 503 si la integración no está configurada, comprobado antes de modificar el estado. Las respuestas y el `requestId` mantienen el contrato HTTP existente.

## Generación textual: siguiente incremento de fase 5

`GenerateCampaignCopy` recibirá organización, campaña y `generationId`, y utilizará el snapshot de esa generación; no reconstruirá precios a partir del catálogo actual. Dependerá de un port `CopyGenerator` y de contratos de persistencia internos, sin importar OpenAI ni NestJS.

Entrada del port: nombre y descripción del producto, precio habitual, oferta y vigencia, perfil de empresa, tono, instrucciones y CTA exacto. Dinero en unidades menores con moneda; fechas normalizadas. Salida propuesta: `headline`, `caption`, `cta`, `hashtags`, `imagePrompt`. El adapter deberá validar un esquema estricto y rechazar campos adicionales, vacíos y tamaños excesivos antes de retornar.

La validación de JSON no garantiza veracidad comercial. El CTA se compara con el snapshot; precios, fechas, descuentos y condiciones se incorporan desde datos autoritativos mediante composición determinista. El texto libre se mantiene sujeto a revisión humana. El diseño no promete detectar toda afirmación inventada mediante un schema o expresiones regulares.

Primero se implementarán caso de uso, persistencia provisional y fake del port. Después, `OpenAICopyGenerator`, con configuración validada, timeout y reintentos acotados. La elección de modelo y parámetros se verificará contra la documentación oficial al implementar el adapter. Ningún test unitario hará llamadas facturables.

Criterios de aceptación: rechazo de generación ajena u obsoleta; uso del snapshot original; CTA inalterado; persistencia idempotente del resultado provisional; conflicto ante un resultado diferente para la misma generación; ausencia de contenido aprobable mientras falten assets; errores explícitos y logs sin secretos. Un reintento no sobrescribe el resultado ya aceptado.

## Imagen, almacenamiento y composición: fase 6

`ImageGenerator` recibe el prompt validado y devuelve una referencia a una imagen base. `TemplateRenderer` recibe la revisión de plantilla y datos exactos del snapshot. `StorageProvider` guarda el resultado y devuelve una referencia interna al asset. Los casos de uso no conocen MinIO ni las APIs de OpenAI.

El renderer controla las plantillas ejecutables, escapa valores y restringe recursos de red a orígenes autorizados. No se ejecutará HTML arbitrario enviado por un cliente ni se utilizarán URLs de entrada como permisos implícitos para acceder a la red. Estas garantías pertenecen a la implementación y pruebas de fase 6.

## Orquestación y callbacks: fase 7

`WorkflowOrchestrator` aceptará comandos versionados con un identificador estable de operación y referencias a organización, campaña y generación o publicación/intento. n8n coordina pasos; NestJS conserva snapshots, estados e idempotencia. La entrega repetida de un comando no crea una nueva generación ni un nuevo destino.

Los callbacks internos propuestos incorporan `schemaVersion`, `eventId`, organización, campaña y la identidad de generación o publicación/intento. Los eventos de generación comunican resultado completo o código de fallo; los de publicación, resultado independiente por destino. Los campos se validan antes de ejecutar los casos de uso existentes de registro. Un resultado de una generación o intento anterior no modifica el vigente.

Autenticación propuesta: firma HMAC del cuerpo crudo y timestamp, comparación en tiempo constante, ventana temporal configurable, identificación de clave para rotación y persistencia del identificador de evento para detectar repeticiones. La firma no reemplaza la validación de pertenencia. No se expondrán callbacks sin esta protección esperando a la fase 9.

Mismo evento y contenido devuelve un acuse sin otra escritura. Mismo identificador con otro contenido es un conflicto. Los resultados deben quedar asociados a la operación comercial, no solo al ID de ejecución de n8n. Los workflows exportados no incluirán claves ni tokens.

## Publicación por plataforma: fase 8

La aceptación crea una publicación por destino aprobado y actualiza el resumen de campaña en una transacción. Cada intento posterior tiene identidad propia. `SocialPublisher` recibe contenido aprobado, asset y una referencia de cuenta; el adapter resuelve credenciales fuera del dominio y verifica capacidades de su plataforma.

Un destino publicado no se reenvía cuando otro falla. Un timeout no prueba que el proveedor haya rechazado el envío: el intento queda pendiente de conciliación antes de permitir otro envío. La persistencia actual no modela explícitamente todos los resultados inciertos; se debe incorporar esa política antes de los adapters reales. Se utilizará idempotencia del proveedor cuando exista, sin prometer entrega exactamente una vez para todas las plataformas.

La respuesta final por destino incluirá los campos verificables disponibles (ID remoto, fecha y URL externa si procede), con adaptación explícita al modelo persistido. No se inventarán URLs o fechas para satisfacer un contrato uniforme. Los códigos de error públicos serán controlados, sin respuestas crudas ni credenciales.

## Secuencia de trabajo

1. Integrar esta documentación pendiente del PR #16 y revisar el diseño propuesto.
2. Fase 5, primer incremento: resultado textual provisional, migración, port `CopyGenerator`, caso de uso y pruebas con fake.
3. Fase 5, segundo incremento: adapter OpenAI y configuración; validar salida y fallos con respuestas simuladas antes de una prueba real autorizada.
4. Continuar con assets y renderizado en fase 6; entrega durable y n8n en fase 7; cuentas y publicación en fase 8. Incorporar cada endpoint público cuando exista su aceptación durable y un ejecutor configurado.

La fase 4 permanece parcialmente implementada. El CMS local mantiene su trabajo independiente; no se incluye en estos incrementos de API.
