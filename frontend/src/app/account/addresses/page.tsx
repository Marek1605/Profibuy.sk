'use client'

import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'

export default function AccountAddressesPage() {
  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/account" className="hover:text-gray-800">Moj ucet</Link>
          <span>/</span>
          <span className="text-gray-800">Adresy</span>
        </div>
        <h1 className="text-2xl font-bold mb-8">Moje adresy</h1>
        <div className="text-center py-12 text-gray-500">
          <p>Zatial nemáte ulozenu ziadnu adresu.</p>
          <p className="text-sm mt-2">Adresy sa automaticky ulozia pri prvej objednavke.</p>
        </div>
      </main>
      <Footer />
    </>
  )
}
