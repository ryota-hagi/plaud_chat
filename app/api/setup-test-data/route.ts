import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST() {
  try {
    console.log('Setting up test data with real embeddings...')

    // Test content
    const testContent = '会議の議事録です。プロジェクトの進捗について話し合いました。開発は順調に進んでいます。来月リリース予定です。予算も適切に管理されています。'

    // Generate embedding for test content
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: testContent,
      }),
    })

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate embedding')
    }

    const embeddingData = await embeddingResponse.json()
    const embedding = embeddingData.data[0].embedding

    // First, ensure document exists
    const { data: docResult, error: docError } = await supabase.rpc('upsert_document', {
      p_file_path: '/test-meeting.md',
      p_content: testContent,
      p_metadata: { fileName: 'test-meeting.md', type: 'test' }
    })

    if (docError) {
      console.error('Document upsert error:', docError)
      return NextResponse.json({ error: 'Failed to upsert document', details: docError }, { status: 500 })
    }

    const documentId = docResult[0].id

    // Clear existing chunks
    await supabase.rpc('clear_document_chunks', { p_document_id: documentId })

    // Insert chunk with real embedding
    const { data: chunkResult, error: chunkError } = await supabase
      .from('document_chunks')
      .insert({
        document_id: documentId,
        chunk_index: 0,
        content: testContent,
        embedding: `[${embedding.join(',')}]`
      })
      .select()

    if (chunkError) {
      console.error('Chunk insert error:', chunkError)
      return NextResponse.json({ error: 'Failed to insert chunk', details: chunkError }, { status: 500 })
    }

    // Test search immediately
    const { data: searchResult, error: searchError } = await supabase.rpc('search_documents', {
      query_embedding: `[${embedding.join(',')}]`,
      match_threshold: 0.9,
      match_count: 5,
    })

    if (searchError) {
      console.error('Search test error:', searchError)
    }

    return NextResponse.json({
      success: true,
      documentId,
      chunkResult,
      searchTest: {
        found: searchResult?.length || 0,
        results: searchResult || [],
        error: searchError
      }
    })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({
      error: 'Setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}