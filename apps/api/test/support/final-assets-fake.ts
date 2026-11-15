import type { CampaignFinalAssets } from '#app/modules/campaigns/application/ports/campaign-final-assets';
// Las suites de dominio y persistencia aíslan el lector de archivos externo; las de almacenamiento verifican bytes reales.
export const finalAssetsFake: CampaignFinalAssets = {
  async readFinal(input) {
    return {
      bytes: new Uint8Array([1]),
      asset: {
        ...input,
        id: input.assetId,
        purpose: 'FINAL_PIECE',
        contentType: 'image/png',
        width: 1080,
        height: 1080,
      },
    };
  },
};
