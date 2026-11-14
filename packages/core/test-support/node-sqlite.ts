import { DatabaseSync } from "node:sqlite";
import type { SqlDatabase } from "../src/local/sql-database";

/** An in-memory SQLite database for tests, using the one built into Node. */
export function createMemoryDatabase(): SqlDatabase {
  const database = new DatabaseSync(":memory:");
  return {
    async execute(sql, params = []) {
      if (params.length === 0) {
        database.exec(sql);
      } else {
        database.prepare(sql).run(...params);
      }
    },
    async select<Row>(sql: string, params: (string | number | null)[] = []) {
      return database.prepare(sql).all(...params) as Row[];
    },
  };
}
