# ローンチ告知文案

凪と同じ売り方戦略(X・note・Product Hunt・Reddit)を、「隣」向けに書き換えたもの。`[App Store link]` / `[Google Play link]` は公開後に実URLへ差し替える。X用の文字数はCJK文字を重み2でカウントする実仕様に合わせて検証済み(280字換算)。

## 投稿タイミング

凪と同じ流れ。審査提出前にXで開発実況 → 公開当日にX5連スレッド → Product Hunt → 数日後にReddit → 1週間後にnote。

## X(旧Twitter)スレッド

**1/5・フック**(244/280字)
```
一人で走るのがちょっと寂しいので、隣で話しかけてくれる音声伴走アプリを作りました。

コーチ・友人・恋人、3つの口調から選べます。ペースが落ちたら励まし、上がったら褒めてくれる。

音楽を止めずに、声だけ重なります。

🏃 隣 -Tonari-
[App Store link]
```

**2/5・差別化**(129/280字)
```
声優収録のランニングアプリ(MAPLUS+等)は1キャラ¥1,080。隣はTTS(端末音声合成)で台詞を動的生成することで、買い切り¥480に抑えました。
```

**3/5・機能**(164/280字)
```
できること:
・コーチ/友人/恋人、3つの口調
・距離・ペース・停止に反応してリアルタイムで話しかけ
・Spotify等の音楽を止めずに声を重ねる
・ラン/ウォークの記録を自動保存
```

**4/5・開発の裏側**(131/280字)
```
Claude Codeで実装。GPSでのペース計測とTTSの読み上げ、約90行の台詞バンクを組んで、デモモードも作りました(歩かなくても体験できます)。
```

**5/5・CTA**(89/280字)
```
コーチの声は無料です。試してみてください。感想やリクエストはリプライで🙏
[App Store link]
```

## note記事アウトライン

タイトル案: 「声優1キャラ¥1,080のランニングアプリに対抗して、TTSで買い切り¥480の伴走アプリを作った話」

1. **なぜ作ったか** — 一人で走る孤独感、MAPLUS+等の先行事例と価格、声優収録ではなくTTSで差別化した理由
2. **何を作ったか** — 3つの口調、トリガー設計(距離・ペース・停止検知)、音楽を止めないダッキング
3. **どう作ったか** — Claude Code + Expo + expo-speech/expo-location、デモモードの作り方
4. **結果と今後** — 公開後の反応、ラン/ウォーク履歴機能、今後の展望(ニックネーム呼びかけ、共有カード等)

## Product Hunt

- **Tagline**(上限60字・49字): `A voice that runs beside you. Not a subscription.`
- **Description**:
  ```
  Tonari talks to you in real time while you run or walk — pace changes, distance milestones, even when you stop. Pick Coach, Friend, or Partner. Coach is free; unlock the rest for ¥480 (~$3), no subscription. It ducks under your music instead of stopping it.
  ```
- **Maker's first comment**:
  ```
  Hey PH 👋

  Running alone always felt a little quiet, so I built Tonari — it tracks your pace/distance via GPS and talks to you based on how the run is going (slowing down, speeding up, hitting a kilometer, stopping too long). Existing apps like this use recorded voice actors and charge ¥1,080 per character; I used on-device TTS instead so lines are generated dynamically and it's a single ¥480 unlock for all voices, no subscription.

  Built solo with Claude Code (Expo/React Native). There's a demo mode so you can preview the voices without actually going for a run.
  ```

## Reddit投稿

投稿先の目安: r/running, r/artificial (TTS活用の観点), r/SideProject, r/IndieDev(各サブのセルフプロモーションルールを事前確認)。

- **タイトル案**: `I built a running companion app that talks to you based on your pace — TTS instead of paying per voice actor`
- **本文**:
  ```
  Existing "voice companion" running apps use recorded voice actors and charge per character (one Japanese app charges ¥1,080/character). I built Tonari using on-device text-to-speech instead — it reacts to your pace, distance, and pauses in real time, and costs a single ¥480 (~$3) one-time unlock for all three voice styles (Coach/Friend/Partner). It also ducks under your music instead of stopping it.

  There's a demo mode that simulates a run so you can try the voices without going outside.

  Built solo with Claude Code. Happy to talk about the GPS/pace-trigger logic or the TTS setup.

  [App Store link]
  ```

## 投稿前チェックリスト

- [ ] 全ての `[App Store link]` / `[Google Play link]` を実際のストアURLに差し替える
- [ ] スクリーンショット(`docs/store-listing.md` のスクリーンショット文言案を使用)を各投稿に添付
- [ ] Reddit各サブのセルフプロモーションルールを事前確認
- [ ] Product Huntは太平洋時間00:01頃に公開されるようスケジュール
- [ ] X投稿後、最初の1時間は返信に目を配り、質問には即レスする
