import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Plaud Chat - AI文字起こしチャットボット',
  description: 'Plaud.aiの文字起こしデータを活用したAIチャットボット',
  keywords: ['AI', 'チャットボット', '文字起こし', 'Plaud.ai'],
  authors: [{ name: 'Plaud Chat Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          {children}
        </div>
      </body>
    </html>
  )
}