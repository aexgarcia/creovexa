# ADR-0007 · Almacenamiento privado S3-compatible con assets inmutables

- **Estado:** Aceptado (retroactivo)
- **Fecha de registro:** 2026-11-14 · decisión original: fase 6
- **Ámbito:** imágenes de producto, logos y assets de campaña

## Contexto

El sistema guarda fotos de producto, logos, imágenes generadas y flyers finales. Deben poder moverse de MinIO local a S3, Cloudflare R2 u otro servicio compatible.

## Decisión

- Storage accedido mediante el protocolo S3 (`@aws-sdk/client-s3`); MinIO en desarrollo.
- El bucket es **privado**. El cliente nunca recibe URLs del storage: lee las imágenes a través de endpoints de la API que verifican la organización.
- Los objetos son **inmutables**: se suben con escritura condicional y nunca se sobrescriben. Reemplazar una imagen crea un asset nuevo.
- Cada asset tiene una fila en PostgreSQL con dueño, clave interna, SHA-256, tamaño, tipo y dimensiones. Los bytes se validan realmente (con `sharp`): PNG, JPEG o WebP, hasta 10 MiB y 16 millones de píxeles.
- PostgreSQL y el storage no comparten transacción. Ante una confirmación incierta **no se borra** el objeto.

## Alternativas consideradas

- **URLs públicas o prefirmadas:** menos carga en la API, pero expone material no aprobado y complica el aislamiento por organización. Puede adoptarse más adelante para el flyer ya publicado.
- **Guardar bytes en PostgreSQL:** más simple, pero infla la base y los respaldos.

## Consecuencias

- Pueden quedar objetos huérfanos; falta una limpieza periódica.
- Servir imágenes pasa por la API; aceptable para el volumen esperado.
- Hoy existen tres adapters y tres tablas de assets separados. Se unifican en un módulo `assets` ([ADR-0010](0010-dividir-campaigns.md)).
