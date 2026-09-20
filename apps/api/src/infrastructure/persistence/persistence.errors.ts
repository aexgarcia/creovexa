export class PersistenceConflictError extends Error {
  constructor() {
    super('La escritura entra en conflicto con un registro existente.');
    this.name = 'PersistenceConflictError';
  }
}

export class PersistenceReferenceError extends Error {
  constructor() {
    super('Una referencia de la escritura no existe o no pertenece al recurso.');
    this.name = 'PersistenceReferenceError';
  }
}

export class PersistenceScopeError extends Error {
  constructor() {
    super('La escritura no pertenece a la organización indicada.');
    this.name = 'PersistenceScopeError';
  }
}
