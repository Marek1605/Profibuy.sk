'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import ProductCard from '@/components/shop/ProductCard'
import FilterSidebar from '@/components/shop/FilterSidebar'
import MobileFilterDrawer from '@/components/shop/MobileFilterDrawer'
import { getCategoryProducts } from '@/lib/api'
import type { Product, Category } from '@/types'

export default function CategoryPage() {
  return <Suspense fallback={<CategorySkeleton />}><CategoryContent /></Suspense>
}

function CategorySkeleton() {
  return (
    <>
      <Header />
      <div className="max-w-[1440px] mx-auto px-4 py-8">
        <div className="skeleton h-8 w-48 rounded mb-4" />
        <div className="skeleton h-4 w-96 rounded mb-8" />
        <div className="flex gap-8">
          <div className="hidden lg:block w-[260px] flex-shrink-0 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [gridCols, setGridCols] = useState<3 | 4>(4)

  const page = Number(searchParams.get('page') || '1')
  const sort = searchParams.get('sort') || 'newest'

  // Count active filters for badge
  const activeFilterCount = (() => {
    let count = 0
    if (searchParams.get('brands')) count += searchParams.get('brands')!.split(',').filter(Boolean).length
    if (searchParams.get('min_price')) count++
    if (searchParams.get('max_price')) count++
    if (searchParams.get('in_stock') === 'true') count++
    if (searchParams.get('on_sale') === 'true') count++
    searchParams.forEach((_, key) => { if (key.startsWith('attr_')) count++ })
    return count
  })()

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const sp = new URLSearchParams(searchParams.toString())
        if (!sp.has('page')) sp.set('page', String(page))
        if (!sp.has('limit')) sp.set('limit', '24')
        if (!sp.has('sort')) sp.set('sort', sort)

        const data = await getCategoryProducts(params.slug as string, sp)
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
  }, [params.slug, searchParams.toString()])

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

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-[1440px] mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-5 flex-wrap">
            <Link href="/" className="hover:text-gray-800 transition">Domov</Link>
            <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <Link href="/categories" className="hover:text-gray-800 transition">Kategórie</Link>
            <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <span className="text-gray-800 font-medium">{category?.name || '...'}</span>
          </nav>

          {/* Category header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{category?.name || 'Kategória'}</h1>
            {category?.description && <p className="text-gray-500 mt-1.5 text-sm max-w-2xl">{category.description}</p>}
          </div>

          {/* Subcategories */}
          {category?.children && category.children.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Podkategórie</h3>
              <div className="flex flex-wrap gap-2">
                {category.children.map(child => (
                  <Link
                    key={child.id}
                    href={`/categories/${child.slug}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200"
                  >
                    {child.name}
                    {(child.product_count || 0) > 0 && (
                      <span className="text-gray-400 text-xs">({child.product_count})</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Main content: sidebar + products */}
          <div className="flex gap-8 items-start">
            {/* Desktop sidebar */}
            <div className="hidden lg:block w-[260px] flex-shrink-0">
              <div className="sticky top-20 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <FilterSidebar categorySlug={params.slug as string} totalProducts={total} />
              </div>
            </div>

            {/* Products area */}
            <div className="flex-1 min-w-0">
              {/* Top bar */}
              <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-5 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  {/* Mobile filter button */}
                  <button
                    onClick={() => setMobileFiltersOpen(true)}
                    className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium transition relative"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filtre
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  <span className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-900">{total}</span> produktov
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Grid toggle */}
                  <div className="hidden lg:flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setGridCols(3)}
                      className={`p-2 transition ${gridCols === 3 ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                      title="3 stĺpce"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="0" y="0" width="4.5" height="4.5" rx="1" />
                        <rect x="5.75" y="0" width="4.5" height="4.5" rx="1" />
                        <rect x="11.5" y="0" width="4.5" height="4.5" rx="1" />
                        <rect x="0" y="5.75" width="4.5" height="4.5" rx="1" />
                        <rect x="5.75" y="5.75" width="4.5" height="4.5" rx="1" />
                        <rect x="11.5" y="5.75" width="4.5" height="4.5" rx="1" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setGridCols(4)}
                      className={`p-2 transition ${gridCols === 4 ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                      title="4 stĺpce"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="0" y="0" width="3" height="3" rx="0.75" />
                        <rect x="4.33" y="0" width="3" height="3" rx="0.75" />
                        <rect x="8.66" y="0" width="3" height="3" rx="0.75" />
                        <rect x="13" y="0" width="3" height="3" rx="0.75" />
                        <rect x="0" y="4.33" width="3" height="3" rx="0.75" />
                        <rect x="4.33" y="4.33" width="3" height="3" rx="0.75" />
                        <rect x="8.66" y="4.33" width="3" height="3" rx="0.75" />
                        <rect x="13" y="4.33" width="3" height="3" rx="0.75" />
                      </svg>
                    </button>
                  </div>

                  {/* Sort */}
                  <select
                    value={sort}
                    onChange={(e) => updateParam('sort', e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium bg-white hover:border-gray-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
                  >
                    <option value="newest">Najnovšie</option>
                    <option value="price_asc">Najlacnejšie</option>
                    <option value="price_desc">Najdrahšie</option>
                    <option value="name">Názov A-Z</option>
                    <option value="bestselling">Najpredávanejšie</option>
                  </select>
                </div>
              </div>

              {/* Products grid */}
              {loading ? (
                <div className={`grid grid-cols-2 ${gridCols === 3 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4'} gap-4`}>
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
                  <p className="text-xl mb-2 font-semibold text-gray-900">Žiadne produkty</p>
                  <p className="text-gray-500 mb-6">Skúste zmeniť filtre alebo sa pozrite do inej kategórie.</p>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => router.push(`/categories/${params.slug}`)}
                      className="px-6 py-2.5 text-white rounded-xl font-medium transition hover:opacity-90"
                      style={{ background: 'var(--primary)' }}
                    >
                      Zrušiť filtre
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className={`grid grid-cols-2 ${gridCols === 3 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4'} gap-4`}>
                    {products.map(p => <ProductCard key={p.id} product={p} />)}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-1.5 mt-8">
                      <button
                        onClick={() => updateParam('page', String(page - 1))}
                        disabled={page <= 1}
                        className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>

                      {generatePageNumbers(page, totalPages).map((pageNum, i) =>
                        pageNum === -1 ? (
                          <span key={`ellipsis-${i}`} className="w-10 h-10 flex items-center justify-center text-gray-400">…</span>
                        ) : (
                          <button
                            key={pageNum}
                            onClick={() => updateParam('page', String(pageNum))}
                            className={`w-10 h-10 rounded-xl font-medium text-sm transition ${
                              pageNum === page
                                ? 'text-white shadow-md'
                                : 'border border-gray-200 hover:bg-gray-50'
                            }`}
                            style={pageNum === page ? { background: 'var(--primary)' } : {}}
                          >
                            {pageNum}
                          </button>
                        )
                      )}

                      <button
                        onClick={() => updateParam('page', String(page + 1))}
                        disabled={page >= totalPages}
                        className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile filter drawer */}
      <MobileFilterDrawer
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        activeCount={activeFilterCount}
      >
        <FilterSidebar categorySlug={params.slug as string} totalProducts={total} />
      </MobileFilterDrawer>

      <Footer />
    </>
  )
}

// Smart pagination with ellipsis
function generatePageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: number[] = [1]

  if (current > 3) pages.push(-1)

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push(-1)

  if (!pages.includes(total)) pages.push(total)

  return pages
}
