import { computeMetrics } from '../domain/bodycomp';
import { ageYears } from '../domain/age';
import type { Metrics, Profile, Reading, Settings } from '../domain/types';

export interface Db {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: (string | number | null)[]): Promise<number>; // last insert id
  all<T = any>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
}

const DEFAULT_SETTINGS: Settings = { reminderTime: '07:00', cutoffTime: '09:30', reminderEnabled: true };

type Row = {
  id: number; ts: number; raw_hex: string; weight_kg: number; impedance_ohm: number | null; metrics: string;
  flagged: number; flag_reason: string | null; confirmed: number; health_synced: number;
};

const toReading = (r: Row): Reading => ({
  id: r.id, ts: r.ts, rawHex: r.raw_hex, weightKg: r.weight_kg, impedanceOhm: r.impedance_ohm,
  metrics: JSON.parse(r.metrics) as Metrics, flagged: !!r.flagged, flagReason: r.flag_reason,
  confirmed: !!r.confirmed, healthSynced: !!r.health_synced,
});

export class Repo {
  private constructor(private db: Db) {}

  static async withDb(db: Db): Promise<Repo> {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, raw_hex TEXT NOT NULL,
        weight_kg REAL NOT NULL, impedance_ohm REAL, metrics TEXT NOT NULL,
        flagged INTEGER NOT NULL DEFAULT 0, flag_reason TEXT, confirmed INTEGER NOT NULL DEFAULT 0,
        health_synced INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS readings_ts ON readings(ts);
      CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT OR IGNORE INTO kv (key, value) VALUES ('schema_version', '1');`);
    return new Repo(db);
  }

  static async open(): Promise<Repo> {
    const { openDatabaseAsync } = await import('expo-sqlite');
    const sql = await openDatabaseAsync('better-scale.db');
    return Repo.withDb({
      exec: (q) => sql.execAsync(q),
      run: async (q, p = []) => (await sql.runAsync(q, p)).lastInsertRowId,
      all: (q, p = []) => sql.getAllAsync(q, p) as Promise<any[]>,
    });
  }

  insertReading(r: Omit<Reading, 'id'>): Promise<number> {
    return this.db.run(
      `INSERT INTO readings (ts, raw_hex, weight_kg, impedance_ohm, metrics, flagged, flag_reason, confirmed, health_synced)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [r.ts, r.rawHex, r.weightKg, r.impedanceOhm, JSON.stringify(r.metrics), +r.flagged, r.flagReason, +r.confirmed, +r.healthSynced],
    );
  }

  async listReadings(sinceTs?: number, includeFlagged = false): Promise<Reading[]> {
    const rows = await this.db.all<Row>(
      `SELECT * FROM readings WHERE ts >= ? ${includeFlagged ? '' : 'AND flagged = 0'} ORDER BY ts ASC`,
      [sinceTs ?? 0],
    );
    return rows.map(toReading);
  }

  async setFlag(id: number, flagged: boolean, reason: string | null): Promise<void> {
    await this.db.run('UPDATE readings SET flagged = ?, flag_reason = ? WHERE id = ?', [+flagged, reason, id]);
  }

  /** User says "this is correct": shows on graphs and counts toward the baseline. */
  async confirmReading(id: number): Promise<void> {
    await this.db.run('UPDATE readings SET flagged = 0, confirmed = 1 WHERE id = ?', [id]);
  }

  async unsynced(): Promise<Reading[]> {
    const rows = await this.db.all<Row>('SELECT * FROM readings WHERE flagged = 0 AND health_synced = 0 ORDER BY ts ASC');
    return rows.map(toReading);
  }

  async deleteByRawHex(hex: string): Promise<void> {
    await this.db.run('DELETE FROM readings WHERE raw_hex = ?', [hex]);
  }

  async markSynced(id: number): Promise<void> {
    await this.db.run('UPDATE readings SET health_synced = 1 WHERE id = ?', [id]);
  }

  private async getKv(key: string): Promise<string | null> {
    const rows = await this.db.all<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
    return rows[0]?.value ?? null;
  }
  private setKv(key: string, value: string): Promise<number> {
    return this.db.run('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
  }

  async getProfile(): Promise<Profile | null> {
    const v = await this.getKv('profile');
    return v ? (JSON.parse(v) as Profile) : null;
  }
  async saveProfile(p: Profile): Promise<void> { await this.setKv('profile', JSON.stringify(p)); }

  async getSettings(): Promise<Settings> {
    const v = await this.getKv('settings');
    return v ? { ...DEFAULT_SETTINGS, ...(JSON.parse(v) as Settings) } : { ...DEFAULT_SETTINGS };
  }
  async saveSettings(s: Settings): Promise<void> { await this.setKv('settings', JSON.stringify(s)); }

  async getScaleId(): Promise<string | null> { return this.getKv('scaleId'); }
  async saveScaleId(id: string): Promise<void> { await this.setKv('scaleId', id); }

  /** Recompute every reading's metrics from stored weight and impedance; age is taken at each reading's time. */
  async recomputeAll(p: Profile): Promise<void> {
    const rows = await this.db.all<Row>('SELECT * FROM readings');
    await this.db.exec('BEGIN');
    try {
      for (const r of rows) {
        const m = computeMetrics(
          { sex: p.sex, athlete: p.athlete, heightCm: p.heightCm, ageYears: ageYears(p.birthDate, r.ts) },
          r.weight_kg,
          r.impedance_ohm,
        );
        await this.db.run('UPDATE readings SET metrics = ? WHERE id = ?', [JSON.stringify(m), r.id]);
      }
      await this.db.exec('COMMIT');
    } catch (e) {
      await this.db.exec('ROLLBACK');
      throw e;
    }
  }
}
