# ローンチ告知文案

「凪 収益化戦略」の売り方戦略(X・note・Product Hunt・Reddit)を、実際に投稿できる文面に落とし込んだもの。デザイン付きの版はアーティファクト「凪 ローンチ告知文案」を参照。`[App Store link]` / `[Google Play link]` は公開後に実URLへ差し替える。

X(Twitter)の文字数はCJK文字を重み2でカウントする実仕様に合わせて検証済み(280字換算)。

## 投稿タイミング

| タイミング | チャネル | 内容 |
|---|---|---|
| 審査提出前(DAY5-6) | X | 開発の様子を1〜2投稿で実況(スクリーンショット添付) |
| ストア公開当日 | X | 下記5連スレッドを投稿 |
| ストア公開当日〜翌日 | Product Hunt | 太平洋時間の早朝(日本時間深夜〜早朝)に公開すると露出を最大化しやすい |
| 公開2〜3日後 | Reddit | 初速が落ち着いた頃、実績(DL数等)を添えて投稿 |
| 公開1週間後 | note | 開発の裏側記事を公開し、Xで再度告知 |

## X(旧Twitter)スレッド

**1/5・フック**(248/280字)
```
サブスクに疲れたので、環境音アプリを1週間で作って公開しました。

雨・波・ホワイトノイズは無料。焚き火・カフェ・風鈴を含む全部は買い切り¥480(サブスクなし)。

集中タイマーと、終了前にフェードアウトする就寝タイマーつき。

🌊 凪 -Nagi-
[App Store link]
```

**2/5・問題提起**(142/280字)
```
Calm・Headspaceは年間1万円超。でも中身はタイマーと環境音のループ。だったらそこだけ切り出して、買い切りにすればいいのでは、と思って作りました。
```

**3/5・機能**(193/280字)
```
できること:
・環境音6種を自由にミックス(音量も個別調整)
・集中タイマー 25/50分+カスタム
・就寝タイマー 15/30/45/60分、終了前にゆっくりフェードアウト
・広告なし/アカウント登録不要/オフライン完結
```

**4/5・開発の裏側**(122/280字)
```
Claude Codeで実装。環境音もノイズ合成でプレースホルダーを自前生成して、著作権フリーで動くところまで1週間でこぎつけました。
```

**5/5・CTA**(98/280字)
```
無料で3種類使えるので、よければ試してみてください。感想やリクエストはリプライで🙏
[App Store link]
```

## note記事アウトライン

タイトル案: 「個人開発で『サブスクに疲れた人向け』の睡眠アプリを1週間で作った話」

1. **なぜ作ったか** — サブスク疲れの市場データ、Calm/Headspaceの価格と不満点。「割高×不満」ジャンルを探した経緯。
2. **何を作ったか** — 凪の機能紹介、買い切り¥480の価格設計、無料枠3種の選定理由。
3. **どう作ったか** — Claude Code + Expoでの実装、環境音をノイズ合成で自前生成した話、7日間のスケジュール。
4. **結果と今後** — 公開後のDL数・売上(数字が出たら追記)、音源の実録音への差し替え予定、次に作るアプリの構想。

## Product Hunt

- **Tagline**(上限60字・57字): `A one-time-purchase sound & sleep timer. No subscription.`
- **Description**:
  ```
  Nagi mixes rain, waves, campfire and more into a focus/sleep timer with gentle fade-out. Rain, waves and white noise are free; unlock the rest for a single ¥480 (~$3) — no subscription, ever. Built solo in a week with Claude Code.
  ```
- **Maker's first comment**:
  ```
  Hey PH 👋

  I kept paying for meditation apps that cost $70+/year for what's basically a timer and a handful of audio loops. So I built Nagi: the same idea, but rain/waves/white noise are free, and the rest is a single ¥480 (~$3) one-time unlock. No subscription, no account, no ads.

  Built solo in about a week using Claude Code (Expo/React Native). Would love feedback, especially on what sounds you'd want added next.
  ```

## Reddit投稿

投稿先の目安: r/SomebodyMakeThis, r/sleep, r/productivity, r/SideProject, r/IndieDev(自作宣伝ルールはサブごとに確認)。

- **タイトル案**: `I got tired of $70/year sleep apps, so I built a $3 one-time alternative`
- **本文**:
  ```
  Every sleep/meditation app I tried wanted a subscription for what amounts to a timer and a few looped sounds. So over the last week I built Nagi — rain, waves, campfire, white noise, café and wind chimes you can mix together, plus a focus timer and a sleep timer that fades out before it stops.

  Rain, waves and white noise are free. The rest unlocks with a single ¥480 (~$3) purchase — no subscription, no account, no ads, fully offline.

  Built solo with Claude Code. Happy to answer questions about the build or take requests for more sounds.

  [App Store link]
  ```

## 投稿前チェックリスト

- [ ] 全ての `[App Store link]` / `[Google Play link]` を実際のストアURLに差し替える
- [ ] スクリーンショット(`docs/store-listing.md` のスクリーンショット文言案を使用)を各投稿に添付
- [ ] Reddit各サブのセルフプロモーションルールを事前確認(比率制限・曜日制限があるサブが多い)
- [ ] Product Huntは投稿前に "Ship" ページで下書き作成し、太平洋時間00:01頃に公開されるようスケジュール
- [ ] X投稿後、最初の1時間は返信に目を配り、質問には即レスする
