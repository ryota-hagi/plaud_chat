-- pgvector拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- ドキュメント保存用テーブル
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  file_path TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- チャンク保存用テーブル
CREATE TABLE document_chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI ada-002 embeddings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, chunk_index)
);

-- ベクトル検索用インデックス（HNSW使用、より高速）
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- テキスト検索用インデックス
CREATE INDEX IF NOT EXISTS documents_content_idx 
ON documents 
USING gin(to_tsvector('simple', content));

CREATE INDEX IF NOT EXISTS document_chunks_content_idx 
ON document_chunks 
USING gin(to_tsvector('simple', content));

-- ファイルパス検索用インデックス
CREATE INDEX IF NOT EXISTS documents_file_path_idx 
ON documents(file_path);

-- 更新日時でのソート用インデックス
CREATE INDEX IF NOT EXISTS documents_updated_at_idx 
ON documents(updated_at DESC);

-- ベクトル検索関数
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  document_id BIGINT,
  content TEXT,
  similarity FLOAT,
  file_path TEXT,
  metadata JSONB
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    d.file_path,
    d.metadata
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ハイブリッド検索関数（ベクトル + テキスト検索）
CREATE OR REPLACE FUNCTION hybrid_search_documents(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  document_id BIGINT,
  content TEXT,
  similarity FLOAT,
  text_rank FLOAT,
  combined_score FLOAT,
  file_path TEXT,
  metadata JSONB
)
LANGUAGE SQL STABLE
AS $$
  WITH vector_search AS (
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      1 - (dc.embedding <=> query_embedding) AS similarity,
      d.file_path,
      d.metadata
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ),
  text_search AS (
    SELECT
      dc.id,
      ts_rank_cd(to_tsvector('simple', dc.content), plainto_tsquery('simple', query_text)) AS text_rank
    FROM document_chunks dc
    WHERE to_tsvector('simple', dc.content) @@ plainto_tsquery('simple', query_text)
  )
  SELECT
    vs.id,
    vs.document_id,
    vs.content,
    vs.similarity,
    COALESCE(ts.text_rank, 0) AS text_rank,
    (vs.similarity * 0.7 + COALESCE(ts.text_rank, 0) * 0.3) AS combined_score,
    vs.file_path,
    vs.metadata
  FROM vector_search vs
  LEFT JOIN text_search ts ON vs.id = ts.id
  ORDER BY combined_score DESC
  LIMIT match_count;
$$;

-- 文書の更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at 
BEFORE UPDATE ON documents 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 統計情報取得用ビュー
CREATE OR REPLACE VIEW document_stats AS
SELECT
  COUNT(DISTINCT d.id) AS total_documents,
  COUNT(dc.id) AS total_chunks,
  AVG(LENGTH(d.content)) AS avg_document_length,
  AVG(LENGTH(dc.content)) AS avg_chunk_length,
  MAX(d.updated_at) AS last_updated
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id;

-- RLS (Row Level Security) の設定
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- 認証されたユーザーのみがデータにアクセス可能
CREATE POLICY "Enable read access for authenticated users" ON documents
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON document_chunks
FOR SELECT USING (auth.role() = 'authenticated');

-- サービスロールは全てのアクセスが可能
CREATE POLICY "Enable all access for service role" ON documents
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all access for service role" ON document_chunks
FOR ALL USING (auth.role() = 'service_role');