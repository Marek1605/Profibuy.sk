import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ProfiBuy.sk - Vas online obchod',
  description: 'Nakupujte kvalitne produkty za skvele ceny',
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
