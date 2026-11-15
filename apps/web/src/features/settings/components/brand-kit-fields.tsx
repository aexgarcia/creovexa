'use client';
import { Palette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { BrandColors, Currency, Region } from '../services/company-settings.service';

// Países con su zona horaria principal. El idioma de los textos es español en todos.
const COUNTRIES = [
  { code: 'PE', name: 'Perú', timeZone: 'America/Lima' },
  { code: 'MX', name: 'México', timeZone: 'America/Mexico_City' },
  { code: 'CO', name: 'Colombia', timeZone: 'America/Bogota' },
  { code: 'CL', name: 'Chile', timeZone: 'America/Santiago' },
  { code: 'AR', name: 'Argentina', timeZone: 'America/Argentina/Buenos_Aires' },
  { code: 'EC', name: 'Ecuador', timeZone: 'America/Guayaquil' },
  { code: 'BO', name: 'Bolivia', timeZone: 'America/La_Paz' },
  { code: 'ES', name: 'España', timeZone: 'Europe/Madrid' },
  { code: 'US', name: 'Estados Unidos', timeZone: 'America/New_York' },
] as const;

const CURRENCIES: { code: Currency; name: string }[] = [
  { code: 'PEN', name: 'Soles (S/)' },
  { code: 'USD', name: 'Dólares (US$)' },
  { code: 'EUR', name: 'Euros (€)' },
];

const COLOR_FIELDS: { key: keyof BrandColors; label: string }[] = [
  { key: 'primary', label: 'Principal' },
  { key: 'secondary', label: 'Secundario' },
  { key: 'accent', label: 'Acento (botón y precio)' },
  { key: 'lightBackground', label: 'Fondo claro' },
  { key: 'darkBackground', label: 'Fondo oscuro' },
];

// Punto de partida si no hay logo ni colores elegidos.
const NEUTRAL: BrandColors = {
  primary: '#111827',
  secondary: '#6B7280',
  accent: '#2563EB',
  lightBackground: '#F3F4F6',
  darkBackground: '#0B0F19',
};

// El mismo estilo que los demás select del CMS.
const selectClass = 'h-11 w-full rounded-[10px] border border-input bg-control px-3 text-sm';

/** País y moneda. Al cambiar de país se ajustan la zona horaria y el idioma regional. */
export function RegionFields({
  region,
  onChange,
}: {
  region: Region;
  onChange: (region: Region) => void;
}) {
  const known = COUNTRIES.some((country) => country.code === region.country);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="organization-country">País</Label>
        <select
          id="organization-country"
          className={selectClass}
          value={region.country}
          onChange={(event) => {
            const country = COUNTRIES.find((c) => c.code === event.target.value);
            if (country)
              onChange({
                ...region,
                country: country.code,
                locale: `es-${country.code}`,
                timeZone: country.timeZone,
              });
          }}
        >
          {!known && <option value={region.country}>{region.country}</option>}
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Las fechas de las promociones se muestran en la hora de {region.timeZone}.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="organization-currency">Moneda por defecto</Label>
        <select
          id="organization-currency"
          className={selectClass}
          value={region.currency}
          onChange={(event) => onChange({ ...region, currency: event.target.value as Currency })}
        >
          {CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * Los colores del flyer. Mientras el usuario no elija los suyos (custom = null), se usan los
 * que el sistema propone desde el logo.
 */
export function BrandColorFields({
  custom,
  suggested,
  onChange,
}: {
  custom: BrandColors | null;
  suggested: BrandColors | null;
  onChange: (colors: BrandColors | null) => void;
}) {
  const shown = custom ?? suggested;
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Palette className="size-4" /> Colores de marca
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {custom
              ? 'Colores elegidos por ti.'
              : suggested
                ? 'Propuestos a partir de tu logo. Puedes cambiarlos.'
                : 'Sube un logo para que te propongamos colores, o elígelos tú.'}
          </p>
        </div>
        {custom && suggested && (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}>
            Usar colores del logo
          </Button>
        )}
      </div>
      {shown ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key} className="min-w-0 space-y-2">
              <Input
                id={`brand-color-${key}`}
                type="color"
                className="h-12 w-full cursor-pointer rounded-xl p-1"
                value={shown[key].toLowerCase()}
                onChange={(event) =>
                  onChange({ ...shown, [key]: event.target.value.toUpperCase() })
                }
              />
              <Label htmlFor={`brand-color-${key}`} className="font-normal">
                {label}
                <span className="mt-1 block font-mono text-xs text-muted-foreground">
                  {shown[key]}
                </span>
              </Label>
            </div>
          ))}
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(NEUTRAL)}>
          Elegir colores
        </Button>
      )}
    </div>
  );
}
