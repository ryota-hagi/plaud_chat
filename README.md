# Plaud Chat - AI文字起こしチャットボット

Plaud.aiから取得した文字起こしデータを活用して、質問応答が可能なAIチャットボットシステムです。

## システム概要

- **データソース**: Dropbox内のPlaud.ai文字起こしmdファイル
- **検索技術**: RAG (Retrieval-Augmented Generation) + pgvector
- **自動化**: n8nによるファイル監視・データ更新
- **フロントエンド**: Next.js + Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL + Edge Functions)

## アーキテクチャ

```
Dropbox (mdファイル) 
    ↓ (15分ごと監視)
n8n (セルフホスト)
    ↓ (チャンク分割・埋め込み生成)
Supabase (pgvector DB + Edge Functions)
    ↓ (API)
Next.js フロントエンド
```

## セットアップ手順

### 1. n8nセルフホストの起動

```bash
# 環境変数を設定
cp .env.example .env
# .envファイルを編集してパスワードを設定

# Docker Composeで起動
docker-compose up -d

# ログを確認
docker-compose logs -f n8n
```

n8nに `http://localhost:5678` でアクセスし、Dropbox認証を設定します。

### 2. Supabaseプロジェクトの設定

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. SQL Editorで `supabase/setup.sql` を実行
3. Edge Functionをデプロイ:
   ```bash
   cd supabase/functions/chat
   supabase functions deploy chat
   ```

### 3. n8nワークフローのインポート

1. n8n管理画面でワークフローをインポート
2. `n8n-workflow.json` の内容をコピーして貼り付け
3. 必要な認証情報を設定:
   - Dropbox OAuth2
   - Supabase (URL + Service Role Key)
   - OpenAI API Key

### 4. フロントエンドのデプロイ

```bash
cd frontend

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.local.example .env.local
# .env.localにSupabaseの情報を記入

# 開発サーバーで確認
npm run dev

# Vercelにデプロイ
npx vercel
```

## 必要なアカウント・APIキー

- [Supabase](https://supabase.com) - 無料プラン
- [OpenAI API](https://platform.openai.com) - text-embedding-ada-002 & gpt-3.5-turbo
- [Dropbox App](https://www.dropbox.com/developers) - OAuth2アプリ
- [Vercel](https://vercel.com) - フロントエンドデプロイ（無料プラン）

## 月額コスト見積もり

- **n8n**: $0 (セルフホスト)
- **Supabase**: $0 (無料プラン: 500MB DB, 2GB帯域幅)
- **OpenAI API**: $5-20 (使用量次第)
- **Vercel**: $0 (Hobbyプラン)

**合計: 月額 $5-20**

## 主な機能

### チャットボット機能
- 自然言語での質問応答
- ハイブリッド検索（ベクトル + テキスト検索）
- ソース文書の表示
- リアルタイム応答

### データ管理
- mdファイルの自動取り込み
- チャンク分割・埋め込み生成
- 増分更新（変更されたファイルのみ処理）
- 日本語最適化

### 監視・運用
- 15分ごとの自動同期
- エラーハンドリング
- ログ記録
- パフォーマンス統計

## トラブルシューティング

### n8nが起動しない
```bash
# ログを確認
docker-compose logs n8n postgres redis

# ポート確認
lsof -i :5678

# 権限確認
docker-compose down && docker-compose up -d
```

### Dropbox認証エラー
1. App Key/Secretが正しいか確認
2. Redirect URLが `http://localhost:5678/rest/oauth2-credential/callback` に設定されているか確認
3. Dropboxアプリが開発モードになっているか確認

### 検索結果が表示されない
1. OpenAI API制限を確認
2. Supabaseの使用量を確認
3. pgvectorインデックスが正しく作成されているか確認

### フロントエンドが動作しない
1. 環境変数が正しく設定されているか確認
2. Supabase Edge Functionがデプロイされているか確認
3. CORS設定を確認

## 開発・カスタマイズ

### チャンクサイズの調整
`n8n-workflow.json`の`Process Text Content`ノードで調整:
```javascript
const CHUNK_SIZE = 1000;      // チャンクサイズ
const OVERLAP_SIZE = 200;     // オーバーラップサイズ
```

### 検索精度の向上
`supabase/setup.sql`の検索関数を調整:
```sql
-- 類似度閾値の調整
match_threshold FLOAT DEFAULT 0.7

-- ハイブリッド検索の重みづけ調整
(vs.similarity * 0.7 + COALESCE(ts.text_rank, 0) * 0.3)
```

### UIのカスタマイズ
`frontend/app/page.tsx`と`frontend/app/globals.css`でUIを調整可能。

## ライセンス

MIT License

## サポート

問題が発生した場合は、各サービスのドキュメントを参照してください:
- [n8n Documentation](https://docs.n8n.io/)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)