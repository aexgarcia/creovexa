# ADR-0022 · Kit de marca: rubro, región y colores propuestos desde el logo

- **Estado:** Aceptado, implementado
- **Fecha:** 2026-11-14
- **Ámbito:** módulo `organizations`
- **Relacionado:** [ADR-0019](0019-perfil-de-marca-en-la-organizacion.md), [ADR-0009](../../../adr/0009-estrategia-de-generacion-del-flyer.md), [datos para generar el flyer](../../../arquitectura/datos-del-flyer.md)

## Contexto

Con el flyer generado por IA ([ADR-0009](../../../adr/0009-estrategia-de-generacion-del-flyer.md)), la apariencia depende de lo que la empresa declara de sí misma. Faltaban tres datos:

- **El rubro**, que orienta el estilo visual mejor que la descripción libre.
- **La región**: país, idioma, zona horaria y moneda estaban fijos en el código, en Perú. Las fechas de las promociones se enviaban en UTC.
- **Los colores de marca**: el compositor usaba dos paletas fijas, así que dos empresas distintas obtenían el mismo azul.

En la prueba de calidad, pedirle los colores al usuario desde cero no fue necesario: el logo ya los tiene.

## Decisión

1. `organizations` guarda el rubro (opcional), la región (`country`, `locale`, `time_zone`, `default_currency`) y los colores de marca (`brand_colors`, cinco colores en hex).
2. **Región por defecto.** Las organizaciones existentes quedan en Perú (`PE`, `es-PE`, `America/Lima`, `PEN`), que era el valor fijo.
3. **El dominio valida la región:**
   - el país, con código ISO de dos letras;
   - el locale, con su forma canónica;
   - la zona horaria, que debe existir en la base IANA del entorno;
   - la moneda, entre las soportadas.
   
   Se puede cambiar un solo campo y los demás se conservan.
4. **Colores propuestos desde el logo, sin IA.** Al subir un logo, el adapter de almacenamiento lo analiza con `sharp` y guarda dos datos en la fila del logo:
   - `is_dark`: si su tinta es oscura;
   - `suggested_colors`: el color dominante es el primario, el siguiente distinto el secundario y el más saturado el acento; los fondos claro y oscuro se derivan del primario.
   
   Son datos del logo, inmutables como su archivo.
5. **Colores efectivos** = los que eligió el usuario o, si no eligió, los propuestos por el logo actual. Elegirlos no borra la propuesta, y enviar `brandColors: null` vuelve a ella. Subir un logo nuevo nunca pisa colores elegidos.

## Alternativas consideradas

- **Copiar los colores propuestos a la organización al subir el logo:** pisaría los que el usuario ya eligió, o obligaría a decidir cuándo sí y cuándo no.
- **Analizar el logo en cada lectura:** obliga a descargar el archivo del almacenamiento en cada `GET /organization`.
- **Un port propio para el análisis:** no hay más de una implementación ni reglas de negocio; es una función de infraestructura que usa el adapter que ya procesa la imagen.
- **Pedir los colores con IA:** cuesta una llamada por logo y no mejora lo que da contar píxeles.

## Consecuencias

- Los logos subidos antes de esta migración no tienen análisis: la tabla es inmutable y el análisis necesita los bytes. Con esos logos, los colores efectivos son nulos hasta que el usuario los elija o vuelva a subir el logo.
- La región todavía no llega al snapshot ni a los prompts; eso corresponde al cambio de `campaigns` y `content-generation` que implementa ADR-0009.
- Una moneda que no está en el enum (por ejemplo, el peso mexicano) requiere ampliar `Currency` ([ADR-0005](../../../adr/0005-dinero-en-unidades-menores.md)).
