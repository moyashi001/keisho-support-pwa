# 懸賞支援アプリ (PWA)

懸賞ツイートのURLから応募条件を解析し、リプライ文の下書きを自動生成するPWA。
Vercelでの静的ホスティング + サーバーレス関数構成を想定しています。

## 構成

- `index.html` / `app.html` / `app.css` / `app.js` : PWA本体 (フレームワーク不使用、素のHTML/CSS/JS)
- `api/analyze.js` : Vercelサーバーレス関数。X API v2でツイート取得・条件抽出・リプライ生成を行う
- `lib/` : `api/analyze.js` から使う共通ロジック (X API呼び出し、条件抽出、リプライ生成)
- `manifest.json` / `service-worker.js` : PWA設定・オフラインキャッシュ
- `scripts/gen-icons.js` : アイコン(PNG)生成スクリプト
- `scripts/dev-server.js` : Vercel CLI無しでもローカル確認できる簡易devサーバー

## 重要な設計方針: フォロー/リポスト/リプライは自動実行しない

Xの自動化ルールでは、ユーザーの操作を介さない自動フォロー・自動リポスト・自動リプライ投稿は禁止されています。
そのため本アプリは **リプライ文の下書き作成まで** を自動化し、実際の操作は
[Intent URL](https://developer.x.com/en/docs/x-for-websites/tweet-button/guides/web-intent) を開いて
**ユーザー本人がXの画面上で確認・実行** する方式にしています（`app.js` の `buildIntentUrls`）。
「完了にする」ボタンはAPIで実行結果を確認するものではなく、画面上の状態表示のみです（保存はしません）。

## セットアップ

```bash
npm install
cp .env.example .env   # X_BEARER_TOKEN を設定
npm run dev             # http://localhost:8080 で確認
```

Node.js 18以上を推奨します。アイコンを作り直す場合は `npm run gen-icons` を実行してください。

## Vercelへのデプロイ

1. GitHubリポジトリを作成しpush
2. Vercelダッシュボードでリポジトリをインポート（Framework Preset: Other でOK。`api/` 配下は自動的にサーバーレス関数として認識されます）
3. Vercelの環境変数に `X_BEARER_TOKEN` を設定
4. デプロイ

## 画面構成

1. ツイートURL入力 → 解析
2. 抽出された応募条件一覧
3. 自動生成されたリプライ文（編集可能、130文字以内）
4. フォロー/リポスト/リプライ投稿（Xの確認画面を開く）
