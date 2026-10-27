# ジェネシスワークシステム連携の設計（GWS 開発担当向け）

## 方針

- **Google カレンダーを正（マスター）** とし、ジェネシスワークシステム（以下 GWS）は Google カレンダーの内容を受け取って表示・社内共有する。
- スマホの Google カレンダーで入力した予定、PC で入力した予定、音声スケジュールで登録した予定は、すべて **同じ経路（Google カレンダーの変更検知）** で GWS に届く。
  → 「音声アプリから GWS に直接送る」形にしないことで、手入力の予定が漏れたり二重登録になったりするのを防ぐ。
- GWS 側は **予定を受け取る API を 1 本用意するだけ** でよい。Google への接続・差分の取得・再送は同期サービス側が行う。

```
各社員の Google カレンダー（Workspace）
        │  5 分ごとに差分取得（ドメイン全体の委任・読み取り専用）
        ▼
同期サービス sync/（Cloud Run ジョブ）……設定手順: workspace-sync-setup.md
        │  POST（社員ごと・変更があったときだけ）
        ▼
GWS の API（このドキュメントの仕様）
```

送り元は 2 種類あるが、どちらも同じ形式で送る。

| 送り元 | 対象 | 使う場面 |
| --- | --- | --- |
| `sync/`（Cloud Run） | Workspace の **全社員** | **本番（会社で使う）** |
| `gas/GenesisSync.js`（Apps Script） | Apps Script を作った 1 人だけ | 個人で試す場合 |

## GWS 側で用意してほしい API

`POST {GENESIS_ENDPOINT}`（例：`https://gws.example.co.jp/api/schedules/google-sync`）

- ヘッダー：`Authorization: Bearer {GENESIS_TOKEN}`（GWS で発行した固定トークン）、`Content-Type: application/json`
- 1 リクエスト = **1 人分**（`userEmail`）の変更。1 回に最大 500 件、それを超えると `batch` で分割して順に送る。
- 本文：

```json
{
  "source": "google-calendar",
  "userEmail": "takezawa@example.co.jp",
  "fullSync": false,
  "timeMin": null,
  "batch": { "index": 0, "total": 1 },
  "events": [
    {
      "userEmail": "takezawa@example.co.jp",
      "googleEventId": "abc123def456",
      "googleCalendarId": "primary",
      "status": "active",
      "title": "営業会議",
      "location": "本社会議室",
      "description": "音声入力: 10月15日14時から16時まで本社会議室で営業会議",
      "private": false,
      "allDay": false,
      "start": "2026-10-15T14:00:00+09:00",
      "end": "2026-10-15T16:00:00+09:00",
      "timeZone": "Asia/Tokyo",
      "iCalUID": "abc123def456@google.com",
      "recurringEventId": null,
      "organizerEmail": "takezawa@example.co.jp",
      "myResponseStatus": "accepted",
      "attendees": [{ "email": "tanaka@example.co.jp", "responseStatus": "needsAction" }],
      "busy": true,
      "source": "voice-schedule",
      "updated": "2026-10-12T23:50:00.000Z",
      "htmlLink": "https://www.google.com/calendar/event?eid=..."
    },
    {
      "userEmail": "takezawa@example.co.jp",
      "googleEventId": "zzz999",
      "googleCalendarId": "primary",
      "status": "deleted"
    }
  ]
}
```

### 項目

| 項目 | 内容 |
| --- | --- |
| `userEmail` | 誰のカレンダーの予定か。GWS の社員（メールアドレス）と紐づけて、その人のスケジュールに表示する |
| `googleEventId` | 予定の ID。**`userEmail` + `googleEventId` で一意**（同じ会議でも参加者ごとに別の予定として届く） |
| `status` | `active`（登録・更新）／`deleted`（削除） |
| `private` | 「非公開」の予定。`title` は「予定あり」、場所・メモ・参加者は空で届く |
| `allDay` / `start` / `end` | 終日なら `"2026-10-20"` 形式の日付で、**`end` は最終日の翌日**（Google の仕様）。時間指定なら `+09:00` 付きの日時 |
| `iCalUID` | 同じ会議は参加者間で共通。会議を 1 件にまとめて表示したいときに使える |
| `recurringEventId` | 繰り返し予定の各回のとき、元の予定の ID（各回は別々の予定として届く） |
| `myResponseStatus` | 本人の出欠（`accepted` / `declined` / `tentative` / `needsAction`）。招待を辞退した予定を表示しない、などに使える |
| `busy` | 「予定あり」表示か（`false` は「空き時間」として登録された予定） |
| `source` | 音声スケジュールで登録した予定は `voice-schedule` |

### GWS 側の処理

1. **upsert**：`(userEmail, googleEventId)` をキーに、なければ作成・あれば更新。同じ内容が何度届いても結果が変わらないようにする（失敗時に再送されるため）。
2. **削除**：`status: "deleted"` は GWS の予定を削除（または非表示）。`title` などは届かない。
3. **全件送り直し（`fullSync: true`）**：初回や Google 側の都合で同期をやり直すときに届く。
   この場合、`timeMin` 以降に終わるこの人の予定は **届いたものがすべて**。最後のバッチ（`batch.index == batch.total - 1`）を受け取ったら、
   今回届かなかった予定（`timeMin` 以降）を削除する。予定 0 件の人でも `events: []` で 1 回届く。
4. **応答**：成功したら 2xx。2xx 以外を返すと、その人の同期位置は進まず、次回（5 分後）に同じ内容をまとめて再送する。
5. **GWS に存在しない社員**（`userEmail` が未登録）は 2xx を返して無視してよい（エラーにすると毎回再送される）。

実装の見本：`sync/dev/mock-genesis.js` の `handleSync()`（上の 1〜3 をそのまま実装した小さなサーバー）。

## テストのしかた

```sh
cd sync
node dev/mock-genesis.js      # 見本サーバーを起動（http://localhost:8787）
npm test                      # 同期サービスのテスト（偽の Google と見本サーバーで動作確認）
```

## Apps Script 版（1 人用）の有効化

1. Apps Script エディタの左メニュー「サービス」→ ＋ →「Google Calendar API」を追加（識別子 `Calendar`）
   ※ `gas/appsscript.json` をそのまま貼り付けていれば追加済み。
2. スクリプトプロパティに `GENESIS_ENDPOINT`・`GENESIS_TOKEN` を追加。
3. エディタで `installGenesisTrigger` を 1 回実行（カレンダーが変わるたびに自動で送信）。

会社で使う場合は Apps Script 版ではなく `sync/`（全社員）を使う。両方を同時に動かしても、同じキーで upsert されるので重複はしない。

## 今後の検討事項

- **GWS → Google の逆方向**：GWS で入力した予定を Google カレンダーにも反映したい場合は、同期サービスに「書き込み」権限（`calendar.events`）を追加して GWS から登録する。
  双方向にするとループしやすいので、GWS から登録した予定には `extendedProperties.private.source = "genesis"` を付け、届いても GWS 側で更新し直さないようにする。
- **反映の速さ**：現在は 5 分ごと（最短 1 分まで設定可）。即時に近づけたい場合は Calendar API の `events.watch`（変更通知）を追加する。
- **音声の解析精度**：現在はルールベースの解析。精度が足りなくなったら、生成 AI（Claude API など）で解析する方式に差し替えられるよう、解析処理は `parseSchedule()` 1 関数にまとめてある。
