import type { EntityId } from '#app/domain/entity-id';

export const TEMPLATE_STYLE_REFERENCES = Symbol('TEMPLATE_STYLE_REFERENCES');

export interface StyleReferenceSelection {
  organizationId: EntityId;
  templateId: EntityId;
  assetId: EntityId;
}

export interface SavedStyleReference {
  bytes: Uint8Array;
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
}

// Imágenes de ejemplo de una plantilla. Inmutables: una revisión anterior puede seguir usándolas.
export interface TemplateStyleReferences {
  // Guarda el archivo; la revisión que lo usa la crea el caso de uso.
  save(input: StyleReferenceSelection & { bytes: Uint8Array; at: Date }): Promise<void>;
  // Solo dentro de la plantilla y la organización indicadas.
  read(input: StyleReferenceSelection): Promise<SavedStyleReference | null>;
}
