import {
  type AtlasData,
  createLocalAtlasData,
  migrate,
  type SqlDatabase,
} from "@atlas/core";
import Database from "@tauri-apps/plugin-sql";

/**
 * Opens the database kept on this Mac (in the app's data folder), creating
 * or upgrading it first if needed.
 */
export async function openAtlasData(): Promise<AtlasData> {
  const connection = await Database.load("sqlite:atlas.db");
  const database: SqlDatabase = {
    async execute(sql, params = []) {
      await connection.execute(sql, params);
    },
    select: (sql, params = []) => connection.select(sql, params),
  };

  await migrate(database);
  return createLocalAtlasData(database);
}
