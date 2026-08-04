export const BANDS = ['160M', '80M', '60M', '40M', '30M', '20M', '17M', '15M', '12M', '10M', '6M', '2M', '70CM'] as const;
export const MODES = ['SSB', 'CW', 'FT8', 'FT4', 'FM', 'AM', 'RTTY', 'PSK31', 'DIGITALVOICE'] as const;

export interface Qso {
  id: string;
  call: string;
  qsoDate: string;
  timeOn: string;
  band: string;
  frequency: string;
  mode: string;
  rstSent: string;
  rstRcvd: string;
  name: string;
  qth: string;
  gridSquare: string;
  comment: string;
  stationCallsign: string;
  operator: string;
  myGridSquare: string;
  txPower: string;
  createdAt: string;
  updatedAt: string;
  /** Fields unknown to this app are retained so an import/export round-trip does not discard data. */
  extraFields: Record<string, string>;
}

export interface StationProfile {
  callsign: string;
  operator: string;
  gridSquare: string;
  defaultBand: string;
  defaultMode: string;
  defaultPower: string;
  language: 'en' | 'uk' | 'de';
}

export function utcQsoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

export function utcQsoTime(date = new Date()): string {
  return date.toISOString().slice(11, 16).replace(':', '');
}

export function defaultRst(mode: string): string {
  const normalized = mode.toUpperCase();
  if (normalized === 'CW' || normalized === 'RTTY') return '599';
  if (normalized === 'FT8' || normalized === 'FT4') return '-10';
  return '59';
}

export function emptyQso(profile: StationProfile, now = new Date()): Qso {
  const timestamp = now.toISOString();
  const rst = defaultRst(profile.defaultMode);
  return {
    id: crypto.randomUUID(), call: '', qsoDate: utcQsoDate(now), timeOn: utcQsoTime(now),
    band: profile.defaultBand, frequency: '', mode: profile.defaultMode, rstSent: rst, rstRcvd: rst,
    name: '', qth: '', gridSquare: '', comment: '', stationCallsign: profile.callsign,
    operator: profile.operator, myGridSquare: profile.gridSquare, txPower: profile.defaultPower,
    createdAt: timestamp, updatedAt: timestamp, extraFields: {}
  };
}

export function normalizeCallsign(value: string): string {
  return value.trim().toUpperCase();
}
