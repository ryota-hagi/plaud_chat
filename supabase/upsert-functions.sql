-- 堅牢なUPSERT関数群
-- 重複エラーを完全に回避し、新規・更新両方に対応

-- 1. ドキュメントのUPSERT関数
CREATE OR REPLACE FUNCTION upsert_document(
  p_file_path TEXT,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  id BIGINT, 
  file_path TEXT, 
  content TEXT, 
  metadata JSONB, 
  created_at TIMESTAMPTZ, 
  updated_at TIMESTAMPTZ,
  is_new BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  existing_doc RECORD;
  doc_id BIGINT;
  is_new_record BOOLEAN := false;
BEGIN
  -- 既存ドキュメントの確認
  SELECT d.id, d.updated_at INTO existing_doc
  FROM documents d 
  WHERE d.file_path = p_file_path;
  
  IF existing_doc.id IS NULL THEN
    -- 新規挿入
    INSERT INTO documents (file_path, content, metadata)
    VALUES (p_file_path, p_content, p_metadata)
    RETURNING documents.id INTO doc_id;
    is_new_record := true;
  ELSE
    -- 既存レコードの更新
    UPDATE documents 
    SET 
      content = p_content,
      metadata = p_metadata,
      updated_at = NOW()
    WHERE documents.id = existing_doc.id
    RETURNING documents.id INTO doc_id;
  END IF;
  
  -- 結果を返す
  RETURN QUERY
  SELECT 
    d.id,
    d.file_path,
    d.content,
    d.metadata,
    d.created_at,
    d.updated_at,
    is_new_record as is_new
  FROM documents d
  WHERE d.id = doc_id;
END;
$$;

-- 2. ドキュメントチャンクのUPSERT関数
CREATE OR REPLACE FUNCTION upsert_document_chunk(
  p_document_id BIGINT,
  p_chunk_index INT,
  p_content TEXT,
  p_embedding VECTOR(1536)
)
RETURNS TABLE(
  id BIGINT,
  document_id BIGINT,
  chunk_index INT,
  content TEXT,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO document_chunks (document_id, chunk_index, content, embedding)
  VALUES (p_document_id, p_chunk_index, p_content, p_embedding)
  ON CONFLICT (document_id, chunk_index) 
  DO UPDATE SET 
    content = EXCLUDED.content,
    embedding = EXCLUDED.embedding
  RETURNING 
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.chunk_index,
    document_chunks.content,
    document_chunks.embedding,
    document_chunks.created_at;
END;
$$;

-- 3. ドキュメント存在チェック関数
CREATE OR REPLACE FUNCTION check_document_exists(
  p_file_path TEXT
)
RETURNS TABLE(
  exists BOOLEAN,
  id BIGINT,
  updated_at TIMESTAMPTZ,
  needs_update BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  doc_record RECORD;
BEGIN
  SELECT d.id, d.updated_at INTO doc_record
  FROM documents d 
  WHERE d.file_path = p_file_path;
  
  IF doc_record.id IS NULL THEN
    -- ドキュメントが存在しない
    RETURN QUERY SELECT false, null::bigint, null::timestamptz, true;
  ELSE
    -- ドキュメントが存在する
    RETURN QUERY SELECT true, doc_record.id, doc_record.updated_at, false;
  END IF;
END;
$$;

-- 4. 一括チャンク削除関数（既存チャンクをクリア）
CREATE OR REPLACE FUNCTION clear_document_chunks(
  p_document_id BIGINT
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM document_chunks 
  WHERE document_id = p_document_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 5. ファイル一覧取得関数（処理対象の確認用）
CREATE OR REPLACE FUNCTION get_document_list()
RETURNS TABLE(
  id BIGINT,
  file_path TEXT,
  chunk_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    d.id,
    d.file_path,
    COUNT(dc.id) as chunk_count,
    d.created_at,
    d.updated_at
  FROM documents d
  LEFT JOIN document_chunks dc ON d.id = dc.document_id
  GROUP BY d.id, d.file_path, d.created_at, d.updated_at
  ORDER BY d.updated_at DESC;
$$;

-- 6. システム統計取得関数
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE(
  total_documents BIGINT,
  total_chunks BIGINT,
  avg_chunks_per_document NUMERIC,
  last_updated TIMESTAMPTZ,
  oldest_document TIMESTAMPTZ
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    COUNT(DISTINCT d.id) as total_documents,
    COUNT(dc.id) as total_chunks,
    CASE 
      WHEN COUNT(DISTINCT d.id) > 0 
      THEN ROUND(COUNT(dc.id)::numeric / COUNT(DISTINCT d.id), 2)
      ELSE 0
    END as avg_chunks_per_document,
    MAX(d.updated_at) as last_updated,
    MIN(d.created_at) as oldest_document
  FROM documents d
  LEFT JOIN document_chunks dc ON d.id = dc.document_id;
$$;