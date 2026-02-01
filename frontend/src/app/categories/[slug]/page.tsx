'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import ProductCard from '@/components/shop/ProductCard'
import { getCategoryProducts } from '@/lib/api'
import type { Product, Category } from '@/types'

export default function CategoryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  const page = Number(searchParams.get('page') || '1')
  const sort = searchParams.get('sort') || 'newest'

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const sp = new URLSearchParams()
        sp.set('page', String(page))
        sp.set('limit', '24')
        sp.set('sort', sort)
        const data = await getCategoryProducts(params.slug as string, sp)
        setCategory(data.category)
        setProducts(data.products?.items || [])
        setTotal(data.products?.total || 0)
        setTotalPages(data.products?.total_pages || 0)
      } catch { setProducts([]) }
      setLoading(false)
    }
    load()
  }, [params.slug, page, sort])

  function updateParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set(key, value)
    if (key !== 'page') p.set('page', '1')
    router.push(`/categories/${params.slug}?${p.toString()}`)
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-800">Domov</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-gray-800">Kategorie</Link>
          <span>/</span>
          <span className="text-gray-800">{category?.name || '...'}</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{category?.name || 'Kategoria'}</h1>
          {category?.description && <p className="text-gray-600 mt-2">{category.description}</p>}
        </div>

        {/* Subcategories */}
        {category?.children && category.children.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {category.children.map(child => (
              <Link key={child.id} href={`/categories/${child.slug}`} className="px-4 py-2 bg-gray-100 rounded-full text-sm hover:bg-gray-200 transition">
                {child.name} {child.product_count > 0 && <span className="text-gray-400">({child.product_count})</span>}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">{total} produktov</p>
          <select value={sort} onChange={(e) => updateParam('sort', e.target.value)} className="border rounded px-3 py-2 text-sm">
            <option value="newest">Najnovsie</option>
            <option value="price_asc">Cena vzostupne</option>
            <option value="price_desc">Cena zostupne</option>
            <option value="name">Nazov A-Z</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-72" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-xl mb-2">Ziadne produkty v tejto kategorii</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => (
                  <button key={i + 1} onClick={() => updateParam('page', String(i + 1))} className={`px-4 py-2 border rounded ${i + 1 === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}>{i + 1}</button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  )
}
