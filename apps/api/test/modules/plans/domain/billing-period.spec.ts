import {
  dailyPeriod,
  localDate,
  localMidnight,
  monthlyPeriod,
} from '#app/modules/plans/domain/billing-period';

const LIMA = 'America/Lima';
const day = (value: Date) => value.toISOString().slice(0, 10);

describe('Billing periods', () => {
  it('reads the local date of an instant', () => {
    // 2026-11-23T03:00Z son las 22:00 del 22 en Lima.
    expect(localDate(new Date('2026-11-23T03:00:00Z'), LIMA)).toEqual({
      year: 2026,
      month: 11,
      day: 22,
    });
  });

  it('finds the instant of a local midnight', () => {
    expect(localMidnight({ year: 2026, month: 11, day: 23 }, LIMA).toISOString()).toBe(
      '2026-11-23T05:00:00.000Z',
    );
    // Madrid cambia de horario: el 29 de marzo de 2026 la medianoche aún es +01:00.
    expect(localMidnight({ year: 2026, month: 3, day: 29 }, 'Europe/Madrid').toISOString()).toBe(
      '2026-03-28T23:00:00.000Z',
    );
  });

  it('resets the day at local midnight', () => {
    const period = dailyPeriod(new Date('2026-11-23T03:00:00Z'), LIMA);
    expect(day(period.start)).toBe('2026-11-22');
    expect(period.resetsAt.toISOString()).toBe('2026-11-23T05:00:00.000Z');
  });

  it.each([
    // Inicio el 15: el 20 cae en el período del 15 al 15 siguiente.
    [{ year: 2026, month: 1, day: 15 }, '2026-11-20T15:00:00Z', '2026-11-15', '2026-12-15'],
    // Antes del día de inicio, sigue el período del mes anterior.
    [{ year: 2026, month: 1, day: 15 }, '2026-11-10T15:00:00Z', '2026-10-15', '2026-11-15'],
    // Inicio el 31: en meses más cortos se usa el último día.
    [{ year: 2026, month: 1, day: 31 }, '2026-02-28T15:00:00Z', '2026-02-28', '2026-03-31'],
    [{ year: 2026, month: 1, day: 31 }, '2026-04-15T15:00:00Z', '2026-03-31', '2026-04-30'],
    // Cambio de año.
    [{ year: 2026, month: 1, day: 5 }, '2027-01-02T15:00:00Z', '2026-12-05', '2027-01-05'],
  ])('anchors the month to the start day %j at %s', (anchor, now, start, reset) => {
    const period = monthlyPeriod(anchor, new Date(now), LIMA);
    expect(day(period.start)).toBe(start);
    expect(period.resetsAt.toISOString()).toBe(`${reset}T05:00:00.000Z`);
  });
});
