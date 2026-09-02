# ローンチ告知文案

凪・隣と同じ売り方戦略(X・note・Product Hunt・Reddit)を、「気配」向けに書き換えたもの。`[App Store link]` / `[Google Play link]` は公開後に実URLへ差し替える。X用の文字数はCJK文字を重み2でカウントする実仕様に合わせて検証済み(280字換算)。

## 投稿タイミング

凪・隣と同じ流れ。審査提出前にXで開発実況 → 公開当日にX5連スレッド → Product Hunt → 数日後にReddit → 1週間後にnote。

## X(旧Twitter)スレッド

**1/5・フック**(273/280字)
```
一人で作業してると静かすぎるので、隣に誰かがいる気配を感じられるアプリを作りました。

呼吸の音を土台に、時々応援や気遣いの声が届きます。女友達・男友達・どうぶつ、9キャラクターから選べます。

時間は5分〜2時間、シチュエーションも選べます。

🕯️ 気配 -Kehai-
[App Store link]
```

**2/5・特徴**(110/280字)
```
声かけのタイミングはランダム、台詞も毎回変わるので飽きません。伸びやため息などの生活音もランダムに挟まります。
```

**3/5・機能**(190/280字)
```
できること:
・9キャラクター(女友達4/男友達3/どうぶつ2、清楚系は無料)
・シチュエーション選択(勉強/作業/読書/家事/就寝前/フリー)
・5分/30分/1時間/2時間から選べる時間
・音楽を止めずに声を重ねる
```

**4/5・開発の裏側**(89/280字)
```
Claude Codeで実装。呼吸音や生活音は録音ではなくノイズ合成でプロシージャル生成しています。
```

**5/5・CTA**(79/280字)
```
清楚系は無料です。作業や勉強のお供にどうぞ。感想はリプライで🙏
[App Store link]
```

## note記事アウトライン

タイトル案: 「一人作業の"静かすぎる"を埋めるアプリを作った話 ― 呼吸音とランダムボイスで"隣にいる気配"を作る」

1. **なぜ作ったか** — 在宅ワーク・一人暮らしの孤独感、凪(環境音)・隣(ランニング伴走)からの発展
2. **何を作ったか** — 9キャラクター(女友達/男友達/どうぶつ)の口調設計の考え方(実在人物ではなく口調のスタイルとして表現した経緯)、シチュエーション機能、ランダム性の作り方
3. **どう作ったか** — Claude Code + Expo、呼吸音のDSP合成(凪の技術の転用)、ランダム間隔スケジューリングの実装
4. **結果と今後** — 公開後の反応、キャラクタービジュアル(イラスト)の追加予定

## Product Hunt

- **Tagline**(上限60字・48字): `A gentle voice keeps you company while you work.`
- **Description**:
  ```
  Kehai plays a soft breathing loop while you study or work alone, with a voice that checks in and cheers you on at random intervals — never the same line twice in a row. Pick from four tones (Gentle is free); unlock the rest for ¥480 (~$3), no subscription. Set a timer from 5 minutes to 2 hours.
  ```
- **Maker's first comment**:
  ```
  Hey PH 👋

  Working alone at home always felt a little too quiet, so I built Kehai — a soft breathing ambience plays throughout, and a voice occasionally cheers you on or checks in, at randomized intervals so it never feels scripted. Four tones to choose from, all supportive/cheering (no romantic framing).

  Built solo with Claude Code (Expo/React Native), same toolkit as two earlier apps of mine. All the ambient audio is procedurally synthesized, not recorded.
  ```

## Reddit投稿

投稿先の目安: r/WorkFromHome, r/GetStudying, r/socialanxiety(慎重に、押し付けがましくならないよう配慮), r/SideProject, r/IndieDev。

- **タイトル案**: `I built an app that gives you a sense someone's quietly working alongside you`
- **本文**:
  ```
  Working alone at home started feeling too quiet, so I built Kehai — it plays a soft breathing sound in the background and, at random intervals, a voice cheers you on or checks in on you. Four tones to pick from (all supportive, not romantic), and the lines never repeat back-to-back so it doesn't feel scripted.

  Set a timer for 5 minutes up to 2 hours. The gentle tone is free; the other three unlock with a single ¥480 (~$3) purchase, no subscription.

  Built solo with Claude Code. Happy to talk about how the randomized-timing system works.

  [App Store link]
  ```

## 投稿前チェックリスト

- [ ] 全ての `[App Store link]` / `[Google Play link]` を実際のストアURLに差し替える
- [ ] スクリーンショット(`docs/store-listing.md` のスクリーンショット文言案を使用)を各投稿に添付
- [ ] Reddit各サブのセルフプロモーションルールを事前確認
- [ ] Product Huntは太平洋時間00:01頃に公開されるようスケジュール
- [ ] X投稿後、最初の1時間は返信に目を配り、質問には即レスする
