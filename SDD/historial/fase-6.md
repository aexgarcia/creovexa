# Fase 6 · Imagen y composición

> Historial consolidado de los documentos originales `docs/phase-*.md`. Registra lo que se decidió y verificó en su momento; el estado vigente está en [estado de fases](../fases/estado.md) y en los [contratos de módulo](../modulos/).

## Fase 6 · Generación con IA y composición de publicidad

### Requerimiento vigente

Cada producto o servicio tendrá una sola imagen guardada. La campaña toma automáticamente esa imagen junto con producto, descripción, precios, promoción, logo, copy e instrucciones adicionales para generar con IA la propuesta visual y componer un flyer final listo para previsualizar, aprobar y publicar. No hay galerías, múltiples imágenes del catálogo ni selector de imagen principal.

La plantilla recibe `mainImage`, un nombre que no presupone el origen de la imagen. En el flujo publicitario será la propuesta visual generada con IA a partir de la foto guardada. La foto del catálogo se mantiene como referencia y se muestra por separado. El resultado compuesto se representa en el frontend mediante `finalAssetUrl`; nunca debe sustituirse por la foto del producto o el resultado intermedio de IA ni construirse a partir de un UUID sin un endpoint de lectura real.

La generación visual con IA sigue formando parte del requerimiento original. `ProductImageSource` obtiene la foto de referencia y `ImageGenerator` crea la propuesta visual preservando la identidad del producto. `TemplateRenderer` compone los textos, precios, fechas, CTA y logo exactos; el modelo no es la fuente de esos valores. El proveedor visual se inyectará mediante un adapter, independientemente del proveedor utilizado para el copy de fase 5.

Flujo: snapshot + copy → foto única mediante `ProductImageSource` → `ImageGenerator` con foto, prompt, copy y snapshot → BASE_IMAGE / `mainImage` → `TemplateRenderer` → FINAL_PIECE / `finalAssetUrl` → revisión y aprobación. La publicación sigue en sus fases posteriores.

### Estado implementado

- Producto: HTTP y dominio permiten cero o una referencia de imagen. Crear el producto antes de subir su foto sigue siendo posible; componer publicidad exige exactamente una. Se conserva el campo existente `imageAssetIds` limitado a un elemento para evitar cambiar todas las respuestas, snapshots y columnas. No se descartan referencias históricas ni se elige silenciosamente una entre varias.
- `GenerateCampaignImage` exige copy persistido y una imagen en el snapshot, y solicita a `ProductImageSource.load` la imagen exacta con organización, producto e ID. `StoredProductImageSource` lee el asset del catálogo verificando organización y producto y entrega una referencia temporal a sus bytes guardados.
- `ImageGenerator.generate` recibe esa referencia temporal, el `imagePrompt` persistido, copy completo y snapshot con producto, precios, promoción, marca/logo e instrucciones. La disponibilidad del proveedor y un prompt no vacío se exigen antes de reservar trabajo. Un fallo de IA no se oculta componiendo la foto original como alternativa.
- Se guarda la propuesta visual de IA como BASE_IMAGE. Es un asset intermedio de campaña, no una segunda imagen del catálogo ni el flyer final. La foto original sigue preservada mediante su asset inmutable de producto y el snapshot, incluso si luego se reemplaza la foto actual.
- `TemplateRenderer` recibe `mainImage`, copy completo (titular, caption, CTA, hashtags) y snapshot con logo, producto, precios e instrucciones. Ya no recibe solo el titular.
- La composición debe devolver PNG 1080×1080. `StorageProvider` guarda FINAL_PIECE y únicamente este asset se registra en el contenido pendiente de aprobación.
- La reserva dura cinco minutos. Se conservan idempotencia, control de versión, pertenencia, recuperación de reservas vencidas y protección ante resultados de otro intento.
- El formulario y detalle del CMS tienen lugares separados para la foto del producto y el flyer final. La API entrega `imageUrl` mediante la ruta de lectura del producto y `productImageUrl` para la imagen fijada en el snapshot de campaña. El CMS resuelve esas rutas contra `NEXT_PUBLIC_API_URL`. `candidateContent.finalAssetUrl` identifica el endpoint de lectura del flyer compuesto; la aprobación requiere cargar su previsualización y verificar los bytes en el backend.
- `TemplatePreview` acepta `mainImage`; no hay selector de foto. El servicio antiguo de demostración ya no asigna la foto del producto a `finalAssetUrl`.

**La fase no está terminada.** El CMS permite guardar y mostrar la imagen del catálogo, generar texto, subir/previsualizar el logo, solicitar el flyer final y aprobarlo después de cargar su vista previa. `GeminiImageGenerator` y `OpenAIImageGenerator` se seleccionan mediante `IMAGE_PROVIDER`, deshabilitado por defecto hasta configurar explícitamente el proveedor visual. `PlaywrightTemplateRenderer` genera PNG 1080×1080 con el logo guardado y el recorrido HTTP se prueba con Chromium, PostgreSQL y MinIO reales. Faltan regeneración e historial con recuperación de versiones. Las respuestas de IA siguen simuladas en las pruebas; no se ha realizado una llamada real al proveedor de imagen ni modificado las claves.

### Persistencia y almacenamiento

`CampaignImageJob` y `CampaignAsset` se crean mediante `20260929000000_campaign_image_storage`. Las claves compuestas conservan organización, campaña y generación. Cada asset conserva operación, propósito, bucket/key internos, SHA-256, tamaño, MIME y dimensiones.

`PrismaCampaignImageRepository` serializa reservas en la fila de campaña y exige copy READY y versión vigente. Utiliza el reloj de PostgreSQL después de adquirir el bloqueo. La confirmación verifica assets de la misma operación y copy exacto, y guarda contenido, PENDING_APPROVAL y reserva READY en una transacción. Liberar un token anterior o confirmado no afecta al intento vigente.

`MinioStorageProvider` usa uploads condicionales (`If-None-Match: *`) para no sobrescribir objetos. Un reintento tras un upload sin metadatos verifica los bytes por SHA-256. Su lector interno exige organización e ID, verifica hash y tamaño y no revela assets ajenos.

PostgreSQL y MinIO no comparten transacción. No se mantiene un bloqueo SQL durante el upload ni se borra el archivo ante una confirmación incierta. Pueden quedar objetos huérfanos; la limpieza posterior debe comprobar que ninguna revisión los referencia.

Dependencias:

- `@aws-sdk/client-s3`: protocolo compatible con MinIO y uploads condicionales, sin implementar firmas propias.
- `sharp`: comprueba formato y dimensiones y decodifica píxeles para rechazar archivos truncados. PNG/JPEG/WebP estáticos, hasta 10 MiB y 16 millones de píxeles. La pieza final exige PNG 1080×1080.

`LocalImageArtifacts` entrega referencias UUID a archivos temporales privados separados por organización/campaña/generación/operación. No admite URLs ni rutas de clientes. El directorio debe pertenecer al proceso de API. Limpieza temporal y workers distribuidos siguen pendientes.

### Configuración y verificación

Variables documentadas en `apps/api/.env.example`: `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`. `StorageModule` valida y comparte la configuración al arrancar. Si no hay credenciales, el catálogo y copy siguen disponibles y la subida devuelve `PRODUCT_IMAGE_UNAVAILABLE` o `ORGANIZATION_LOGO_UNAVAILABLE`; una configuración parcial con una credencial se rechaza al inicio.

Antes de habilitarlo, provisionar un bucket privado sin acceso anónimo. El adaptador no crea buckets ni publica objetos. `pnpm --filter @creovexa/api storage:setup` prepara el MinIO local, comprueba un bucket dedicado sin política pública y completa `apps/api/.env` conservando otras variables. Solo usa las credenciales Docker como alternativa para endpoints locales; en otro entorno se deben configurar credenciales limitadas al bucket. Reiniciar la API después de cambiar su configuración.

Las migraciones `20260929000000_campaign_image_storage` y `20261001000000_product_images` se aplicaron al PostgreSQL local de desarrollo el 1 de octubre de 2026. Para otro entorno: `pnpm --filter @creovexa/api db:migrate`. La segunda agrega la restricción de máximo una referencia de imagen; falla ante datos antiguos con más de una, sin descartarlos silenciosamente.

- `pnpm --filter @creovexa/api test`: reglas de dominio y aplicación, incluida imagen única, foto y prompt requeridos, entrada de referencia a la IA, composición del resultado visual, fallos sin alternativa silenciosa, vencimiento e idempotencia.
- `pnpm --filter @creovexa/api test:integration`: PostgreSQL, migración repetible, concurrencia, aislamiento y confirmación.
- `pnpm --filter @creovexa/api test:storage`: PostgreSQL y MinIO reales, con esquema y bucket temporales exclusivos que se eliminan al terminar. Sin IA. Usa por defecto el MinIO local y las credenciales Docker del `.env` raíz; para otro servicio definir `TEST_STORAGE_ENDPOINT`, `TEST_STORAGE_ACCESS_KEY` y `TEST_STORAGE_SECRET_KEY`. No imprime credenciales.
- El almacenamiento se prueba contra acceso anónimo, reintentos, sobrescritura y bytes inválidos. Incluye escenarios con integraciones simuladas y un caso de uso con renderer Chromium real y foto/respuesta de IA simuladas.

### Archivos del ajuste y siguiente paso

Cambios en dominio y DTO de productos; ports y caso de uso de composición; pruebas unitarias y de almacenamiento; detalle/formulario de campaña, preview de plantilla y tipos del frontend. Se añade `product-image-source.ts` y el componente `campaign-image.tsx`. Los tipos compartidos de imagen quedan en `image-artifact.ts`.

La corrección de generación visual restablece `ports/image-generator.ts` y modifica `GenerateCampaignImage`, el contrato de `TemplateRenderer`, sus pruebas unitarias y de almacenamiento y la guía `fases5-10.md`. No agrega dependencias ni modifica la subida de productos o el diseño del CMS. La foto de referencia y la propuesta visual son entradas y resultados distintos; únicamente el flyer compuesto se registra para aprobación.

Siguiente paso: conectar regeneración e historial con recuperación de versiones; la publicación se mantiene en sus fases posteriores. El proveedor/modelo de imagen requiere configuración propia; cambiar el proveedor de copy no habilita automáticamente generación visual.

### Incremento 4: proveedor visual Gemini

`GeminiImageGenerator` implementa `ImageGenerator` usando la [API REST de generación/edición de imágenes de Gemini](https://ai.google.dev/gemini-api/docs/generate-content/image-generation). Mantiene el protocolo `generateContent`, ya utilizado por el adapter de copy, sin añadir un SDK ni otras dependencias. La URL de Google es fija y no se siguen redirecciones. La clave viaja en `x-goog-api-key`, nunca en la URL ni en logs.

Recibe la foto original mediante una referencia temporal de la misma organización/campaña/generación/operación. Lee e inspecciona sus bytes antes de enviarlos; un ID ajeno, ruta arbitraria o metadatos falsos se rechazan antes de hacer una llamada. Envía una sola foto como base64 junto con prompt, copy y snapshot. El brief pide una propuesta publicitaria con identidad del producto conservada y espacio para que el renderer componga los textos, precios y logo exactos. La fidelidad visual requiere revisión humana del flyer; no se afirma que un prompt garantice identidad perfecta.

La respuesta debe contener una sola imagen final, omitiendo las partes marcadas como pensamientos. Se rechazan respuestas bloqueadas, incompletas, solo de texto, múltiples imágenes y URLs de archivos. Se limita el cuerpo HTTP antes y durante su lectura, y se comprueban base64 canónico, MIME real, decodificación completa, tamaño máximo de 10 MiB y máximo de 16 millones de píxeles. Se normaliza orientación EXIF antes de emitir una referencia privada. No se guarda texto del modelo como copy ni se convierte una foto original en alternativa silenciosa ante fallos.

Configuración independiente, documentada en `apps/api/.env.example`:

- `IMAGE_PROVIDER=disabled` por defecto, incluso si existe `GEMINI_API_KEY` para generar copy.
- `IMAGE_PROVIDER=gemini` habilita explícitamente el adapter; requiere `GEMINI_IMAGE_MODEL` de imagen y la clave de Gemini. No utiliza el modelo de texto como alternativa.
- `GEMINI_IMAGE_TIMEOUT_MS=60000`, entre 100 y 120000 ms. Un intento por solicitud, también limitado durante la lectura del cuerpo. No hay retry automático: tras una respuesta ambigua el proveedor puede haber generado y cobrado la imagen; repetirla automáticamente puede duplicar costes. La campaña conserva el mecanismo de reserva/reintento explícito existente.

Google documenta estos modelos de imagen sin nivel gratuito en su [tabla de precios](https://ai.google.dev/gemini-api/docs/pricing). La disponibilidad de copy gratuito no implica cuota gratuita de imagen. No se modifica el `.env` real ni se activa facturación o se hacen llamadas reales durante este incremento. Una prueba real requiere configurar conscientemente el proveedor/modelo en un proyecto con acceso y revisar su facturación.

Archivos nuevos: `image-generation.config.ts` y su spec, `gemini-image-generator.ts` y su spec, `campaign-image.module.ts`. Se modifican `AppModule`, el token `IMAGE_GENERATOR`, errores de imagen, firma de lectura de `LocalImageArtifacts`, `.env.example`, contexto y prueba de almacenamiento, y esta guía. `CampaignImageModule` hace el binding del adapter al port; no añade servicios que solo deleguen llamadas. El dominio y el caso de uso no importan Gemini.

Verificación: pruebas con archivos temporales e imágenes reales y HTTP simulado de entrada de referencia, salida distinta de la foto, aislamiento por operación/propietario, MIME/bytes, límites de cuerpo, bloqueo del proveedor, timeout de cabeceras y cuerpo, cuota y errores sin fuga de información ni reintentos. Las pruebas de almacenamiento también verifican el binding deshabilitado independientemente del MinIO configurado. No se ha verificado calidad visual contra el modelo real ni se declara completada la previsualización del flyer en el CMS.

### Incremento 3: imagen única del catálogo

Se implementan `SaveProductImage` y `GetProductImage`, con el port `ProductImages` y el adapter `MinioProductImages`. El upload HTTP usa [FileInterceptor de NestJS](https://docs.nestjs.com/techniques/file-upload), limitado a un archivo y 10 MiB; los tipos de Multer se añaden únicamente para compilación, sin una nueva dependencia de ejecución.

- `POST /products/:id/image`: formulario multipart con un único campo `image`. Guarda un objeto inmutable, registra sus metadatos y sustituye la referencia actual del producto en una transacción SQL. Se validan los bytes reales, no el nombre ni el MIME declarado. PNG/JPEG/WebP estáticos, hasta 16 millones de píxeles; se normaliza la orientación EXIF de fotos de teléfono antes de almacenar.
- `GET /products/:id/images/:assetId`: verifica organización y producto, incluyendo assets históricos fijados en snapshots. La respuesta tiene MIME de imagen, tamaño, `Cache-Control: private, no-store` y `X-Content-Type-Options: nosniff`. No se entrega una URL pública de MinIO ni se acepta una ruta/URL arbitraria.
- `ProductImageAsset` conserva propietario, producto, key, hash, MIME, tamaño y dimensiones. Las fotos reemplazadas siguen disponibles para campañas; no aparecen como galería ni opciones de selección.
- La sustitución y las ediciones comerciales usan `updatedAt` como condición de escritura. Una operación que perdió una carrera no sobrescribe la nueva foto ni otros datos; devuelve conflicto. Los objetos subidos antes de un conflicto pueden quedar huérfanos y su limpieza queda pendiente.
- `StoredProductImageSource` convierte la imagen del snapshot en una referencia temporal validada para el caso de composición. No depende de la foto actual del producto ni de una IA.

El formulario permite seleccionar, previsualizar y reemplazar una sola imagen al guardar. Si falla el upload después de crear el producto, conserva su ID para reintentar sin duplicar el producto. En edición, los datos comerciales y la foto se guardan en dos solicitudes; si falla la foto, los datos ya guardados permanecen y la imagen anterior se conserva. El mensaje de error y el formulario permiten reintentar.

Los assets del catálogo tienen una tabla propia porque no pertenecen a una generación de campaña. Reutilizan el protocolo MinIO y la inspección de bytes compartida en `infrastructure/image-files.ts`; no se fuerzan IDs ficticios de campaña para subir productos. La API mantiene el contexto de organización de desarrollo existente. La autenticación real de usuarios sigue en la fase 9; no se presenta este contexto como autorización de producción.

Archivos principales nuevos: migración `20261001000000_product_images`, ports/errores/casos de uso de imagen en productos, `minio-product-images.ts`, `stored-product-image-source.ts`, `product-images.module.ts`, `image-files.ts`, `setup-storage.mjs`, hook `use-upload-product-image.ts` y pruebas de aplicación/HTTP/almacenamiento. Se modifican esquema Prisma, controller/responses/repositorio de productos, respuesta de campaña, configuración, filtro HTTP, formularios/servicios del CMS y cliente multipart.

Verificación: pruebas unitarias de guardado/lectura, rechazo de uploads sin propietario o vacíos/excesivos, y pruebas HTTP contra PostgreSQL y MinIO reales de reemplazo, aislamiento, corrupción, normalización EXIF y preservación de la imagen del snapshot. Las pruebas del cliente comprueban que multipart deje al navegador generar su boundary. Recursos de prueba creados en esquemas/buckets exclusivos y eliminados al finalizar.

### Incremento 5: composición con Chromium real

`PlaywrightTemplateRenderer` implementa `TemplateRenderer` y se inyecta mediante `TEMPLATE_RENDERER`. Reutiliza Playwright y sharp, que ya están declarados; no agrega dependencias. Produce un PNG de 1080×1080 desde un diseño HTML/CSS controlado por el servidor, con `mainImage`, nombre comercial, titular, producto, precio regular/promocional, fechas y CTA exactos. El caption y hashtags se conservan como copy de la publicación, sin intentar colocar un caption de miles de caracteres en el flyer.

En este incremento se comenzó con una composición cuadrada inicial, `square-v1`, para todas las plantillas válidas. El incremento siguiente conecta la configuración visual persistida por revisión. Las piezas ya confirmadas son archivos inmutables y un replay devuelve el asset guardado.

`CampaignRenderResources` es un port de lectura con responsabilidad concreta: resolver los recursos de la operación y comprobar la revisión fijada. `PrismaCampaignRenderResources` comprueba organización, template/revisión/número/dimensiones, reserva activa usando el reloj de PostgreSQL, y BASE_IMAGE perteneciente a organización, campaña, generación y token de operación. Nunca sustituye la revisión por la actual ni utiliza un FINAL_PIECE como entrada. Lee los bytes privados con el adapter de almacenamiento, que verifica hash y tamaño.

El renderer admite un raster de logo verificado por su lector de recursos. El incremento 7 conecta la persistencia del logo de organización: el adapter real devuelve `LOGO_UNAVAILABLE` si el snapshot referencia un logo inexistente o ilegible. No lo omite, no inventa un logo, ni acepta una URL externa como alternativa. Si la organización no tiene logo, muestra su nombre comercial.

Todos los valores se escapan como texto. Solo imágenes PNG/JPEG/WebP estáticas, inspeccionadas y convertidas internamente a data URLs, llegan al navegador. Se usan [contextos aislados de Playwright](https://playwright.dev/docs/api/class-browsercontext) con JavaScript deshabilitado, service workers bloqueados, modo offline y todas las solicitudes de red abortadas. La política CSP solo permite imágenes data y estilos inline del servidor; no permite scripts, frames, formularios ni conexiones. El código de medición de texto ejecutado por Playwright es fijo del servidor, no código procedente del HTML de clientes.

Los textos se ajustan reduciendo su fuente hasta un mínimo de 16 px; si todavía desbordan su espacio, se rechaza la pieza en vez de recortar datos exactos. Los importes se formatean desde unidades menores enteras, sin aritmética de coma flotante. Las fechas usan `es-PE` y zona `America/Lima`. No se inventa promoción si no existe en el snapshot.

Un renderer atiende una composición a la vez y devuelve BUSY ante otra simultánea. Cada render crea un navegador headless aislado y lo cierra al finalizar o fallar. `RENDER_TIMEOUT_MS` vale 20000 por defecto, con rango de 100 a 30000 para lanzamiento/composición. Preparación: `pnpm --filter @creovexa/api renderer:setup`; instala Chromium compatible con la versión de Playwright. Sin Chromium o almacenamiento, `assertAvailable` falla antes de que el caso de uso solicite una imagen de IA. El almacenamiento de campaña puede estar sin configurar al arrancar el catálogo y falla explícitamente al intentar utilizarlo.

Pruebas:

- `pnpm --filter @creovexa/api test`: incluye validación de configuración del renderer.
- `pnpm --filter @creovexa/api test:render`: Chromium real, PNG y dimensiones, textos/precios/fechas visibles, logo de prueba, contenido malicioso, desbordamiento, timeout, concurrencia y cierre del navegador. Genera una muestra local en `apps/api/.local/phase-6-flyer-preview.png`, con imagen sintética de prueba; no es una campaña ni una imagen de IA.
- `pnpm --filter @creovexa/api test:storage`: incorpora aislamiento de recursos y revisión histórica, token anterior, reserva vencida y flujo `GenerateCampaignImage` → Chromium → MinIO → confirmación PostgreSQL/PENDING_APPROVAL/replay, usando foto y respuesta de IA simuladas.

La muestra PNG se inspeccionó visualmente: titular, producto, ambos precios, CTA, marca y fechas se leen completos. La imagen principal se presenta completa, sin recortar un raster de otra proporción. Pasaron 535 pruebas unitarias, 10 de render con Chromium y 25 de almacenamiento, TypeScript, lint, formato y build de API. No se hicieron llamadas de imagen a Google ni se modificó la configuración real de facturación. El flujo HTTP y frontend de generación/previsualización final aún están pendientes.

Archivos nuevos: `campaign-render-resources.ts`, `prisma-campaign-render-resources.ts`, `campaign-flyer-html.ts`, `playwright-template-renderer.ts`, configuración/spec de renderer, `vitest.config.render.ts` y `campaign-flyer.render-spec.ts`. Se modifican el port de renderer y errores, módulos de imágenes, configuración opcional/cierre de MinIO, scripts del paquete API, `.env.example`, contexto/pruebas de almacenamiento y esta guía. Sin migraciones ni cambios de diseño en el CMS.

### Incremento 6: plantillas con diseño persistido

Cada `TemplateRevision` guarda un `design` completo: composición `CLASSIC` o `PRODUCT_FOCUS`, paleta `BLUE` o `CORAL` y seis opciones de visibilidad (logo, precio regular, precio promocional, titular, CTA e imagen principal). El nombre del producto, nombre comercial y fechas de promoción se conservan. Ocultar el precio promocional evita tachar el regular, y una plantilla nunca inventa una promoción cuando la campaña no tiene una. El formato sigue siendo 1080×1080.

`FlyerDesign`, un value object compartido entre revisión y composición, valida los valores permitidos, rechaza claves adicionales y copia/congela los datos. El contrato HTTP usa DTOs anidados y validación estricta; no admite HTML, CSS, URLs ni colores arbitrarios. No se añaden dependencias ni capas de delegación.

La migración `20261001010000_template_design` agrega JSONB con el diseño clásico azul como valor predeterminado para todas las revisiones existentes, valida su forma en SQL y protege revisiones contra UPDATE/DELETE. Los clientes que omiten el diseño al crear conservan el diseño anterior; omitirlo al editar conserva el de la revisión actual. Editar el diseño genera una revisión nueva, con el control de concurrencia existente.

`PrismaCampaignRenderResources` obtiene el diseño de la revisión histórica identificada por el snapshot, junto con los recursos propios de la operación. El renderer utiliza ese diseño y conserva aislamiento, escape de textos y datos comerciales exactos. No toma la revisión actual de la plantilla ni modifica snapshots históricos. La propuesta visual continúa siendo generada con IA en el flujo publicitario; la configuración determina cómo se compone.

El CMS permite elegir composición, paleta y elementos al crear/editar. La vista previa cambia inmediatamente, las tarjetas muestran el diseño guardado y guardar cambios visuales sin renombrar crea una revisión. La vista previa del editor utiliza datos de ejemplo y es orientativa; no se presenta como un asset generado. El editor libre y otros tamaños quedan fuera del alcance.

Archivos nuevos: `flyer-design.ts` y sus pruebas, DTO/pruebas HTTP de diseño, migración y tipo de diseño del frontend. Se modifican entidades/revisiones/casos de uso/resultados/mappers/respuestas de plantillas, filtro HTTP, contrato/lector de recursos y renderer, servicio/editor/previsualización/tarjetas del CMS y pruebas unitarias, HTTP, PostgreSQL, Chromium y cliente. La migración se aplicó al PostgreSQL local de desarrollo el 1 de octubre de 2026.

Verificaciones: 555 pruebas unitarias de API, 29 de frontend, 76 de integración PostgreSQL, 25 de almacenamiento PostgreSQL/MinIO y 13 de renderizado con Chromium. Se comprobaron configuración inválida, persistencia y lectura, aislamiento, revisiones históricas, concurrencia, cambios visuales sin renombrar, visibilidad, promoción y ambos diseños. Se inspeccionaron las vistas móvil/escritorio del editor y la muestra `apps/api/.local/phase-6-product-focus-preview.png`, con imagen/logo sintéticos. Las pruebas de UI usaron la API simulada; las de HTTP y recursos usaron esquemas/buckets exclusivos y los eliminaron al finalizar.

La carga/lectura del logo se completa en el incremento 7. La fase 6 sigue pendiente de conectar los endpoints y el CMS con la generación y lectura real de `finalAssetUrl`. Este incremento no habilita llamadas de imagen a Google ni configura facturación.

### Incremento 7: logo de organización y composición

Configuración de empresa permite seleccionar un único logo PNG, JPEG o WebP, previsualizarlo y guardarlo junto con el perfil. El límite es 10 MB y 16 millones de píxeles; el servidor valida y decodifica los bytes reales, rechaza SVG, animaciones y archivos dañados y normaliza la orientación de fotos. Un PNG conserva su transparencia. La vista mantiene las tarjetas y distribución existentes, con una imagen compacta y alternativa legible si falla su lectura.

- `POST /organization/logo`: multipart con exactamente un campo `logo`; reemplaza la referencia actual y devuelve el perfil con `logoUrl`.
- `GET /organization/logos/:assetId`: devuelve únicamente bytes del logo perteneciente a la organización activa, con MIME verificado, `private, no-store` y `nosniff`. Los logos ajenos e inexistentes devuelven 404.
- GET/PATCH de organización también entregan la URL relativa de lectura. PATCH no acepta un ID de logo enviado por el cliente; las respuestas del frontend resuelven la URL contra la API.

`SaveOrganizationLogo` y `GetOrganizationLogo` usan el port `OrganizationLogos`, implementado por `MinioOrganizationLogos`. La migración `20261002000000_organization_logos` crea metadatos de assets inmutables con propietario, hash, tamaño y dimensiones. Los bytes se guardan en el bucket privado existente. Al reemplazar el logo se conserva el asset anterior para los snapshots históricos, sin galerías ni selección de logos en campañas. La migración se aplicó al PostgreSQL local de desarrollo el 2 de octubre de 2026.

La escritura del logo y de su referencia es una transacción PostgreSQL condicionada por `updatedAt`; las ediciones del perfil usan la misma condición para evitar perder un logo recién subido en una carrera. El reloj avanza al menos un milisegundo por escritura. Los archivos subidos antes de un conflicto pueden quedar huérfanos; su limpieza sigue pendiente. No se borran objetos ante un resultado ambiguo de commit. `StorageModule` comparte la configuración existente entre módulos de producto, organización y campaña, sin añadir dependencias.

`PrismaCampaignRenderResources` lee el logo identificado por el snapshot, con su organización, y verifica hash, tamaño, MIME y dimensiones antes de componerlo. Reemplazar el logo de la empresa no cambia la composición de una campaña cuya generación ya lo fijó. Una referencia ilegible bloquea la composición con `LOGO_UNAVAILABLE`; el renderer conserva las opciones de visibilidad de la revisión de plantilla.

El CMS valida formato/tamaño antes de enviar, libera las URLs temporales y bloquea guardados duplicados. El perfil y el archivo se guardan en solicitudes separadas: si el perfil se guardó y el archivo falló, lo indica y conserva el archivo seleccionado para reintentar. No reintenta automáticamente la subida ni muestra mensajes internos del proveedor.

Archivos creados: port/error/casos de uso/pruebas de logos en `modules/organizations/application`, adapter `minio-organization-logos.ts`, `organization-logos.module.ts`, `storage.module.ts`, migración, `organization-logos.storage-spec.ts` y hook `use-upload-organization-logo.ts`. Archivos modificados: esquema Prisma, repositorio/errores/actualización del perfil, controller/respuestas de organización, filtro HTTP, módulos de catálogo/producto/campaña y lector de recursos; vista/servicio de Configuración, cliente HTTP, pruebas del servicio y de almacenamiento, y esta guía.

Verificaciones: 561 pruebas unitarias de API, 31 de frontend, 76 de integración PostgreSQL, 31 de almacenamiento PostgreSQL/MinIO y 13 de renderizado con Chromium. TypeScript de API/web, lint de API y archivos web afectados, formato completo y build de API pasaron. Se verificaron upload/read HTTP, acceso privado/aislamiento, transparencia, orientación, límites, corrupción, inmutabilidad y conflictos de escritura. Una prueba compone un PNG real con el logo histórico después de reemplazar el actual. La UI se comprobó e inspeccionó en escritorio y móvil con API simulada, incluyendo error parcial, reintento y recarga. Las pruebas reales usan esquemas/buckets aislados y los eliminan al terminar.

La generación, lectura y aprobación del flyer se conectan en el incremento 8. La publicación sigue en sus fases posteriores. No se han realizado llamadas reales de IA visual ni se han cambiado las claves o la configuración de facturación.

### Incremento 8: flyer final desde el CMS

El detalle conserva las acciones en la esquina superior derecha y muestra la foto del catálogo separada del flyer. Tras generar el texto aparece «Generar flyer»: envía la generación fijada en ese copy al caso de uso existente. La propuesta visual se genera con el adapter de IA, se compone con la revisión de plantilla y datos exactos y se almacena como `FINAL_PIECE`. El contenido queda `PENDING_APPROVAL` y las consultas de detalle/listado entregan `candidateContent.finalAssetUrl`.

- `POST /campaigns/:id/image`: acepta únicamente `{ generationId }`, ejecuta `GenerateCampaignImage` y devuelve `{ contentId, generationId, finalAssetUrl }`. Repetir una generación ya completada devuelve el mismo contenido sin otra llamada de IA. Un ID de generación obsoleto se rechaza; no se toman URLs, imágenes ni datos comerciales del navegador.
- `GET /campaigns/:id/assets/:assetId`: lee únicamente el PNG final referenciado por el contenido candidato de esa campaña y generación. Un asset ajeno, intermedio o no referenciado devuelve 404. Verifica hash, MIME, dimensiones y bytes decodificables, y responde con `private, no-store` y `nosniff`.
- `POST /campaigns/:id/approve`: conserva el control de contenido/versión/promoción existente y ahora exige un solo asset final legible de esa campaña y generación. Un ID sin archivo, un resultado intermedio o bytes corruptos no pueden aprobarse. La promoción se comprueba de nuevo después de la lectura, antes de persistir.

`CampaignFinalAssets` es el port de lectura verificada, implementado por `MinioStorageProvider`. `GetCampaignFinalAsset` comprueba la referencia candidata y pertenencia; `ApproveCampaign` utiliza el mismo port. La validación pertenece a los casos de uso y al adapter, sin lógica de negocio ni acceso a MinIO en controllers. Se reutilizan `GenerateCampaignImage`, reservas y transacciones existentes; no se agregan dependencias, tablas ni migraciones.

El CMS resuelve `finalAssetUrl` contra la API y nunca lo reemplaza por la foto del producto o la imagen intermedia. La aprobación permanece bloqueada mientras no cargue la vista previa. Una imagen ilegible ofrece «Reintentar vista previa», que solo vuelve a leer el PNG, sin regenerarlo ni consumir IA. Al aprobar se envía el ID exacto de contenido mostrado. Durante generación se bloquean clics duplicados y se informa que puede tardar unos minutos; no hay reintentos automáticos. Si hay un timeout se pide actualizar la campaña antes de volver a generar, porque el servidor podría haber terminado.

La generación visual utiliza `IMAGE_PROVIDER=gemini`, `GEMINI_IMAGE_MODEL` y la clave/configuración ya documentadas para el adapter. El proveedor permanece deshabilitado por defecto; una suscripción de Gemini o la configuración de copy no lo habilitan por sí solas. Sin proveedor/almacenamiento disponibles, la API devuelve `IMAGE_UNAVAILABLE` antes de reservar trabajo o llamar al modelo. No se ha elegido un modelo nuevo ni modificado el entorno real para activar llamadas.

Archivos creados: `campaign-final-assets.ts`, `get-campaign-final-asset.ts`, `final-assets.spec.ts`, `campaign-image.controller.ts`, `campaign-flyer.storage-spec.ts`, `final-assets-fake.ts` y `use-campaign-image.ts`. Archivos modificados: aprobación, errores/respuestas de campaña, adapter MinIO, módulos de imagen/persistencia/catálogo y filtro HTTP; detalle/imagen/tarjeta de copy, servicio de campañas y cliente HTTP del CMS; pruebas/contextos de dominio, PostgreSQL y servicio frontend, y esta guía. Las pruebas de dominio/persistencia aíslan el lector externo con un fake explícito; las de almacenamiento/HTTP prueban la validación real.

Verificaciones: 567 pruebas unitarias de API, 34 de frontend, 76 de integración PostgreSQL, 36 de almacenamiento PostgreSQL/MinIO y 13 de render con Chromium. TypeScript de API/web, lint de API y archivos frontend afectados, formato completo y build de API pasaron. El recorrido HTTP genera con respuesta de IA simulada y foto real, compone con Chromium, guarda/lee el PNG y aprueba; verifica replay sin otra llamada, copy obligatorio, generación obsoleta, aislamiento, bloqueo de imagen intermedia y corrupción antes de aprobación. Los esquemas/buckets de prueba son exclusivos y se eliminan al terminar.

Se comprobó el CMS con API simulada: error seguro, reintento explícito, generación fijada, bloqueo durante trabajo, fallo de previsualización que impide aprobar, recarga del PNG sin regenerar y aprobación del contenido exacto. Las capturas de escritorio/móvil se inspeccionaron y no presentan desbordamiento horizontal. No se ha comprobado la calidad contra un modelo real de imagen ni se han generado campañas reales del usuario en estas pruebas.

El 5 de octubre de 2026 se comprobó también el arranque del build y las rutas nuevas en OpenAPI usando temporalmente el puerto 3002, con IA visual deshabilitada. El proceso temporal se detuvo después de leer la documentación. El proceso que ocupaba el puerto 3001 no exponía las rutas de este proyecto y se conservó; para probar el CMS debe arrancarse esta API en el puerto configurado en `NEXT_PUBLIC_API_URL`.

Siguiente incremento de fase 6: regeneración e historial con recuperación de versiones. La publicación en redes sigue pendiente de las fases de integración/publicación; este incremento permite preparar y aprobar el flyer, sin anunciar que ya se publica.

### Incremento 9: modelos OpenAI seleccionados

El 13 de octubre de 2026 se incorpora `OpenAIImageGenerator` para el modelo solicitado `gpt-image-2`, manteniendo el port `ImageGenerator`, almacenamiento, renderer y contratos HTTP/CMS existentes. El copy utiliza `gpt-5-mini` en la configuración local, con `reasoning.effort=minimal` para ese modelo y sus snapshots. Los otros modelos de copy conservan su solicitud anterior.

El adapter visual envía una única foto real verificada como multipart a `/v1/images/edits`, con `model=gpt-image-2`, `n=1`, `size=1024x1024`, `output_format=png` y calidad explícita `low`, `medium` o `high`. No utiliza `input_fidelity` ni `response_format`: GPT Image 2 procesa las referencias con fidelidad alta y devuelve base64. La resolución de la propuesta visual cumple los múltiplos de 16 del proveedor; el renderer existente entrega el flyer final 1080×1080, componiendo logo, datos comerciales y copy exactos. La identidad del producto y la calidad creativa requieren revisión de la imagen final.

La configuración agrega `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_QUALITY` y `OPENAI_IMAGE_TIMEOUT_MS`; comparte `OPENAI_API_KEY` del backend. `IMAGE_PROVIDER` admite `disabled`, `gemini` y `openai`, sin fallback entre proveedores. La presencia de la clave por sí sola no activa imágenes. La configuración local selecciona `COPY_PROVIDER=openai`, `OPENAI_COPY_MODEL=gpt-5-mini`, `OPENAI_COPY_TIMEOUT_MS=40000`, `IMAGE_PROVIDER=openai`, `OPENAI_IMAGE_MODEL=gpt-image-2`, `OPENAI_IMAGE_QUALITY=medium` y `OPENAI_IMAGE_TIMEOUT_MS=120000`, conservando las claves existentes. Reiniciar la API carga estos valores. La autorización y acceso al modelo de esa cuenta no se verificaron con llamadas reales.

Las referencias son temporales y propias de la misma organización/campaña/generación/operación. Antes de llamar se decodifica la foto y se compara con sus metadatos. La respuesta se limita durante streaming y por tamaño declarado, con timeout que cubre cabeceras y cuerpo; solo se acepta un PNG decodificable 1024×1024 de hasta 10 MB. No se siguen redirecciones ni URLs de salida. La generación visual realiza un único intento, sin retry automático, y registra solamente proveedor, IDs y códigos seguros. Un 429 devuelve `RATE_LIMITED`; otros errores HTTP no filtran cuerpos ni credenciales. No se ejecutaron solicitudes reales ni se consumió saldo en las verificaciones.

Archivos creados: `openai-image-generator.ts` y sus pruebas. Modificados: configuración/pruebas de imágenes, binding de `CampaignImageModule`, generator/pruebas de copy OpenAI, `apps/api/.env.example`, configuración local no versionada y esta guía. No hay dependencias, migraciones ni cambios de diseño en el frontend.

Fuentes: [OpenAI Docs: edición de imágenes](https://developers.openai.com/api/reference/resources/images/methods/edit), [prompting de imágenes](https://developers.openai.com/api/docs/guides/image-prompting) y [GPT-5 mini](https://developers.openai.com/api/docs/models/gpt-5-mini).

Verificaciones: 588 pruebas unitarias de API, 76 de integración PostgreSQL, 36 de almacenamiento PostgreSQL/MinIO y 13 de renderizado con Chromium; TypeScript de API, lint, formato completo y build correctos. El nuevo adapter se prueba con HTTP simulado y PNG reales: multipart y modelo exactos, referencias propias, calidad/tamaño, salida distinta de la foto, MIME/dimensiones/base64, rechazo de URLs, límites y timeouts de cabeceras/cuerpo, errores sin credenciales y una sola solicitud por intento. La llamada real a GPT Image 2, calidad creativa y acceso de la cuenta quedan por comprobar al generar una campaña desde el CMS. Regeneración/historial siguen siendo el siguiente alcance pendiente de fase 6.
