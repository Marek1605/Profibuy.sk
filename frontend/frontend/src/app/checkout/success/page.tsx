'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'

export default function CheckoutSuccessPage() {
  return <Suspense fallback={<div className="p-8 text-center">Nacitavam...</div>}><SuccessContent /></Suspense>
}

function SuccessContent() {
  const params = useSearchParams()
  const orderNumber = params.get('order')

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-6">✅</div>
        <h1 className="text-3xl font-bold mb-4">Dakujeme za objednavku!</h1>
        {orderNumber && <p className="text-lg text-gray-600 mb-2">Cislo objednavky: <strong>{orderNumber}</strong></p>}
        <p className="text-gray-600 mb-8">Na vas email sme odoslali potvrdenie objednavky s podrobnostami.</p>
        <div className="flex gap-4 justify-center">
          <Link href="/products" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Pokracovat v nakupovani</Link>
          <Link href="/account/orders" className="px-6 py-3 border rounded-lg hover:bg-gray-50 font-medium">Moje objednavky</Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
