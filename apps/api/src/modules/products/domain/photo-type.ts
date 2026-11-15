// Qué muestra la foto del producto. Lo indica quien la sube: decide qué debe conservar la IA
// y qué puede recomponer (un producto recortado se conserva idéntico; un lugar se ambienta).
export enum PhotoType {
  // Producto recortado, sin fondo.
  CUTOUT = 'CUTOUT',
  // Producto sobre fondo liso de estudio.
  STUDIO = 'STUDIO',
  // Producto dentro de una escena o ambiente.
  SCENE = 'SCENE',
  // Un local o espacio, típico de servicios.
  PLACE = 'PLACE',
  // Una o varias personas.
  PERSON = 'PERSON',
}

// Lo que se sabe de la imagen actual. Las imágenes subidas antes de existir estos datos no los
// tienen: photoType y hasTransparency son null.
export interface ProductImageTraits {
  readonly photoType: PhotoType | null;
  readonly hasTransparency: boolean | null;
}
