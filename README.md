# 精密Lab. 整理券システム

五月祭における企画の混雑緩和を目的として開発した、LINE連携型のリアルタイム整理券システムです。

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

必要な環境変数：
- `NEXT_PUBLIC_FIREBASE_*` — Firebase設定（クライアント側）
- `LINE_CHANNEL_ACCESS_TOKEN` — LINE Official Accountのトークン
- `ADMIN_PASSWORD` — 管理者画面のパスワード

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

本番環境は Vercel にデプロイされています：https://seimitsu-ticket.vercel.app

---

## 使い方ガイド

### 📱 来場者向け（整理券取得画面）

#### 1. QRコードをスキャン
企画場所に掲示されたQRコードをスマートフォンのカメラで読み込みます。

![整理券取得前](docs/screenshots/01-ticket-before.jpg)

#### 2. 整理券の状況を確認
スキャン後、LINE内で自動的にブラウザが開き、現在の整理券状況が表示されます。

**表示情報：**
- **現在案内中** — 現在案内されている番号
- **待ち時間目安** — 目安となる待ち時間
- **待ち人数** — 自分より前に並んでいる人数

#### 3. 「整理券を受け取る」ボタンをタップ
ボタンをタップすると、整理券が発行されます。

![整理券取得済み](docs/screenshots/02-ticket-obtained.jpg)

#### 4. 整理券番号を確認
取得した整理券の番号が表示されます。この番号はLINEからも送信されます。

**重要：** 一度取得した整理券は有効です。ページを閉じても大丈夫です。

#### 5. 順番が来るまで待機
LINE内で「順番になりました」という通知を受け取るまで自由に行動できます。

![順番が来た時](docs/screenshots/03-ticket-called.jpg)

**「順番になりました！」と表示されたら：**
- 15分以内に企画場所へ向かう必要があります
- 15分以上経過すると整理券は無効になります

#### 6. LINE通知を確認
順番が来ると、LINE Official Accountから通知が届きます。

![確認メッセージ](docs/screenshots/04-line-confirmation.jpg)

![呼び出し通知](docs/screenshots/05-line-notification.jpg)

#### 7. 企画場所へ移動
通知に記載された場所へ向かいます。

---

### 📺 案内画面（スタッフ向け）

企画場所の受付に掲示するモニター用の画面です。来場者の整理券状況がリアルタイムに更新されます。

#### 企画詳細（Project）
https://seimitsu-ticket.vercel.app/guide/project

![Project詳細](docs/screenshots/09-guide-project.png)

Project企画の整理券一覧が表示されます。

#### 企画詳細（142号室）
https://seimitsu-ticket.vercel.app/guide/142

![142号室詳細](docs/screenshots/10-guide-142.png)

#### 企画詳細（146号室）
https://seimitsu-ticket.vercel.app/guide/146

![146号室詳細](docs/screenshots/11-guide-146.png)

**表示内容：**
- 企画名と場所
- 現在案内中の番号
- 待ち人数
- 待ち時間目安

---

### ⚙️ 管理画面（運営向け）

パスワード認証後、管理者が整理券の進行状況を管理します。

#### 管理画面へのアクセス
https://seimitsu-ticket.vercel.app/admin

![管理画面（せいみつスイッチ）](docs/screenshots/07-admin-switch.png)

**ログイン方法：**
- ユーザー名: `admin`
- パスワード: `.env.local` の `ADMIN_PASSWORD` の値

**機能：**
- 各企画の「次の番号を呼ぶ」ボタン
- ボタンをクリックすると自動的にLINE通知が送信される
- リアルタイムに全ページが更新される

**使い方：**
1. 管理画面にログイン
2. 呼び出したい企画の「次の番号」をクリック
3. 来場者のLINEに自動で通知が届く

---

## LINE通知メッセージ

### 整理券取得時
![整理券取得確認](docs/screenshots/04-line-confirmation.jpg)

整理券が取得できたことをユーザーに通知し、ページを再度開くためのリンクを送信します。

### 順番が来た時
![呼び出し通知](docs/screenshots/05-line-notification.jpg)

現在の番号と企画場所を通知します。15分以内に企画場所へ向かう必要があります。

### ウェルカムメッセージ
![ウェルカムメッセージ](docs/screenshots/06-line-welcome.png)

LINE Official Accountをフォローすると最初に送信される案内メッセージです。

---

## トラブルシューティング

### LINE認証がうまくいかない場合
- LINE Official Accountが正しく設定されているか確認
- `NEXT_PUBLIC_FIREBASE_*` が正しく設定されているか確認
- ブラウザのCookieをクリアして再度試す

### 管理画面にアクセスできない
- パスワードが正しく設定されているか確認（`.env.local` の `ADMIN_PASSWORD`）
- ブラウザのBasic認証キャッシュをクリアする

### 整理券番号が重複している場合
- Firestore トランザクションのタイムアウト
- Firebase コンソールで `tickets` コレクションの状態を確認
- 必要に応じて手動でリセット

---

## デプロイ

このプロジェクトは Vercel にデプロイされています。

```bash
git push origin main
```

Vercel の自動デプロイが有効になっている場合、プッシュと同時にデプロイが開始されます。

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

## 工夫した点

- **トランザクション処理** — 同時に複数人が整理券を取得しても番号が重複しないよう、Firestoreのトランザクションで排他制御を実装
- **サーバーアクション** — LINE APIのトークンをサーバー側にのみ保持し、クライアントに露出しない設計
- **リアルタイム同期** — `onSnapshot` により、ページリロード不要で待ち状況が即時反映
- **セキュリティ** — 環境変数による機密情報の管理、Basic認証による管理者ページの保護
- **モバイルファースト** — LINE LIFF専用の小画面にも対応したレスポンシブデザイン
- **視認性** — 待ち状況が一目でわかるように数字を大きく表示、色分けで状態を区別

---

## Firebase設定

### Firestoreコレクション構成

```
tickets/
├── {exhibitId}/
│   ├── currentNumber: Number (次に案内する番号)
│   └── nowServing: Number (現在案内中の番号)

users/
├── {userId}/
│   ├── exhibitId: String
│   ├── ticketNumber: Number
│   ├── timestamp: Timestamp
│   └── served: Boolean
```

### データのリセット

テストやリセット時は以下の手順を実行：
1. Firebase Console にアクセス
2. `users` コレクションを選択 → すべてのドキュメントを削除
3. `tickets` コレクションの `currentNumber` を 0 にリセット

---

## ライセンス

このプロジェクトは東京大学五月祭での使用を前提としています。

---

## 参考資料

- [Next.js公式ドキュメント](https://nextjs.org)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [LINE LIFF](https://developers.line.biz/ja/docs/liff/)
- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)
