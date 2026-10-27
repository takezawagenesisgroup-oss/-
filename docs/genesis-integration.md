# ジェネシスワークシステム連携の設計（GWS 開発担当向け）

## 方針

- **竹澤さんの Google カレンダーを正（マスター）** とし、ジェネシスワークシステム（以下 GWS）のスケジュールはその内容を受け取って社内に共有する。
- スマホの Google カレンダーで入力した予定、PC で入力した予定、音声スケジュールで登録した予定は、すべて **同じ経路（Google カレンダーの変更検知）** で GWS に届く。
  → 「音声アプリから GWS に直接送る」形にしないことで、手入力の予定が漏れたり二重登録になったりするのを防ぐ。
- 送信は Google Apps Script（`gas/GenesisSync.js`）が竹澤さんのアカウントで行う。**GWS 側は予定を受け取る API を 1 本用意するだけ** でよい。

```
竹澤さんのスマホ（Google カレンダーアプリ）で入力・変更・削除
        │
        ▼
Google カレンダー ──(変更されるとすぐ／念のため 10 分ごと)──▶ Apps Script syncToGenesis()
                                                                 │ 前回からの差分だけを取得
                                                                 ▼
                                               POST GWS の API（このドキュメントの仕様）
                                                                 │
                                                                 ▼
                                               GWS のスケジュール（竹澤さんの予定として表示）
```

## 設定手順（GWS の API ができたら・約 10 分）

音声スケジュール用に作った Apps Script プロジェクト（README の「1. Google Apps Script を用意する」）に追加する。

1. Apps Script エディタで「＋」→「スクリプト」→ `GenesisSync` を作り、`gas/GenesisSync.js` の中身を貼り付けて保存。
2. 左メニュー「サービス」→ ＋ →「Google Calendar API」を追加（識別子 `Calendar`）。
   ※ `gas/appsscript.json` をそのまま貼り付けていれば追加済み。
3. ⚙「プロジェクトの設定」→「スクリプト プロパティ」に追加：
   - `GENESIS_ENDPOINT`：GWS の API の URL
   - `GENESIS_TOKEN`：GWS で発行した API トークン
4. 関数 `installGenesisTrigger` を選んで「実行」（初回は権限の許可が出るので許可）。
   → 過去 30 日以降の予定が GWS に全件送られ、以降はスマホで予定を変えるたびに自動で送られる。

**GWS の API ができる前に試す**：スクリプトプロパティに `GENESIS_DRY_RUN` = `true` を追加して `syncToGenesis` を実行すると、送る予定の一覧が「実行ログ」に出る（送信はしない）。確認後は `GENESIS_DRY_RUN` を削除する。

| 関数 | 用途 |
| --- | --- |
| `installGenesisTrigger` | 自動連携を開始（1 回だけ） |
| `syncToGenesis` | 今すぐ送る（手動実行） |
| `resetGenesisSync` | 過去 30 日以降を全件送り直す（GWS 側のデータを作り直したときなど） |
| `uninstallGenesisTrigger` | 自動連携を停止 |

## GWS 側で用意してほしい API

`POST {GENESIS_ENDPOINT}`（例：`https://gws.example.co.jp/api/schedules/google-sync`）

- ヘッダー：`Authorization: Bearer {GENESIS_TOKEN}`（GWS で発行した固定トークン）、`Content-Type: application/json`
- 1 リクエスト = **1 人分**（`userEmail`）の変更。現在は竹澤さんのメールアドレス（Workspace アカウント）だけが届く。
  GWS 側では、このメールアドレスの社員（竹澤さん）のスケジュールとして登録する。
- 将来、社員全員分に広げたときも同じ形式で届く（1 回に最大 500 件、超える場合は `batch` で分割）。
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
4. **応答**：成功したら 2xx。2xx 以外を返すと、その人の同期位置は進まず、次回（カレンダーの次の変更時、または 10 分以内）に同じ内容をまとめて再送する。
5. **GWS に存在しない社員**（`userEmail` が未登録）は 2xx を返して無視してよい（エラーにすると毎回再送される）。

実装の見本：`sync/dev/mock-genesis.js` の `handleSync()`（上の 1〜3 をそのまま実装した小さなサーバー）。

## テストのしかた

```sh
node sync/dev/mock-genesis.js   # 見本の受け口を起動（http://localhost:8787/api/schedules/google-sync）
npm test                        # 連携処理のテスト（偽の Google と見本の受け口で動作確認）
```

## 参考：将来、社員全員の Google カレンダーを連携する場合

現在は竹澤さん 1 人分の連携。社員全員分に広げる場合は、Workspace の「ドメイン全体の委任」を使う同期サービス（`sync/`）を使う。
送るデータの形式は同じなので、GWS 側の API はそのまま使える。手順は [workspace-sync-setup.md](workspace-sync-setup.md)。

## 今後の検討事項

- **GWS → Google の逆方向**：GWS で入力した予定を Google カレンダーにも反映したい場合は、同期サービスに「書き込み」権限（`calendar.events`）を追加して GWS から登録する。
  双方向にするとループしやすいので、GWS から登録した予定には `extendedProperties.private.source = "genesis"` を付け、届いても GWS 側で更新し直さないようにする。
- **反映の速さ**：現在は 5 分ごと（最短 1 分まで設定可）。即時に近づけたい場合は Calendar API の `events.watch`（変更通知）を追加する。
- **音声の解析精度**：現在はルールベースの解析。精度が足りなくなったら、生成 AI（Claude API など）で解析する方式に差し替えられるよう、解析処理は `parseSchedule()` 1 関数にまとめてある。
