declare const transactionContext: unique symbol;

// Opaque handle to a database transaction in progress. It lets one module ask another
// to take part in its transaction without either of them knowing the database client.
export interface TransactionContext {
  readonly [transactionContext]: true;
}
