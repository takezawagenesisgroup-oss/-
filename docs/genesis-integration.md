# ジェネシスワークシステム連携の設計（GWS 開発担当向け）

## 方針

- **双方向同期**：竹澤さんの Google カレンダーと、ジェネシスワークシステム（以下 GWS、https://genesis-app-genesis.web.app ）の竹澤さんのスケジュールを同じ内容に保つ。
  - スマホ・PC の Google カレンダーで入力・変更・削除 → **すぐに** GWS に反映
  - GWS の画面で入力・変更・削除 → **5 分以内に** Google カレンダー（スマホ）に反映
- 同期は Google Apps Script（`gas/GenesisSync.js`）が竹澤さんのアカウントで行う。**GWS 側は API を 2 本用意するだけ** でよい（Google への接続は不要）。
- 音声スケジュールで登録した予定も Google カレンダー経由で同じように GWS に届く。

```
              ┌───────────── ① Google → GWS（変更があるとすぐ） ─────────────┐
              │   POST /api/schedules/google-sync（変わった予定を送る）        ▼
 Google カレンダー  ⇄  Apps Script syncWithGenesis()                  GWS のスケジュール
 （スマホ・PC）       ▲                                                       │
              └───────────── ② GWS → Google（5 分ごと） ──────────────────────┘
                  GET /api/schedules/changes（GWS で変わった予定を取りに行く）
```

**行ったり来たりしない仕組み**
- GWS で作った予定を Google に登録するとき、Google 側に `genesisId`（GWS の予定 ID）を付ける。それが ① で戻ってきたら、GWS は新しい予定を作らず **元の予定に紐づける**。
- ② の変更一覧には **GWS の画面での変更だけ** を載せる（① で Google から届いた変更は載せない）。
- 両方で同時に変更された場合は、**更新日時が新しい方** を採用する。

## 設定手順（GWS の API ができたら・約 10 分）

音声スケジュール用に作った Apps Script プロジェクト（README の「1. Google Apps Script を用意する」）に追加する。

1. Apps Script エディタで「＋」→「スクリプト」→ `GenesisSync` を作り、`gas/GenesisSync.js` の中身を貼り付けて保存。
2. 左メニュー「サービス」→ ＋ →「Google Calendar API」を追加（識別子 `Calendar`）。
   ※ `gas/appsscript.json` をそのまま貼り付けていれば追加済み。
3. ⚙「プロジェクトの設定」→「スクリプト プロパティ」に追加：

   | プロパティ | 値 |
   | --- | --- |
   | `GENESIS_ENDPOINT` | ① の URL（例：`https://…/api/schedules/google-sync`） |
   | `GENESIS_CHANGES_ENDPOINT` | ② の URL（例：`https://…/api/schedules/changes`）。設定しなければ Google → GWS の片方向だけ |
   | `GENESIS_TOKEN` | GWS で発行した API トークン（①②共通） |

4. 関数 `installGenesisTrigger` を選んで「実行」（初回は権限の許可が出るので許可）。
   → 過去 30 日以降の Google の予定が GWS に送られ、以降は自動で同期される。

**API ができる前に試す**：スクリプトプロパティに `GENESIS_DRY_RUN` = `true` を追加して `syncWithGenesis` を実行すると、同期する予定の一覧が「実行ログ」に出る（送信・反映はしない）。確認後は `GENESIS_DRY_RUN` を削除する。

| 関数 | 用途 |
| --- | --- |
| `installGenesisTrigger` | 自動同期を開始（1 回だけ） |
| `syncWithGenesis` | 今すぐ同期（手動実行） |
| `resetGenesisSync` | 最初からやり直す（GWS 側のデータを作り直したときなど） |
| `uninstallGenesisTrigger` | 自動同期を停止 |

## GWS 側で用意してほしい API ①：Google → GWS（予定を受け取る）

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
      "genesisId": null,
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
| `genesisId` | GWS で作られて Google に登録された予定なら、その GWS の予定 ID。**あれば、その予定を更新して `googleEventId` を記録する**（新しく作らない） |

### GWS 側の処理

1. **upsert**：`genesisId` があればその予定、なければ `(userEmail, googleEventId)` で探し、なければ作成・あれば更新（`googleEventId` も保存）。同じ内容が何度届いても結果が変わらないようにする（失敗時に再送されるため）。
   ここで作成・更新・削除した予定には **`origin: "google"`** を記録し、② の変更一覧に載せない。
2. **削除**：`status: "deleted"` は GWS の予定を削除（または非表示）。`title` などは届かない。
3. **全件送り直し（`fullSync: true`）**：初回や Google 側の都合で同期をやり直すときに届く。
   この場合、`timeMin` 以降に終わるこの人の予定のうち **Google と紐づいているもの（`googleEventId` あり）** は、届いたものがすべて。
   最後のバッチ（`batch.index == batch.total - 1`）を受け取ったら、今回届かなかったそれらの予定を削除する。
   GWS で作ってまだ Google に反映されていない予定（`googleEventId` なし）は消さない。予定 0 件でも `events: []` で 1 回届く。
4. **応答**：成功したら 2xx。2xx 以外を返すと同期位置は進まず、次回（カレンダーの次の変更時、または 5 分以内）に同じ内容をまとめて再送する。
5. **GWS に存在しない社員**（`userEmail` が未登録）は 2xx を返して無視してよい（エラーにすると毎回再送される）。

実装の見本：`sync/dev/mock-genesis.js` の `handleSync()`（上の 1〜3 をそのまま実装した小さなサーバー）。

## GWS 側で用意してほしい API ②：GWS → Google（変更一覧を返す）

`GET {GENESIS_CHANGES_ENDPOINT}?userEmail=takezawa@…&since={cursor}`（例：`https://gws.example.co.jp/api/schedules/changes`）

- ヘッダー：`Authorization: Bearer {GENESIS_TOKEN}`
- `since`：前回の応答の `cursor`。初回は空文字（＝最初から）。
- 応答：`since` より後に **GWS の画面で** 作成・変更・削除された、その人の予定（古い順）。

```json
{
  "cursor": "1730000000123",
  "hasMore": false,
  "schedules": [
    {
      "genesisId": "f3b1c2…",
      "googleEventId": null,
      "userEmail": "takezawa@example.co.jp",
      "status": "active",
      "title": "取引先訪問",
      "location": "札幌",
      "description": "",
      "allDay": false,
      "start": "2026-10-29T10:00:00+09:00",
      "end": "2026-10-29T11:30:00+09:00",
      "updatedAt": "2026-10-27T01:23:45.000Z",
      "origin": "genesis"
    },
    {
      "genesisId": "a91e…",
      "googleEventId": "abc123def456",
      "status": "deleted",
      "updatedAt": "2026-10-27T01:30:00.000Z",
      "origin": "genesis"
    }
  ]
}
```

| 項目 | 内容 |
| --- | --- |
| `cursor` | 次回の `since` に使う値（文字列なら何でもよい。例：最後の予定の `updatedAt` のミリ秒）。変更がなければ `since` と同じ値を返す |
| `hasMore` | まだ続きがあるとき `true`（Apps Script は続けて取りに来る）。1 回に返すのは 100 件程度まで |
| `genesisId` | GWS の予定 ID（必須） |
| `googleEventId` | Google と紐づいていればその ID、GWS で作ったばかりなら `null` |
| `status` | `active` / `deleted` |
| `allDay` / `start` / `end` | ① と同じ形式。終日は `"2026-11-02"` 形式で **`end` は最終日の翌日**。時間指定は `+09:00` 付き |
| `updatedAt` | GWS で最後に変更した日時（どちらが新しいかの判定に使う） |
| `origin` | `genesis`（GWS の画面での変更）。`google` のものは Apps Script が無視する |

GWS 側の処理：
- **GWS の画面で** 予定を作成・変更・削除したときは、`origin: "genesis"` と `updatedAt` を記録する（削除はレコードを消さず `status: "deleted"` にする。② で削除を伝えるため）。
- ② では `userEmail` が一致し、`origin == "genesis"` で、`since` より後に変更された予定だけを返す。
- Apps Script が Google に反映すると、その結果は ① で `genesisId` 付きで届く（GWS はそれで `googleEventId` を記録する）。

## Firebase（genesis-app-genesis）で実装する場合の目安

GWS は Firebase Hosting で公開されているので、Cloud Functions for Firebase（HTTP 関数）+ Firestore で実装するのが手軽。

- Firestore の予定ドキュメント（例：`schedules/{genesisId}`）に、画面用の項目に加えて
  `userEmail`・`googleEventId`・`status`・`origin`・`updatedAt`（`serverTimestamp()`）を持たせる。
- 画面からの保存処理で `origin: "genesis"`、`updatedAt: serverTimestamp()` をセットする（削除は `status: "deleted"`）。
- ① `POST /api/schedules/google-sync`：上の upsert ルールで書き込み（`origin: "google"`）。
- ② `GET /api/schedules/changes`：`where('userEmail','==',…).where('origin','==','genesis').where('updatedAt','>',since).orderBy('updatedAt').limit(100)`。
  `cursor` は最後の `updatedAt` のミリ秒（複合インデックスが必要）。
- `GENESIS_TOKEN` は Functions の Secret（`defineSecret`）に保存し、`Authorization` ヘッダーと照合する。
- 処理の流れは `sync/dev/mock-genesis.js`（`handleGoogleSync` / `listChanges` / `saveFromGenesisUi`）がそのまま見本になる。

## テストのしかた

```sh
node sync/dev/mock-genesis.js   # 見本の GWS API を起動（http://localhost:8787/）
npm test                        # 同期処理のテスト（偽の Google カレンダーと見本の GWS API で双方向の動作を確認）
```

## 参考：将来、社員全員の Google カレンダーを連携する場合

現在は竹澤さん 1 人分の連携。社員全員分に広げる場合は、Workspace の「ドメイン全体の委任」を使う同期サービス（`sync/`）を使う。
送るデータの形式は同じなので、GWS 側の API ① はそのまま使える（全社員版は現在 Google → GWS の片方向のみ）。手順は [workspace-sync-setup.md](workspace-sync-setup.md)。

## 今後の検討事項

- **反映の速さ**：現在は 5 分ごと（最短 1 分まで設定可）。即時に近づけたい場合は Calendar API の `events.watch`（変更通知）を追加する。
- **音声の解析精度**：現在はルールベースの解析。精度が足りなくなったら、生成 AI（Claude API など）で解析する方式に差し替えられるよう、解析処理は `parseSchedule()` 1 関数にまとめてある。
