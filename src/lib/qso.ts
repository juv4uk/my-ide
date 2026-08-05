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

/**
 * Create a local identifier even when a WebView does not expose randomUUID().
 *
 * Modern secure contexts use the native UUID implementation. Older WebViews and
 * LAN previews still provide strong random bytes, so this remains fully offline.
 */
export function createLocalId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

export function emptyQso(profile: StationProfile, now = new Date()): Qso {
  const timestamp = now.toISOString();
  const rst = defaultRst(profile.defaultMode);
  return {
    id: createLocalId(), call: '', qsoDate: utcQsoDate(now), timeOn: utcQsoTime(now),
    band: profile.defaultBand, frequency: '', mode: profile.defaultMode, rstSent: rst, rstRcvd: rst,
    name: '', qth: '', gridSquare: '', comment: '', stationCallsign: profile.callsign,
    operator: profile.operator, myGridSquare: profile.gridSquare, txPower: profile.defaultPower,
    createdAt: timestamp, updatedAt: timestamp, extraFields: {}
  };
}

export function normalizeCallsign(value: string): string {
  return value.trim().toUpperCase();
}
