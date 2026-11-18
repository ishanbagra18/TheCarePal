import path from 'path';
import fs from 'fs';
import { config } from '../config/env.js';

// Ensure directory exists for database file
const dbDir = path.dirname(config.databasePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance;

try {
  // 1. Try loading better-sqlite3 first (if native binary is available)
  const BetterSqlite3 = (await import('better-sqlite3')).default;
  dbInstance = new BetterSqlite3(config.databasePath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
} catch (e) {
  // 2. Seamlessly use Node's built-in synchronous SQLite (node:sqlite DatabaseSync)
  // Provides identical synchronous API with zero native compilation issues on Node 22+ / Windows
  const { DatabaseSync } = await import('node:sqlite');
  dbInstance = new DatabaseSync(config.databasePath);
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  
  // Add pragma helper for better-sqlite3 compatibility
  dbInstance.pragma = (cmd) => {
    try {
      return dbInstance.exec(`PRAGMA ${cmd};`);
    } catch (err) {
      // ignore pragma query errors
    }
  };
}

export const db = dbInstance;
export default db;
