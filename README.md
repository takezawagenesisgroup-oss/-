# 凪 -Nagi-

集中と眠りのためのサウンドタイマー。環境音を好きな組み合わせで再生し、集中タイマー / 就寝タイマー(終了前にフェードアウト)を使えるオフライン完結アプリ。Expo (React Native) 製。

企画背景・市場調査・価格戦略・売り方は別途まとめた戦略メモを参照。

## セットアップ

```bash
npm install
npm run web      # ブラウザで動作確認 (http://localhost:8081)
npm run ios      # 要 macOS + Xcode
npm run android  # 要 Android Studio / エミュレータ
```

## ディレクトリ構成

```
App.tsx                    エントリーポイント(画面組み立て、音声モード初期化)
app/
  theme.ts                 配色・余白トークン
  sounds.ts                6種類の環境音の定義(id・表示名・音源ファイル)
  useSoundEngine.ts         複数音源の同時ループ再生・音量・フェードアウトを管理するフック
  useCountdown.ts            集中/就寝タイマー用の汎用カウントダウンフック
  components/
    SoundTile.tsx           音源カード(タップでON/OFF、ONの間だけ音量スライダー表示)
    TimerPanel.tsx           集中/就寝タブ、プリセット・カスタム時間、実行中の残り時間表示
assets/sounds/               環境音アセット(*.wav)。README.md にライセンスと差し替え手順
scripts/generate-sounds.js   上記アセットを生成するプロシージャル音声合成スクリプト
```

## 音源について

`assets/sounds/*.wav` は `npm run generate-sounds` で生成したプレースホルダー音源(ノイズ整形・合成音、著作権フリー)。**App Store 申請前に実録音へ差し替えることを推奨** — 詳細は `assets/sounds/README.md` を参照。

## MVPスコープ

- 実装済み: 環境音6種の同時ミックス再生、音量調整、集中タイマー(25/50分+カスタム)、就寝タイマー(15/30/45/60分+カスタム、終了前フェードアウト)、バックグラウンド再生設定
- 未実装(v1では意図的に見送り): アカウント/クラウド同期、Apple Watch対応、音源追加課金、多言語(日本語+英語以外)、AI機能

## 次のアクション

1. `assets/sounds/*.wav` を実録音(ロイヤリティフリー/ライセンス取得済み)に差し替える
2. Apple Developer Program 登録、`app.json` の `ios.bundleIdentifier` / `android.package` を設定
3. アプリアイコン(`assets/icon.png` 他)を差し替える
4. `npm run ios` / TestFlight で実機確認してから申請
