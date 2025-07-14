-- テストデータの挿入
INSERT INTO documents (file_path, content, metadata) VALUES 
(
  '/test-meeting.md',
  'これは会議の議事録です。今日の会議では以下の内容について話し合いました：

1. プロジェクトの進捗状況
- 開発は順調に進んでいます
- 予定通り来月リリース予定です

2. 予算について
- 現在の予算は適切に管理されています
- 追加費用は発生していません

3. 次回のミーティング
- 来週の金曜日に次回会議を開催します
- 場所は会議室Aです',
  '{"fileName": "test-meeting.md", "fileSize": 200, "wordCount": 50, "processedAt": "2025-07-14T13:15:00Z"}'
),
(
  '/product-specs.md', 
  'プロダクト仕様書

# 機能概要
本プロダクトは以下の機能を提供します：

## 主な機能
1. ユーザー認証システム
2. データ管理機能
3. レポート生成機能
4. 通知システム

## 技術仕様
- フロントエンド: React
- バックエンド: Node.js
- データベース: PostgreSQL
- 認証: JWT

## セキュリティ
- HTTPS通信必須
- パスワードハッシュ化
- セッション管理',
  '{"fileName": "product-specs.md", "fileSize": 300, "wordCount": 80, "processedAt": "2025-07-14T13:15:00Z"}'
)
ON CONFLICT (file_path) DO NOTHING;