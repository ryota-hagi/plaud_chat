import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // OpenAI API for embedding
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: message,
      }),
    })

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate embedding')
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding

    // Search similar documents
    const { data: documents, error: searchError } = await supabase.rpc('search_documents', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_threshold: 0.7,
      match_count: 5,
    })

    if (searchError) {
      console.error('Search error:', searchError)
      return NextResponse.json(
        { error: 'Failed to search documents' },
        { status: 500 }
      )
    }

    // Prepare context
    console.log('Search results:', documents)
    const context = documents?.map((doc: any) => doc.content).join('\n\n') || ''
    console.log('Context length:', context.length)
    console.log('Context preview:', context.substring(0, 200))

    // Generate response with ChatGPT
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `あなたはPlaud.aiのデータに基づいて質問に答えるAIアシスタントです。以下のコンテキストを参考にして、正確で分かりやすい回答を日本語で提供してください。

コンテキスト:
${context}

もしコンテキストに関連する情報がない場合は、「申し訳ございませんが、その情報は現在利用可能なデータに含まれていません」と回答してください。`
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    if (!chatResponse.ok) {
      throw new Error('Failed to generate chat response')
    }

    const chatData = await chatResponse.json()
    const response = chatData.choices[0].message.content

    return NextResponse.json({ response })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}