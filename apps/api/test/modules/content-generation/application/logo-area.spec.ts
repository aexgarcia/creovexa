import { logoArea, reservedArea } from '#app/modules/content-generation/application/logo-area';

describe('logo area', () => {
  it('places the logo inside the margin of the chosen corner', () => {
    const margin = Math.round(1080 * 0.04);
    const area = logoArea(1080, 1080, 2, 'TOP_RIGHT');
    expect(area.x + area.width).toBe(1080 - margin);
    expect(area.y).toBe(margin);
    // Hasta el 13 % de la altura, con su relleno.
    expect(area.height).toBeLessThanOrEqual(Math.round(1080 * 0.13) + 1);
    const bottomLeft = logoArea(1080, 1080, 2, 'BOTTOM_LEFT');
    expect(bottomLeft.x).toBe(margin);
    expect(bottomLeft.y + bottomLeft.height).toBe(1080 - margin);
  });
  it('limits a very wide logo by width, and allows more width in a story', () => {
    const square = logoArea(1080, 1080, 8, 'TOP_LEFT');
    expect(square.width).toBeLessThanOrEqual(Math.ceil(1080 * 0.3) + 1);
    const story = logoArea(1080, 1920, 8, 'TOP_LEFT');
    expect(story.width).toBeGreaterThan(square.width);
    expect(story.width).toBeLessThanOrEqual(Math.ceil(1080 * 0.4) + 1);
  });
  it('asks the AI for a slightly larger corner than the logo uses', () => {
    const reserved = reservedArea(1, 2, 'TOP_RIGHT');
    const area = logoArea(1000, 1000, 2, 'TOP_RIGHT');
    expect(reserved.widthPct).toBeGreaterThan(((1000 - area.x) / 1000) * 100);
    expect(reserved.heightPct).toBeGreaterThan(((area.y + area.height) / 1000) * 100);
  });
});
