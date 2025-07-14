import './globals.css'

export const metadata = {
  title: 'Plaud Chat - AIチャットボット',
  description: 'Plaud.aiのデータを活用したAIチャットボット',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}