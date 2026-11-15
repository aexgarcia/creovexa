// Datos exclusivos de la demostración visual. No proceden de la API ni describen la organización activa.
export const dashboardPreview = {
  totals: { campaigns: 7, products: 12, published: 2, pendingApproval: 1 },
  stages: [
    { label: 'Borrador', count: 1, color: '#7f7482' },
    { label: 'Generando', count: 2, color: '#2f5bf5' },
    { label: 'Por aprobar', count: 1, color: '#7fa0ff' },
    { label: 'Aprobada', count: 1, color: '#a97cff' },
    { label: 'Publicando', count: 0, color: '#6b28eb' },
    { label: 'Publicada', count: 2, color: '#22c55e' },
  ],
  recent: [
    { title: 'Café de temporada', status: 'Por aprobar', date: '14 nov.', color: '#7fa0ff' },
    { title: 'Colección de verano', status: 'Generando', date: '13 nov.', color: '#2f5bf5' },
    { title: 'Taller de fin de semana', status: 'Borrador', date: '12 nov.', color: '#b5abb8' },
    { title: 'Tu rutina, renovada', status: 'Publicada', date: '11 nov.', color: '#22c55e' },
    { title: 'Pack de favoritos', status: 'Aprobada', date: '10 nov.', color: '#a97cff' },
  ],
  checklist: [
    { title: 'Logo de empresa', detail: 'Ejemplo: subido', complete: true },
    { title: 'Colores de marca', detail: 'Ejemplo: definidos', complete: true },
    { title: 'Rubro y tono', detail: 'Orienta el estilo y el copy', complete: false },
    { title: 'Contacto', detail: 'Ejemplo: configurado', complete: true },
    { title: 'Productos con foto', detail: 'Ejemplo: 12 de 12', complete: true },
    { title: 'Texto legal', detail: 'Añade tus condiciones habituales', complete: false },
  ],
  weekly: [1, 2, 1, 4, 3, 5, 4, 7],
} as const;
