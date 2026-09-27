export function amountMinor(value: string): number | null {
  if (!/^\d{1,14}(?:[.,]\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.replace(',', '.').split('.');
  const result = Number(BigInt(whole!) * BigInt(100) + BigInt(fraction.padEnd(2, '0')));
  return Number.isSafeInteger(result) ? result : null;
}
export function decimalPrice(value: number): string {
  const digits = String(value).padStart(3, '0');
  return digits.slice(0, -2) + '.' + digits.slice(-2);
}
