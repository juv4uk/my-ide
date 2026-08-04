import type { Qso, StationProfile } from './qso.js';

const QSO_KEY = 'signal-radio-ide:qso:v1';
const PROFILE_KEY = 'signal-radio-ide:station-profile:v1';

export const DEFAULT_PROFILE: StationProfile = {
  callsign: '', operator: '', gridSquare: '', defaultBand: '20M', defaultMode: 'SSB',
  defaultPower: '100', language: 'uk'
};

/** The repository boundary lets a future SQLite adapter replace localStorage without changing screens. */
export class QsoRepository {
  list(): Qso[] {
    const records = this.readJson<Qso[]>(QSO_KEY, []);
    return records.sort((a, b) => `${b.qsoDate}${b.timeOn}`.localeCompare(`${a.qsoDate}${a.timeOn}`));
  }

  save(qso: Qso): void {
    const records = this.list();
    const existingIndex = records.findIndex((record) => record.id === qso.id);
    const record = { ...qso, updatedAt: new Date().toISOString() };
    if (existingIndex >= 0) records[existingIndex] = record;
    else records.push(record);
    localStorage.setItem(QSO_KEY, JSON.stringify(records));
  }

  saveMany(imported: Qso[]): void {
    const byId = new Map(this.list().map((record) => [record.id, record]));
    for (const record of imported) byId.set(record.id, record);
    localStorage.setItem(QSO_KEY, JSON.stringify([...byId.values()]));
  }

  remove(id: string): void {
    localStorage.setItem(QSO_KEY, JSON.stringify(this.list().filter((record) => record.id !== id)));
  }

  loadProfile(): StationProfile {
    return { ...DEFAULT_PROFILE, ...this.readJson<Partial<StationProfile>>(PROFILE_KEY, {}) };
  }

  saveProfile(profile: StationProfile): void {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  private readJson<T>(key: string, fallback: T): T {
    try {
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : fallback;
    } catch {
      // Corrupt local state should never prevent the operator from opening the logbook.
      return fallback;
    }
  }
}
