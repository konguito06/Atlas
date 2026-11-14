export type SqlValue = string | number | null;

/**
 * The few SQLite operations the on-device data layer needs. Each app wraps
 * its own driver in this, so the queries themselves are shared.
 */
export interface SqlDatabase {
  /**
   * Runs SQL that returns nothing. Without params it may hold several
   * statements, which must run on one connection.
   */
  execute(sql: string, params?: SqlValue[]): Promise<void>;
  /** Runs a query; each row is an object keyed by column name. */
  select<Row>(sql: string, params?: SqlValue[]): Promise<Row[]>;
}
