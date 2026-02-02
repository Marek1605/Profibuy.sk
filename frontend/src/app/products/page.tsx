'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import ProductCard from '@/components/shop/ProductCard'
import { getProducts, getFilters } from '@/lib/api'
import type { Product, FilterOptions } from '@/types'

export default function ProductsPage() {
  return <Suspense fallback={<div className="p-8 text-center">Nacitavam...</div>}><ProductsContent /></Suspense>
}

function ProductsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filters, setFilters] = useState<FilterOptions | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const page = Number(searchParams.get('page') || '1')
  const sort = searchParams.get('sort') || 'newest'
  const minPrice = searchParams.get('price_min') || ''
  const maxPrice = searchParams.get('price_max') || ''
  const inStock = searchParams.get('in_stock') === 'true'
  const onSale = searchParams.get('on_sale') === 'true'

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', '24')
        params.set('sort', sort)
        if (minPrice) params.set('price_min', minPrice)
        if (maxPrice) params.set('price_max', maxPrice)
        if (inStock) params.set('in_stock', 'true')
        if (onSale) params.set('on_sale', 'true')
        const data = await getProducts(params)
        setProducts(data.items || [])
        setTotal(data.total)
        setTotalPages(data.total_pages)
      } catch { setProducts([]) }
      try { const f = await getFilters(); setFilters(f) } catch {}
      setLoading(false)
    }
    load()
  }, [page, sort, minPrice, maxPrice, inStock, onSale])

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.set('page', '1')
    router.push(`/products?${params.toString()}`)
  }

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-gray-800 transition">Domov</Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-800 font-medium">Produkty</span>
          </nav>

          <div className="flex gap-6">
            {/* Filters sidebar */}
            <aside className={`w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden'} lg:block`}>
              <div className="bg-white rounded-2xl border p-5 sticky top-32">
                <h2 className="font-bold text-base mb-5 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  Filtre
                </h2>

                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Cena (EUR)</h3>
                  <div className="flex gap-2 items-center">
                    <input type="number" placeholder="Od" value={minPrice} onChange={(e) => updateFilter('price_min', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    <span className="text-gray-400">-</span>
                    <input type="number" placeholder="Do" value={maxPrice} onChange={(e) => updateFilter('price_max', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                </div>

                <div className="mb-5 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={inStock} onChange={(e) => updateFilter('in_stock', e.target.checked ? 'true' : '')} className="rounded border-gray-300" />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">Len skladom</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={onSale} onChange={(e) => updateFilter('on_sale', e.target.checked ? 'true' : '')} className="rounded border-gray-300" />
                    <span className="text-sm text-red-600 group-hover:text-red-700 font-medium">🔥 Vo vypredaji</span>
                  </label>
                </div>

                {filters?.brands && filters.brands.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Znacky</h3>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {filters.brands.slice(0, 15).map(b => (
                        <label key={b.id} className="flex items-center gap-2 cursor-pointer text-sm py-0.5 hover:text-gray-900">
                          <input type="checkbox" className="rounded border-gray-300" />
                          <span>{b.name}</span>
                          <span className="text-gray-400 text-xs ml-auto">({b.count})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* Products area */}
            <div className="flex-1">
              {/* Sort bar */}
              <div className="bg-white rounded-2xl border p-4 mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowFilters(!showFilters)} className="lg:hidden p-2 rounded-lg border hover:bg-gray-50">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  </button>
                  <span className="text-sm text-gray-500">
                    Zobrazenych <strong className="text-gray-800">{products.length}</strong> z <strong className="text-gray-800">{total}</strong> vysledkov
                  </span>
                </div>
                <select value={sort} onChange={(e) => updateFilter('sort', e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                  <option value="newest">Najnovsie</option>
                  <option value="price_asc">Cena vzostupne</option>
                  <option value="price_desc">Cena zostupne</option>
                  <option value="name">Nazov A-Z</option>
                  <option value="bestselling">Najpredavanejsie</option>
                </select>
              </div>

              {/* Products grid */}
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="skeleton h-80 rounded-2xl" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="text-xl font-bold text-gray-800 mb-2">Ziadne produkty</p>
                  <p className="text-gray-500 mb-6">Skuste zmenit filtre alebo vyhladavanie</p>
                  <Link href="/products" className="text-blue-600 hover:underline font-medium">Zobrazit vsetky produkty</Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {products.map(p => <ProductCard key={p.id} product={p} />)}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-1.5 mt-8">
                      {page > 1 && (
                        <button onClick={() => updateFilter('page', String(page - 1))} className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm">&larr;</button>
                      )}
                      {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                        let p = i + 1
                        if (totalPages > 7) {
                          if (page <= 4) p = i + 1
                          else if (page >= totalPages - 3) p = totalPages - 6 + i
                          else p = page - 3 + i
                        }
                        return (
                          <button key={p} onClick={() => updateFilter('page', String(p))} className={`w-10 h-10 rounded-lg text-sm font-medium transition ${p === page ? 'text-white' : 'border bg-white hover:bg-gray-50'}`} style={p === page ? { background: 'var(--primary)' } : {}}>
                            {p}
                          </button>
                        )
                      })}
                      {page < totalPages && (
                        <button onClick={() => updateFilter('page', String(page + 1))} className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm">&rarr;</button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
