# n8n セルフホスト セットアップ

## システム要件
- Docker & Docker Compose
- メモリ: 4GB以上推奨
- CPU: 2コア以上推奨
- ディスク: 10GB以上の空き容量

## セットアップ手順

### 1. 環境変数の設定
`.env`ファイルを編集してパスワードを設定してください：

```bash
# 強力なパスワードに変更してください
N8N_BASIC_AUTH_PASSWORD=your_secure_password_here
POSTGRES_PASSWORD=n8n_secure_password_here
```

### 2. n8nの起動
```bash
# Docker Composeでサービスを起動
docker-compose up -d

# ログを確認
docker-compose logs -f n8n
```

### 3. n8nへのアクセス
ブラウザで `http://localhost:5678` にアクセスします。

**ログイン情報:**
- ユーザー名: admin
- パスワード: `.env`で設定したパスワード

### 4. Dropbox認証の設定
1. n8n管理画面の「Credentials」メニューを開く
2. 「Add Credential」→「Dropbox OAuth2 API」を選択
3. 以下の情報を入力：
   - Client ID: `zwsu5h31edsbemt`
   - Client Secret: `ybjndzz3b7mxucs`
   - Redirect URL: `http://localhost:5678/rest/oauth2-credential/callback`
4. 「Connect my account」をクリックしてDropboxと連携

## 管理コマンド

### サービスの停止
```bash
docker-compose down
```

### サービスの再起動
```bash
docker-compose restart
```

### データのバックアップ
```bash
# PostgreSQLデータをバックアップ
docker-compose exec postgres pg_dump -U n8n n8n > backup.sql

# n8nデータをバックアップ
docker run --rm -v plaud_chat_n8n-data:/data -v $(pwd):/backup alpine tar czf /backup/n8n-backup.tar.gz -C /data .
```

### アップデート
```bash
# 最新のn8nイメージを取得
docker-compose pull

# サービスを再起動
docker-compose up -d
```

## トラブルシューティング

### n8nが起動しない場合
1. Dockerログを確認: `docker-compose logs n8n`
2. PostgreSQLの接続を確認: `docker-compose logs postgres`
3. ポート5678が他のプロセスで使用されていないか確認: `lsof -i :5678`

### Dropbox接続エラー
1. App KeyとApp Secretが正しいか確認
2. Redirect URLが正確に設定されているか確認
3. Dropboxアプリが開発モードになっているか確認

### メモリ不足エラー
1. システムメモリを確認: `free -h`
2. Docker Composeでメモリ制限を調整
3. 不要なDockerコンテナを停止: `docker system prune`