# ADR-0005 · Dinero en unidades menores con moneda explícita

- **Estado:** Aceptado (retroactivo)
- **Fecha de registro:** 2026-11-14 · decisión original: fase 2
- **Ámbito:** value object compartido `Money` (`src/domain/value-objects/money.ts`)

## Contexto

Los precios aparecen en la publicidad y un error de redondeo o de moneda es un error comercial.

## Decisión

El dinero se representa con el value object `Money`: importe entero en unidades menores (`amountMinor`, céntimos) y moneda explícita. Monedas admitidas: `PEN`, `USD`, `EUR`. No se asume moneda por ubicación ni se hacen conversiones. Operar con monedas distintas lanza `CurrencyMismatchError`.

## Alternativas consideradas

- **Números decimales (`number`):** errores de coma flotante.
- **Moneda fija del sistema:** más simple, pero impide atender a un cliente de otro país.

## Consecuencias

- El formato visible (símbolo, separadores) es responsabilidad de quien presenta el precio, no del dominio.
- Hoy ese formato está fijo en el flyer y en la política de copy; debe parametrizarse por organización antes de atender otra región.
- Agregar una moneda requiere cambiar el enum en dominio y en el esquema.
