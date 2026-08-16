# 職人マッチ

個人で活動する職人と、仕事を依頼したいお客様をつなぐマッチングサービスです。
職人はできること・得意分野・年齢・性別・稼働可能な日程をプロフィールに登録し、
お客様はプロフィールを見た上で内容と金額を提示して直接依頼を送ります。
職人は金額と内容を見て仕事を受けるかどうかを判断し、受諾するとマッチングが成立します。
マッチング成立時、プラットフォームは依頼金額の一定割合（デフォルト15%）を手数料として徴収します。

## 技術スタック

- [Next.js](https://nextjs.org)（App Router / TypeScript）
- [Prisma](https://www.prisma.io) + SQLite
- [NextAuth.js](https://authjs.dev)（Credentials認証）
- Tailwind CSS

## セットアップ

```bash
npm install
npx prisma migrate dev
npm run seed   # サンプルの職人・お客様アカウントを投入（パスワードは全て password123）
npm run dev
```

http://localhost:3000 を開いてください。

## 主な機能

- 職人 / お客様の会員登録・ログイン
- 職人プロフィール登録・編集（できること、得意分野、年齢、性別、対応エリア、単価、稼働可能な曜日）
- 職人の検索・一覧（分野・エリア・性別で絞り込み）
- お客様から職人への直接依頼（内容・希望日・場所・金額を提示、手数料の内訳を表示）
- 職人による依頼の受諾・辞退、完了報告
- お客様の依頼履歴・職人のダッシュボード（回答待ち件数、完了件数、累計受取額）

## ディレクトリ構成

- `src/app` — ページ・APIルート（App Router）
- `src/lib` — Prisma クライアント、NextAuth 設定、定数
- `prisma/schema.prisma` — データモデル（User / CraftsmanProfile / JobRequest）
- `prisma/seed.ts` — サンプルデータ投入スクリプト
