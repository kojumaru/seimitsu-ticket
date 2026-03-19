# 精密Lab. 整理券システム

大学の学園祭における企画の混雑緩和を目的として開発した、LINE連携型のリアルタイム整理券システムです。

---

## 概要

来場者がQRコードをスキャンするとLINEアプリ上で整理券を取得でき、順番が来たら自動でLINE通知が届きます。運営スタッフは管理者画面から順番を進めるだけで、呼び出し通知まで自動で行われます。

---

## 機能

- **整理券の発行** — LINEログイン後、ボタン一つで整理券を取得
- **リアルタイム待ち状況** — 現在の案内番号・待ち人数・待ち時間目安をリアルタイムで表示
- **LINE通知** — 順番が来たら来場者のLINEに自動でメッセージを送信
- **案内画面** — 各企画のQRコードと待ち時間を一覧表示（スタッフが掲示用に使用）
- **管理者画面** — パスワード認証付き。ボタン一つで次の番号を呼び出し

---

## 技術スタック

| 技術 | 用途 |
|---|---|
| Next.js 16 (App Router) | フレームワーク・サーバーアクション |
| React 19 | UIコンポーネント |
| TypeScript | 型安全な開発 |
| Tailwind CSS | スタイリング |
| Firebase (Firestore) | リアルタイムデータ管理 |
| LINE LIFF | LINEログイン・ユーザー識別 |
| LINE Messaging API | プッシュ通知 |
| Framer Motion | アニメーション |
| Vercel | デプロイ・ホスティング |

---

## システム構成

```
来場者
  └─ QRコードをスキャン
  └─ LINE LIFF でログイン
  └─ 整理券を取得（Firestoreに記録）
  └─ リアルタイムで待ち状況を確認
  └─ 順番が来たらLINE通知を受信

運営スタッフ
  └─ 管理者画面（パスワード認証）にアクセス
  └─ 「次の番号を呼ぶ」ボタンを押す
  └─ Firestoreが更新 → 全来場者の画面がリアルタイムに変わる
  └─ サーバーアクション経由でLINE通知が送信される
```

---

## ディレクトリ構成

```
app/
├── page.tsx              # 来場者向け：整理券取得・待ち状況画面
├── guide/page.tsx        # 案内用：QRコードと待ち時間の一覧
├── admin/page.tsx        # 運営向け：呼び出し管理画面
├── actions/
│   └── notify.ts         # サーバーアクション（LINE通知）
├── lib/
│   ├── firebase.ts       # Firebase接続設定
│   └── proxy.ts          # LINE API呼び出し処理

middleware.ts             # /admin へのBasic認証
```

---

## セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/kojumaru/seimitsu-ticket.git
cd seimitsu-ticket
npm install
```

### 2. 環境変数を設定

`.env.example` をコピーして `.env.local` を作成し、各値を入力してください。

```bash
cp .env.example .env.local
```

### 3. Firestoreの初期データ

`tickets` コレクションに企画ごとのドキュメントを作成してください。

```
tickets/{exhibitId}
  currentNumber: 0
  nowServing: 0
```

### 4. 開発サーバーを起動

```bash
npm run dev
```

---

## 画面一覧

| URL | 説明 |
|---|---|
| `/?exhibitId={id}` | 来場者向け整理券画面 |
| `/guide` | QRコード・待ち時間一覧（掲示用） |
| `/admin?exhibitId={id}` | 運営管理画面（要パスワード） |

---

## 工夫した点

- **トランザクション処理** — 同時に複数人が整理券を取得しても番号が重複しないよう、Firestoreのトランザクションで排他制御を実装
- **サーバーアクション** — LINE APIのトークンをサーバー側にのみ保持し、クライアントに露出しない設計
- **リアルタイム同期** — `onSnapshot` により、ページリロード不要で待ち状況が即時反映
- **セキュリティ** — 環境変数による機密情報の管理、Basic認証による管理者ページの保護
