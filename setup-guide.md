# セットアップガイド

## 初回セットアップの流れ

### ステップ1: Dropboxアプリの設定確認

✅ **既に完了済み**
- App Key: `zwsu5h31edsbemt`
- App Secret: `ybjndzz3b7mxucs`
- Permission: Scoped App (App Folder)
- Folder: `/Apps/Plaud_chat/`

**追加で必要な設定:**
1. Dropbox Developer Console で Redirect URI を追加:
   ```
   http://localhost:5678/rest/oauth2-credential/callback
   ```

### ステップ2: n8nの起動

```bash
# リポジトリのルートディレクトリで実行
cd /Users/hagiryouta/plaud_chat

# 環境変数ファイルを編集
nano .env
# 以下のパスワードを強力なものに変更してください:
# N8N_BASIC_AUTH_PASSWORD=your_secure_password_here
# POSTGRES_PASSWORD=n8n_secure_password_here

# Docker Composeで起動
docker-compose up -d

# 起動確認
docker-compose ps
docker-compose logs -f n8n
```

**n8nへのアクセス:**
- URL: http://localhost:5678
- ユーザー名: admin
- パスワード: `.env`で設定したパスワード

### ステップ3: Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) にサインアップ/ログイン
2. 「New Project」をクリック
3. プロジェクト名: `plaud-chat`
4. データベースパスワードを設定
5. リージョンを選択（Japan東京推奨）

**データベースの初期化:**
1. Supabase Dashboard → SQL Editor
2. `supabase/setup.sql`の内容をコピーして実行
3. 成功メッセージを確認

**Edge Functionのデプロイ:**
```bash
# Supabase CLIをインストール
npm install -g supabase

# プロジェクトと連携
cd supabase
supabase init
supabase link --project-ref YOUR_PROJECT_REF

# Edge Functionをデプロイ
supabase functions deploy chat --project-ref YOUR_PROJECT_REF
```

### ステップ4: OpenAI APIキーの取得

1. [OpenAI Platform](https://platform.openai.com) にログイン
2. API Keys → Create new secret key
3. キーをコピーして保存

### ステップ5: n8nでの認証設定

1. n8n (http://localhost:5678) にログイン
2. **Dropbox認証の設定:**
   - 左メニュー → Credentials
   - Add Credential → Dropbox OAuth2 API
   - Client ID: `zwsu5h31edsbemt`
   - Client Secret: `ybjndzz3b7mxucs`
   - 「Connect my account」をクリックしてDropboxで認証

3. **変数の設定:**
   - 左メニュー → Settings → Variables
   - 以下の変数を追加:
     ```
     SUPABASE_URL: https://YOUR_PROJECT_REF.supabase.co
     SUPABASE_SERVICE_ROLE_KEY: YOUR_SERVICE_ROLE_KEY
     OPENAI_API_KEY: YOUR_OPENAI_API_KEY
     ```

### ステップ6: ワークフローのインポート

1. n8n → Workflows → Import from JSON
2. `n8n-workflow.json`の内容をコピーして貼り付け
3. 「Import」をクリック
4. 「Activate」をクリックして有効化

### ステップ7: フロントエンドのセットアップ

```bash
cd frontend

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.local.example .env.local
nano .env.local
```

**.env.local の設定:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

**開発サーバーの起動:**
```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセス

### ステップ8: 動作テスト

1. **Dropboxにテストファイル配置:**
   - Dropboxの `/Apps/Plaud_chat/` フォルダに `.md` ファイルを配置

2. **n8nワークフローの手動実行:**
   - n8n → Workflows → 「Dropbox to Supabase RAG Pipeline」
   - 「Execute Workflow」をクリック

3. **チャットボットのテスト:**
   - フロントエンド (http://localhost:3000) で質問を送信
   - 応答が返ってくることを確認

### ステップ9: Vercelへのデプロイ（本番環境）

```bash
cd frontend

# Vercelにログイン
npx vercel login

# デプロイ
npx vercel

# 環境変数を設定
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# 再デプロイ
npx vercel --prod
```

## よくある問題と解決方法

### n8nにアクセスできない
- Dockerコンテナが起動しているか確認: `docker-compose ps`
- ポート5678が他で使用されていないか確認: `lsof -i :5678`
- ファイアウォールの設定を確認

### Dropbox認証が失敗する
- Redirect URLが正確に設定されているか確認
- App Key/App Secretが正しいか確認
- Dropboxアプリが開発モードになっているか確認

### ワークフローでエラーが発生する
- OpenAI API制限を確認
- Supabaseの接続情報を確認
- n8nの変数設定を確認

### フロントエンドでチャットが動作しない
- Supabase Edge Functionがデプロイされているか確認
- 環境変数が正しく設定されているか確認
- ブラウザの開発者ツールでエラーを確認

### データが更新されない
- n8nワークフローが有効化されているか確認
- Dropboxフォルダにmdファイルが正しく配置されているか確認
- n8nの実行ログを確認

## セキュリティ確認事項

- [ ] 全てのパスワードを強力なものに変更済み
- [ ] OpenAI APIキーが安全に管理されている
- [ ] Supabase Service Role Keyが適切に設定されている
- [ ] n8nが外部からアクセスできない設定になっている（本番環境では要検討）

## 完了チェックリスト

- [ ] Dropboxアプリ設定完了
- [ ] n8n起動・ログイン成功
- [ ] Supabaseプロジェクト作成・DB初期化完了
- [ ] OpenAI APIキー取得完了
- [ ] n8n認証設定完了
- [ ] ワークフローインポート・有効化完了
- [ ] フロントエンド起動成功
- [ ] 動作テスト完了
- [ ] 本番環境デプロイ完了（オプション）

すべて完了すれば、Plaud.aiの文字起こしデータを活用したAIチャットボットが稼働開始します！