# Google カレンダー → ジェネシスワークシステム 自動同期（Google Workspace 全社員）

**スマホの Google カレンダーアプリで入力・変更・削除した予定が、数分以内にジェネシスワークシステム（GWS）のスケジュールに自動で反映** されるようにする仕組みです。
音声アプリで登録した予定も、PC の Google カレンダーで入力した予定も、すべて同じように反映されます。社員の操作は不要です。

```
 スマホの Google カレンダー ─┐
 PC の Google カレンダー ────┼─▶ Google Workspace（各社員のカレンダー）
 音声スケジュール ───────────┘            │
                                          │ 5 分ごとに「前回からの変更」だけを取得
                                          ▼
                        同期サービス（sync/・Cloud Run で自動実行）
                                          │ POST（社員ごと）
                                          ▼
                        ジェネシスワークシステムのスケジュール
```

- 同期サービスは Google Workspace の「**ドメイン全体の委任**」を使い、社員本人のカレンダーを**読み取り専用**で読みます（書き込み権限は持ちません）。
- 毎回「前回からの差分（追加・変更・削除）」だけを取得するので、社員数が多くても軽く動きます。
- 「**非公開**」にした予定は、GWS には「予定あり」とだけ送ります（件名・場所・メモは送りません）。
- GWS 側が止まっていても、復旧後にまとめて再送されます（予定の取りこぼしなし）。

## 用意するもの・担当

| | 作業 | 担当 |
| --- | --- | --- |
| 1 | Google Cloud プロジェクトとサービスアカウントを作る | Google Cloud を触れる人（15 分） |
| 2 | Workspace 管理コンソールで「ドメイン全体の委任」を許可する | **Workspace の特権管理者**（5 分） |
| 3 | GWS に予定の受け口（API）を作る | GWS の開発担当（仕様は [genesis-integration.md](genesis-integration.md)） |
| 4 | 同期サービスを Cloud Run に載せる（コマンド 1 回） | 1 と同じ人（10 分） |

3 が完成する前でも、1・2・4 を済ませて **DRY_RUN（送らずに件数だけ確認）** で動作確認できます。

## 1. Google Cloud の準備

音声スケジュールの Google ログイン用に作ったプロジェクトを使って構いません。

1. <https://console.cloud.google.com/> でプロジェクトを選ぶ（なければ作成）。課金（請求先アカウント）を有効にする。
   ※ Cloud Run・Scheduler・Storage は、この規模ならほぼ無料枠内（月数十円程度）に収まります。
2. 「IAM と管理」→「サービス アカウント」→「サービス アカウントを作成」
   - 名前：`genesis-calendar-sync`
   - ロールの付与は不要（スキップ）
3. 作成したサービスアカウントを開き、「詳細」の **一意の ID（クライアント ID・数字 21 桁）** を控える。
   ※ 鍵（JSON キー）は作らなくて大丈夫です。

## 2. ドメイン全体の委任（Workspace 特権管理者）

1. <https://admin.google.com/> →「セキュリティ」→「アクセスとデータ管理」→「API の制御」
2. 「ドメイン全体の委任を管理」→「新しく追加」
   - クライアント ID：1 で控えた数字
   - OAuth スコープ（カンマ区切りでそのまま貼り付け）：
     ```
     https://www.googleapis.com/auth/calendar.events.readonly,https://www.googleapis.com/auth/admin.directory.user.readonly
     ```
3. 「承認」。反映まで数分〜最大 24 時間かかることがあります。

| スコープ | 用途 |
| --- | --- |
| `calendar.events.readonly` | 社員のカレンダーの予定を**読むだけ** |
| `admin.directory.user.readonly` | 同期対象の社員一覧（停止中の人を除く）を**読むだけ** |

## 3. GWS の受け口（API）

[genesis-integration.md](genesis-integration.md) の仕様で、GWS の開発担当に作ってもらいます。
動きの見本として `sync/dev/mock-genesis.js`（受け取った予定を登録・更新・削除するだけの小さなサーバー）があります。

## 4. 同期サービスを Cloud Run に載せる

Google Cloud コンソール右上の「Cloud Shell」を開いて実行します。

```sh
git clone https://github.com/takezawagenesisgroup-oss/-.git voice-schedule
cd voice-schedule/sync

PROJECT_ID=プロジェクトID \
ADMIN_EMAIL=Workspaceの管理者メール \
GENESIS_ENDPOINT=https://GWSのURL/api/schedules/google-sync \
GENESIS_TOKEN=GWSで発行したトークン \
EXCLUDE_USERS=info@example.co.jp,noreply@example.co.jp \
./deploy-cloud-run.sh
```

- これで「Cloud Run ジョブ」と「5 分ごとに実行する Cloud Scheduler」が作られます。
- 間隔を変える場合は `SCHEDULE="*/2 * * * *"`（2 分ごと）などを付けて再実行。
- `ADMIN_EMAIL` は全社員の一覧を読むためだけに使います（その人のカレンダーを操作するわけではありません）。
- 一部の人だけで試したい場合は、デプロイ後に Cloud Run ジョブの環境変数 `SYNC_USERS=a@...,b@...` を追加します（全社員より優先）。

**GWS の API が完成する前に試す**：`GENESIS_ENDPOINT=https://example.invalid GENESIS_TOKEN=dummy` でデプロイし、ジョブの環境変数に `DRY_RUN=1` を追加 →
`gcloud run jobs execute genesis-calendar-sync --region asia-northeast1 --wait` → ログに社員ごとの件数が出れば Google 側の設定は完了です。
GWS が完成したら環境変数 `GENESIS_ENDPOINT` を本番 URL に、`DRY_RUN` を削除、トークンを `gcloud secrets versions add genesis-token` で更新します。
※ DRY_RUN 中も同期位置は進むので、本番に切り替える前に Cloud Storage の `state.json` を削除して、全件送り直しから始めてください。

## 動作の確認・運用

- 実行ログ：Cloud Run →「ジョブ」→ `genesis-calendar-sync` →「ログ」
  社員ごとに「○件を送信」「失敗 - 理由」が出ます（予定の中身はログに出しません）。
- 同期状態：Cloud Storage のバケット `プロジェクトID-genesis-sync` の `state.json`。削除すると次回は全員分を全件送り直します。
- 社員の入社・退職：自動で反映されます（毎回 Workspace の社員一覧を取得）。

## よくあるエラー

| ログのメッセージ | 原因と対処 |
| --- | --- |
| `トークン取得（ドメイン全体の委任の設定を確認してください）… unauthorized_client` | 2 の設定がまだ反映されていない／クライアント ID かスコープの貼り間違い |
| `signJwt … PERMISSION_DENIED` | サービスアカウントに「サービス アカウント トークン作成者」が付いていない（`deploy-cloud-run.sh` を再実行） |
| `カレンダーの取得に失敗 (HTTP 404)` | その人にカレンダーのライセンスがない（`EXCLUDE_USERS` に追加） |
| `GWS への送信に失敗しました (HTTP 5xx)` | GWS 側のエラー。次回自動で再送されます |

## Cloud Run を使わない場合

社内サーバーや常時起動の PC でも動きます（Node.js 20 以上、外部ライブラリ不要）。
この場合はサービスアカウントの JSON キーを作成して使います（組織のポリシーで禁止されている場合は Cloud Run を使ってください）。

```sh
cd sync
cp .env.example .env   # 値を記入（GOOGLE_SERVICE_ACCOUNT_KEY_FILE にキーのパス）
set -a; . ./.env; set +a
node index.js --loop 120   # 2 分ごとに同期し続ける
```
