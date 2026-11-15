import type { GenerationSnapshotData } from '#app/modules/campaigns/contract';

// Contexto creativo de la imagen base del modo COMPOSED. Reemplaza al imagePrompt que escribía
// el copy: la dirección de arte sale de la plantilla y del kit de marca. Sin IDs, precios,
// caption ni hashtags, que no ayudan a una imagen sin texto.
export function baseImageContext(snapshot: GenerationSnapshotData, headline: string) {
  const { organization, product, template } = snapshot;
  const design = template.design;
  return {
    business: {
      name: organization.name,
      industry: organization.industry,
      brandTone: organization.brandTone,
      visualStyle: [...organization.visualStyle],
      brandColors: organization.brandColors,
    },
    product: {
      kind: product.kind,
      name: product.name,
      productBrand: product.productBrand,
      photoType: product.photoType,
    },
    objective: snapshot.objective,
    occasion: snapshot.occasion,
    headline,
    artDirection: design
      ? {
          composition: design.composition,
          style: design.style,
          mode: design.mode,
          background: design.background,
          instructions: design.instructions,
        }
      : null,
    additionalInstructions: snapshot.instructions || null,
  };
}
