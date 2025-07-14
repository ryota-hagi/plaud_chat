import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    console.log('Testing API...')
    console.log('Supabase URL:', supabaseUrl)
    console.log('OpenAI Key exists:', !!process.env.OPENAI_API_KEY)
    console.log('Service Role Key exists:', !!supabaseKey)

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Missing environment variables',
        details: {
          supabaseUrl: !!supabaseUrl,
          serviceKey: !!supabaseKey,
          openaiKey: !!process.env.OPENAI_API_KEY
        }
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Test database connection
    const { data: documents, error: dbError } = await supabase
      .from('documents')
      .select('id, file_path, content')
      .limit(5)

    if (dbError) {
      return NextResponse.json({
        error: 'Database error',
        details: dbError
      }, { status: 500 })
    }

    // Test document_chunks
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('id, document_id, content')
      .limit(3)

    if (chunksError) {
      return NextResponse.json({
        error: 'Chunks error',
        details: chunksError
      }, { status: 500 })
    }

    // Test OpenAI
    let openaiTest = 'Not tested'
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      })
      openaiTest = response.ok ? 'Connected' : `Error: ${response.status}`
    } catch (error) {
      openaiTest = `Fetch error: ${error}`
    }

    return NextResponse.json({
      status: 'success',
      environment: {
        supabaseUrl: supabaseUrl,
        hasServiceKey: !!supabaseKey,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY
      },
      database: {
        documentsCount: documents?.length || 0,
        documents: documents || [],
        chunksCount: chunks?.length || 0,
        chunks: chunks || []
      },
      openai: openaiTest
    })

  } catch (error) {
    console.error('Test API Error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}