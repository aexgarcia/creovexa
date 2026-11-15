# ADR-0013 · Catálogo unificado de productos y servicios

- **Estado:** Aceptado (retroactivo)
- **Fecha de registro:** 2026-11-14 · decisión original: fase 2
- **Ámbito:** módulo `products`

## Contexto

El sistema debe publicitar tanto productos como servicios. Para generar publicidad ambos necesitan lo mismo: nombre, descripción, precio y una imagen.

## Decisión

Una sola entidad `Product` con el discriminador `ProductKind.PRODUCT | SERVICE`, una sola tabla y un solo conjunto de endpoints (`/products`). Una campaña promociona un único elemento del catálogo.

## Alternativas consideradas

- **Módulos `products` y `services` separados:** duplicaría entidades, repositorios, endpoints y pantallas sin reglas distintas que lo justifiquen.
- **Sin discriminador:** impediría adaptar el texto ("producto" o "servicio") en el copy y en el CMS.

## Consecuencias

- La campaña y la generación tratan igual a ambos tipos.
- Si los servicios adquirieran reglas propias (duración, reservas, disponibilidad), habría que separar el modelo; hoy están fuera del alcance.
- Las campañas con varios productos quedan para una ampliación posterior.
