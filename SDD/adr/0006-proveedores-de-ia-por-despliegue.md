# ADR-0006 · Proveedores de IA detrás de ports, elegidos por despliegue

- **Estado:** Aceptado (retroactivo)
- **Fecha de registro:** 2026-11-14 · decisión original: fases 5–6; el alcance "por despliegue" se confirmó el 2026-11-14
- **Ámbito:** generación de copy e imagen

## Contexto

Los modelos de texto e imagen cambian rápido en calidad y precio. El proyecto empezó con OpenAI y sumó Gemini.

## Decisión

Los casos de uso dependen de los ports `CopyGenerator` e `ImageGenerator`. Hay un adapter por proveedor (`OpenAICopyGenerator`, `GeminiCopyGenerator`, `OpenAIImageGenerator`, `GeminiImageGenerator`). El proveedor se elige **por despliegue** con `COPY_PROVIDER` e `IMAGE_PROVIDER`, de forma independiente entre sí; `IMAGE_PROVIDER` viene deshabilitado por defecto.

Reglas comunes de los adapters:

- Llamadas HTTP directas con `fetch`, sin SDK del proveedor.
- Timeout configurable. El copy de OpenAI reintenta una vez ante `429` o `5xx`; la imagen no reintenta sola, porque una respuesta ambigua puede haberse cobrado.
- La respuesta del modelo se valida siempre antes de persistir. El modelo nunca es fuente de precios, fechas ni condiciones.
- Las claves nunca aparecen en URLs ni en logs.

## Alternativas consideradas

- **Proveedor por organización:** exige guardar credenciales por cliente y una interfaz de configuración; no hay necesidad actual.
- **SDK oficiales:** más dependencias y menos control sobre límites de tamaño y timeouts.
- **Un solo proveedor:** más simple, pero deja el producto atado a sus precios y disponibilidad.

## Consecuencias

- Cambiar de proveedor es cambiar variables de entorno.
- Cada proveedor nuevo es un adapter más con sus pruebas.
- Si un cliente necesita su propio proveedor o clave, este ADR deberá reemplazarse.
