import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://deno.land/x/openai@v4.24.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ChatRequest {
  question: string;
  searchType?: 'vector' | 'hybrid';
  maxResults?: number;
  threshold?: number;
}

interface ChatResponse {
  answer: string;
  sources: Array<{
    id: number;
    content: string;
    file_path: string;
    similarity: number;
  }>;
  metadata: {
    searchType: string;
    resultsCount: number;
    processingTime: number;
  };
}

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { 
      question, 
      searchType = 'hybrid',
      maxResults = 5,
      threshold = 0.7 
    }: ChatRequest = await req.json();

    if (!question || question.trim().length === 0) {
      throw new Error('質問が入力されていません');
    }

    console.log(`質問を受信: ${question}`);

    // 質問の埋め込みベクトルを生成
    const embedding = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: question.trim(),
    });

    const queryEmbedding = embedding.data[0].embedding;
    console.log('埋め込みベクトルを生成しました');

    // 検索タイプに応じて関数を選択
    let searchResults;
    if (searchType === 'hybrid') {
      const { data } = await supabase.rpc('hybrid_search_documents', {
        query_text: question.trim(),
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: maxResults
      });
      searchResults = data;
    } else {
      const { data } = await supabase.rpc('search_documents', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: maxResults
      });
      searchResults = data;
    }

    console.log(`${searchResults?.length || 0}件の関連文書を見つけました`);

    if (!searchResults || searchResults.length === 0) {
      return new Response(
        JSON.stringify({
          answer: "申し訳ございませんが、お探しの情報に関連する文書が見つかりませんでした。別の質問をお試しください。",
          sources: [],
          metadata: {
            searchType,
            resultsCount: 0,
            processingTime: Date.now() - startTime
          }
        } as ChatResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // コンテキストを作成（文書の内容を結合）
    const context = searchResults
      .map((doc, index) => `[文書${index + 1}: ${doc.file_path}]\n${doc.content}`)
      .join('\n\n---\n\n');

    // ChatGPTに回答を生成させる
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `あなたはPlaud.aiから取得された文字起こしデータを基に質問に答えるアシスタントです。

以下のルールに従って回答してください：
1. 提供されたコンテキスト情報のみを使用して回答する
2. コンテキストに含まれない情報については「提供された情報からは分かりません」と答える
3. 回答は簡潔で分かりやすく、日本語で行う
4. 参照した文書がある場合は、回答の最後に「参考: [文書名]」を含める
5. 不正確な推測や憶測は避ける

コンテキスト情報:
${context}`
        },
        {
          role: "user",
          content: question
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0
    });

    const answer = completion.choices[0].message.content || "回答を生成できませんでした。";
    
    console.log('ChatGPTから回答を取得しました');

    // レスポンスを整形
    const sources = searchResults.map(doc => ({
      id: doc.id,
      content: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
      file_path: doc.file_path,
      similarity: Math.round(doc.similarity * 100) / 100
    }));

    const response: ChatResponse = {
      answer,
      sources,
      metadata: {
        searchType,
        resultsCount: searchResults.length,
        processingTime: Date.now() - startTime
      }
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('エラーが発生しました:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || '内部サーバーエラーが発生しました',
        answer: "申し訳ございませんが、現在システムにエラーが発生しています。しばらく時間をおいてから再度お試しください。",
        sources: [],
        metadata: {
          searchType: 'error',
          resultsCount: 0,
          processingTime: 0
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});