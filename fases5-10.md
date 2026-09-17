# FASE 5 — GENERACIÓN DE COPY CON IA

Implementa la integración de generación de contenido textual.

Respeta Ports and Adapters.

Crear un contrato como:

CopyGenerator

El caso de uso no debe conocer OpenAI.

Crear:

GenerateCampaignCopy

La implementación externa:

OpenAICopyGenerator

debe vivir en infrastructure.

Entrada estructurada:

product
description
regularPrice
promotionPrice
promotionEnd
business
brandTone
additionalInstructions

Salida estructurada:

headline
caption
cta
hashtags
imagePrompt

No aceptar respuestas libres difíciles de parsear.

Usar structured output / schema validation cuando esté disponible.

Validar siempre la respuesta antes de persistirla.

El modelo no puede inventar:

* precio
* descuentos
* fechas
* características del producto
* condiciones de venta

Persistir el resultado en GeneratedContent.

Agregar mecanismos para:

* timeout
* retry limitado
* logging
* errores explícitos

Nunca registrar API keys.

Crear unit tests del use case usando un fake CopyGenerator.

# FASE 6 — GENERACIÓN Y COMPOSICIÓN DE IMAGEN

Implementar generación de imágenes promocionales.

Separar dos responsabilidades:

ImageGenerator

y

TemplateRenderer

ImageGenerator:
genera la imagen creativa mediante IA.

TemplateRenderer:
compone los elementos que deben ser exactos.

Nunca pedir a la IA que sea la fuente final para:

precio
porcentajes
nombre del producto
fechas
CTA crítico

Flujo:

campaign
→ image prompt
→ ImageGenerator
→ base image
→ TemplateRenderer
→ final promotional asset

Implementar:

OpenAIImageGenerator

y

PlaywrightTemplateRenderer

Las plantillas pueden utilizar HTML + CSS.

Variables disponibles:

{{productName}}
{{regularPrice}}
{{promotionPrice}}
{{promotionEnd}}
{{headline}}
{{cta}}
{{logo}}
{{generatedImage}}

Proteger el renderer frente a HTML o valores maliciosos.

Generar inicialmente:

1080x1080

Diseñar la arquitectura para soportar posteriormente:

1080x1350
1080x1920

Guardar assets mediante un port:

StorageProvider

Implementación inicial:

MinioStorageProvider

El caso de uso debe recibir solamente URLs/identificadores, no conocer MinIO.

Agregar:

RegenerateCampaignImage

y mantener historial de generaciones para poder regresar a una versión anterior.

# FASE 7 — INTEGRACIÓN CON N8N

Ahora integra NestJS con n8n.

IMPORTANTE:

n8n será el orquestador, pero no será propietario de las reglas del dominio.

Crear port:

WorkflowOrchestrator

Implementación:

N8nWorkflowOrchestrator

Casos de uso importantes:

RequestCampaignGeneration
ProcessGeneratedCampaign
RequestCampaignPublication

Diseñar webhooks seguros entre:

NestJS → n8n
n8n → NestJS

Implementar autenticación/firma para webhooks.

Los workflows deben ser idempotentes.

Diseñar inicialmente:

workflow: generate-campaign

Webhook
↓
Get campaign
↓
Generate copy
↓
Generate AI image
↓
Render template
↓
Store asset
↓
Notify API
↓
PENDING_APPROVAL

workflow: publish-campaign

Webhook
↓
Get campaign
↓
Publish Facebook
↓
Publish Instagram
↓
Publish TikTok
↓
Notify API

Pero mantener cada publicación independiente.

Si ocurre:

Facebook ✅
Instagram ✅
TikTok ❌

el sistema debe persistir esos resultados independientemente.

Generar archivos JSON exportables de los workflows dentro de:

automation/n8n/workflows/

No almacenar credentials dentro de esos JSON.

# FASE 8 — REDES SOCIALES

Crear una abstracción:

SocialPublisher

No diseñarla de forma que todas las plataformas tengan obligatoriamente exactamente las mismas características.

Considerar capacidades por plataforma.

Implementaciones iniciales:

MetaFacebookPublisher
MetaInstagramPublisher
TikTokPublisher

Cada publicación debe devolver algo semejante a:

platform
externalPublicationId
status
publishedAt
externalUrl

Crear:

PublishCampaign
PublishToPlatform

Implementar idempotency.

Una misma publication no puede enviarse dos veces simplemente porque n8n hizo retry.

Persistir:

attemptCount
lastAttemptAt
externalPublicationId
failureReason

No utilizar Playwright para hacer login y simular clics en Facebook, Instagram o TikTok.

Utilizar APIs oficiales.

Diseñar token management separado de lógica del dominio.

Nunca persistir passwords de las redes sociales.

Los access tokens deben manejarse mediante almacenamiento seguro.

Implementar inicialmente adapters aunque algunas plataformas utilicen mocks durante desarrollo.

# FASE 9 — AUTENTICACIÓN, SEGURIDAD Y AUDITORÍA

Implementa seguridad del CMS.

Roles iniciales:

ADMIN
EDITOR
REVIEWER

Permisos sugeridos:

ADMIN

* administrar configuración
* administrar redes
* administrar usuarios
* todas las campañas

EDITOR

* productos
* plantillas
* crear campañas
* regenerar contenido

REVIEWER

* revisar
* aprobar
* publicar

No depender únicamente del frontend para autorización.

Todas las reglas deben validarse en backend.

Agregar:

AuditLog

Registrar eventos como:

CAMPAIGN_CREATED
CONTENT_GENERATED
IMAGE_REGENERATED
CAMPAIGN_APPROVED
PUBLICATION_REQUESTED
PUBLICATION_SUCCEEDED
PUBLICATION_FAILED
SOCIAL_ACCOUNT_CONNECTED

Guardar:

actor
action
entity
entityId
timestamp
metadata segura

Nunca guardar:

passwords
API keys
access tokens

Implementar:

rate limiting
CORS
security headers
input validation
webhook signatures

Revisar posibles SSRF en URLs recibidas.

Revisar posibles inyecciones en templates HTML.

# FASE 10 — RESILIENCIA, TESTING Y PRODUCCIÓN

Realiza ahora una revisión arquitectónica completa.

No refactorices únicamente porque prefieras otro estilo.

Identifica problemas reales:

* acoplamiento
* duplicación
* dependencias circulares
* lógica en controllers
* infraestructura filtrándose al dominio
* errores mal manejados
* operaciones no idempotentes
* falta de transacciones
* queries N+1
* secretos inseguros
* funciones demasiado complejas

Agregar testing en tres niveles:

Unit tests:
domain
application

Integration:
repositories
external adapters cuando sea viable

E2E:
crear campaña
generar contenido
aprobar campaña
publicar campaña

Crear fakes para:

CopyGenerator
ImageGenerator
TemplateRenderer
SocialPublisher
StorageProvider
WorkflowOrchestrator

Configurar Docker Compose para desarrollo.

Servicios:

web
api
postgres
n8n
minio

Agregar healthchecks.

Agregar volúmenes.

Agregar .env.example.

Nunca almacenar secretos en Git.

Crear scripts como:

pnpm dev
pnpm test
pnpm test:e2e
pnpm lint
pnpm typecheck
pnpm build

Todos deben ejecutarse correctamente.

Crear documentación:

README.md

docs/
architecture.md
domain.md
n8n.md
social-integrations.md
deployment.md

Crear un diagrama Mermaid mostrando:

CMS
API
PostgreSQL
n8n
OpenAI
Storage
Meta
TikTok

Finalmente realiza una revisión como Senior Software Architect y enumera:

1. deuda técnica restante
2. riesgos
3. mejoras antes de producción
4. cosas que NO debemos implementar todavía
5. próximos pasos prioritarios
