import { createLocalId, type Qso, type StationProfile } from './qso.js';

const FIELD_MAP: Record<string, keyof Qso> = {
  CALL: 'call', QSO_DATE: 'qsoDate', TIME_ON: 'timeOn', BAND: 'band', FREQ: 'frequency',
  MODE: 'mode', RST_SENT: 'rstSent', RST_RCVD: 'rstRcvd', NAME: 'name', QTH: 'qth',
  GRIDSQUARE: 'gridSquare', COMMENT: 'comment', STATION_CALLSIGN: 'stationCallsign',
  OPERATOR: 'operator', MY_GRIDSQUARE: 'myGridSquare', TX_PWR: 'txPower'
};
const EXPORT_FIELDS: Array<[string, keyof Qso]> = Object.entries(FIELD_MAP).map(([field, property]) => [field, property]);

/** ADI lengths count Unicode characters, not UTF-16 code units used by String.length. */
function field(name: string, value: string): string {
  return `<${name}:${Array.from(value).length}>${value}`;
}

export function exportAdif(records: Qso[], appVersion = '0.0.0'): string {
  const header = [field('ADIF_VER', '3.1.7'), field('PROGRAMID', 'Signal & Radio IDE'), field('PROGRAMVERSION', appVersion), '<EOH>'].join('');
  const body = records.map((record) => {
    const known = EXPORT_FIELDS.map(([name, property]) => [name, String(record[property] ?? '')] as const)
      .filter(([, value]) => value !== '').map(([name, value]) => field(name, value));
    const extra = Object.entries(record.extraFields).filter(([name, value]) => value !== '' && !(name in FIELD_MAP))
      .map(([name, value]) => field(name.toUpperCase(), value));
    return `${[...known, ...extra].join('')}<EOR>`;
  }).join('\n');
  return `${header}\n${body}\n`;
}

interface AdifToken { name: string; value: string; }

/** Parses ADI by declared field length, so delimiters and Unicode inside values remain safe. */
export function parseAdif(input: string, profile: StationProfile): Qso[] {
  const tokens: AdifToken[] = [];
  let cursor = 0;
  while (cursor < input.length) {
    const open = input.indexOf('<', cursor);
    if (open < 0) break;
    const close = input.indexOf('>', open + 1);
    if (close < 0) throw new Error(`Unclosed ADIF tag at character ${open}`);
    const [rawName, rawLength] = input.slice(open + 1, close).trim().split(':');
    const name = rawName.toUpperCase();
    cursor = close + 1;
    if (name === 'EOH' || name === 'EOR') { tokens.push({ name, value: '' }); continue; }
    const length = Number.parseInt(rawLength, 10);
    if (!Number.isFinite(length) || length < 0) throw new Error(`Invalid length for ADIF field ${name}`);
    const value = Array.from(input.slice(cursor)).slice(0, length).join('');
    if (Array.from(value).length !== length) throw new Error(`Unexpected end of ADIF field ${name}`);
    cursor += value.length;
    tokens.push({ name, value });
  }

  const records: Qso[] = [];
  let current: Record<string, string> = {};
  let headerComplete = !tokens.some((token) => token.name === 'EOH');
  for (const token of tokens) {
    if (token.name === 'EOH') { headerComplete = true; current = {}; continue; }
    if (!headerComplete) continue;
    if (token.name === 'EOR') {
      if (Object.keys(current).length > 0) records.push(fieldsToQso(current, profile));
      current = {};
      continue;
    }
    current[token.name] = token.value;
  }
  // Import is tolerant of a missing final EOR; export always writes standards-compliant records.
  if (Object.keys(current).length > 0) records.push(fieldsToQso(current, profile));
  return records;
}

function fieldsToQso(fields: Record<string, string>, profile: StationProfile): Qso {
  const now = new Date().toISOString();
  const qso: Qso = {
    id: createLocalId(), call: '', qsoDate: '', timeOn: '', band: '', frequency: '', mode: '',
    rstSent: '', rstRcvd: '', name: '', qth: '', gridSquare: '', comment: '', stationCallsign: profile.callsign,
    operator: profile.operator, myGridSquare: profile.gridSquare, txPower: profile.defaultPower,
    createdAt: now, updatedAt: now, extraFields: {}
  };
  for (const [name, value] of Object.entries(fields)) {
    const property = FIELD_MAP[name];
    if (property) (qso[property] as string) = value;
    else qso.extraFields[name] = value;
  }
  return qso;
}
