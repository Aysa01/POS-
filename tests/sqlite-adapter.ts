import { DatabaseSync } from "node:sqlite";

export class SQLiteDatabase {
  native: DatabaseSync;
  constructor(native: DatabaseSync) {
    this.native = native;
  }
  async closeAsync() { try { this.native.close(); } catch { /* already closed by a reopen test */ } }
  async execAsync(sql: string) {
    this.native.exec(sql);
  }
  async getFirstAsync<T>(sql: string, ...values: any[]): Promise<T | null> {
    return (this.native.prepare(sql).get(...values) as T) ?? null;
  }
  async getAllAsync<T>(sql: string, ...values: any[]): Promise<T[]> {
    return this.native.prepare(sql).all(...values) as T[];
  }
  async runAsync(sql: string, ...values: any[]) {
    const result = this.native.prepare(sql).run(...values);
    return {
      lastInsertRowId: Number(result.lastInsertRowid),
      changes: Number(result.changes),
    };
  }
  async withExclusiveTransactionAsync(
    work: (tx: SQLiteDatabase) => Promise<void>,
  ) {
    this.native.exec("BEGIN EXCLUSIVE");
    try {
      await work(this);
      this.native.exec("COMMIT");
    } catch (error) {
      this.native.exec("ROLLBACK");
      throw error;
    }
  }
}
let storagePath: string | null = null;
const opened: DatabaseSync[] = [];
export function useDatabaseFile(path: string | null) {
  storagePath = path;
}
export function closeAll() {
  for (const native of opened.splice(0)) { try { native.close(); } catch { /* service already closed it */ } }
}
export async function openDatabaseAsync(_name: string) {
  const native = new DatabaseSync(storagePath ?? ":memory:");
  opened.push(native);
  return new SQLiteDatabase(native);
}
