'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import ProductCard from '@/components/shop/ProductCard'
import { searchProducts } from '@/lib/api'
import type { Product } from '@/types'

export default function SearchPage() {
  return <Suspense fallback={<div className="p-8 text-center">Nacitavam...</div>}><SearchContent /></Suspense>
}

function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query) return
    async function search() {
      setLoading(true)
      try {
        const data = await searchProducts(query)
        setProducts(data.items || [])
        setTotal(data.total)
      } catch { setProducts([]) }
      setLoading(false)
    }
    search()
  }, [query])

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Vysledky hladania</h1>
        {query && <p className="text-gray-600 mb-6">Pre &quot;{query}&quot; - {total} vysledkov</p>}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-72" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-xl mb-2">Ziadne vysledky</p>
            <p className="mb-4">Skuste zmenit hladany vyraz</p>
            <Link href="/products" className="text-blue-600 hover:underline">Prezerať vsetky produkty</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
