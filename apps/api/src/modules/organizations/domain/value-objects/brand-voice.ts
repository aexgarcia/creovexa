import { InvalidOrganizationProfileError } from '../errors/organization.errors.js';

// Datos del kit de marca que orientan cómo se ve y qué puede decir el flyer.

export const TYPOGRAPHIES = [
  'SANS_MODERN',
  'SERIF_ELEGANT',
  'ROUNDED',
  'CONDENSED_BOLD',
  'HANDWRITTEN',
] as const;
export type Typography = (typeof TYPOGRAPHIES)[number];

export function typography(value: unknown): Typography | null {
  if (value == null) return null;
  if (!TYPOGRAPHIES.includes(value as Typography))
    throw new InvalidOrganizationProfileError('typography');
  return value as Typography;
}

// Cómo contactar a la empresa. Solo aparece en el flyer si la plantilla lo pide.
export interface Contact {
  readonly whatsapp: string | null;
  readonly website: string | null;
  readonly instagram: string | null;
  readonly address: string | null;
}

// Lo que llega para guardar: los campos que faltan quedan vacíos.
export type ContactInput = Partial<Contact>;

const CONTACT_KEYS = ['whatsapp', 'website', 'instagram', 'address'] as const;
const CONTACT_MAX_LENGTH = 100;

/** null si no hay ningún dato de contacto. */
export function contact(input: unknown): Contact | null {
  if (input == null) return null;
  if (typeof input !== 'object' || Array.isArray(input))
    throw new InvalidOrganizationProfileError('contact');
  const values = input as Record<string, unknown>;
  const extra = Object.keys(values).find(
    (key) => !(CONTACT_KEYS as readonly string[]).includes(key),
  );
  if (extra) throw new InvalidOrganizationProfileError(`contact.${extra}`);
  const result = {} as Record<(typeof CONTACT_KEYS)[number], string | null>;
  for (const key of CONTACT_KEYS) {
    const value = values[key];
    if (value != null && (typeof value !== 'string' || value.trim().length > CONTACT_MAX_LENGTH))
      throw new InvalidOrganizationProfileError(`contact.${key}`);
    result[key] = typeof value === 'string' && value.trim() ? value.trim() : null;
  }
  return Object.values(result).some(Boolean) ? Object.freeze(result) : null;
}

/** Lista de palabras sin vacías ni repetidas (sin distinguir mayúsculas). */
export function wordList(
  value: unknown,
  field: string,
  limits: { items: number; length: number },
): readonly string[] {
  if (value == null) return Object.freeze([]);
  if (!Array.isArray(value) || value.length > limits.items)
    throw new InvalidOrganizationProfileError(field);
  const list = value.map((item) => {
    if (typeof item !== 'string' || !item.trim() || item.trim().length > limits.length)
      throw new InvalidOrganizationProfileError(field);
    return item.trim();
  });
  if (new Set(list.map((item) => item.toLocaleLowerCase('es'))).size !== list.length)
    throw new InvalidOrganizationProfileError(field);
  return Object.freeze(list);
}

export const VISUAL_STYLE_LIMITS = { items: 5, length: 30 };
export const FORBIDDEN_WORD_LIMITS = { items: 20, length: 40 };
export const LEGAL_TEXT_MAX_LENGTH = 200;
