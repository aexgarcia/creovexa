# Pendientes funcionales de la interfaz

Actualizado: 15 de noviembre de 2026. Este inventario distingue controles implementados, limitaciones y elementos ilustrativos de las vistas. Actualizarlo al conectar o sustituir cada elemento.

## Navegación y acceso

| Elemento                | Estado actual                                                                 | Pendiente                                                                       |
| ----------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Buscador de la cabecera | Deshabilitado, «próximamente»; no ejecuta búsquedas                           | Implementar búsqueda global y navegación a resultados                           |
| Notificaciones          | Botón deshabilitado; no representa eventos reales                             | Definir los eventos y conectarlos a una consulta real                           |
| Pie del sidebar         | «Espacio de trabajo / Creovexa Studio» e iniciales CV son etiquetas estáticas | Sustituir por identidad y organización de la sesión cuando exista autenticación |
| Inicio de sesión        | `/login` informa que no está disponible                                       | Implementar identidad, sesión y permisos                                        |

## Productos

| Elemento                                      | Estado actual                                                                 | Pendiente                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Listado, paginación, creación, edición y foto | Conectados a API; guardar datos y subir foto son operaciones separadas        | Mantener la recuperación de errores parciales al evolucionar el flujo        |
| Búsqueda, filtro por tipo y orden             | Funcionan **solo sobre la página cargada**, indicado en pantalla              | Ampliar las consultas de API para buscar, filtrar y ordenar todo el catálogo |
| Orden de precios                              | Agrupa por moneda y luego ordena el importe; no convierte divisas             | Definir conversión únicamente si el producto la necesita                     |
| Vista previa del formulario                   | Refleja los valores en edición y la foto seleccionada; todavía no es un flyer | Ninguna generación debe inferirse de esta muestra                            |
| Archivado y eliminación                       | No disponibles                                                                | Definir e implementar las operaciones antes de exponer acciones              |

## Plantillas

| Elemento                                                   | Estado actual                                                                                        | Pendiente                                                                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Listado y paginación                                       | Conectados a API                                                                                     | —                                                                                                                         |
| Buscador y filtro por formato                              | Funcionan **solo sobre la página cargada**, indicado en pantalla                                     | Ampliar el endpoint para consultas sobre todo el catálogo                                                                 |
| Crear, editar y elegir una base                            | Conectados a API; las bases cargan opciones reales del sistema                                       | —                                                                                                                         |
| Miniaturas y vista previa                                  | Esquemas calculados localmente con textos y colores de ejemplo; el aviso está visible                | Conectar el kit de marca para una muestra más representativa si se requiere; nunca prometer correspondencia exacta con IA |
| Estilo, fondo y cantidad de texto en la muestra            | Aproximación visual simplificada; no interpreta las indicaciones libres ni las referencias de estilo | El resultado real se revisa en la generación de la campaña                                                                |
| Duplicar                                                   | Deshabilitado y marcado «Próximamente»                                                               | Implementar copia real antes de habilitarlo                                                                               |
| Archivado, eliminación e historial navegable de revisiones | No disponibles                                                                                       | Definir las operaciones y sus contratos                                                                                   |
| Referencias al crear                                       | Aviso de guardar primero; se gestionan en edición                                                    | Subida dentro de creación solo si se diseña el flujo de guardado parcial                                                  |
| Referencias al editar                                      | Conectadas a API; hasta dos imágenes. Cada alta o baja crea una revisión inmediatamente              | Se bloquean con cambios sin guardar para evitar perderlos al cargar la revisión nueva                                     |
| Referencias en miniaturas                                  | No se dibujan en el esquema local                                                                    | El esquema no simula una aplicación de estilo por IA                                                                      |

## Configuración de empresa

| Elemento                                | Estado actual                                                                                                                                            | Pendiente                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Perfil, región, voz, colores y contacto | Conectados a API; formulario organizado por secciones                                                                                                    | —                                                                               |
| Resumen lateral e indicador del kit     | Se calculan con los valores del formulario, incluidos cambios sin guardar. Se cuentan cinco apartados: logo, colores, rubro/tono, contacto y texto legal | No interpretarlo como medición de calidad ni como garantía de generación        |
| Muestras de tipografía «Aa»             | Aproximaciones visuales; la selección sí se guarda                                                                                                       | El flyer definitivo lo diseña el generador; no son fuentes finales garantizadas |
| Logo principal                          | Se guarda al confirmar, después del perfil. Un fallo de subida conserva la selección para reintentar                                                     | —                                                                               |
| Variantes del logo                      | Subida y baja inmediatas, señaladas en pantalla. Bloqueadas con cambios sin guardar; el formulario se bloquea mientras se modifica una variante          | —                                                                               |
| Colores del logo                        | Propuestos desde el logo ya guardado; un logo seleccionado todavía no tiene nueva paleta hasta subirse                                                   | —                                                                               |
| Estilo visual y palabras prohibidas     | Campos funcionales con expresiones separadas por coma y contadores                                                                                       | La edición mediante etiquetas individuales del prototipo queda pendiente        |
| CTA predeterminado                      | Texto «Próximamente», sin control operativo                                                                                                              | Definir el campo y conectarlo antes de habilitarlo                              |

## Dashboard: demostración estática

Por instrucción del usuario, la pantalla está adaptada visualmente pero usa únicamente los datos locales de `src/features/dashboard/mocks/dashboard-preview.ts`. **No consulta `GET /dashboard`.** Su aviso de demostración está siempre visible.

- Son estáticos todos los KPI, distribución de estados, nombres y fechas de campañas, porcentaje del kit, publicaciones por red, rendimiento de IA, gráfica semanal y ofertas por vencer.
- Los nombres de campaña de ejemplo no enlazan a IDs inventados. Los accesos a productos, configuración y campañas sí navegan a secciones reales.
- Se conserva el servicio y hook de consulta existentes para una conexión posterior. Los componentes anteriores de métricas reales ya no se montan; revisar su reutilización o retirada al conectar la vista definitiva. Quedan pendientes conexión a métricas reales, completitud del kit y promociones por vencer; algunos de esos datos todavía no pertenecen al endpoint actual.
- La detección real de campañas trabadas sigue pendiente. No se deduce un bloqueo solo de `GENERATING` y no se muestran alertas falsas sobre campañas de la organización.
- Ningún indicador de publicación ni de rendimiento demuestra que se hayan hecho envíos a redes o llamadas a IA.

## Vistas aún por adaptar al nuevo diseño

- **Cuentas sociales:** el servicio actual usa mocks en memoria. Conectar y desconectar no enlaza cuentas reales ni realiza OAuth. Sustituir por integración real y revisar la señalización de demostración al adaptar esta vista.
- **Campañas y publicaciones:** conservar los flujos existentes al adaptar sus pantallas. La publicación efectiva en Meta y TikTok sigue pendiente; no presentar los datos persistidos de publicaciones como prueba de envío a esas redes.

Los mocks usados exclusivamente en pruebas de navegador no forman parte del producto ni sustituyen los servicios en ejecución.
