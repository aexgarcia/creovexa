// Períodos de uso en la zona horaria de la organización (ADR-0033). Las fechas locales se
// representan como Date a medianoche UTC del mismo día, como las columnas DATE.

export interface LocalDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export interface UsagePeriod {
  // Fecha local en que empezó, para guardar el contador.
  start: Date;
  // Instante en que termina y se reinicia el cupo.
  resetsAt: Date;
}

const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

export function localDate(instant: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((part) => part.type === type)!.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

export function dateValue({ year, month, day }: LocalDate): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function offset(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const value = (type: string) => Number(parts.find((part) => part.type === type)!.value);
  const asUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** El instante de la medianoche local de una fecha. */
export function localMidnight(date: LocalDate, timeZone: string): Date {
  const guess = Date.UTC(date.year, date.month - 1, date.day);
  // Segunda pasada por si el cambio de horario cae entre la estimación y la medianoche.
  const first = guess - offset(guess, timeZone);
  return new Date(guess - offset(first, timeZone));
}

function addMonths(year: number, month: number, months: number) {
  const index = year * 12 + (month - 1) + months;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

// El día de inicio en un mes concreto; en meses más cortos, el último día.
function anchored(year: number, month: number, anchorDay: number): LocalDate {
  return { year, month, day: Math.min(anchorDay, daysIn(year, month)) };
}

/** Período mensual que empieza el mismo día del mes que el plan. */
export function monthlyPeriod(anchor: LocalDate, now: Date, timeZone: string): UsagePeriod {
  const today = localDate(now, timeZone);
  let start = anchored(today.year, today.month, anchor.day);
  if (today.day < start.day) {
    const previous = addMonths(today.year, today.month, -1);
    start = anchored(previous.year, previous.month, anchor.day);
  }
  const next = addMonths(start.year, start.month, 1);
  return {
    start: dateValue(start),
    resetsAt: localMidnight(anchored(next.year, next.month, anchor.day), timeZone),
  };
}

/** El día local en curso. */
export function dailyPeriod(now: Date, timeZone: string): UsagePeriod {
  const today = localDate(now, timeZone);
  const tomorrow = localDate(new Date(dateValue(today).getTime() + 36 * 3600 * 1000), 'UTC');
  return { start: dateValue(today), resetsAt: localMidnight(tomorrow, timeZone) };
}
