-- 既存の関数を削除してから新しい関数を作成
DROP FUNCTION IF EXISTS search_documents(vector, double precision, integer);

-- ベクター検索関数（修正版）
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id bigint,
  content text,
  file_path text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.document_id as id,
    dc.content,
    d.file_path,
    d.metadata,
    (dc.embedding <=> query_embedding) * -1 + 1 as similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE dc.embedding <=> query_embedding < (1 - match_threshold)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;