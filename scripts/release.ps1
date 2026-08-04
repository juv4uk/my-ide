# release.ps1 — автоматичний реліз Signal & Radio IDE
# Використання: .\release.ps1 0.2.8

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Створення релізу v$Version" -ForegroundColor Cyan

# 1. Перевір, що ми в корені репозиторія
if (-not (Test-Path ".git")) {
    Write-Error "❌ Це не Git-репозиторій. Запускай з кореня проєкту."
    exit 1
}

# 2. Онови package.json
Write-Host "📦 Оновлення package.json..." -ForegroundColor Yellow
$json = Get-Content package.json -Raw | ConvertFrom-Json
$json.version = $Version
$json | ConvertTo-Json -Depth 10 | Set-Content package.json

# 3. Онови Cargo.toml
Write-Host "🦀 Оновлення Cargo.toml..." -ForegroundColor Yellow
$cargo = Get-Content src-tauri/Cargo.toml -Raw
$cargo = $cargo -replace '^version = "[\d\.]+"', "version = `"$Version`""
$cargo | Set-Content src-tauri/Cargo.toml

# 4. Онови tauri.conf.json
Write-Host "⚙️ Оновлення tauri.conf.json..." -ForegroundColor Yellow
$tauri = Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json
$tauri.version = $Version
$tauri | ConvertTo-Json -Depth 10 | Set-Content src-tauri/tauri.conf.json

# 5. Закоміть
Write-Host "💾 Коміт змін..." -ForegroundColor Yellow
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "release: v$Version"

# 6. Запуш
Write-Host "📤 Пуш на GitHub..." -ForegroundColor Yellow
git push origin refs/heads/main

# 7. Створи тег
Write-Host "🏷️ Створення тегу v$Version..." -ForegroundColor Yellow
$tag = "v$Version"
git tag $tag
git push origin $tag

Write-Host "✅ Готово! Workflow запустився автоматично." -ForegroundColor Green
Write-Host "👀 Стеж за прогресом: https://github.com/juv4uk/my-ide/actions" -ForegroundColor Cyan