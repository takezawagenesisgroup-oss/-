# ジェネシスワークシステム連携の設計

## 方針

- **Google カレンダーを正（マスター）** とし、ジェネシスワークシステム（以下 GWS）は Google カレンダーの内容を受け取って表示・社内共有する。
- 音声で登録した予定も、Google カレンダーに直接手入力した予定も、**同じ経路（Google カレンダーの変更検知）** で GWS に送る。
  → 「音声アプリから GWS に直接送る」形にしないことで、手入力の予定が漏れたり二重登録になったりするのを防ぐ。
- 送信は Google Apps Script（`gas/GenesisSync.js`）が行う。GWS 側は「予定を受け取る API」を 1 本用意するだけでよい。

```
Google カレンダー ──(変更トリガー)──▶ Apps Script syncToGenesis()
                                          │ Calendar API の syncToken で差分だけ取得
                                          ▼
                              POST GENESIS_ENDPOINT（GWS の API）
```

## GWS 側で用意してほしい API

`POST {GENESIS_ENDPOINT}`

- ヘッダー：`Authorization: Bearer {GENESIS_TOKEN}`、`Content-Type: application/json`
- 本文：

```json
{
  "source": "google-calendar",
  "events": [
    {
      "googleEventId": "abc123def456",
      "googleCalendarId": "primary",
      "status": "active",
      "title": "営業会議",
      "location": "本社会議室",
      "description": "音声入力: 10月15日14時から16時まで本社会議室で営業会議",
      "allDay": false,
      "start": "2026-10-15T14:00:00+09:00",
      "end": "2026-10-15T16:00:00+09:00",
      "updated": "2026-10-12T23:50:00.000Z",
      "htmlLink": "https://www.google.com/calendar/event?eid=..."
    },
    {
      "googleEventId": "zzz999",
      "status": "deleted"
    }
  ]
}
```

GWS 側の処理：
- `googleEventId` をキーに **upsert**（なければ作成、あれば更新）。同じ予定が何度届いても結果が変わらないようにする（再送されることがあるため）。
- `status: "deleted"` は GWS 側の予定を削除（または非表示）にする。削除時は `title` などが空の場合がある。
- 終日予定は `allDay: true`、`start` / `end` は `"2026-10-20"` 形式の日付。**`end` は最終日の翌日**（Google カレンダーの仕様）。
- 成功時は 2xx を返す。2xx 以外を返すと Apps Script は同期位置を進めず、次回の変更時にまとめて再送する。

## 有効化の手順（GWS の API 完成後）

1. Apps Script エディタの左メニュー「サービス」→ ＋ →「Google Calendar API」を追加（識別子 `Calendar`）
   ※ `gas/appsscript.json` をそのまま貼り付けていれば追加済み。
2. スクリプトプロパティに追加
   - `GENESIS_ENDPOINT`：GWS の API URL
   - `GENESIS_TOKEN`：GWS の API トークン
3. エディタで `installGenesisTrigger` を 1 回実行（カレンダー変更時に `syncToGenesis` が自動で動くようになる。初回は過去 30 日以降の予定を送信）。

## 複数人で使う場合（Google ログイン方式）

Google ログイン方式では、各社員が自分のカレンダーに登録するため、`GenesisSync.js`（1 アカウント用）では全員分を連携できない。
次のどちらかで、**GWS のサーバー側から各社員の Google カレンダーを同期** する。

1. **Google Workspace を使っている場合（おすすめ）**：サービスアカウントにドメイン全体の委任を設定し、GWS サーバーが各社員のカレンダーを Calendar API（`events.watch` の通知 + `syncToken` の差分取得）で読む。社員の操作は不要。
2. **Gmail アカウントの場合**：GWS 側に「Google カレンダーと連携する」ボタンを用意し、社員ごとに OAuth（オフラインアクセス）で同意をもらってリフレッシュトークンを保存。以降は 1 と同様に差分同期する。

どちらの場合も、同期処理が受け取るデータは上記の `events` の形式と同じにしておけば、GWS 側の登録・更新・削除処理を 1 人用と共通化できる。
音声で登録した予定には `extendedProperties.private.source = "voice-schedule"`（Apps Script 経由はタグ `source`）が付いているので、必要なら区別できる。

## 今後の検討事項
- **GWS → Google の逆方向**：GWS で入力した予定を Google カレンダーにも反映したい場合は、GWS から Apps Script の `doPost`（`event` 形式）を呼べば登録できる。ただし双方向にするとループしやすいので、`extendedProperties` / タグ（`source`）で発生元を判定する。
- **音声の解析精度**：現在はルールベースの解析。言い回しが増えて精度が足りなくなった場合は、Apps Script から生成 AI（Claude API など）を呼んで解析する方式に差し替えられるよう、解析処理は `parseSchedule()` 1 関数にまとめてある。
