import type { Metadata, Viewport } from 'next'
import './globals.css'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  let siteTitle = '设计作品集'
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } })
    if (settings?.siteTitle) siteTitle = settings.siteTitle
  } catch {}

  return {
    title: siteTitle,
    description: '高端平面设计作品展示',
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: siteTitle,
    },
    icons: {
      icon: [
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let siteTitle = '设计作品集'
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } })
    if (settings?.siteTitle) siteTitle = settings.siteTitle
  } catch {}

  return (
    <html lang="zh">
      <head>
        <meta name="theme-color" content="#1a1a1a" />
      </head>
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
