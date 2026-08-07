# Development, builds, and releases · Розробка, збірки та релізи · Entwicklung, Builds und Releases

**[English](#english) · [Українська](#українська) · [Deutsch](#deutsch)** · [Documentation home](README.md)

## English

### Prerequisites and local commands

Use Node.js/npm for frontend work and a stable Rust toolchain plus Tauri v2 platform prerequisites for native work.

```powershell
npm install
npm run dev          # Vite development server on port 1420
npm run tauri dev    # Native shell plus frontend
npm test             # Compile test TS and run Node tests
npm run check        # Svelte/TypeScript diagnostics
npm run build        # Static production frontend
cargo test --manifest-path src-tauri/Cargo.toml
```

Vite uses strict port 1420 and HMR port 1421 for remote Tauri development. File watching ignores `src-tauri` to avoid frontend rebuild noise during Rust compilation.

After bumping the `ft8js` dependency, regenerate the embedded WASM payload: `node scripts/generate-ft8-wasm-assets.mjs`. This overwrites `src/lib/ft8/wasm-assets.ts`, which should be committed alongside the dependency bump.

### Tests

`npm test` compiles `src/lib/**/*.ts` to `.test-build/` and runs every `tests/*.test.mjs` file against the compiled output with Node's built-in test runner. `cargo test --manifest-path src-tauri/Cargo.toml` runs the Rust suite.

| File | Covers |
|---|---|
| `tests/adif.test.mjs` | Declared-length ADIF field parsing, preserving unknown fields, Unicode/angle-bracket round-trip, rejecting malformed declared lengths |
| `tests/connect.test.mjs` | Invite code → stable public room ID, invite code normalization, encrypting message content before it reaches a transport, rejecting decryption with the wrong invite |
| `tests/ft8-codec.test.mjs` | `encodeFt8` → `decodeFt8` round-trip through the real WASM module (not just the pure-JS parser), decoding silence returns no messages |
| `tests/ft8-message.test.mjs` | Parsing CQ (bare and directed), grid exchange, signal report (with/without roger), RRR/RR73/73, falling back to `UNKNOWN` for free text, `impliesCompletedExchange`, `otherStationCall` picking the non-local callsign |
| `tests/qso.test.mjs` | `utcQsoDate`/`utcQsoTime` UTC formatting, `defaultRst` per mode, `createLocalId` UUID v4 shape and uniqueness, `emptyQso` defaults from a station profile, `normalizeCallsign` |
| `tests/radio-rules.test.mjs` | ADIF watts → explicit milliwatts conversion for Radio Rules, zero fallback for an empty/invalid power value |
| `src-tauri/src/radio_rules.rs` (`#[cfg(test)]`) | Matching/non-matching rules, rejecting unknown QSO fields and actions (capability whitelist), syntax error line/column reporting, action deduplication across rules |

### Release artifacts

| Target | Artifact |
|---|---|
| Windows x64 | `.msi`, setup `.exe` |
| Linux x86_64/ARM64 | `.deb`, `.rpm`, `.AppImage` |
| Flatpak x86_64 | `.flatpak` |
| macOS universal | `.dmg`, `.app.tar.gz` |
| Android ARM64 | signed `.apk`, signed `.aab` |
| iOS ARM64 Simulator | zipped `.app` |
| Web | `signal-radio-log-web.html` |

The Web artifact is built with `BUILD_TARGET=web`, verified for external local references, and post-processed by `scripts/make-portable-web.mjs`. Its stable filename allows the README `releases/latest/download/...` link to survive version changes.

### Android signing secrets

GitHub Actions requires `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, and `ANDROID_KEY_ALIAS`. The workflow reconstructs the keystore, configures Gradle, builds ARM64 packages, verifies APK/AAB signatures, renames the artifacts, and uploads them. Secrets must never be committed.

### Release process

Run from a clean `main` branch:

```powershell
.\scripts\release.ps1 0.5.6
```

The script validates semantic version form and tag uniqueness, updates `package.json`, lockfiles, Cargo metadata, and `tauri.conf.json`, then runs Cargo check, Node tests, Svelte check, and frontend build. It permits changes only in five version files, creates a trilingual commit, creates an annotated tag, and atomically pushes branch and tag.

Before running it, add `.github/release-notes/rX.Y.Z.md`. The release workflow prepends that trilingual document and asks GitHub to append the full changelog. Every functional/docs change should be committed separately before the version commit.

### CI dependency graph

Three desktop matrix builds create the GitHub Release first. ARM Linux, Flatpak, Web, Android, and iOS depend on successful desktop completion and then upload in parallel. A release is complete only when all jobs are green and expected assets are present.

### Contributor rules

- Preserve unknown ADIF fields and offline usability.
- Keep UI text in English, Ukrainian, and German.
- Use thumb-sized controls and test portrait/landscape layouts.
- Do not describe foundations as shipped UI features.
- Add tests for parsers, crypto boundaries, migrations, and destructive data operations.
- Never commit `.env`, signing keys, generated packages, local project memory, or build directories.

## Українська

Для frontend потрібні Node.js/npm, для native — стабільний Rust, Tauri v2 та системні залежності платформи. Основні команди: `npm run dev`, `npm run tauri dev`, `npm test`, `npm run check`, `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml`.

`npm test` компілює `src/lib/**/*.ts` у `.test-build/` і запускає кожен `tests/*.test.mjs` вбудованим test runner'ом Node. Файли: `adif.test.mjs` (парсинг ADIF за довжиною поля, невідомі поля, Unicode, помилкові довжини), `connect.test.mjs` (стабільний room ID, шифрування/розшифрування QSO Connect), `ft8-codec.test.mjs` (наскрізний round-trip encode→decode через реальний WASM-модуль), `ft8-message.test.mjs` (розпізнавання CQ/обміну локаторами/рапорту/RRR/RR73/73), `qso.test.mjs` (UTC-формати дати й часу, типові RST, генерація ID, значення за замовчуванням), `radio-rules.test.mjs` (вати → мілівати). Rust-тести в `radio_rules.rs` перевіряють збіг/незбіг правил, білий список можливостей, точність помилок і дедуплікацію дій.

CI створює MSI/EXE, DEB/RPM/AppImage, Flatpak, universal DMG, підписані Android APK/AAB, iOS Simulator ZIP, ARM64 Linux і один `signal-radio-log-web.html`. Android вимагає чотири GitHub Secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS`.

Після оновлення залежності `ft8js` перегенеруйте вбудований WASM: `node scripts/generate-ft8-wasm-assets.mjs`, і закомітьте оновлений `src/lib/ft8/wasm-assets.ts` разом зі зміною залежності.

Реліз запускається з чистої `main` командою `.\scripts\release.ps1 X.Y.Z`. Скрипт оновлює п’ять версійних файлів, виконує Rust/frontend перевірки, створює тримовний коміт, анотований тег і атомарно відправляє їх. Перед цим треба додати `.github/release-notes/rX.Y.Z.md` та окремо закомітити всі звичайні зміни.

Правила внесків: не втрачати невідомі ADIF-поля, берегти офлайн-роботу, перекладати UI трьома мовами, тестувати палець/орієнтації, відрізняти основу від готової функції й не комітити секрети, пакети чи build-каталоги.

## Deutsch

Frontend benötigt Node.js/npm; native Builds benötigen stabiles Rust, Tauri v2 und Plattformabhängigkeiten. Wichtige Befehle: `npm run dev`, `npm run tauri dev`, `npm test`, `npm run check`, `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml`.

`npm test` kompiliert `src/lib/**/*.ts` nach `.test-build/` und führt jede `tests/*.test.mjs`-Datei mit Node's eingebautem Test-Runner aus. Dateien: `adif.test.mjs` (längenbasiertes ADIF-Parsing, unbekannte Felder, Unicode, fehlerhafte Längen), `connect.test.mjs` (stabile Raum-ID, QSO-Connect-Ver-/Entschlüsselung), `ft8-codec.test.mjs` (Ende-zu-Ende-Round-Trip encode→decode über das echte WASM-Modul), `ft8-message.test.mjs` (Erkennung von CQ/Locator-Austausch/Bericht/RRR/RR73/73), `qso.test.mjs` (UTC-Datum-/Zeitformate, Standard-RST, ID-Erzeugung, Standardwerte), `radio-rules.test.mjs` (Watt → Milliwatt). Die Rust-Tests in `radio_rules.rs` prüfen Regel-Treffer/Nicht-Treffer, die Fähigkeiten-Whitelist, Fehlergenauigkeit und Aktions-Deduplizierung.

CI erzeugt MSI/EXE, DEB/RPM/AppImage, Flatpak, universelles DMG, signierte Android-APK/AAB, iOS-Simulator-ZIP, ARM64-Linux und eine `signal-radio-log-web.html`. Android benötigt die vier aufgeführten GitHub Secrets.

Nach einem Update der `ft8js`-Abhängigkeit die eingebettete WASM-Nutzlast neu erzeugen: `node scripts/generate-ft8-wasm-assets.mjs`, und das aktualisierte `src/lib/ft8/wasm-assets.ts` zusammen mit dem Dependency-Bump committen.

Ein Release startet auf sauberem `main` mit `.\scripts\release.ps1 X.Y.Z`. Das Skript aktualisiert fünf Versionsdateien, führt Rust-/Frontend-Prüfungen aus, erstellt dreisprachigen Commit und annotierten Tag und pusht beides atomar. Zuvor gehören kuratierte Hinweise nach `.github/release-notes/rX.Y.Z.md`.

Beiträge müssen unbekannte ADIF-Felder und Offline-Nutzung bewahren, UI-Texte dreisprachig halten, Touch/Hoch-/Querformat testen, Grundlagen nicht als fertige UI bezeichnen und niemals Geheimnisse oder Build-Artefakte committen.

