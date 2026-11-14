# Fase 2 · Modelo de dominio

> Historial consolidado de los documentos originales `docs/phase-*.md`. Registra lo que se decidió y verificó en su momento; el estado vigente está en [estado de fases](../fases/estado.md) y en los [contratos de módulo](../modulos/).

## Fase 2: incremento 1 — organizaciones y catálogo

Implementado el 17 de septiembre de 2026 según el [modelo de dominio](../arquitectura/dominio.md). El incremento 2 de [plantillas](fase-2.md) se completó el 18 de septiembre de 2026. La fase 2 continúa pendiente de campañas y resultados por destino.

### Comportamiento disponible

- `CreateOrganization` crea una organización con nombre obligatorio y perfil de marca opcional.
- `UpdateOrganizationProfile` actualiza los campos proporcionados, conserva identidad y fecha de creación, y permite retirar tono o logo mediante `null`.
- `CreateProduct` registra un producto o servicio únicamente si la organización existe, consultada mediante el port `OrganizationLookup`.
- `UpdateProduct` modifica los datos comerciales del producto dentro de la organización indicada. Conserva su identidad, propietario y tipo; rechaza recursos ajenos o inexistentes.

Estos son casos de uso de aplicación probados directamente. Todavía no están expuestos por HTTP ni conectados a PostgreSQL. Los fakes pertenecen exclusivamente a tests, y no se registraron nuevos providers en `AppModule`.

### Decisiones concretadas

#### Dinero explícito

`Money.fromMinorUnits(amountMinor, currency)` acepta enteros seguros no negativos y las monedas iniciales `PEN`, `USD` y `EUR`. Las tres usan actualmente dos dígitos fraccionarios, definidos por moneda: `1990 PEN` representa 19,90 soles. No hay moneda predeterminada, conversión implícita ni conversión desde números decimales. Se rechazan valores como `19.9`, negativos, `NaN`, infinitos o enteros fuera del rango seguro.

El conjunto acotado permite validar los importes sin incorporar una dependencia monetaria ni pretender soportar todos los códigos de moneda. Ampliarlo exige declarar su precisión y añadir pruebas. Las comparaciones de orden entre monedas diferentes fallan explícitamente; la igualdad considera importe y moneda.

Una actualización de precio puede proporcionar una nueva pareja importe/moneda completa. Eso reemplaza el precio comercial, no calcula un tipo de cambio. La promoción continúa reservada a campañas.

#### Entidades con actualizaciones atómicas en memoria

`Organization.updateProfile` y `Product.updateDetails` validan todos los cambios y devuelven una entidad nueva. La instancia anterior sigue intacta, incluso si la validación o el guardado posterior falla. Se prefirió esto a setters que pudieran dejar cambios parciales sobre una entidad cargada.

Las fechas se copian al leerlas y los arrays de imágenes son inmutables. `undefined` conserva un campo en actualizaciones; `null` elimina tono/logo; una descripción vacía o un array vacío eliminan sus respectivos contenidos. Las fechas inválidas o anteriores a la última modificación se rechazan.

#### Identidad y referencias de assets

`EntityId` es un tipo nominal común que valida UUID y normaliza su escritura a minúsculas. No se crean clases para cada ID. Los identificadores de logo e imágenes también son UUID estables, sin URLs de proveedor. No se aceptan imágenes duplicadas por diferencias de mayúsculas.

Este incremento valida la forma de las referencias de assets, no su existencia, propiedad o carga en almacenamiento. Esas comprobaciones se incorporarán con el módulo que gestione assets y su integración; no hay un repositorio ficticio de archivos.

#### Contratos y límites entre módulos

Cada módulo define su repositorio concreto de dominio, sin `BaseRepository`. `add` representa inserción y no debe sobrescribir una identidad existente; `save` actualiza un recurso existente y no es un upsert. En productos, las operaciones reciben explícitamente la organización. Las implementaciones reales y sus constraints se incorporarán con persistencia.

El catálogo solo conoce `OrganizationLookup`, un port de lectura definido por el consumidor. No importa entidades ni repositorios internos de organizaciones. Los resultados de aplicación se convierten explícitamente en objetos de datos, con fechas ISO y copias de los datos de precio/imágenes; no se entregan entidades a futuros controllers.

`Clock` e `IdGenerator` son ports pequeños compartidos por los casos de uso que necesitan tiempo o IDs nuevos. Se inyectan desde el constructor para hacer pruebas deterministas. Sus implementaciones de producción y la composición NestJS se incorporarán cuando se conecte la aplicación a infraestructura.

La separación por organización está comprobada en consultas y actualizaciones, incluida una defensa si un repositorio devuelve un recurso equivocado. No constituye todavía autenticación o autorización: el origen confiable del identificador de organización corresponde a la fase de seguridad.

No se agregaron dependencias, infraestructura, controllers ni cambios al frontend.

### Archivos creados y modificados

Creado código bajo estas rutas:

- `apps/api/src/domain/`: `entity-id.ts`, `timestamp.ts`, `value-objects/money.ts` y pruebas de ID y dinero.
- `apps/api/src/application/ports/`: `clock.ts` e `id-generator.ts`.
- `apps/api/src/modules/organizations/domain/`: entidad y pruebas, errores explícitos y contrato de repositorio.
- `apps/api/src/modules/organizations/application/`: conversión del resultado, `CreateOrganization`, `UpdateOrganizationProfile` y pruebas de ambos casos de uso.
- `apps/api/src/modules/products/domain/`: entidad y pruebas, `ProductKind`, errores explícitos y contrato de repositorio.
- `apps/api/src/modules/products/application/`: resultado, port de organización, error de organización inexistente, `CreateProduct`, `UpdateProduct` y pruebas.
- `apps/api/test/support/commercial-fakes.ts`: repositorios y consulta de organización para tests, con reloj y UUID deterministas.
- `docs/phase-2.md`: este registro.

Actualizado `docs/domain.md` para reflejar la implementación parcial. El cambio pendiente en `docs/phase-1.md` proviene de la validación de Docker anterior y se conservó.

### Verificación

- `pnpm test`: 76 pruebas unitarias correctas, de las cuales 64 corresponden a este incremento y 12 ya existían.
- `pnpm test:e2e`: una prueba HTTP existente correcta.
- `pnpm typecheck`: API y CMS correctos.
- `pnpm lint`: correcto.
- `pnpm build`: API y CMS compilan correctamente.
- Formato y revisión del diff: sin errores.
- Revisión de imports: dominio y aplicación nuevos no dependen de NestJS, Prisma, variables de entorno ni integraciones externas; los módulos comerciales no importan internals entre sí.

Las pruebas cubren creación y actualización, datos inválidos, moneda explícita, identidad, referencias duplicadas, encapsulación de fechas y arrays, entidades ausentes, aislamiento por organización y conservación de datos ante fallos de validación o almacenamiento. Vitest y compilación se ejecutaron fuera del sandbox porque requieren procesos secundarios.

La persistencia, concurrencia real, constraints de base de datos, endpoints comerciales y autorización permanecen pendientes de sus fases. No se requieren cambios de Docker para ejecutar estas pruebas de dominio y aplicación.

### Siguiente paso

Los cuatro incrementos de la fase 2 están implementados; el cierre está en [publicaciones](fase-2.md). Revisar e integrar los incrementos pendientes mediante PR y comenzar la fase 3 de persistencia. Este documento conserva el registro histórico de la base comercial.

## Fase 2: incremento 2 — plantillas

Implementado el 18 de septiembre de 2026 según [docs/domain.md](../arquitectura/dominio.md), sobre la base comercial del incremento 1.

### Comportamiento

- `TemplateDimensions` valida ancho y alto como enteros seguros positivos y permite compararlos por valor. Es inmutable y puede representar tamaños futuros, como 1080 × 1350 o 1080 × 1920.
- La creación de `TemplateRevision` admite únicamente el formato inicial 1080 × 1080. Dimensiones válidas pero fuera de ese formato producen `UnsupportedTemplateDimensionsError`; no se convierten silenciosamente.
- `Template` requiere un nombre no vacío y conserva identidad, organización, revisión vigente y fechas. Al crearla se genera una revisión con UUID propio, número 1 y las mismas referencias de plantilla y organización.
- `Template.createRevision` devuelve otro agregado con una revisión nueva y número consecutivo. Conserva la identidad y fecha de creación de la plantilla. Las revisiones anteriores y las instancias ya entregadas a otros consumidores permanecen intactas.
- `CreateTemplate` valida el identificador de organización, comprueba su existencia por `OrganizationLookup`, genera las dos identidades mediante `IdGenerator`, obtiene el instante de `Clock` y ejecuta una sola operación `TemplateRepository.add`.
- El resultado de aplicación contiene datos planos, dimensiones copiadas y fechas ISO. No expone las entidades ni referencias mutables de sus datos.

El caso de uso recibe `organizationId`, `name` y `dimensions: { width, height }`. No recibe IDs ni números de revisión elegidos por el cliente, HTML, CSS o configuración de un proveedor.

### Decisiones y límites

#### Revisiones inmutables

Editar una composición en el futuro no debe cambiar lo que una campaña había seleccionado. Por ello, la identidad de la plantilla y la identidad de su revisión son diferentes conceptos. La revisión conserva su número, dimensiones, propietario y fecha; el agregado cambia la referencia vigente al producir una nueva versión.

Se descartó sobrescribir la misma revisión, porque invalidaría las referencias históricas. El agregado guarda solo la revisión vigente para no exigir cargar todo el historial al operar. El método de dominio rechaza reutilizar el ID de la revisión vigente y fechas anteriores. Los IDs deben provenir del generador; comprobar colisiones con cualquier revisión histórica, persistir revisiones sucesivas y controlar la concurrencia requiere los constraints y la implementación de repositorio de la fase 3. No se afirma que los tests en memoria garanticen estas propiedades de base de datos.

La revisión inicial de esta fase contiene metadatos de formato e identidad. La definición real de composición y su ejecución segura se incorporarán en la fase 6. Crear una plantilla todavía no produce una pieza renderizada.

#### Una escritura para crear el agregado

El contrato `TemplateRepository.add(organizationId, template)` exige insertar atómicamente plantilla y revisión inicial, rechazando identidades existentes. Una implementación futura deberá usar una transacción para no dejar una plantilla sin revisión. Se eligió una operación del repositorio frente a dos guardados independientes que podrían completarse parcialmente.

El contrato contiene solo la operación usada por `CreateTemplate`; no se agregaron métodos CRUD sin consumidores. El método de dominio para crear revisiones tiene pruebas, pero aún no existe un caso de uso de edición o un adapter para guardarlas.

#### Dependencias y organización

El port `OrganizationLookup` pertenece a plantillas. Aunque su firma coincide con el del catálogo, no se importa desde ese módulo ni se crea un servicio genérico entre módulos. Así cada consumidor conserva su contrato sin depender de detalles internos ajenos.

Se reutilizan `EntityId`, validación de fechas, `Clock` e `IdGenerator`. El código de dominio y aplicación no importa NestJS, Prisma ni integraciones externas. No se agregaron dependencias ni se modificaron el frontend, Docker o `AppModule`. En el contrato de repositorio de organizaciones solo se añadió el salto de línea final que faltaba en la base, necesario para pasar la comprobación global de formato; su comportamiento y firma permanecen iguales.

El identificador de organización delimita la creación, pero no autentica al usuario. Los controles de autorización se incorporarán en la fase correspondiente.

#### Corrección necesaria de Vitest

Las primeras pruebas fallaron porque el import `#app/modules/templates/domain/entities/template` desde `test/support` se resolvía hacia `dist`, donde la clase nueva aún no existía. La resolución automática mediante `tsconfigPaths` no cubrió ese caso y hacía que las pruebas dependieran de archivos compilados.

Se configuró el alias explícito `#app → src` en ambos archivos de Vitest, calculado desde `import.meta.url`. Esto mantiene la resolución de producción de `package.json` intacta y permite que tests unitarios y HTTP utilicen las mismas fuentes. Se prefirió corregir la configuración a compilar antes de probar o reescribir los imports de cada prueba. La suite corregida pasó antes de ejecutar el build de las clases nuevas.

### Archivos

Creado el módulo `apps/api/src/modules/templates/`:

- `domain/value-objects/template-dimensions.ts` y su prueba.
- `domain/entities/template.ts`, `template-revision.ts` y sus pruebas.
- `domain/errors/template.errors.ts`.
- `domain/repositories/template.repository.ts`.
- `application/ports/organization-lookup.ts`.
- `application/errors/template-organization-not-found.error.ts`.
- `application/template-result.ts`.
- `application/use-cases/create-template.ts` y su prueba.

También creados `apps/api/test/support/template-fakes.ts` y este documento. Modificados `apps/api/vitest.config.ts`, `apps/api/vitest.config.e2e.ts`, `docs/domain.md` y `docs/phase-2.md`. Corregido únicamente el salto de línea final de `apps/api/src/modules/organizations/domain/repositories/organization.repository.ts`.

### Verificación

- 46 pruebas unitarias nuevas: dimensiones inválidas, compatibilidad inicial, UUID, pertenencia, secuencia de revisiones, conservación de referencias, inmutabilidad, fechas, organización inexistente, datos de resultado independientes y propagación de errores de consulta/guardado.
- `pnpm test`: 122 pruebas unitarias correctas en total.
- `pnpm test:e2e`: una prueba HTTP correcta.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` y `pnpm build`: correctos.
- Revisión del diff y límites de imports: sin errores.

Pruebas y compilación necesitaron ejecutarse fuera del sandbox por las restricciones sobre procesos secundarios. La atomicidad y unicidad reales de almacenamiento, los endpoints y el renderizado no se verificaron porque no se implementan en este incremento.

### Siguiente paso

Plantillas ya se integró mediante PR. Campañas y [publicaciones](fase-2.md) también están implementadas; con ellas se completa el código previsto para la fase 2. Revisar e integrar los incrementos pendientes mediante PR antes de comenzar persistencia. Este documento conserva el registro histórico de plantillas.

## Fase 2 — Incremento 3: campañas

Implementado el 18 de septiembre de 2026, siguiendo [el modelo de dominio](../arquitectura/dominio.md) y [la arquitectura](../arquitectura/reglas-de-trabajo.md). Rama: `feat/campaign-domain`.

### Alcance y comportamiento

Se incorpora únicamente dominio y aplicación de campañas, con contratos de repositorio y consulta, y pruebas. No se agregan dependencias.

- `Campaign` comienza en `DRAFT`. Solicitar generación crea una operación identificada y pasa a `GENERATING`. Un resultado completo lleva a `PENDING_APPROVAL`; la aprobación exige el ID exacto del candidato.
- `Promotion` utiliza `Money`: misma moneda que el precio base, importe inferior y fechas ordenadas. Una oferta futura puede prepararse; una oferta vencida no puede crearse, solicitar generación ni aprobarse. El vencimiento es exclusivo: en el instante final ya está vencida.
- `GenerationSnapshot` conserva copias inmutables de producto, precio, oferta, marca, brief y revisión de plantilla al solicitar cada generación. La campaña sigue fijando la misma revisión de plantilla al regenerar.
- `GeneratedContent` exige titular, caption, CTA coincidente con el solicitado y al menos un ID de asset. Los hashtags son opcionales mediante una lista vacía. El contenido, sus arrays, fechas y snapshot quedan protegidos frente a mutaciones externas.
- Regenerar desde `PENDING_APPROVAL` o `APPROVED` retira candidato y aprobación del estado actual y comienza otra operación. Su resultado necesitará nueva aprobación. Las revisiones anteriores permanecen en el historial según el contrato de repositorio.
- Un resultado equivalente de la operación vigente es inocuo, incluso después de aprobarlo; no vuelve a guardar ni cambia fechas, versión o aprobación. Un resultado contradictorio o de una operación anterior se rechaza.
- Registrar un fallo de generación guarda un código controlado y pasa a `FAILED`. Repetir ese mismo fallo es inocuo. Reintentar exige una nueva operación; las respuestas tardías de la anterior ya no se aceptan.

Casos de uso implementados:

| Caso de uso                       | Entrada y responsabilidad                                                                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CreateCampaign`                  | Organización, producto, plantilla, revisión, título, CTA, instrucciones y oferta opcionales. Comprueba referencias y crea el borrador.              |
| `RequestCampaignGeneration`       | Organización y campaña. Comprueba recursos actuales, captura la entrada e inicia la primera generación o reintenta una fallida.                     |
| `RecordGeneratedCampaign`         | Organización, campaña, operación vigente y resultado estructurado. Usa el snapshot almacenado y asigna identidad y número de revisión internamente. |
| `RecordCampaignGenerationFailure` | Organización, campaña, operación vigente y código de fallo. Permite cerrar una generación fallida y reintentarla.                                   |
| `ApproveCampaign`                 | Organización, campaña e ID del contenido revisado. Comprueba candidato, estado y vigencia comercial.                                                |
| `RequestCampaignRegeneration`     | Organización y campaña. Captura los datos actuales e invalida la aprobación al guardar la nueva generación.                                         |

Los resultados de aplicación son datos planos con fechas ISO y copias separadas de los datos internos. Los errores de consulta o guardado se propagan; no se devuelve éxito cuando falla la escritura.

### Decisiones y alternativas

#### Congelar datos al solicitar generación

Consultar el catálogo de nuevo al recibir el resultado podría asociar una pieza a precios o marca distintos de los usados para generarla. Se guarda la entrada al iniciar cada operación y se reutiliza al recibir el resultado y aprobarlo. El borrador solo fija referencias y brief; así recoge cambios comerciales realizados antes de solicitar generación.

Se descartó importar las entidades de catálogo, organizaciones o plantillas. Los ports del consumidor devuelven datos mínimos y verifican existencia, identidad y organización. El ID de organización delimita consultas y escrituras; la autorización de usuarios se incorporará en su fase.

#### Una revisión completa por operación

Se reciben resultados completos para que nunca exista un candidato aprobable a medio generar. Los IDs y el número de revisión proceden de la aplicación, no del callback. El ID de operación permite distinguir reintentos de entrega y resultados antiguos; comparar el contenido permite rechazar confirmaciones contradictorias.

Se descartó sobrescribir el candidato con cada callback o mantener una aprobación al regenerar, porque ambas alternativas podrían autorizar contenido distinto del revisado. También se agregó `RecordCampaignGenerationFailure` para evitar dejar una operación fallida permanentemente en `GENERATING`. Recibe códigos controlados en lugar de textos libres potencialmente sensibles del proveedor.

#### Guardado atómico y versión esperada

`CampaignRepository.add` inserta sin sobrescribir. `save(organizationId, campaign, expectedVersion)` exige que la versión almacenada coincida y que la actualización de campaña y la inserción de operación/contenido sean atómicas. Debe preservar el historial, rechazar colisiones de IDs y permitir solo una revisión por generación. Un conflicto se comunica mediante `ConcurrentCampaignModificationError`.

Se eligió un único contrato de guardado frente a dos escrituras independientes que podrían dejar contenido sin campaña actualizada. No se añadió una capa de servicios ni una unidad de trabajo genérica. El agregado mantiene solo la operación y el candidato vigentes para no cargar todo el historial.

Los fakes de pruebas modelan este contrato y permiten comprobar que los casos de uso pasan la versión esperada y propagan conflictos. Las transacciones, restricciones únicas y concurrencia real de PostgreSQL deben implementarse y verificarse en la fase 3.

### Archivos creados y modificados

Creado `apps/api/src/modules/campaigns/`:

- `domain/entities/campaign.ts`, `generated-content.ts` y sus pruebas.
- `domain/value-objects/promotion.ts`, `generation-snapshot.ts` y sus pruebas.
- `domain/campaign-status.ts`, `domain/errors/campaign.errors.ts` y `domain/repositories/campaign.repository.ts`.
- `application/use-cases/`: los seis casos de uso anteriores y pruebas en `create-campaign.spec.ts` y `campaign-workflow.spec.ts`.
- `application/ports/campaign-lookups.ts`, `application/errors/campaign-resource-not-found.error.ts`, `application/load-campaign-resources.ts`, `application/load-campaign.ts` y `application/campaign-result.ts`.

También creados `apps/api/test/support/campaign-fakes.ts` y este documento. Actualizados `docs/domain.md`, `docs/phase-2.md` y `docs/phase-2-templates.md` para reflejar el avance.

### Verificación

- 84 pruebas unitarias nuevas: ofertas, snapshots, revisiones, transiciones, pertenencia, callbacks duplicados/antiguos/contradictorios, aprobación exacta, regeneración, fallos, copias independientes y contrato de versión.
- `pnpm test`: 206 pruebas unitarias correctas en total.
- `pnpm test:e2e`: una prueba HTTP existente correcta.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` y `pnpm build`: correctos.
- Revisión de límites de imports: campañas utiliza su propio dominio y ports, más los contratos compartidos existentes; no importa entidades de otros módulos, NestJS, Prisma ni integraciones externas.

Pruebas y compilación necesitaron ejecución fuera del sandbox por sus procesos secundarios. El test HTTP cubre salud de la API; todavía no existen endpoints de campañas.

### Límites y siguiente paso

Solicitar generación registra la intención; todavía no genera imágenes, renderiza piezas ni contacta n8n. Los IDs de assets se validan como referencias, pero su existencia y la exactitud visual requieren almacenamiento y renderizado. No se implementan persistencia, controllers, autorización, edición del brief, consulta del historial ni publicación en este incremento.

En este incremento `FAILED` representaba únicamente generación. El incremento 4 de [publicaciones](fase-2.md) ya incorpora el origen del fallo, los estados y las reglas de publicación, restringiendo cada reintento a su operación.

Revisar e integrar los incrementos de campañas y publicaciones mediante PR. Los cuatro incrementos de la fase 2 están implementados; el siguiente desarrollo corresponde a la fase 3 de persistencia. Este documento conserva el registro de campañas y sus verificaciones originales.

## Fase 2 — Incremento 4: resultados por destino

Implementado el 19 de septiembre de 2026, siguiendo [el modelo de dominio](../arquitectura/dominio.md) y [la arquitectura](../arquitectura/reglas-de-trabajo.md). Completa los cuatro incrementos de código previstos para la fase 2.

Rama de trabajo: `feat/publication-domain`. Depende del incremento 3, guardado en el commit `7659f62` de `feat/campaign-domain`. La revisión se organiza en dos PR dependientes: campañas hacia `main` y publicaciones sobre la rama de campañas hasta integrar el primer incremento.

### Comportamiento implementado

`Publication` representa un único destino de una revisión aprobada de campaña. Conserva organización, campaña, contenido aprobado, cuenta social y plataforma por identidad; no importa las entidades de otros módulos.

- Comienza en `PENDING`. `startAttempt` crea un intento con UUID, número y fecha y pasa a `PUBLISHING`.
- `recordSuccess` registra un identificador externo no vacío y la fecha de confirmación. `PUBLISHED` es terminal y no admite otro intento.
- `recordFailure` recibe un código de fallo confirmado: `REJECTED`, `ACCOUNT_UNAVAILABLE` o `RATE_LIMITED`. Se permite reintentar desde `FAILED` con otro ID de intento, manteniendo publicación, cuenta y revisión.
- Repetir una confirmación equivalente devuelve la misma versión sin cambiar sus fechas. Las confirmaciones contradictorias y las de intentos anteriores se rechazan.
- Las instancias anteriores, fechas y metadatos de intento permanecen intactos. Cada cambio efectivo incrementa la versión.

`Campaign` completa su ciclo de publicación:

| Operación                                    | Regla                                                                                                                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `approve(contentId, at, socialAccountIds)`   | Fija una revisión exacta y cuentas sin duplicados. Una aprobación sin cuentas conserva el flujo de revisión de contenido, pero no habilita publicación.                                             |
| `startPublication(publications, at)`         | Exige `APPROVED`, oferta no vencida y una publicación nueva en `PENDING` por cada cuenta aprobada. Rechaza cambios de organización, campaña, contenido o destinos.                                  |
| `recordPublicationSummary(publications, at)` | Comprueba un resumen completo con versiones por publicación. Mantiene `PUBLISHING` si hay destinos pendientes o en curso; al terminar todos produce `PUBLISHED`, `PARTIALLY_PUBLISHED` o `FAILED`.  |
| `retryPublication(publications, at)`         | Solo desde un resultado de publicación parcial o fallido. Exige nuevos intentos en los destinos fallidos y preserva exactamente los exitosos, la aprobación y las cuentas. Revalida el vencimiento. |

`CampaignFailureOrigin` distingue generación y publicación. Un fallo de publicación no permite regenerar ni aprobar contenido nuevo. Una campaña en curso o publicada no permite iniciar otra publicación, regenerar ni cambiar la revisión.

Los resultados de un envío iniciado válidamente pueden registrarse después del vencimiento; el vencimiento bloquea nuevos inicios o reintentos, no la recepción de confirmaciones.

### Decisiones y alternativas

#### Una publicación por cuenta y un resumen de campaña

Una misma campaña puede tener éxito en una cuenta y fallar en otra. Cada `Publication` protege su intento y resultado; `PublicationProgress` conserva únicamente identidades, estados y versiones por destino para validar el resumen de campaña.

Se descartó un único estado global sin detalle porque ocultaría éxitos parciales y facilitaría repetir envíos ya exitosos. También se evitó que `Campaign` contenga o importe entidades `Publication`; recibe el contrato de datos planos `CampaignPublication`, propio del consumidor.

`PublicationStatus` se comparte en `src/domain` como vocabulario pequeño utilizado realmente por ambos módulos. La alternativa sería duplicar los mismos cuatro estados y sus conversiones sin una diferencia de negocio actual. Las plataformas permanecen dentro de publicaciones.

#### Destinos vinculados a la aprobación

Elegir nuevas cuentas después de aprobar alteraría el alcance autorizado. El dominio fija sus IDs junto con el contenido y exige el mismo conjunto al publicar. Regenerar limpia la aprobación y sus destinos.

El caso de uso existente `ApproveCampaign` continúa aprobando solo contenido. La selección de cuentas en aplicación se incorporará junto con un port que valide existencia, pertenencia y conexión. En esta fase, las pruebas ejercitan la aprobación con destinos directamente sobre el dominio; no se expone una entrada de cuentas sin validación externa ni se agregan CRUD de cuentas sociales.

#### Versiones y resultados fuera de orden

El resumen debe incluir todas las publicaciones fijadas al iniciar. Comprueba identidad y versión por destino y acepta listas en distinto orden. Una versión anterior se rechaza; con la misma versión solo se acepta el mismo estado. Los estados exitosos no retroceden y un fallo solo se reabre mediante la operación de reintento.

Se descartaron contadores sueltos de éxitos y fallos porque no permitirían verificar qué cuenta terminó o detectar una respuesta antigua. Reintentar exige versiones nuevas en `PUBLISHING` para todos los destinos fallidos y conserva las versiones exitosas.

#### Fallos confirmados y resultados inciertos

Los códigos de fallo de publicación representan resultados conocidos. No se clasifica automáticamente un timeout de red como fallo reintentable: el proveedor podría haber publicado. El tratamiento de resultados inciertos, la reconciliación y los contratos de proveedores se incorporarán en las fases 7–8, como prevé el modelo.

La entidad evita repetir operaciones sobre su estado actual. La unicidad histórica de IDs e intentos, los constraints por campaña/contenido/cuenta, los bloqueos por versión y la idempotencia de envíos reales requieren persistencia e integración. No se promete entrega exactamente una vez con pruebas en memoria.

### Archivos creados y modificados

Creados:

- `apps/api/src/domain/publication-status.ts`.
- `apps/api/src/modules/publications/domain/entities/publication.ts` y `publication.spec.ts`.
- `apps/api/src/modules/publications/domain/social-platform.ts`.
- `apps/api/src/modules/publications/domain/errors/publication.errors.ts`.
- `apps/api/src/modules/campaigns/domain/value-objects/publication-progress.ts`.
- `apps/api/src/modules/campaigns/domain/entities/campaign-publication.spec.ts`.
- `apps/api/test/support/publication-fixtures.ts`.
- Este documento.

Modificados:

- `apps/api/src/modules/campaigns/domain/entities/campaign.ts`: aprobación de destinos, inicio, resumen, reintento y aislamiento del origen de fallos.
- `apps/api/src/modules/campaigns/domain/campaign-status.ts`: estados de publicación y origen de fallo.
- `apps/api/src/modules/campaigns/domain/errors/campaign.errors.ts`: errores de resumen inválido y antiguo.
- `apps/api/src/modules/campaigns/application/campaign-result.ts`: destinos, origen de fallo y resumen en datos planos independientes.
- `docs/domain.md`, `docs/phase-2.md`, `docs/phase-2-templates.md` y `docs/phase-2-campaigns.md`: estado de implementación y siguiente paso.

No se agregaron dependencias, repositorios sin consumidores, casos de uso de envío, infraestructura ni controllers.

### Verificación

- 43 pruebas unitarias nuevas, incluyendo flujos con las entidades reales de ambos módulos y proyecciones de datos en los fixtures.
- `pnpm test`: 249 pruebas unitarias correctas.
- `pnpm test:e2e`: una prueba HTTP existente correcta.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` y `pnpm build`: correctos.
- Revisión de imports: los módulos no importan entidades internas entre sí ni dependen de NestJS, Prisma, variables de entorno o clientes externos.

Se verificaron éxito parcial y total, fallo total, operaciones prohibidas, separación del origen de fallos, revisión y destinos exactos, versiones antiguas/contradictorias, duplicados, reintentos, vencimiento e inmutabilidad. El test HTTP sigue cubriendo salud de la API; no hay endpoints de publicación.

Pruebas y compilación requirieron ejecución fuera del sandbox por sus procesos secundarios. No se verificaron transacciones ni concurrencia real en PostgreSQL, existencia/conexión de cuentas o envíos a proveedores, porque corresponden a implementaciones posteriores.

### Cierre de fase y siguiente paso

Los cuatro incrementos de la fase 2 están implementados en dominio y aplicación dentro del alcance acordado. Usuarios, membresías y cuentas sociales permanecen definidos conceptualmente para sus fases; generación, renderizado y publicación reales todavía no están conectados.

Primero revisar e integrar campañas y publicaciones mediante PR. Como la rama de publicaciones parte del commit de campañas, revisar el incremento 4 contra `feat/campaign-domain` permite ver solo sus cambios; después de integrar campañas se puede cambiar la base a `main`.

El siguiente desarrollo es la fase 3: diseñar el schema de Prisma a partir de las entidades, definir reconstrucción y mappers explícitos, implementar repositorios, migrations y pruebas de integración. Será necesario garantizar la unicidad de publicaciones y operaciones y persistir de forma consistente las transiciones de campaña y publicaciones. Los casos de uso de coordinación y envío real continúan previstos para las fases 7–8.
