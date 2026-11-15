import type { LogoPosition } from '#app/domain/value-objects/flyer-design';

// Dónde va el logo superpuesto en el flyer de AI_FULL. Lo usan el brief, que pide a la IA dejar
// la esquina libre, y el compositor, que pega el logo ahí. Portado de
// evaluation/flyer-quality/logo.mjs, con los mismos valores probados.

// Del lado menor del lienzo, desde los bordes.
const MARGIN = 0.04;
// De la altura del lienzo.
const MAX_HEIGHT = 0.13;
// De la altura del logo, alrededor del logo dentro del velo.
const PADDING = 0.18;
// En la primera prueba por API la IA dejó una esquina más chica que la pedida.
const RESERVED_SLACK = 0.04;

// De la anchura del lienzo: 30 % en cuadrado y más en lienzos angostos (40 % en 9:16), para
// que el logo no quede diminuto en una historia.
const maxWidth = (width: number, height: number) => 0.3 * Math.sqrt(height / width);

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LogoArea extends Rect {
  padding: number;
  logo: { width: number; height: number };
}

/** Dónde y de qué tamaño va el logo, con su relleno, en píxeles. aspectRatio: ancho / alto del logo. */
export function logoArea(
  width: number,
  height: number,
  aspectRatio: number,
  position: LogoPosition,
): LogoArea {
  const margin = Math.round(Math.min(width, height) * MARGIN);
  let logoHeight = (height * MAX_HEIGHT) / (1 + 2 * PADDING);
  let logoWidth = logoHeight * aspectRatio;
  const available = width * maxWidth(width, height) - 2 * PADDING * logoHeight;
  if (logoWidth > available) {
    logoWidth = available;
    logoHeight = logoWidth / aspectRatio;
  }
  const padding = Math.round(logoHeight * PADDING);
  const area = {
    width: Math.round(logoWidth) + 2 * padding,
    height: Math.round(logoHeight) + 2 * padding,
  };
  return {
    x: position.endsWith('RIGHT') ? width - margin - area.width : margin,
    y: position.startsWith('BOTTOM') ? height - margin - area.height : margin,
    ...area,
    padding,
    logo: { width: Math.round(logoWidth), height: Math.round(logoHeight) },
  };
}

/** La zona en porcentajes del lienzo, medida desde su esquina y con holgura, para pedírsela a la IA. */
export function reservedArea(canvasRatio: number, aspectRatio: number, position: LogoPosition) {
  const width = 1000;
  const height = Math.round(width / canvasRatio);
  const area = logoArea(width, height, aspectRatio, position);
  const fromLeft = area.x < width / 2 ? area.x : width - area.x - area.width;
  const fromTop = area.y < height / 2 ? area.y : height - area.y - area.height;
  return {
    widthPct: Math.round(((fromLeft + area.width) / width) * 100 + RESERVED_SLACK * 100),
    heightPct: Math.round(((fromTop + area.height) / height) * 100 + RESERVED_SLACK * 100),
  };
}
