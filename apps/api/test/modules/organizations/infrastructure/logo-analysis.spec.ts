import sharp from 'sharp';
import { analyzeLogo } from '#app/modules/organizations/infrastructure/logo-analysis';

async function png(svg: string) {
  return new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer());
}

// Un círculo marrón grande, un texto ocre más chico y fondo transparente.
const CAFE = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100">
  <circle cx="50" cy="50" r="48" fill="#5B3A29"/>
  <rect x="120" y="35" width="160" height="30" fill="#C98B4E"/>
</svg>`;

describe('analyzeLogo', () => {
  it('takes the dominant color as primary and the next distinct one as secondary', async () => {
    const { isDark, suggestedColors } = await analyzeLogo(await png(CAFE));
    expect(isDark).toBe(true);
    expect(suggestedColors.primary).toMatch(/^#5[0-9A-F]3[0-9A-F]2[0-9A-F]$/);
    expect(suggestedColors.secondary).toMatch(/^#C[0-9A-F]8[0-9A-F]4[0-9A-F]$/);
    // El ocre es más saturado que el marrón: es el acento.
    expect(suggestedColors.accent).toBe(suggestedColors.secondary);
    for (const color of Object.values(suggestedColors)) expect(color).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('derives a light and a dark background from the primary', async () => {
    const { suggestedColors } = await analyzeLogo(await png(CAFE));
    const lightness = (hex: string) =>
      [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0) / 3;
    expect(lightness(suggestedColors.lightBackground)).toBeGreaterThan(230);
    expect(lightness(suggestedColors.darkBackground)).toBeLessThan(40);
  });

  it('ignores white and transparency, and reports a light logo', async () => {
    const light = await png(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
      <rect width="200" height="100" fill="#FFFFFF"/>
      <rect x="20" y="20" width="160" height="60" fill="#F2C94C"/>
    </svg>`);
    const { isDark, suggestedColors } = await analyzeLogo(light);
    expect(isDark).toBe(false);
    expect(suggestedColors.primary).not.toBe('#FFFFFF');
  });

  it('falls back to a neutral palette when the logo has no color of its own', async () => {
    const blank = await png(
      '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="#FFFFFF"/></svg>',
    );
    const { isDark, suggestedColors } = await analyzeLogo(blank);
    expect(isDark).toBe(false);
    expect(suggestedColors.primary).toBe('#111827');
  });
});
