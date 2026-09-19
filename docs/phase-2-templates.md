# Fase 2: incremento 2 — plantillas

Implementado el 18 de septiembre de 2026 según [docs/domain.md](domain.md), sobre la base comercial del incremento 1.

## Comportamiento

- `TemplateDimensions` valida ancho y alto como enteros seguros positivos y permite compararlos por valor. Es inmutable y puede representar tamaños futuros, como 1080 × 1350 o 1080 × 1920.
- La creación de `TemplateRevision` admite únicamente el formato inicial 1080 × 1080. Dimensiones válidas pero fuera de ese formato producen `UnsupportedTemplateDimensionsError`; no se convierten silenciosamente.
- `Template` requiere un nombre no vacío y conserva identidad, organización, revisión vigente y fechas. Al crearla se genera una revisión con UUID propio, número 1 y las mismas referencias de plantilla y organización.
- `Template.createRevision` devuelve otro agregado con una revisión nueva y número consecutivo. Conserva la identidad y fecha de creación de la plantilla. Las revisiones anteriores y las instancias ya entregadas a otros consumidores permanecen intactas.
- `CreateTemplate` valida el identificador de organización, comprueba su existencia por `OrganizationLookup`, genera las dos identidades mediante `IdGenerator`, obtiene el instante de `Clock` y ejecuta una sola operación `TemplateRepository.add`.
- El resultado de aplicación contiene datos planos, dimensiones copiadas y fechas ISO. No expone las entidades ni referencias mutables de sus datos.

El caso de uso recibe `organizationId`, `name` y `dimensions: { width, height }`. No recibe IDs ni números de revisión elegidos por el cliente, HTML, CSS o configuración de un proveedor.

## Decisiones y límites

### Revisiones inmutables

Editar una composición en el futuro no debe cambiar lo que una campaña había seleccionado. Por ello, la identidad de la plantilla y la identidad de su revisión son diferentes conceptos. La revisión conserva su número, dimensiones, propietario y fecha; el agregado cambia la referencia vigente al producir una nueva versión.

Se descartó sobrescribir la misma revisión, porque invalidaría las referencias históricas. El agregado guarda solo la revisión vigente para no exigir cargar todo el historial al operar. El método de dominio rechaza reutilizar el ID de la revisión vigente y fechas anteriores. Los IDs deben provenir del generador; comprobar colisiones con cualquier revisión histórica, persistir revisiones sucesivas y controlar la concurrencia requiere los constraints y la implementación de repositorio de la fase 3. No se afirma que los tests en memoria garanticen estas propiedades de base de datos.

La revisión inicial de esta fase contiene metadatos de formato e identidad. La definición real de composición y su ejecución segura se incorporarán en la fase 6. Crear una plantilla todavía no produce una pieza renderizada.

### Una escritura para crear el agregado

El contrato `TemplateRepository.add(organizationId, template)` exige insertar atómicamente plantilla y revisión inicial, rechazando identidades existentes. Una implementación futura deberá usar una transacción para no dejar una plantilla sin revisión. Se eligió una operación del repositorio frente a dos guardados independientes que podrían completarse parcialmente.

El contrato contiene solo la operación usada por `CreateTemplate`; no se agregaron métodos CRUD sin consumidores. El método de dominio para crear revisiones tiene pruebas, pero aún no existe un caso de uso de edición o un adapter para guardarlas.

### Dependencias y organización

El port `OrganizationLookup` pertenece a plantillas. Aunque su firma coincide con el del catálogo, no se importa desde ese módulo ni se crea un servicio genérico entre módulos. Así cada consumidor conserva su contrato sin depender de detalles internos ajenos.

Se reutilizan `EntityId`, validación de fechas, `Clock` e `IdGenerator`. El código de dominio y aplicación no importa NestJS, Prisma ni integraciones externas. No se agregaron dependencias ni se modificaron el frontend, Docker o `AppModule`. En el contrato de repositorio de organizaciones solo se añadió el salto de línea final que faltaba en la base, necesario para pasar la comprobación global de formato; su comportamiento y firma permanecen iguales.

El identificador de organización delimita la creación, pero no autentica al usuario. Los controles de autorización se incorporarán en la fase correspondiente.

### Corrección necesaria de Vitest

Las primeras pruebas fallaron porque el import `#app/modules/templates/domain/entities/template` desde `test/support` se resolvía hacia `dist`, donde la clase nueva aún no existía. La resolución automática mediante `tsconfigPaths` no cubrió ese caso y hacía que las pruebas dependieran de archivos compilados.

Se configuró el alias explícito `#app → src` en ambos archivos de Vitest, calculado desde `import.meta.url`. Esto mantiene la resolución de producción de `package.json` intacta y permite que tests unitarios y HTTP utilicen las mismas fuentes. Se prefirió corregir la configuración a compilar antes de probar o reescribir los imports de cada prueba. La suite corregida pasó antes de ejecutar el build de las clases nuevas.

## Archivos

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

## Verificación

- 46 pruebas unitarias nuevas: dimensiones inválidas, compatibilidad inicial, UUID, pertenencia, secuencia de revisiones, conservación de referencias, inmutabilidad, fechas, organización inexistente, datos de resultado independientes y propagación de errores de consulta/guardado.
- `pnpm test`: 122 pruebas unitarias correctas en total.
- `pnpm test:e2e`: una prueba HTTP correcta.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` y `pnpm build`: correctos.
- Revisión del diff y límites de imports: sin errores.

Pruebas y compilación necesitaron ejecutarse fuera del sandbox por las restricciones sobre procesos secundarios. La atomicidad y unicidad reales de almacenamiento, los endpoints y el renderizado no se verificaron porque no se implementan en este incremento.

## Siguiente paso

Plantillas ya se integró mediante PR. El incremento 3 de [campañas](phase-2-campaigns.md) está implementado y listo para revisión. Después corresponde el incremento 4, resultados por destino. Este documento conserva el registro de plantillas; la fase 2 todavía no está completa.
