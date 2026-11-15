import type { RenderCampaignTemplateInput } from '../application/ports/template-renderer.js';
import { FlyerDesign, type FlyerDesignData } from '#app/domain/value-objects/flyer-design';

function escape(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
}

function money(price: { amountMinor: number; currency: string }): string {
  const minor = BigInt(price.amountMinor);
  return `${escape(price.currency)} ${minor / 100n}.${(minor % 100n).toString().padStart(2, '0')}`;
}

function date(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Lima',
  }).format(new Date(value));
}

// Diseño cuadrado de confianza v1. Sin HTML ni CSS del cliente, fuentes externas, URLs ni valores ejecutables.
export function campaignFlyerHtml(
  input: RenderCampaignTemplateInput,
  mainImage: string,
  logo: string | null,
  design?: FlyerDesignData,
): string {
  // COMPOSED conserva sus dos diseños cuadrados y traduce a ellos la dirección de arte.
  const { composition, mode, elements } = FlyerDesign.create(design).data;
  const layout = composition === 'PRODUCT_PANEL' ? 'PRODUCT_FOCUS' : 'CLASSIC';
  const palette = mode === 'LIGHT' ? 'CORAL' : 'BLUE';
  const settings = {
    showLogo: elements.logo,
    showRegularPrice: elements.regularPrice,
    showPromotionPrice: elements.promotionPrice,
    showHeadline: elements.headline,
    showCta: elements.cta,
    showMainImage: composition !== 'TYPOGRAPHIC',
  };
  const colors =
    palette === 'BLUE'
      ? { background: '#101321', glow: '#4052a0', accent: '#4b63fb', muted: '#d7defa' }
      : { background: '#251214', glow: '#a04543', accent: '#c74335', muted: '#ffe2d5' };
  const { snapshot, copy } = input;
  const promotion = snapshot.promotion;
  const showOffer = promotion !== null && settings.showPromotionPrice;
  const prices =
    (settings.showRegularPrice
      ? `<div class="${showOffer ? 'regular' : 'price'}" data-fit>${showOffer ? 'Precio regular: ' : ''}${money(snapshot.product.regularPrice)}</div>`
      : '') + (showOffer ? `<div class="price" data-fit>${money(promotion!)}</div>` : '');
  const dates = !elements.validity
    ? ''
    : promotion?.endsAt
      ? `${promotion.startsAt ? `Del ${escape(date(promotion.startsAt))} al ` : 'Hasta el '}${escape(date(promotion.endsAt))}`
      : promotion?.startsAt
        ? `Desde el ${escape(date(promotion.startsAt))}`
        : '';
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'none'; connect-src 'none'; frame-src 'none'">
<style>
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1080px;overflow:hidden}body{font-family:Arial,sans-serif;background:#101321;color:#fff}
.flyer{position:relative;width:1080px;height:1080px;background:radial-gradient(ellipse at 100% 0%,${colors.glow} 0%,transparent 55%),${colors.background}}
.flyer.product-focus .hero{inset:auto;left:64px;top:330px;width:952px;height:360px;border-radius:32px;background:#ffffff10;padding:16px}
.flyer.product-focus .shade{display:none}
.hero{position:absolute;inset:0;width:1080px;height:1080px;object-fit:contain}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,11,22,.83) 0%,rgba(8,11,22,.24) 33%,rgba(8,11,22,.15) 43%,rgba(8,11,22,.94) 72%,#0b0f1d 100%)}
.top{position:absolute;top:56px;left:64px;right:64px;display:flex;align-items:center;justify-content:space-between;gap:32px}
.brand{display:flex;align-items:center;gap:18px;min-width:0;max-width:690px}.logo{width:70px;height:70px;object-fit:contain;background:#fff;border-radius:18px;padding:8px}.brand-name{font-size:27px;font-weight:700;height:62px;max-width:590px;display:flex;align-items:center;overflow-wrap:anywhere}
.badge{padding:16px 26px;border:1px solid #ffffff45;border-radius:40px;font-size:22px;background:#ffffff15;white-space:nowrap}
.headline{position:absolute;top:156px;left:64px;right:64px;height:160px;margin:0;font-size:60px;line-height:1.05;letter-spacing:-1.8px;font-weight:800;overflow-wrap:anywhere;text-shadow:0 3px 24px #0007}
.bottom{position:absolute;bottom:50px;left:64px;right:64px}.product{font-size:26px;color:${colors.muted};line-height:1.15;height:62px;max-width:930px;font-weight:600;overflow-wrap:anywhere}
.offer{display:flex;align-items:center;justify-content:space-between;gap:26px;margin-top:12px}.prices{min-width:0;flex:1}.regular{color:#bdc5de;font-size:24px;height:38px;text-decoration:line-through;overflow-wrap:anywhere}.price{font-size:66px;line-height:1.1;font-weight:800;letter-spacing:-2px;height:88px;overflow-wrap:anywhere}
.cta{display:flex;align-items:center;justify-content:center;padding:16px 26px;width:340px;height:104px;background:${colors.accent};color:white;border-radius:22px;font-weight:700;font-size:30px;line-height:1.12;text-align:center;overflow-wrap:anywhere}
.dates{margin-top:22px;border-top:1px solid #ffffff25;padding-top:20px;color:#c4cce2;font-size:20px;line-height:1.2;height:65px;overflow-wrap:anywhere}
</style></head><body><main class="flyer${layout === 'PRODUCT_FOCUS' ? ' product-focus' : ''}">${settings.showMainImage ? `<img class="hero" alt="" src="${mainImage}">` : ''}<div class="shade"></div>
<div class="top"><div class="brand">${logo && settings.showLogo ? `<img class="logo" alt="Logo" src="${logo}">` : ''}<div class="brand-name" data-fit>${escape(snapshot.organization.name)}</div></div><div class="badge">${promotion ? 'Promoción' : 'Descubre'}</div></div>
${settings.showHeadline ? `<h1 class="headline" data-fit>${escape(copy.headline)}</h1>` : ''}
<section class="bottom"><div class="product" data-fit>${escape(snapshot.product.name)}</div><div class="offer"><div class="prices">${prices}</div>${settings.showCta ? `<div class="cta" data-fit>${escape(snapshot.cta)}</div>` : ''}</div>${dates ? `<div class="dates" data-fit>${dates}</div>` : ''}</section>
</main></body></html>`;
}
