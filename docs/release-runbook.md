# リリース手順書(人間がやる作業)

実装・ブランド素材・ストア文言はここまでの作業で用意済み。ここから先はApple/Googleの開発者アカウントを持つ人間でないと進められない作業だけをまとめた、公開までの実行手順。デザイン付きの版はアーティファクト「凪 リリース手順書」を参照。

## 概要

| 項目 | 目安 |
|---|---|
| 初期費用 | 約¥19,000(Apple $99/年 + Google $25一度きり) |
| 登録〜審査提出までの期間 | 3〜10日(法人でのApple登録は数週間かかる場合あり) |
| Macの要否 | **不要** — EAS Build(Expoのクラウドビルド)でiOSもビルド可能 |

## Phase 1. 開発者アカウント登録

💰 約¥19,000 / ⏱ 1〜3日(法人は数週間かかる場合あり)

- [ ] **Apple Developer Program に登録**($99/年、個人 or 法人)。developer.apple.com から登録。個人(Individual)ならApple IDと本人確認書類、法人(Organization)ならD-U-N-S番号が必要で承認に数日〜数週間かかることがある。急ぐなら個人登録から始めるのも手。
- [ ] **Google Play Developer アカウントに登録**($25、一度きり)。play.google.com/console/signup から登録。本人確認完了まで最大48時間ほどかかる場合がある。
- [ ] **App Store Connect / Play Console 上でアプリのプレースホルダーを作成**。バンドルID(現在の仮設定: `com.nagi.app`)を確定させ、自分のアカウント/ドメインに合わせて `app.json` の `ios.bundleIdentifier` と `android.package` を書き換える。

## Phase 2. ビルド環境(EAS)の準備

💰 無料枠あり / ⏱ 30分

このアプリはExpo製なので、**Macを持っていなくてもEAS Build(Expoのクラウドビルドサービス)でiOSアプリをビルドできる**。ローカルにXcodeが無いこの開発環境と同じ制約は、EASを使えば人間側でも回避できる。

- [ ] Expoアカウントを作成し、EAS CLIをインストール
  ```bash
  npx expo login
  npm install -g eas-cli
  eas login
  ```
- [ ] プロジェクトにEAS Buildを設定
  ```bash
  cd (プロジェクトのルート)
  eas build:configure
  ```
  実行すると `eas.json` が生成される。iOSビルド時にApple IDへのサインインを求められるので、Phase 1で登録したアカウントで進める(証明書・プロビジョニングはEASが自動生成してくれる)。
- [ ] 試しにビルドしてみる
  ```bash
  eas build --platform ios --profile preview
  eas build --platform android --profile preview
  ```
  初回は無料枠(Expoの月間ビルド数枠)で試せる。ビルドが通れば、実機にインストールして動作確認できる。

## Phase 3. 音源の実録音への差し替え

💰 ¥0〜数千円 / ⏱ 半日

現在の `assets/sounds/*.wav` はノイズ合成のプレースホルダー。品質を上げるなら実録音に差し替える(必須ではないが推奨)。

- [ ] **音源を調達する**。CC0(著作権表示不要)の音源なら Freesound.org など。商用利用が明確なライブラリが良ければ Artlist / Epidemic Sound / AudioJungle のようなロイヤリティフリー音源サービス(サブスクまたは買い切り)を利用。「商用アプリでの再配布・ループ利用」が許可規約に含まれているか必ず確認する。
- [ ] **雨・波・焚き火・カフェ・風鈴の5種を同名ファイルで差し替え**。`assets/sounds/rain.wav` 等、同じファイル名で上書きすればコード変更は不要。ホワイトノイズは現状のままでも実用品質。
- [ ] **ループの継ぎ目を実機/ブラウザで確認**
  ```bash
  npm run web
  ```
  6種類すべてを再生し、ループの切れ目でクリック音や不自然な無音が無いか確認する。

## Phase 4. アプリ内課金商品の作成

💰 無料(手数料はストア側の標準率) / ⏱ 1〜2時間+実装差し替え

現状の「購入する」ボタンはダミー実装(`app/purchases.ts`)。実際に課金するには両ストアで商品登録し、決済SDKを組み込む必要がある。

- [ ] **App Store Connect で非消耗型(Non-Consumable)商品を作成**。「機能」→「App内課金」から追加。Product ID例: `unlock_all_sounds`。価格は¥480に近いTierを選択(Appleは固定Tier制)。
- [ ] **Google Play Console で管理対象アプリ内アイテムを作成**。「収益化」→「商品」→「アプリ内アイテム」。同じProduct ID(`unlock_all_sounds`)で揃えておくとコードを共通化しやすい。
- [ ] **`react-native-iap` を導入し、`app/purchases.ts` を差し替え**
  ```bash
  npm install react-native-iap
  ```
  差し替え箇所と手順は `app/purchases.ts` 冒頭のコメントに記載済み。`purchaseUnlockAll()` と `restorePreviousPurchase()` の中身を実際のAPI呼び出しに置き換える。ネイティブモジュールを追加するので、差し替え後は改めて `eas build` が必要。

## Phase 5. 法務ページの仕上げ

💰 ¥0 / ⏱ 15分

- [ ] `docs/legal/privacy-support.html` のお問い合わせ先を実際のメールアドレスに差し替え(現状 `support@example.com` のプレースホルダー)
- [ ] ページを公開してURLを取得。最も簡単なのは、このページをアーティファクトとして再公開し、共有メニューから「公開」に切り替えてURLを取得する方法。自前ドメインを持っていればGitHub Pages等でホスティングしても良い
- [ ] 取得したURLを両ストアの「プライバシーポリシーURL」「サポートURL」欄に設定

> ⚠ **注意**: アーティファクトはデフォルトで非公開。審査担当者がアクセスできるよう、必ず共有設定を確認してから申請すること。

## Phase 6. ストア掲載情報の入力

💰 ¥0 / ⏱ 1〜2時間

- [ ] `docs/store-listing.md` の文言をApp Store Connect / Play Consoleにコピペ(App名・サブタイトル・説明文・キーワード・プロモーションテキストは全て文字数検証済みなのでそのまま貼れる)
- [ ] スクリーンショットを撮影。`docs/store-listing.md` のスクリーンショット文言案(5枚構成)を参考に、必要サイズ(6.7インチ・6.5インチ・5.5インチ等)ぶん、シミュレータまたは実機で撮影。テキストオーバーレイは Figma やCanva等で追加
- [ ] App Privacyアンケート・コンテンツレーティングに回答。`docs/store-listing.md` の「App Privacy」表の通り、全項目「収集しない」で回答できる

## Phase 7. 実機テスト・審査提出

💰 ¥0 / ⏱ 審査は1〜3日(ストアによる)

- [ ] EAS Buildで本番用ビルドを作成しTestFlight / 内部テストへ配信
  ```bash
  eas build --platform ios --profile production
  eas submit --platform ios
  ```
- [ ] 実機で全機能を確認。6種類の音源すべての再生/ミックス、集中タイマー(25/50分+カスタム)、就寝タイマー(4プリセット+カスタム、フェードアウト)、購入フロー、購入の復元、バックグラウンド再生を一通りチェック
- [ ] 問題なければ審査へ提出。App Store Connect / Play Consoleでそれぞれ「審査へ提出」。Appleは通常24〜48時間、Google Playは数時間〜数日で結果が出ることが多い

## Phase 8. 公開・ローンチ告知

💰 ¥0 / ⏱ 公開当日〜1週間

- [ ] 審査通過後、公開日時を設定(即時 or 予約)
- [ ] `docs/launch-copy.md` の `[App Store link]` 等を実URLに差し替えて投稿。X 5連スレッド → Product Hunt → Reddit → note の順で、投稿タイミング表に沿って展開する
- [ ] 初動のレビュー・問い合わせに目を配る。公開直後の数日はレビュー返信・不具合報告への対応を優先する
