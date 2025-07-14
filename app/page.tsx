'use client'

import { useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'こんにちは！Plaud.aiのデータについて何でもお聞きください。'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
        let errorMessage = 'エラーが発生しました。'
        
        if (response.status === 404) {
          errorMessage = '申し訳ございません。お探しの情報に関連するデータが見つかりませんでした。別の質問をお試しください。'
        } else if (response.status === 503) {
          errorMessage = 'AI サービスに接続できませんでした。しばらく待ってから再度お試しください。'
        } else if (response.status === 500) {
          errorMessage = 'データベースの処理でエラーが発生しました。管理者にお問い合わせください。'
        }
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `${errorMessage}\n\n詳細: ${errorData.details || 'なし'}` 
        }])
        return
      }

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'ネットワークエラーが発生しました。インターネット接続を確認してから再度お試しください。' 
      }])
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

  return (
    <div className="container">
      <div className="header">
        <h1>Plaud Chat</h1>
        <p>Plaud.aiのデータを活用したAIチャットボット</p>
      </div>
      
      <div className="chat-container">
        <div className="messages">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              {message.content}
            </div>
          ))}
          {isLoading && (
            <div className="message assistant">
              <div className="loading">回答を生成中</div>
            </div>
          )}
        </div>
        
        <div className="input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="質問を入力してください..."
            disabled={isLoading}
          />
          <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
            送信
          </button>
        </div>
      </div>
    </div>
  )
}