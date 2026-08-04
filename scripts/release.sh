#!/bin/bash
# release.sh — автоматичний реліз Signal & Radio IDE
# Використання: ./release.sh 0.2.8

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "❌ Вкажи версію: ./release.sh 0.2.8"
    exit 1
fi

echo "🚀 Створення релізу v$VERSION"

# Перевірка, що ми в корені репозиторія
if [ ! -d ".git" ]; then
    echo "❌ Це не Git-репозиторій. Запускай з кореня проєкту."
    exit 1
fi

# Оновлення package.json
echo "📦 Оновлення package.json..."
sed -i "s/"version": "[0-9]\+\.[0-9]\+\.[0-9]\+/"version": "$VERSION/" package.json

# Оновлення Cargo.toml
echo "🦀 Оновлення Cargo.toml..."
sed -i "s/^version = "[0-9]\+\.[0-9]\+\.[0-9]\+/version = "$VERSION/" src-tauri/Cargo.toml

# Оновлення tauri.conf.json
echo "⚙️ Оновлення tauri.conf.json..."
sed -i "s/"version": "[0-9]\+\.[0-9]\+\.[0-9]\+/"version": "$VERSION/" src-tauri/tauri.conf.json

# Коміт
echo "💾 Коміт змін..."
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "release: v$VERSION"

# Пуш
echo "📤 Пуш на GitHub..."
git push origin main

# Тег
echo "🏷️ Створення тегу v$VERSION..."
git tag "v$VERSION"
git push origin "v$VERSION"

echo "✅ Готово! Workflow запустився автоматично."
echo "👀 Стеж за прогресом: https://github.com/juv4uk/my-ide/actions"