# PM Management App - プロジェクト＆タスク管理ツール

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16.1.6-000000?logo=nextdotjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E?logo=supabase&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white" />
</p>

## 概要

**PM Management App** は、プロジェクト管理とタスク実行ログ（見積/実績・振り返り）を一体化した Web アプリケーションです。

単なる ToDo 管理ではなく、以下を重視しています。

- **プロジェクト・タスク管理**：親子タスク（WBS）で構造化
- **予実管理**：見積時間と実績時間の差分を可視化
- **振り返り**：完了時にメモを残して改善サイクルを回す
- **チーム共有**：オーナーがメンバー追加/削除
- **可視化**：タイムライン・ダッシュボードで進捗確認

### 開発の背景・経緯

「タスクを終わらせる」だけでなく、「次回の見積精度を上げる」ための実行ログを残すことを目的に開発しています。  
見積と実績、振り返りを一連で記録し、継続的な改善につなげる設計です。

### 公開 URL

https://pm-management-app.vercel.app/

---

## 特徴と機能の説明

### 1. **マルチユーザー対応プロジェクト管理**

- 自分が作成したプロジェクト + 共有されたプロジェクトを表示
- オーナーはメンバーの追加/削除が可能
- メンバーにも閲覧・操作権限を付与

<p align="center"><img src="./images/topPage.png" alt="topPage" width="600" /></p>
<p align="center"><sub>図1. ホーム画面（プロジェクト一覧）</sub></p>

<p align="center"><img src="./images/projectDetail.png" alt="projectDetail" width="600" /></p>
<p align="center"><sub>図2. プロジェクト詳細（タスク管理）</sub></p>

### 2. **タスク作成時の記録項目**

- タイトル
- 開始日・期限日
- 重要度・緊急度（1〜5）
- 見積時間（分）
- 親タスク配下への子タスク追加

<p align="center"><img src="./images/newTask.png" alt="newTask" width="600" /></p>
<p align="center"><sub>図3. 親タスク作成フォーム</sub></p>

<p align="center"><img src="./images/newSubTask.png" alt="newSubTask" width="600" /></p>
<p align="center"><sub>図4. サブタスク作成フォーム</sub></p>

### 3. **完了時の振り返り機能**

- 実績時間を記録
- 振り返りメモを記録
- 親タスク完了時は、完了済み子タスクの実績合計を反映

<p align="center"><img src="./images/review.png" alt="review" width="600" /></p>
<p align="center"><sub>図5. タスク完了時の振り返り入力</sub></p>

### 4. **タイムラインチャート + 進捗ダッシュボード**

- ホーム：プロジェクトタイムライン、期限が近いタスクを表示
- ダッシュボード：プロジェクト別フィルタ、完了タスク統計、見積/実績比較
- 完了済みタスクの詳細を `プロジェクト → 親 → 子` で確認

<p align="center"><img src="./images/topPage.png" alt="topPage" width="600" /></p>
<p align="center"><sub>図6. ホームのタイムライン表示</sub></p>

<p align="center"><img src="./images/projectDetail.png" alt="projectDetail" width="600" /></p>
<p align="center"><sub>図7. プロジェクト詳細の進捗表示</sub></p>

<p align="center"><img src="./images/dashBoard.png" alt="dashboard" width="600" /></p>
<p align="center"><sub>図8. ダッシュボード（見積/実績の可視化）</sub></p>

### 5. **タスクの親子関係管理（WBS）**

- 親タスク・子タスクを同一画面で管理
- 子タスクにはタイマー機能あり
- 状態は `TODO / IN_PROGRESS / DONE`

<p align="center"><img src="./images/projectDetail.png" alt="projectDetail" width="600" /></p>
<p align="center"><sub>図9. 親子タスク（WBS）構成の表示</sub></p>

---

## 使用技術（技術スタック）

### フロントエンド

- TypeScript 5
- Next.js 16.1.6 (App Router)
- React 19
- Tailwind CSS 4
- Recharts

<p align="left">
  <img alt="Frontend Logos" src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind&perline=8" />
</p>

### バックエンド・データベース

- Prisma
- PostgreSQL（Supabase）

<p align="left">
  <img alt="Backend Logos" src="https://skillicons.dev/icons?i=prisma,supabase,postgres&perline=8" />
</p>

### 認証・セキュリティ

- Supabase Auth
- @supabase/ssr

### 開発・デプロイ

- VScode
- ESLint
- Vercel

<p align="left">
  <img alt="Tooling Logos" src="https://skillicons.dev/icons?i=vercel,vscode&perline=8" />
</p>

### システム構成図

<p align="center"><img src="./images/flowChart.png" alt="flowChart" width="600" /></p>
<p align="center"><sub>図10. システム構成図</sub></p>

---

## 開発期間・体制

- 開発体制：個人開発
- 開発期間：1/30 - 2/19 (70時間以上)

---

## 工夫した点・苦労した点

### 工夫した点

1. 親子タスクの自己参照設計（WBS）
2. 見積/実績/振り返りを完了フローに統合
3. オーナー/メンバーの権限分離
4. 完了タスクをプロジェクト詳細内で継続して確認できる構成

### 苦労した点

1. Prisma スキーマ更新時の Client 不整合への対応
2. SSR と認証状態の同期
3. 操作ボタンを維持しつつ、カード全体クリック導線を両立

---

## 既知の課題と今後の展望

### 既知の課題

1. UIの統一感・情報密度の最適化
2. 大規模データ時の描画/集計パフォーマンス
3. 履歴データのアーカイブ戦略（将来的に必要なら別途導入）

### 今後の展望 & ロードマップ

- 通知連携（Slack / メール）
- 分析指標の拡充（週次・月次比較）
- エクスポート機能（CSV）

---

## セットアップ・実行手順

### 環境構築

```bash
npm install
```

`.env.local` に以下を設定してください。

```env
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

```bash
npx prisma migrate dev
npx prisma generate
npm run dev
```

### 本番ビルド

```bash
npm run build
npm run start
```

---

## ライセンス

MIT License（`LICENSE`）

---

## 連絡先・その他

- 開発者：show151
- Repository：https://github.com/show151/pm-management-app
