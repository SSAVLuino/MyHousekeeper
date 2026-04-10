import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Scadix - Gestione Progetti e Scadenze',
  description: 'Sistema di gestione progetti, asset e scadenze',
  manifest: '/manifest.json',
  themeColor: '#ea580c',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Scadix',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple/icon-120x120.png', sizes: '120x120', type: 'image/png' },
      { url: '/apple/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/apple/icon-167x167.png', sizes: '167x167', type: 'image/png' },
      { url: '/apple/icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <head>
        {/* Meta tags aggiuntivi non gestiti da metadata object */}
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Windows Tiles */}
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileImage" content="/windows/icon-150x150.png" />
        <meta name="msapplication-TileColor" content="#ea580c" />
        
        {/* Favicon aggiuntivi */}
        <link rel="shortcut icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={inter.className}>
        {children}
        <Script src="/register-sw.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
