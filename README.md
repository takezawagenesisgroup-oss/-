# 凪 -Nagi-

集中と眠りのためのサウンドタイマー。環境音を好きな組み合わせで再生し、集中タイマー / 就寝タイマー(終了前にフェードアウト)を使えるオフライン完結アプリ。Expo (React Native) 製。

無料枠は雨・波・ホワイトノイズの3種、残り3種(焚き火・カフェ・風鈴)は買い切り¥480で解放するフリーミアム構成(サブスクなし)。企画背景・市場調査・価格戦略・売り方は別途まとめた戦略メモを参照。

## セットアップ

```bash
npm install
npm run web      # ブラウザで動作確認 (http://localhost:8081)
npm run ios      # 要 macOS + Xcode
npm run android  # 要 Android Studio / エミュレータ
```

## ディレクトリ構成

```
App.tsx                      エントリーポイント(画面組み立て、音声モード初期化)
app/
  theme.ts                   配色・余白トークン
  sounds.ts                  6種類の環境音の定義(id・表示名・音源ファイル・無料/有料)
  useSoundEngine.ts           複数音源の同時ループ再生・音量・フェードアウトを管理するフック
  useCountdown.ts              集中/就寝タイマー用の汎用カウントダウンフック
  purchases.ts                 買い切り解放の状態管理(AsyncStorageで永続化)。実ストア連携の
                                差し込みポイントはファイル冒頭のコメント参照
  components/
    SoundTile.tsx             音源カード(タップでON/OFF、ロック中は🔒表示、ONの間だけ音量スライダー)
    TimerPanel.tsx             集中/就寝タブ、プリセット・カスタム時間、実行中の残り時間表示
    PaywallModal.tsx           買い切り¥480の解放モーダル(購入・復元・閉じる)
assets/
  icon.png / splash-icon.png / android-icon-*.png / favicon.png
                                scripts/generate-icons.js で生成したブランドアイコン一式
  sounds/                     環境音アセット(*.wav)。README.md にライセンスと差し替え手順
scripts/
  generate-sounds.js          環境音アセットを生成するプロシージャル音声合成スクリプト
  generate-icons.js           アイコン/スプラッシュ一式を生成するスクリプト(要 playwright)
  icon-template.html          ↑が読み込むSVGアイコン素材(波+月のマーク)
```

## 音源について

`assets/sounds/*.wav` は `npm run generate-sounds` で生成したプレースホルダー音源(ノイズ整形・合成音、著作権フリー)。**App Store 申請前に実録音へ差し替えることを推奨** — 詳細は `assets/sounds/README.md` を参照。

## 課金(買い切り解放)について

`app/purchases.ts` は AsyncStorage で解放状態を永続化する**スタブ実装**。App Store Connect / Google Play Console 側の商品登録はApple/Googleアカウントを持つ人間の作業が必須のため、このリポジトリだけでは完結できない。`react-native-iap` 等への差し替え手順はファイル冒頭のコメントに記載。現状は「購入する」を押すと即座に(ダミーで)解放される。

## MVPスコープ

- 実装済み: 環境音6種の同時ミックス再生、音量調整、集中タイマー(25/50分+カスタム)、就寝タイマー(15/30/45/60分+カスタム、終了前フェードアウト)、バックグラウンド再生設定、買い切り解放の状態管理とペイウォールUI、ブランドアイコン/スプラッシュ
- 未実装(v1では意図的に見送り): アカウント/クラウド同期、Apple Watch対応、多言語(日本語+英語以外)、AI機能、実際のストア決済連携

## 次のアクション

1. `assets/sounds/*.wav` を実録音(ロイヤリティフリー/ライセンス取得済み)に差し替える
2. Apple Developer Program / Google Play Developer 登録。`app.json` の `ios.bundleIdentifier` / `android.package`(現在は仮の `com.nagi.app`)を自分のアカウント規約に合わせて変更
3. App Store Connect / Play Console で非消耗型商品(例: `unlock_all_sounds` ¥480)を作成し、`app/purchases.ts` を `react-native-iap` 等に差し替え
4. `npm run ios` / TestFlight で実機確認してから申請
