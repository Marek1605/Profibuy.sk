'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import ProductCard from '@/components/shop/ProductCard'
import { getProducts, getFilters, formatPrice } from '@/lib/api'
import type { Product, FilterOptions } from '@/types'

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filters, setFilters] = useState<FilterOptions | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  const page = Number(searchParams.get('page') || '1')
  const sort = searchParams.get('sort') || 'newest'
  const minPrice = searchParams.get('price_min') || ''
  const maxPrice = searchParams.get('price_max') || ''
  const inStock = searchParams.get('in_stock') === 'true'

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
        const data = await getProducts(params)
        setProducts(data.items || [])
        setTotal(data.total)
        setTotalPages(data.total_pages)
      } catch { setProducts([]) }
      try { const f = await getFilters(); setFilters(f) } catch {}
      setLoading(false)
    }
    load()
  }, [page, sort, minPrice, maxPrice, inStock])

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
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-800">Domov</Link>
          <span>/</span>
          <span className="text-gray-800">Produkty</span>
        </div>

        <div className="flex gap-8">
          {/* Filters sidebar */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <h2 className="font-bold text-lg mb-4">Filtre</h2>
            
            <div className="mb-6">
              <h3 className="font-medium mb-2">Cena</h3>
              <div className="flex gap-2 items-center">
                <input type="number" placeholder="Od" value={minPrice} onChange={(e) => updateFilter('price_min', e.target.value)} className="w-20 border rounded px-2 py-1 text-sm" />
                <span>-</span>
                <input type="number" placeholder="Do" value={maxPrice} onChange={(e) => updateFilter('price_max', e.target.value)} className="w-20 border rounded px-2 py-1 text-sm" />
              </div>
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={inStock} onChange={(e) => updateFilter('in_stock', e.target.checked ? 'true' : '')} className="rounded" />
                <span className="text-sm">Len skladom</span>
              </label>
            </div>

            {filters?.brands && filters.brands.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium mb-2">Znacky</h3>
                {filters.brands.slice(0, 10).map(b => (
                  <label key={b.id} className="flex items-center gap-2 cursor-pointer text-sm py-0.5">
                    <input type="checkbox" className="rounded" />
                    {b.name} <span className="text-gray-400">({b.count})</span>
                  </label>
                ))}
              </div>
            )}
          </aside>

          {/* Products grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">{total} produktov</p>
              <select value={sort} onChange={(e) => updateFilter('sort', e.target.value)} className="border rounded px-3 py-2 text-sm">
                <option value="newest">Najnovsie</option>
                <option value="price_asc">Cena vzostupne</option>
                <option value="price_desc">Cena zostupne</option>
                <option value="name">Nazov A-Z</option>
                <option value="bestselling">Najpredavanejsie</option>
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-72" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-xl mb-2">Ziadne produkty</p>
                <p>Skuste zmenit filtre alebo vyhladavanie</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {page > 1 && (
                      <button onClick={() => updateFilter('page', String(page - 1))} className="px-4 py-2 border rounded hover:bg-gray-50">Predchadzajuca</button>
                    )}
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                      const p = i + 1
                      return (
                        <button key={p} onClick={() => updateFilter('page', String(p))} className={`px-4 py-2 border rounded ${p === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}>{p}</button>
                      )
                    })}
                    {page < totalPages && (
                      <button onClick={() => updateFilter('page', String(page + 1))} className="px-4 py-2 border rounded hover:bg-gray-50">Dalsia</button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
