# Data formats and security · Дані та безпека · Daten und Sicherheit

**[English](#english) · [Українська](#українська) · [Deutsch](#deutsch)** · [Documentation home](README.md)

## English

### QSO data model

Every record contains local metadata (`id`, `createdAt`, `updatedAt`), contact fields (`call`, `qsoDate`, `timeOn`, `band`, `frequency`, `mode`, `rstSent`, `rstRcvd`, `name`, `qth`, `gridSquare`, `comment`), station fields (`stationCallsign`, `operator`, `myGridSquare`, `txPower`), and `extraFields` for ADIF values unknown to this application.

Dates use ADIF `YYYYMMDD`; times use UTC `HHMM` by default. TX power is stored in watts as text for ADIF compatibility. IDs are UUID v4 values from `crypto.randomUUID()` or cryptographically random bytes.

### Local persistence

| Key | Content |
|---|---|
| `signal-radio-ide:qso:v1` | JSON array of QSO records |
| `signal-radio-ide:station-profile:v1` | Station profile JSON |
| `signal-radio-ide:field-notes:v1` | Markdown Notes text |

Corrupt JSON falls back to an empty/default state so the app can open. This is availability behavior, not backup recovery. Browser data belongs to its origin/profile. Moving a `file://` HTML or clearing site data may make previous local data unavailable; export ADIF before such changes.

### ADIF 3.1.7

Export header includes `ADIF_VER=3.1.7`, `PROGRAMID=Signal & Radio IDE`, and the application version. Known mappings:

| ADIF | Application |
|---|---|
| `CALL` | `call` |
| `QSO_DATE`, `TIME_ON` | UTC date/time |
| `BAND`, `FREQ`, `MODE` | Radio parameters |
| `RST_SENT`, `RST_RCVD` | Reports |
| `NAME`, `QTH`, `GRIDSQUARE`, `COMMENT` | Contact details |
| `STATION_CALLSIGN`, `OPERATOR`, `MY_GRIDSQUARE`, `TX_PWR` | Own station |

The parser counts Unicode characters according to declared ADI length, accepts a missing final `EOR`, ignores header fields before `EOH`, and throws on invalid/unclosed lengths. Unknown record fields are preserved and exported again unless their names conflict with known fields. Re-import is not content-deduplicated.

### Markdown and Mermaid security

Raw Markdown HTML is escaped. The sanitizer removes script, iframe, object, embed, style, link, meta, and foreignObject elements; event handler attributes and `javascript:`/`data:` URL attributes are removed. Mermaid runs with `securityLevel: strict`, and generated SVG receives a second sanitizer pass. This is defense in depth, but dependency updates should still be reviewed.

### Radio Rules security foundation

Rules receive only callsign, band, mode, TX power in milliwatts, and sent/received reports. Allowed conditions and actions are whitelisted. They cannot access files, network, processes, arbitrary Tauri commands, or mutate records directly.

Limits: 32 KiB source, 4,096 tokens, nesting depth 32, 128 rules, 256 actions per matching block, and action text of 1–500 characters. Errors return kind, line, and column. See [Radio Rules](radio-rules.md).

### QSO Connect cryptographic foundation

An invite is 12 unambiguous characters (`2-9`, selected uppercase letters) grouped `XXXX-XXXX-XXXX`. SHA-256 derives a 12-byte public room identifier. PBKDF2-SHA-256 with 210,000 iterations, the invite code, and room ID derives an AES-256-GCM key. Each message uses a random 12-byte IV and contains version, local ID, room ID, timestamp, IV, and Base64URL ciphertext. The sender/text/QSO ID exist only inside encrypted JSON.

The relay adapter joins a public room and forwards encrypted envelopes. This protects content from an honest-but-curious relay but does not provide identity verification, forward secrecy, metadata concealment, abuse prevention, server authentication beyond TLS, or a production service. Treat it as a tested protocol foundation.

### Tauri permissions

The main window has default core/opener/dialog/filesystem permissions plus open/save dialogs and text-file read/write. Radio Rules are exposed through one explicit command. `csp` is currently `null`; before loading remote content or adding a chat UI, a restrictive Content Security Policy should be designed and tested.

## Українська

QSO містить локальні `id/createdAt/updatedAt`, поля контакту, поля власної станції й `extraFields` для невідомих ADIF-значень. Дата має формат `YYYYMMDD`, час — UTC `HHMM`, потужність зберігається текстом у ватах.

Дані лежать у трьох ключах `localStorage`: `signal-radio-ide:qso:v1`, `signal-radio-ide:station-profile:v1`, `signal-radio-ide:field-notes:v1`. Пошкоджений JSON замінюється порожнім/типовим станом. Це не резервна копія. Перед очищенням браузера або переміщенням Web HTML експортуйте ADIF.

Експорт ADIF 3.1.7 містить версію формату, назву й версію програми. Парсер рахує Unicode-символи за заявленою довжиною, терпить відсутній останній `EOR`, відкидає заголовок до `EOH`, повідомляє про неправильні довжини та зберігає невідомі поля для зворотного експорту. Повторний імпорт не шукає дублікати за змістом.

Markdown HTML екранується й очищається; небезпечні елементи, event-атрибути та `javascript:`/`data:` URL видаляються. Mermaid працює з `securityLevel: strict`, SVG очищається вдруге.

Radio Rules бачить лише шість дозволених значень QSO й не має файлів, мережі, процесів чи довільних Tauri-команд. Ліміти: 32 КіБ, 4096 токенів, глибина 32, 128 правил, 256 дій, текст дії 1–500 символів.

QSO Connect використовує 12-символьне запрошення, SHA-256 room ID, PBKDF2-SHA-256 (210 000 ітерацій) і AES-256-GCM із випадковим 12-байтовим IV. Relay бачить room ID і ciphertext, але ця основа ще не забезпечує перевірку особи, forward secrecy, приховування метаданих або production-службу.

Tauri дозволяє основному вікну діалоги та читання/запис текстових файлів. CSP зараз `null`; перед віддаленим контентом її слід обмежити.

## Deutsch

QSO-Daten enthalten lokale Metadaten, Kontakt- und Stationsfelder sowie `extraFields` für unbekannte ADIF-Werte. Datum ist `YYYYMMDD`, Zeit standardmäßig UTC `HHMM`, Leistung ADIF-kompatibler Text in Watt.

`localStorage` verwendet `signal-radio-ide:qso:v1`, `signal-radio-ide:station-profile:v1` und `signal-radio-ide:field-notes:v1`. Defektes JSON fällt auf Standardwerte zurück, ist aber keine Sicherung. Vor Browserbereinigung oder Verschieben der Web-Datei ADIF exportieren.

Der ADIF-3.1.7-Parser zählt Unicode-Zeichen längengerecht, toleriert ein fehlendes letztes `EOR`, ignoriert Header bis `EOH`, meldet ungültige Längen und bewahrt unbekannte Felder. Wiederholter Import erkennt inhaltliche Duplikate nicht.

Markdown-HTML wird escaped und bereinigt; Mermaid läuft strikt und SVG wird erneut sanitisiert. Radio Rules besitzt ausschließlich freigegebene QSO-Felder/Aktionen und feste Ressourcenlimits.

QSO Connect verwendet 12 eindeutige Zeichen, SHA-256 für die Raum-ID, PBKDF2-SHA-256 mit 210.000 Iterationen und AES-256-GCM mit zufälligem 12-Byte-IV. Es ist eine getestete Grundlage, noch ohne Identitätsprüfung, Forward Secrecy, Metadatenverbergung oder Produktionsdienst.

Tauri erlaubt Dialoge und Textdatei-Lese-/Schreibzugriff. Die CSP ist derzeit `null` und muss vor Remote-Inhalten restriktiv gestaltet werden.

