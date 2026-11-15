declare const transactionContext: unique symbol;

// Referencia opaca a una transacción de base de datos en curso. Permite que un módulo pida a otro
// participar en su transacción sin que ninguno de los dos conozca el cliente de la base de datos.
export interface TransactionContext {
  readonly [transactionContext]: true;
}
