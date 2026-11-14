# FASE 1 — ESTRUCTURA DEL PROYECTO

Basándote en las reglas arquitectónicas previamente definidas, crea únicamente la estructura inicial del proyecto.

Quiero un monorepo organizado aproximadamente como:

apps/
web/
api/

packages/
shared/
config/

automation/
n8n/

infrastructure/
docker/

docs/

Analiza si realmente necesitamos Turborepo o si npm/pnpm workspaces son suficientes.

Utiliza pnpm workspaces salvo que exista una razón técnica fuerte para otra alternativa.

Configura:

* TypeScript
* ESLint
* Prettier
* aliases
* variables de entorno
* Docker Compose
* PostgreSQL
* MinIO
* n8n

No implementes todavía funcionalidades de negocio.

Quiero que:

1. Next.js pueda iniciar.
2. NestJS pueda iniciar.
3. PostgreSQL funcione.
4. n8n funcione.
5. MinIO funcione.
6. exista healthcheck básico.

Propón una estructura escalable pero evita sobreingeniería.

Al finalizar muestra el árbol de carpetas y explica la responsabilidad de cada directorio principal.

# FASE 2 — MODELADO DEL DOMINIO

Ahora diseña el dominio inicial del backend.

Antes de escribir código identifica:

* bounded contexts o módulos
* entidades
* agregados si realmente aplican
* value objects
* relaciones
* responsabilidades

Los módulos iniciales deberían considerar:

organizations
users
products
templates
campaigns
social-accounts
publications

Analiza posibles dependencias entre ellos.

Evita que las entidades de diferentes módulos queden fuertemente acopladas.

Por ejemplo, Campaign no debería necesitar una instancia completa de Product.

Puede trabajar con:

productId

cuando sea suficiente.

Quiero que propongas primero el modelo.

Después implementa únicamente:

domain/
application/

de los módulos fundamentales.

Todavía NO implementes controllers ni Prisma.

Para Campaign considera reglas como:

* una campaña comienza como DRAFT
* una campaña DRAFT puede solicitar generación
* una campaña generada queda PENDING_APPROVAL
* una campaña solamente puede aprobarse desde PENDING_APPROVAL
* solamente una campaña APPROVED puede publicarse
* una campaña publicada no debe publicarse nuevamente accidentalmente

Implementar comportamiento dentro de la entidad cuando sea una invariancia real del dominio.

Crear tests unitarios para las reglas principales.

# FASE 3 — PRISMA Y PERSISTENCIA

Ahora implementa la capa de persistencia utilizando PostgreSQL + Prisma.

Primero revisa las entidades y repositorios existentes.

Crea el schema de Prisma basado en el dominio, pero recuerda:

Prisma Models != Domain Entities

Implementa mappers explícitos:

CampaignMapper
ProductMapper
TemplateMapper
etc.

Implementa los repositorios Prisma correspondientes.

Ejemplo:

domain/repositories/campaign.repository.ts

infrastructure/persistence/prisma/repositories/prisma-campaign.repository.ts

Configura dependency injection desde NestJS.

Los casos de uso no deben importar Prisma.

Agrega migrations.

Implementa seeds mínimos únicamente si sirven para desarrollo.

Agregar índices útiles para:

campaign status
organization
publication status
createdAt

Evalúa constraints únicos necesarios.

Implementa tests para repositories importantes, diferenciando tests unitarios de integration tests.

No generes repositories genéricos tipo:

BaseRepository<T>

si reducen claridad o introducen abstracciones artificiales.

# FASE 4 — API REST

Implementa la capa presentation de NestJS.

Crea controllers para:

Products
Templates
Campaigns
Publications

Endpoints iniciales:

POST /products
GET /products
GET /products/:id
PATCH /products/:id

POST /templates
GET /templates
GET /templates/:id

POST /campaigns
GET /campaigns
GET /campaigns/:id

POST /campaigns/:id/generate
POST /campaigns/:id/approve
POST /campaigns/:id/regenerate
POST /campaigns/:id/publish

GET /campaigns/:id/publications

Implementar:

* validation pipes
* class-validator cuando corresponda
* request DTOs
* response DTOs
* global exception mapper
* logging
* pagination

No devolver Domain Entities directamente.

No devolver Prisma Models directamente.

Crear documentación Swagger/OpenAPI.

Agregar error handling consistente.

Crear tests básicos de controllers y e2e para los flujos críticos.

# FASE 4.5 — CMS NEXT.JS

Construye ahora el CMS.

Antes de implementar componentes define las pantallas:

Dashboard

Productos

* listado
* crear
* editar

Plantillas

* listado
* crear
* editar
* preview

Campañas

* listado
* crear
* detalle
* preview
* aprobación
* regeneración
* publicación

Cuentas sociales

* listado
* conexión
* estado

Publicaciones

* historial
* errores

Configuración

Usar:

Next.js
TypeScript
Tailwind
shadcn/ui

Separar:

features/
components/
lib/
services/
hooks/
types/

No colocar fetch directamente por toda la UI.

Crear una capa clara para API clients.

No duplicar modelos del backend innecesariamente.

Implementar estados:

loading
empty
success
error

Crear componentes pequeños y reutilizables cuando realmente tengan comportamiento común.

Evitar una carpeta components con cientos de componentes sin dominio.

Preferir organización por feature.

Ejemplo:

features/
campaigns/
components/
hooks/
services/
schemas/
types/

Implementar primero funcionalidades, no intentar crear todavía un diseño extremadamente elaborado.

Debe ser responsive y accesible.
