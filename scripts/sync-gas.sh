#!/bin/sh
# Apps Script 用ファイルを更新する
#  - web/parser.js を gas/Parser.js にコピー（画面と Apps Script で同じ解析ロジックを使うため）
#  - gas/AllInOne.gs を作る（Apps Script のエディタに 1 ファイル貼るだけで済むように全部まとめたもの）
set -e
cd "$(dirname "$0")/.."
cp web/parser.js gas/Parser.js
{
  echo '// ============================================================================'
  echo '// 音声スケジュール + ジェネシスワーク同期（Apps Script 用・全部まとめたファイル）'
  echo '// Apps Script エディタの「コード.gs」の中身をすべて消して、このファイルの中身を貼り付ける。'
  echo '// ※ このファイルは scripts/sync-gas.sh で自動生成。直接編集しないこと。'
  echo '// ============================================================================'
  for f in gas/Parser.js gas/Code.js gas/GenesisSync.js; do
    echo
    echo "// ----- $f -----"
    cat "$f"
  done
} > gas/AllInOne.gs
echo "gas/Parser.js と gas/AllInOne.gs を更新しました"
