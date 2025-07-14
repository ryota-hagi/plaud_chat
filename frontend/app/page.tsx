'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { FiSend, FiMic, FiFile, FiClock, FiMessageCircle } from 'react-icons/fi'
import { BsRobot } from 'react-icons/bs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Array<{
    id: number
    content: string
    file_path: string
    similarity: number
  }>
  metadata?: {
    searchType: string
    resultsCount: number
    processingTime: number
  }
}

interface ChatResponse {
  answer: string
  sources: Array<{
    id: number
    content: string
    file_path: string
    similarity: number
  }>
  metadata: {
    searchType: string
    resultsCount: number
    processingTime: number
  }
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'こんにちは！Plaud.aiの文字起こしデータについて何でもお聞きください。会議の内容、議事録の検索、特定のトピックについての質問など、お手伝いします。',
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchType, setSearchType] = useState<'vector' | 'hybrid'>('hybrid')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          question: input,
          searchType: searchType,
          maxResults: 5,
          threshold: 0.7
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      const response: ChatResponse = data

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources,
        metadata: response.metadata
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'エラーが発生しました。しばらく時間をおいてから再度お試しください。',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileDisplayName = (filePath: string) => {
    return filePath.split('/').pop() || filePath
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-full">
              <BsRobot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Plaud Chat</h1>
              <p className="text-sm text-gray-500">AI文字起こしアシスタント</p>
            </div>
          </div>
        </div>
      </header>

      {/* メインチャットエリア */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <div className="chat-container flex flex-col">
          {/* メッセージリスト */}
          <div className="flex-1 overflow-y-auto space-y-6 mb-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-3xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                  {/* メッセージバブル */}
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                    } fade-in`}
                  >
                    <div className="message-content text-sm leading-relaxed">
                      {message.content}
                    </div>
                    
                    {/* メタデータ */}
                    <div className="flex items-center justify-between mt-2 text-xs opacity-75">
                      <span className="flex items-center space-x-1">
                        <FiClock className="w-3 h-3" />
                        <span>{formatTime(message.timestamp)}</span>
                      </span>
                      {message.metadata && (
                        <span className="flex items-center space-x-2">
                          <span>{message.metadata.resultsCount}件の文書</span>
                          <span>{message.metadata.processingTime}ms</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ソース情報 */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-500 flex items-center space-x-1">
                        <FiFile className="w-3 h-3" />
                        <span>参考文書:</span>
                      </p>
                      {message.sources.map((source, index) => (
                        <div
                          key={source.id}
                          className="source-card bg-gray-50 border border-gray-200 rounded-lg p-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xs font-medium text-gray-700">
                                  {getFileDisplayName(source.file_path)}
                                </span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  類似度: {Math.round(source.similarity * 100)}%
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {source.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* アバター */}
                <div className={`flex-shrink-0 ${message.type === 'user' ? 'order-1 ml-3' : 'order-2 mr-3'}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {message.type === 'user' ? (
                      <FiMessageCircle className="w-4 h-4" />
                    ) : (
                      <BsRobot className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* ローディング表示 */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                    <BsRobot className="w-4 h-4" />
                  </div>
                </div>
                <div className="max-w-3xl">
                  <div className="bg-white text-gray-800 shadow-sm border border-gray-200 px-4 py-3 rounded-2xl">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full loading-dots"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full loading-dots"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full loading-dots"></div>
                      </div>
                      <span className="text-sm text-gray-500">考え中...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 入力エリア */}
          <div className="border-t border-gray-200 pt-4">
            {/* 検索タイプ選択 */}
            <div className="mb-3">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">検索タイプ:</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSearchType('hybrid')}
                    className={`text-xs px-3 py-1 rounded-full border ${
                      searchType === 'hybrid'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    ハイブリッド
                  </button>
                  <button
                    onClick={() => setSearchType('vector')}
                    className={`text-xs px-3 py-1 rounded-full border ${
                      searchType === 'vector'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    ベクトル検索
                  </button>
                </div>
              </div>
            </div>

            {/* 入力フォーム */}
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="文字起こしデータについて何でもお聞きください..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-blue-500 hover:text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <FiSend className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ヒント */}
            <div className="mt-3 text-xs text-gray-500 text-center">
              例: &quot;昨日の会議で話し合われた内容は？&quot; &quot;プロジェクトの進捗について教えて&quot;
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}