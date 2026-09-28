# Fase 5 · Generación de texto de campaña

## Alcance de este incremento

Generación y consulta de copy persistido, adapters Gemini/OpenAI con salida estructurada y tarjeta «Texto de campaña» en el detalle del CMS. Gemini es el proveedor predeterminado para pruebas; se selecciona mediante COPY_PROVIDER. El diseño de los módulos se conserva. No incluye imagen, renderizado, n8n, publicación ni OAuth.

- `POST /campaigns/:id/copy`: desde DRAFT congela los datos y comienza una generación; desde GENERATING recupera el resultado o reintenta un trabajo fallido. Devuelve headline, caption, cta, hashtags, imagePrompt y generationId.
- `GET /campaigns/:id/copy`: consulta el texto de la generación vigente; devuelve `data: null` si no hay resultado.
- La organización procede del contexto de la API. Recursos ajenos responden 404. Estados no elegibles y solicitudes simultáneas responden 409; proveedor no disponible 503, timeout 504 y salida inválida/rechazada 502.

## Decisiones

El caso de uso GenerateCampaignCopy depende de CopyGenerator y CampaignCopyRepository. El adapter OpenAICopyGenerator usa fetch nativo, sin añadir dependencias. Nest compone las implementaciones; aplicación y dominio no importan OpenAI ni Prisma.

GeneratedContent exige al menos un asset y representa una pieza completa apta para aprobación. Para preservar esa invariancia se añade CampaignCopy como resultado intermedio de CampaignGeneration, con una FK compuesta por organización, campaña y generación. Esta es una adaptación explícita a la guía de fase 5: el texto se persiste ahora en campaign_copies y se incorporará a GeneratedContent junto con los assets en fase 6. Permitir aprobar texto sin imagen o inventar un asset habría roto el contrato existente. El estado permanece GENERATING mientras falta la pieza final.

Una reserva de 120 segundos y un token identifican al intento activo. Una transacción corta bloquea la fila de campaña mediante una actualización sin cambios de versión, comprueba generación vigente y reserva el trabajo. La llamada externa ocurre fuera de la transacción. La escritura final exige el mismo token y estado; no admite resultados de una generación sustituida. Las reservas vencidas se recuperan en una nueva solicitud. Un error libera la reserva y permite reintentar con el mismo snapshot. No hay worker automático en este incremento.

La política de texto es conservadora: el modelo selecciona entre variantes construidas con nombre, descripción, precios y fechas exactos del snapshot, más frases neutrales. CTA y hechos se validan de nuevo en servidor. No se permite redacción libre de características o condiciones. El tono y las instrucciones orientan la elección, no autorizan nuevos hechos. Esta limitación reduce creatividad; no se presenta como generación libre verificada semánticamente. La descripción del catálogo sigue siendo la fuente de hechos y debe estar correctamente registrada.

El adapter utiliza [Structured Outputs de Responses API](https://developers.openai.com/api/docs/guides/structured-outputs), rechaza respuestas incompletas o negativas y aplica hasta dos intentos a errores transitorios. Cada intento dura como máximo 40 segundos; el cliente web espera hasta 100 segundos para esta operación. No se reintentan automáticamente mutaciones desde el CMS. Los logs registran evento, número de intento y código seguro, sin claves, prompts ni texto de proveedor. No hay llamadas reales durante los tests.

## Configuración local

1. Aplicar la nueva migración con `pnpm db:migrate`.
2. Configurar `COPY_PROVIDER=gemini`, `GEMINI_API_KEY` y `GEMINI_COPY_MODEL=gemini-2.5-flash-lite` en `apps/api/.env` siguiendo la [guía de Gemini](gemini-copy-setup.md). Para OpenAI, seleccionar explícitamente `COPY_PROVIDER=openai` y configurar `OPENAI_API_KEY` y `OPENAI_COPY_MODEL`. No guardar claves en Git ni usar variables NEXT_PUBLIC.
3. Opcional: `GEMINI_COPY_TIMEOUT_MS=20000` u `OPENAI_COPY_TIMEOUT_MS=20000` según el proveedor (por intento, rango 100–40000).
4. Reiniciar la API y abrir una campaña en borrador. Pulsar «Generar texto».

Sin configuración, la consulta sigue disponible y la generación responde 503 sin modificar el borrador. No se sustituye el resultado por datos ficticios. Una respuesta correcta no habilita aún aprobar/publicar: eso requiere la imagen final de fase 6.

## Archivos

- API: contratos y política de copy, GenerateCampaignCopy/GetCampaignCopy, adapter OpenAI y repositorio Prisma, controller, configuración y módulo de composición.
- Persistencia: CampaignCopy en schema.prisma y migración 20260928000100_campaign_copy.
- CMS: servicio, hook y tarjeta de texto; timeout configurable en el cliente compartido.
- Pruebas: casos de uso/política, adapter, configuración, contratos web y concurrencia/aislamiento en PostgreSQL.

## Verificaciones y límites

Pruebas unitarias con fake CopyGenerator, respuestas HTTP simuladas para OpenAI y pruebas PostgreSQL en un esquema temporal aislado. No se ha realizado una llamada facturable ni una revisión visual automatizada del nuevo control.

Resultados: 383 pruebas unitarias API, 67 PostgreSQL, 92 HTTP y 23 web correctas (565 en total). Formato, validación de Prisma, tipos y build correctos. Lint sin errores; el frontend mantiene cinco advertencias preexistentes. La migración se verificó aplicándola y repitiendo deploy en un esquema temporal; no se aplicó a la base de trabajo del usuario.

El PR de este incremento depende del cierre del CMS en #20. Mientras ese PR siga abierto, la base es `feat/cms-phase-4-5-completion` para mostrar únicamente el incremento de copy; después de integrarlo se debe cambiar la base a main y verificar el diff antes de fusionar.

CI también escucha PR dirigidos a `feat/**` para validar incrementos dependientes antes de integrarlos en main, conservando los mismos permisos y verificaciones.

El siguiente módulo es la generación y composición de imagen de fase 6: consumir el copy persistido, generar y almacenar assets y formar GeneratedContent sin relajar las reglas de aprobación. La creatividad de copy puede ampliarse posteriormente con una estrategia explícita de verificación de hechos.
