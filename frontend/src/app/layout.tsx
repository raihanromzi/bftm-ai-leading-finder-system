import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BFTM Radar — Mandiri Lead Finder',
  description: 'Hyperlocal lead discovery tool for Bank Mandiri field officers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
