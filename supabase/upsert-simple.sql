-- n8nの順序に合わせた簡単なUPSERT関数
CREATE OR REPLACE FUNCTION upsert_document(
  content TEXT,
  file_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  doc_id BIGINT;
  existing_id BIGINT;
BEGIN
  -- 既存ドキュメントを確認
  SELECT id INTO existing_id FROM documents WHERE documents.file_path = upsert_document.file_path;
  
  IF existing_id IS NULL THEN
    -- 新規挿入
    INSERT INTO documents (file_path, content, metadata)
    VALUES (upsert_document.file_path, upsert_document.content, upsert_document.metadata)
    RETURNING id INTO doc_id;
    
    RETURN json_build_object(
      'id', doc_id,
      'file_path', upsert_document.file_path,
      'is_new', true
    );
  ELSE
    -- 既存更新
    UPDATE documents 
    SET content = upsert_document.content, 
        metadata = upsert_document.metadata,
        updated_at = NOW()
    WHERE id = existing_id;
    
    RETURN json_build_object(
      'id', existing_id,
      'file_path', upsert_document.file_path,
      'is_new', false
    );
  END IF;
END;
$$;