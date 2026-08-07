// EN: Structural parser for the standard FT8 QSO message set (types 0.0/0.1
// in the WSJT-X protocol spec). This app only ever sees the decoded text,
// not the original 77-bit payload, so parsing works on the space-separated
// tokens the decoder already produced. Free text and non-standard formats
// fall through to UNKNOWN rather than guessing — a wrong guess here would
// feed bad data into an auto-filled QSO form (see Ft8Panel's "Log" action).
// UK: Структурний парсер стандартного набору FT8 QSO-повідомлень (типи
// 0.0/0.1 у специфікації протоколу WSJT-X). Застосунок бачить лише вже
// декодований текст, тому парсинг працює з токенами, розділеними пробілом.
// Вільний текст і нестандартні формати падають у UNKNOWN, а не вгадуються —
// хибний здогад тут означав би погані дані в автозаповненій формі QSO.
// DE: Struktureller Parser für den Standard-FT8-QSO-Nachrichtensatz (Typen
// 0.0/0.1 der WSJT-X-Protokollspezifikation). Freitext und nicht-standard
// Formate fallen auf UNKNOWN zurück, statt geraten zu werden.

export type Ft8ParsedMessage =
  | { type: 'CQ'; caller: string; directed?: string; grid?: string }
  | { type: 'GRID'; to: string; from: string; grid: string }
  | { type: 'REPORT'; to: string; from: string; report: string; roger: boolean }
  | { type: 'RRR'; to: string; from: string }
  | { type: 'RR73'; to: string; from: string }
  | { type: '73'; to: string; from: string }
  | { type: 'UNKNOWN'; text: string };

const GRID_RE = /^[A-R]{2}[0-9]{2}([A-X]{2})?$/i;
const REPORT_RE = /^R?[+-][0-9]{2}$/;
// EN: Loose heuristic, not a full callsign validator — good enough to tell
// "looks like a station identifier" apart from a report/grid/keyword token.
const CALLSIGN_RE = /^[A-Z0-9]{1,3}[0-9][A-Z0-9]{0,3}[A-Z](\/[A-Z0-9]+)?$/i;

export function parseFt8Message(text: string): Ft8ParsedMessage {
  const tokens = text.trim().toUpperCase().split(/\s+/).filter(Boolean);

  if (tokens[0] === 'CQ') {
    if (tokens.length === 2 && CALLSIGN_RE.test(tokens[1])) {
      return { type: 'CQ', caller: tokens[1] };
    }
    if (tokens.length === 3 && CALLSIGN_RE.test(tokens[1]) && GRID_RE.test(tokens[2])) {
      return { type: 'CQ', caller: tokens[1], grid: tokens[2] };
    }
    if (tokens.length === 3 && CALLSIGN_RE.test(tokens[2])) {
      return { type: 'CQ', directed: tokens[1], caller: tokens[2] };
    }
    if (tokens.length === 4 && CALLSIGN_RE.test(tokens[2]) && GRID_RE.test(tokens[3])) {
      return { type: 'CQ', directed: tokens[1], caller: tokens[2], grid: tokens[3] };
    }
    return { type: 'UNKNOWN', text };
  }

  if (tokens.length === 3 && CALLSIGN_RE.test(tokens[0]) && CALLSIGN_RE.test(tokens[1])) {
    const [to, from, suffix] = tokens;
    if (suffix === 'RRR') return { type: 'RRR', to, from };
    if (suffix === 'RR73') return { type: 'RR73', to, from };
    if (suffix === '73') return { type: '73', to, from };
    if (GRID_RE.test(suffix)) return { type: 'GRID', to, from, grid: suffix };
    if (REPORT_RE.test(suffix)) {
      return { type: 'REPORT', to, from, report: suffix.replace(/^R/, ''), roger: suffix.startsWith('R') };
    }
  }

  return { type: 'UNKNOWN', text };
}

// EN: True for message types that imply a completed (or completing)
// exchange with a specific station — worth offering a "Log this QSO"
// shortcut for. A bare CQ or an unparsed message is not evidence of an
// actual two-way contact yet.
// UK: Істина для типів повідомлень, що означають завершений (або майже)
// обмін із конкретною станцією — варто пропонувати ярлик "Записати QSO".
// Сам CQ чи нерозпізнане повідомлення ще не доказ реального двостороннього
// зв'язку.
export function impliesCompletedExchange(message: Ft8ParsedMessage): message is
  | { type: 'GRID'; to: string; from: string; grid: string }
  | { type: 'REPORT'; to: string; from: string; report: string; roger: boolean }
  | { type: 'RRR'; to: string; from: string }
  | { type: 'RR73'; to: string; from: string }
  | { type: '73'; to: string; from: string } {
  return message.type === 'GRID' || message.type === 'REPORT' || message.type === 'RRR' || message.type === 'RR73' || message.type === '73';
}

// EN: Given a two-callsign exchange and my own station's callsign, returns
// the *other* station's callsign — the one worth pre-filling into a QSO
// form. Falls back to `to` when my callsign is unknown/unconfigured, since
// the form is always shown for review before saving, never auto-saved.
// UK: З обміну двома позивними й власним позивним станції повертає позивний
// *іншої* станції — той, що варто підставити у форму QSO. Якщо власний
// позивний невідомий/не налаштований, повертає `to`, бо форма завжди
// показується на перегляд перед збереженням, ніколи не зберігається сама.
export function otherStationCall(
  exchange: { to: string; from: string },
  myCall: string
): string {
  const normalizedMyCall = myCall.trim().toUpperCase();
  if (normalizedMyCall && exchange.to === normalizedMyCall) return exchange.from;
  if (normalizedMyCall && exchange.from === normalizedMyCall) return exchange.to;
  return exchange.from;
}
