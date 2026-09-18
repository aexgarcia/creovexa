# Fase 2: incremento 1 — organizaciones y catálogo

Implementado el 17 de septiembre de 2026 según el [modelo de dominio](domain.md). La fase 2 continúa pendiente de sus incrementos de plantillas, campañas y resultados por destino.

## Comportamiento disponible

- `CreateOrganization` crea una organización con nombre obligatorio y perfil de marca opcional.
- `UpdateOrganizationProfile` actualiza los campos proporcionados, conserva identidad y fecha de creación, y permite retirar tono o logo mediante `null`.
- `CreateProduct` registra un producto o servicio únicamente si la organización existe, consultada mediante el port `OrganizationLookup`.
- `UpdateProduct` modifica los datos comerciales del producto dentro de la organización indicada. Conserva su identidad, propietario y tipo; rechaza recursos ajenos o inexistentes.

Estos son casos de uso de aplicación probados directamente. Todavía no están expuestos por HTTP ni conectados a PostgreSQL. Los fakes pertenecen exclusivamente a tests, y no se registraron nuevos providers en `AppModule`.

## Decisiones concretadas

### Dinero explícito

`Money.fromMinorUnits(amountMinor, currency)` acepta enteros seguros no negativos y las monedas iniciales `PEN`, `USD` y `EUR`. Las tres usan actualmente dos dígitos fraccionarios, definidos por moneda: `1990 PEN` representa 19,90 soles. No hay moneda predeterminada, conversión implícita ni conversión desde números decimales. Se rechazan valores como `19.9`, negativos, `NaN`, infinitos o enteros fuera del rango seguro.

El conjunto acotado permite validar los importes sin incorporar una dependencia monetaria ni pretender soportar todos los códigos de moneda. Ampliarlo exige declarar su precisión y añadir pruebas. Las comparaciones de orden entre monedas diferentes fallan explícitamente; la igualdad considera importe y moneda.

Una actualización de precio puede proporcionar una nueva pareja importe/moneda completa. Eso reemplaza el precio comercial, no calcula un tipo de cambio. La promoción continúa reservada a campañas.

### Entidades con actualizaciones atómicas en memoria

`Organization.updateProfile` y `Product.updateDetails` validan todos los cambios y devuelven una entidad nueva. La instancia anterior sigue intacta, incluso si la validación o el guardado posterior falla. Se prefirió esto a setters que pudieran dejar cambios parciales sobre una entidad cargada.

Las fechas se copian al leerlas y los arrays de imágenes son inmutables. `undefined` conserva un campo en actualizaciones; `null` elimina tono/logo; una descripción vacía o un array vacío eliminan sus respectivos contenidos. Las fechas inválidas o anteriores a la última modificación se rechazan.

### Identidad y referencias de assets

`EntityId` es un tipo nominal común que valida UUID y normaliza su escritura a minúsculas. No se crean clases para cada ID. Los identificadores de logo e imágenes también son UUID estables, sin URLs de proveedor. No se aceptan imágenes duplicadas por diferencias de mayúsculas.

Este incremento valida la forma de las referencias de assets, no su existencia, propiedad o carga en almacenamiento. Esas comprobaciones se incorporarán con el módulo que gestione assets y su integración; no hay un repositorio ficticio de archivos.

### Contratos y límites entre módulos

Cada módulo define su repositorio concreto de dominio, sin `BaseRepository`. `add` representa inserción y no debe sobrescribir una identidad existente; `save` actualiza un recurso existente y no es un upsert. En productos, las operaciones reciben explícitamente la organización. Las implementaciones reales y sus constraints se incorporarán con persistencia.

El catálogo solo conoce `OrganizationLookup`, un port de lectura definido por el consumidor. No importa entidades ni repositorios internos de organizaciones. Los resultados de aplicación se convierten explícitamente en objetos de datos, con fechas ISO y copias de los datos de precio/imágenes; no se entregan entidades a futuros controllers.

`Clock` e `IdGenerator` son ports pequeños compartidos por los casos de uso que necesitan tiempo o IDs nuevos. Se inyectan desde el constructor para hacer pruebas deterministas. Sus implementaciones de producción y la composición NestJS se incorporarán cuando se conecte la aplicación a infraestructura.

La separación por organización está comprobada en consultas y actualizaciones, incluida una defensa si un repositorio devuelve un recurso equivocado. No constituye todavía autenticación o autorización: el origen confiable del identificador de organización corresponde a la fase de seguridad.

No se agregaron dependencias, infraestructura, controllers ni cambios al frontend.

## Archivos creados y modificados

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

## Verificación

- `pnpm test`: 76 pruebas unitarias correctas, de las cuales 64 corresponden a este incremento y 12 ya existían.
- `pnpm test:e2e`: una prueba HTTP existente correcta.
- `pnpm typecheck`: API y CMS correctos.
- `pnpm lint`: correcto.
- `pnpm build`: API y CMS compilan correctamente.
- Formato y revisión del diff: sin errores.
- Revisión de imports: dominio y aplicación nuevos no dependen de NestJS, Prisma, variables de entorno ni integraciones externas; los módulos comerciales no importan internals entre sí.

Las pruebas cubren creación y actualización, datos inválidos, moneda explícita, identidad, referencias duplicadas, encapsulación de fechas y arrays, entidades ausentes, aislamiento por organización y conservación de datos ante fallos de validación o almacenamiento. Vitest y compilación se ejecutaron fuera del sandbox porque requieren procesos secundarios.

La persistencia, concurrencia real, constraints de base de datos, endpoints comerciales y autorización permanecen pendientes de sus fases. No se requieren cambios de Docker para ejecutar estas pruebas de dominio y aplicación.

## Siguiente paso

Revisar e integrar este incremento con su PR. Después implementar el incremento 2: plantillas, identidad de revisiones y dimensiones. El resto de la fase 2 no debe considerarse implementado por este cambio.
