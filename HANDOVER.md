# 引き継ぎメモ（PowerShell / ローカル環境への移行用）

このドキュメントは、クラウド上のClaude Codeセッションで作成した
「採用フロー自動化プロトタイプ」を、Windows + PowerShellのローカル環境に
引き継いで作業を続けるための手順書です。実装内容の詳細設計は `README.md`
を参照してください（このファイルはセットアップ手順と引き継ぎ事項に特化しています）。

## 1. これまでの経緯（要約）

- リポジトリ: `takezawagenesisgroup-oss/-`
- 作業ブランチ: `claude/job-application-automation-mym73d`（GitHub上にpush済み）
- 目的: 求人応募〜面談日程調整〜面談シート記入を、HR B社のグループLINE運用に
  代わって自社で完結させる仕組みの設計・プロトタイプ実装
- 合意した技術方針（ヒアリング時の回答）:
  1. まず「設計書＋動くプロトタイプ」を作る
  2. LINE連携は「独立したWebフォーム＋LINE通知」方式（LIFFは使わない）
  3. 日程調整は「手動登録した空き枠から選択」方式（外部カレンダー連携なし）
  4. 面談シートの実項目は**未受領**。現状は仮項目（`lib/interviewSheetFields.ts`）で実装

## 2. リポジトリの取得（PowerShell）

初めてクローンする場合:

```powershell
git clone https://github.com/takezawagenesisgroup-oss/- job-app-automation
cd job-app-automation
git checkout claude/job-application-automation-mym73d
```

既にクローン済みで最新化する場合:

```powershell
cd <リポジトリのパス>
git fetch origin
git checkout claude/job-application-automation-mym73d
git pull origin claude/job-application-automation-mym73d
```

> リポジトリ名が `-` のため、クローン後のディレクトリ名も `-` になります。
> 上記のように任意のフォルダ名（例: `job-app-automation`）を指定して展開することを推奨します。

## 3. 前提環境

- **Node.js 20以上**（開発時はv22.22.2で検証。`node -v` で確認）
- **npm 10以上**（Node.jsに同梱）
- Gitがインストール済みであること

PowerShellでバージョン確認:

```powershell
node -v
npm -v
git --version
```

## 4. セットアップ手順（PowerShell）

```powershell
# 依存パッケージのインストール
npm install

# 環境変数ファイルを作成（LINE未設定でもモックモードで動作します）
Copy-Item .env.example .env

# Prismaクライアント生成 + DBマイグレーション適用（SQLiteファイルを新規作成）
npx prisma generate
npx prisma migrate deploy

# 開発サーバー起動
npm run dev
```

起動後、ブラウザで `http://localhost:3000` を開いてください。管理画面は
`http://localhost:3000/admin/applicants`。

### 4-1. Windows特有の注意点

- `@prisma/adapter-better-sqlite3` はネイティブモジュール（`better-sqlite3`）に依存しています。
  通常はプリビルド済みバイナリが自動取得されるため追加作業は不要ですが、
  `npm install` 時にビルドエラーが出た場合は以下を試してください。
  1. [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
     をインストール（「C++によるデスクトップ開発」ワークロードを選択）
  2. `npm install` を再実行
- PowerShellの実行ポリシーでnpmスクリプトの実行がブロックされる場合は、
  管理者権限のPowerShellで以下を実行（会社のポリシーに従って判断してください）:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
  ```

## 5. 動作確認方法

```powershell
# 型チェック
npx tsc --noEmit

# Lint
npm run lint

# ビルド（本番ビルドが通ることの確認）
npm run build
```

一連の応募フローをAPI経由で確認する場合（`npm run dev` 起動中に別のPowerShellウィンドウで）:

```powershell
# 面談枠を登録
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/slots `
  -ContentType "application/json" `
  -Body '{"startAt":"2026-09-01T10:00:00.000Z","endAt":"2026-09-01T11:00:00.000Z","capacity":2}'

# 応募者を登録（basic info）
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/applicants `
  -ContentType "application/json" `
  -Body '{"name":"山田太郎","email":"taro@example.com","phone":"090-1234-5678"}'
```

ブラウザ操作の確認は `/apply` から実際にフォームを入力するのが確実です。

## 6. リポジトリ構成（主要部分のみ）

```
app/
  page.tsx                        トップ（求人媒体からの入口を想定）
  apply/page.tsx                  基礎情報入力フォーム
  apply/[id]/schedule/page.tsx    面談日程選択
  apply/[id]/waiting/page.tsx     待機画面（LINE連携・面談シート導線）
  interview-sheet/[id]/page.tsx   面談シート事前入力（仮項目）
  admin/slots/page.tsx            面談枠の管理者登録・削除
  admin/applicants/page.tsx       応募者一覧
  admin/applicants/[id]/page.tsx  応募者詳細（面談シート回答・通知履歴）
  api/                            各種APIルート（applicants / slots / appointments /
                                   interview-sheets / line/webhook）
lib/
  prisma.ts                       Prismaクライアント（better-sqlite3アダプタ経由）
  line.ts                         LINE Messaging API送受信ラッパー（未設定時はモック）
  notify.ts                       通知送信＋ログ記録
  validation.ts                   Zodバリデーションスキーマ
  interviewSheetFields.ts         面談シートの仮項目定義（★実項目差し替え対象）
prisma/schema.prisma              データモデル定義
README.md                         設計書（アーキテクチャ図・データモデル・LINE連携方式など）
```

## 7. 次にやるべきこと（引き継ぎタスク）

- [ ] **面談シートの実項目を受領し、`lib/interviewSheetFields.ts` を実データに差し替え**
      （フォーム・保存先ともにこの配列だけで対応できる設計になっています）
- [ ] LINE公式アカウントを開設し、`.env` に `LINE_CHANNEL_ACCESS_TOKEN` /
      `LINE_CHANNEL_SECRET` / `LINE_OFFICIAL_ACCOUNT_URL` を設定して実連携を検証
- [ ] `/admin/*` への認証追加（現状はプロトタイプにつき無認証）
- [ ] SQLite（`dev.db`、Git管理外）から本番用DBへの切り替え検討
- [ ] 求人媒体からの応募データ受け渡し方式の確定

その他の背景・設計判断の詳細は `README.md` の「9. 本番運用に向けて残っているタスク」
にも記載しています。

## 8. 困ったときは

- ビルドエラー: `npx tsc --noEmit` と `npm run lint` を先に実行し、エラーメッセージを確認
- DBスキーマを変更したい場合: `prisma/schema.prisma` を編集後、
  ```powershell
  npx prisma migrate dev --name <変更内容の英語スラッグ>
  ```
- DBを作り直したい場合（**開発データは失われます**）:
  ```powershell
  Remove-Item dev.db -ErrorAction SilentlyContinue
  npx prisma migrate deploy
  ```
