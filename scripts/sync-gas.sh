#!/bin/sh
# web/parser.js を Apps Script 用にコピーする（両方で同じ解析ロジックを使うため）
set -e
cd "$(dirname "$0")/.."
cp web/parser.js gas/Parser.js
echo "gas/Parser.js を更新しました"
