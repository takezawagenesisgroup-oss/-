# ストア申請文言

App Store Connect / Google Play Console にそのまま貼り付ける文言。文字数は全てスクリプトで検証済み。デザイン付きの版は別途アーティファクトを参照。

## 基本情報

| 項目 | 設定値 |
|---|---|
| プライマリカテゴリ | 健康/フィットネス |
| セカンダリカテゴリ | スポーツ |
| 価格モデル | 無料(アプリ内課金 ¥480・非消耗型) |
| 年齢制限 | 4+ / 全年齢(「恋人」トーンも露骨な表現は含まない) |
| 対応言語 | 日本語、English |
| 使用データ | 位置情報(距離・ペース計測のみ、外部送信なし) — 凪と異なりApp Privacy申告が必要 |

## iOS App Store

- **App名**(上限30字・17字): `隣 -Tonari- 声の伴走ラン`
- **サブタイトル**(上限30字・15字): `ペースに合わせ話しかける伴走者`
- **プロモーション用テキスト**(上限170字・80字):
  `コーチは無料。友人・恋人を含む全ての口調は買い切り¥480で解放。サブスクなし。GPSでペース・距離を計測しながら、状況に応じて自動生成された声で話しかけます。`
- **キーワード**(上限100字・67字):
  `ランニング,ウォーキング,伴走,音声,ペース計測,GPS,マラソン,ジョギング,応援,モチベーション,一人,コーチ,友人,恋人,声かけ`

### 説明文(JA)

```
雨の日も、一人の日も、隣に誰かがいる感覚で走れる。

「隣」は、GPSでペース・距離・経過時間を計測しながら、状況に応じてリアルタイムで声をかけてくれるランニング/ウォーキング伴走アプリです。

■ 3つの口調から選べる
コーチ・友人・恋人、3つの口調から選べます。落ち着いた指導、テンション高めの応援、隣にいるような親密な気遣い——気分や目的に合わせて選んでください。

■ ペース・距離・停止まで、状況に反応
1kmごとの通過報告、ペースが落ちた時の励まし、上がった時の称賛、立ち止まった時の気遣い、目標距離の中間地点とラストスパート。台詞は状況に応じて自動生成されるので、毎回違う言葉で話しかけてくれます。

■ 音楽を止めない
Spotifyなどの音楽を再生しながらでも、声はその上に重なって聞こえます(音楽アプリを止めません)。

■ サブスクではなく、買い切り
コーチの声は無料。友人・恋人を含む全ての口調は、¥480の買い切りで解放できます。月額課金は一切ありません。

■ 記録も残る
走り終えるたびに、日時・距離・時間・平均ペースが記録に残ります。

■ こんな方に
・一人で走るのが少し寂しいと感じる方
・モチベーションを保つのが苦手な方
・声優収録の高額なランニングアプリに手が出なかった方

隣にいるつもりで、今日も一歩。
```

### Description (EN)

```
Rain or shine, run like someone's right beside you.

Nagi... no, Tonari (隣, "beside you") tracks your pace, distance, and time via GPS, and talks to you in real time based on how your run is going.

■ Three voices to choose from
Coach, Friend, or Partner. Calm guidance, high-energy cheering, or an intimate voice that feels like company — pick whichever fits your mood.

■ Reacts to your pace, distance, and even when you stop
Distance callouts every kilometer, encouragement when you slow down, praise when you speed up, a gentle check-in if you pause too long, plus a midpoint and final-stretch cue toward your goal. Lines are generated on the fly, so it never feels like the same recording on repeat.

■ Doesn't fight your music
Keep Spotify or your podcast running — the voice ducks in over it instead of stopping it.

■ One-time purchase, not another subscription
Coach is free. Unlock Friend and Partner with a single ¥480 (about $3) purchase. No subscription, ever.

■ Keeps a log
Every run is saved with date, distance, time, and average pace.

Built for anyone who runs alone but doesn't want to feel alone.
```

## Google Play

- **タイトル**(上限30字・20字): `隣 -Tonari- 声の伴走ランニング`
- **簡単な説明**(上限80字・41字): `ペースに応じて話しかけてくれる、声のランニング伴走アプリ。買い切り、サブスクなし。`
- **詳しい説明**: iOSの説明文(JA)と同一内容を使用可。加えて「ランニングアプリ」「ウォーキング アプリ」「一人 ランニング」「マラソン トレーニング」等のフレーズを自然に含める。

## スクリーンショット文言(5枚構成)

1. **メイン画面** — 「隣で、声がする。」/ 口調選択画面(コーチ/友人/恋人)
2. **走行中** — 「ペースに合わせて、話しかけてくれる」/ 実行中の統計+吹き出しキャプション画面
3. **音楽と一緒に** — 「Spotifyを止めずに、声だけ重なる」/ ダッキング訴求(アイコンでSpotify+隣を並べた合成)
4. **価格訴求** — 「サブスクじゃない。買い切り¥480。」/ ペイウォールモーダル
5. **記録** — 「走るたびに、記録が残る」/ 履歴一覧画面

## App Privacy(データ収集の申告)— 凪との違いに注意

凪は「データ収集なし」だったが、本アプリは**距離・ペース計測のために位置情報を取得する**ため、正確な申告が必要。

| 質問項目(Apple) | 回答 |
|---|---|
| 位置情報の収集 | **収集する**(正確な位置情報) |
| 収集した位置情報の利用目的 | アプリの機能(距離・ペース計測)のみ |
| 第三者への提供・共有 | しない |
| ユーザーに関連付け | しない(端末内のみで処理・保存、外部送信なし) |
| トラッキング(他社への追跡)への利用 | しない |
| 利用状況データ・識別子・診断データの収集 | 収集しない |

Google Playの「データセーフティ」セクションも同様に、位置情報を「収集するが第三者と共有しない」「アプリ機能に必須」として申告する。
