import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ProfiBuy.net - Váš online obchod',
  description: 'Nakupujte kvalitné produkty za skvelé ceny',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sk">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
