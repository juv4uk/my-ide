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

### Tests

Current Node tests cover declared-length ADIF parsing, unknown fields, Unicode round-trip, malformed lengths, invite normalization, stable room IDs, encryption/decryption separation, wrong-invite rejection, and watts-to-milliwatts conversion. Rust unit tests cover matching/non-matching Radio Rules, capability rejection, source locations, and action deduplication.

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

Before running it, add `.github/release-notes/vX.Y.Z.md`. The release workflow prepends that trilingual document and asks GitHub to append the full changelog. Every functional/docs change should be committed separately before the version commit.

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

CI створює MSI/EXE, DEB/RPM/AppImage, Flatpak, universal DMG, підписані Android APK/AAB, iOS Simulator ZIP, ARM64 Linux і один `signal-radio-log-web.html`. Android вимагає чотири GitHub Secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS`.

Реліз запускається з чистої `main` командою `.\scripts\release.ps1 X.Y.Z`. Скрипт оновлює п’ять версійних файлів, виконує Rust/frontend перевірки, створює тримовний коміт, анотований тег і атомарно відправляє їх. Перед цим треба додати `.github/release-notes/vX.Y.Z.md` та окремо закомітити всі звичайні зміни.

Правила внесків: не втрачати невідомі ADIF-поля, берегти офлайн-роботу, перекладати UI трьома мовами, тестувати палець/орієнтації, відрізняти основу від готової функції й не комітити секрети, пакети чи build-каталоги.

## Deutsch

Frontend benötigt Node.js/npm; native Builds benötigen stabiles Rust, Tauri v2 und Plattformabhängigkeiten. Wichtige Befehle: `npm run dev`, `npm run tauri dev`, `npm test`, `npm run check`, `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml`.

CI erzeugt MSI/EXE, DEB/RPM/AppImage, Flatpak, universelles DMG, signierte Android-APK/AAB, iOS-Simulator-ZIP, ARM64-Linux und eine `signal-radio-log-web.html`. Android benötigt die vier aufgeführten GitHub Secrets.

Ein Release startet auf sauberem `main` mit `.\scripts\release.ps1 X.Y.Z`. Das Skript aktualisiert fünf Versionsdateien, führt Rust-/Frontend-Prüfungen aus, erstellt dreisprachigen Commit und annotierten Tag und pusht beides atomar. Zuvor gehören kuratierte Hinweise nach `.github/release-notes/vX.Y.Z.md`.

Beiträge müssen unbekannte ADIF-Felder und Offline-Nutzung bewahren, UI-Texte dreisprachig halten, Touch/Hoch-/Querformat testen, Grundlagen nicht als fertige UI bezeichnen und niemals Geheimnisse oder Build-Artefakte committen.

