import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '作業提醒管理系統',
  description: '專為大學生設計的應用程式，集中管理多門課程的作業、報告與考試時間',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  )
}
