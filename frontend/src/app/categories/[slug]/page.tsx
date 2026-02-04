'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import ProductCard from '@/components/shop/ProductCard'
import { getCategoryProducts, formatPrice } from '@/lib/api'
import type { Product, Category } from '@/types'

export default function CategoryPage() {
  return <Suspense fallback={<CategorySkeleton />}><CategoryContent /></Suspense>
}

function CategorySkeleton() {
  return (
    <>
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="skeleton h-8 w-48 rounded mb-4" />
        <div className="skeleton h-4 w-96 rounded mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-white rounded-2xl border overflow-hidden">
              <div className="aspect-square bg-gray-100 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-1/2 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  )
}

function CategoryContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const page = Number(searchParams.get('page') || '1')
  const sort = searchParams.get('sort') || 'newest'
  const minPrice = searchParams.get('min_price') || ''
  const maxPrice = searchParams.get('max_price') || ''

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const sp = new URLSearchParams()
        sp.set('page', String(page))
        sp.set('limit', '24')
        sp.set('sort', sort)
        if (minPrice) sp.set('min_price', minPrice)
        if (maxPrice) sp.set('max_price', maxPrice)
        
        const data = await getCategoryProducts(params.slug as string, sp)
        console.log('Category data:', data)
        setCategory(data?.category || null)
        setProducts(data?.products?.items || [])
        setTotal(data?.products?.total || 0)
        setTotalPages(data?.products?.total_pages || 0)
      } catch (e) {
        console.error('Failed to load category:', e)
        setProducts([])
      }
      setLoading(false)
    }
    load()
  }, [params.slug, page, sort, minPrice, maxPrice])

  function updateParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString())
    if (value) {
      p.set(key, value)
    } else {
      p.delete(key)
    }
    if (key !== 'page') p.set('page', '1')
    router.push(`/categories/${params.slug}?${p.toString()}`)
  }

  function clearFilters() {
    router.push(`/categories/${params.slug}`)
  }

  const hasFilters = minPrice || maxPrice

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
            <Link href="/" className="hover:text-gray-800">Domov</Link>
            <span className="text-gray-300">›</span>
            <Link href="/categories" className="hover:text-gray-800">Kategórie</Link>
            <span className="text-gray-300">›</span>
            <span className="text-gray-800">{category?.name || '...'}</span>
          </nav>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{category?.name || 'Kategória'}</h1>
            {category?.description && <p className="text-gray-600 mt-2">{category.description}</p>}
          </div>

          {/* Subcategories */}
          {category?.children && category.children.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Podkategórie</h3>
              <div className="flex flex-wrap gap-2">
                {category.children.map(child => (
                  <Link 
                    key={child.id} 
                    href={`/categories/${child.slug}`} 
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition"
                  >
                    {child.name}
                    {(child.product_count || 0) > 0 && (
                      <span className="text-gray-400 ml-1">({child.product_count})</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Filters bar */}
          <div className="bg-white rounded-xl border p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-gray-600 font-medium">{total} produktov</span>
                
                {/* Mobile filter toggle */}
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Filtre
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Price filter (desktop) */}
                <div className="hidden lg:flex items-center gap-2">
                  <span className="text-sm text-gray-500">Cena:</span>
                  <input 
                    type="number" 
                    placeholder="Od" 
                    value={minPrice}
                    onChange={(e) => updateParam('min_price', e.target.value)}
                    className="w-20 px-2 py-1.5 border rounded-lg text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input 
                    type="number" 
                    placeholder="Do" 
                    value={maxPrice}
                    onChange={(e) => updateParam('max_price', e.target.value)}
                    className="w-20 px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>

                {hasFilters && (
                  <button 
                    onClick={clearFilters}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Zrušiť filtre
                  </button>
                )}

                {/* Sort */}
                <select 
                  value={sort} 
                  onChange={(e) => updateParam('sort', e.target.value)} 
                  className="border rounded-lg px-3 py-2 text-sm font-medium bg-white"
                >
                  <option value="newest">Najnovšie</option>
                  <option value="price_asc">Cena vzostupne</option>
                  <option value="price_desc">Cena zostupne</option>
                  <option value="name">Názov A-Z</option>
                  <option value="bestselling">Najpredávanejšie</option>
                </select>
              </div>
            </div>

            {/* Mobile filters */}
            {showFilters && (
              <div className="lg:hidden mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Cena:</span>
                  <input 
                    type="number" 
                    placeholder="Od" 
                    value={minPrice}
                    onChange={(e) => updateParam('min_price', e.target.value)}
                    className="w-24 px-2 py-1.5 border rounded-lg text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input 
                    type="number" 
                    placeholder="Do" 
                    value={maxPrice}
                    onChange={(e) => updateParam('max_price', e.target.value)}
                    className="w-24 px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Products grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border overflow-hidden">
                  <div className="aspect-square bg-gray-100 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
                    <div className="h-6 w-1/2 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-xl mb-2 font-semibold text-gray-900">Žiadne produkty v tejto kategórii</p>
              <p className="text-gray-500 mb-6">Skúste zmeniť filtre alebo sa pozrite do inej kategórie.</p>
              {hasFilters && (
                <button 
                  onClick={clearFilters}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Zrušiť filtre
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {page > 1 && (
                    <button 
                      onClick={() => updateParam('page', String(page - 1))} 
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
                    >
                      ← Predošlá
                    </button>
                  )}
                  
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                    let pageNum: number
                    if (totalPages <= 7) {
                      pageNum = i + 1
                    } else if (page <= 4) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i
                    } else {
                      pageNum = page - 3 + i
                    }
                    
                    return (
                      <button 
                        key={pageNum} 
                        onClick={() => updateParam('page', String(pageNum))} 
                        className={`px-4 py-2 border rounded-lg font-medium transition ${pageNum === page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  
                  {page < totalPages && (
                    <button 
                      onClick={() => updateParam('page', String(page + 1))} 
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
                    >
                      Ďalšia →
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
