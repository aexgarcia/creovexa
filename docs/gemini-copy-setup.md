# Gemini para pruebas de generación de texto

El proveedor se selecciona con `COPY_PROVIDER=gemini|openai`. Gemini es el predeterminado. Ambos implementan CopyGenerator y conservan la validación, persistencia y formato de respuesta. El cambio no requiere migración ni modifica el CMS o los casos de uso. No hay fallback automático a OpenAI ni a otro modelo cuando se agota la cuota.

## Configuración

Crear una clave en [Google AI Studio](https://aistudio.google.com/apikey) para un proyecto con nivel **Free Tier**. La suscripción de la aplicación Gemini y la configuración de facturación de la API son aspectos distintos: comprobar el nivel del proyecto antes de usar la clave. El código no puede determinar si una clave pertenece a un proyecto gratuito o de pago.

Según la [documentación de Google AI Pro](https://ai.google.dev/gemini-api/docs/google-ai-plans), los beneficios de prototipado de la suscripción se aplican a la interfaz web de AI Studio; las llamadas directas desde aplicaciones se gestionan por separado. La suscripción no sustituye la clave ni garantiza uso ilimitado gratuito de la API.

Configurar en **apps/api/.env**, no en el `.env` raíz de Docker:

```dotenv
COPY_PROVIDER=gemini
GEMINI_API_KEY=tu_clave_de_AI_Studio
GEMINI_COPY_MODEL=gemini-2.5-flash-lite
GEMINI_COPY_TIMEOUT_MS=20000
```

Reiniciar `pnpm dev:api`, abrir una campaña en borrador y pulsar **Generar texto**. El modelo del ejemplo admite salida estructurada y tiene nivel gratuito según las referencias consultadas el 28 de septiembre de 2026; disponibilidad y cuotas dependen del proyecto y pueden cambiar. No se activa facturación desde Creovexa.

Si ya existe texto para una generación, se devuelve el resultado guardado: cambiar proveedor no lo reemplaza. Para probar el nuevo proveedor, utilizar una campaña nueva. No hay generación real mientras falte la clave; el endpoint devuelve 503 sin usar datos simulados.

Para volver a OpenAI, cambiar a `COPY_PROVIDER=openai` y configurar `OPENAI_API_KEY`, `OPENAI_COPY_MODEL` y opcionalmente `OPENAI_COPY_TIMEOUT_MS`. Solo se valida y utiliza la configuración del proveedor seleccionado.

## Implementación y límites

GeminiCopyGenerator utiliza generateContent por HTTPS, clave en `x-goog-api-key`, JSON Schema y validación independiente. Rechaza bloqueos, resultados incompletos, JSON inválido o hechos ajenos a la política de copy. Tiene timeout por intento y como máximo dos intentos para errores transitorios. Los logs no incluyen claves, texto ni respuestas del proveedor. Se conserva la política conservadora de variantes definidas por la aplicación.

Las pruebas usan HTTP simulado; no consumen cuota ni demuestran que la clave del usuario esté configurada. El nivel gratuito puede utilizar entradas y salidas para mejorar productos de Google: usar datos ficticios de pruebas. La futura generación de imágenes tendrá su propio adaptador y condiciones; este cambio cubre únicamente texto.

Verificado: 409 pruebas unitarias API y 67 pruebas PostgreSQL correctas, TypeScript, lint, formato y compilación de API. No hay cambios de schema ni migraciones para sustituir el proveedor. La clave local sigue pendiente y no se ejecutó una llamada real a Gemini.

Referencias oficiales: [facturación y niveles](https://ai.google.dev/gemini-api/docs/billing/), [precios por modelo](https://ai.google.dev/gemini-api/docs/pricing) y [salidas estructuradas](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).
