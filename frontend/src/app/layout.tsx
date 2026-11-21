import type { Metadata } from 'next'
import './globals.css'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'BFTM Radar — Mandiri Lead Finder',
  description: 'Hyperlocal lead discovery tool for Bank Mandiri field officers',
}

export function generateViewport() {
  return { themeColor: '#f7f8fa' }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={cn("font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  )
}
