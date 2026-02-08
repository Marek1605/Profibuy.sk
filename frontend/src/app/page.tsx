'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import ProductCard from '@/components/shop/ProductCard'
import { getProducts, getCategories } from '@/lib/api'
import type { Product, Category } from '@/types'

const categoryEmojis: Record<string, string> = {
  'automobilove-produkty': '🚗',
  'cestovanie': '✈️',
  'dom-a-zahrada': '🏡',
  'domace-spotrebice': '🔌',
  'elektronika': '💻',
  'kancelaria': '📎',
  'ostatne': '📦',
  'pre-deti': '🧸',
  'sport': '⚽',
  'zdravie': '💊',
  'oblecenie': '👕',
  'jedlo': '🍕',
}

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [saleProducts, setSaleProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      
      try {
        // Load categories
        const cats = await getCategories()
        console.log('Categories loaded:', cats?.length || 0)
        setCategories(cats || [])
      } catch (e) {
        console.error('Failed to load categories:', e)
      }

      try {
        // Load featured products
        const p = new URLSearchParams({ limit: '8', sort: 'bestselling' })
        const data = await getProducts(p)
        console.log('Featured products loaded:', data?.items?.length || 0)
        setFeaturedProducts(data?.items || [])
      } catch (e) {
        console.error('Failed to load featured products:', e)
      }

      try {
        // Load sale products
        const p = new URLSearchParams({ limit: '4', sort: 'newest', on_sale: 'true' })
        const data = await getProducts(p)
        console.log('Sale products loaded:', data?.items?.length || 0)
        setSaleProducts(data?.items || [])
      } catch (e) {
        console.error('Failed to load sale products:', e)
      }

      setLoading(false)
    }
    load()
  }, [])

  const activeCat = categories.find(c => c.slug === activeCategory)

  // Loading skeleton
  if (loading) {
    return (
      <>
        <Header />
        <main className="bg-white min-h-screen">
          {/* Hero skeleton */}
          <div className="h-[400px] bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
          
          {/* Stats skeleton */}
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <div className="w-14 h-14 rounded-2xl bg-gray-200 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Products skeleton */}
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
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
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="bg-white">

        {/* === CATEGORY ICONS BAR (like profibuy.sk) === */}
        {/* === HERO === */}
        <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #1e3a5f 100%)' }}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          </div>
          <div className="max-w-7xl mx-auto px-4 py-16 lg:py-20 relative">
            <div className="max-w-2xl">
              <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium mb-4 backdrop-blur-sm">
                🔥 Najlepsie ceny online
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
                Tisice produktov<br />
                <span style={{ color: '#c4956a' }}>za skvele ceny</span>
              </h1>
              <p className="text-lg text-blue-100/90 mb-8 leading-relaxed">
                Porovnajte ceny a nakupte to najlepsie. Rychle dorucenie po celom Slovensku s dopravou zadarmo nad 50 EUR.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/products" className="btn-primary text-base">
                  Prezerať produkty
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link href="/categories" className="btn-outline !border-white !text-white hover:!bg-white hover:!text-gray-900 text-base">
                  Kategorie
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* === STATS === */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: '🚚', num: 'Do 24h', label: 'Rychle dorucenie', desc: 'Po celom Slovensku' },
                { icon: '🔒', num: '100%', label: 'Bezpecny nakup', desc: 'SSL sifrovanie' },
                { icon: '↩️', num: '14 dni', label: 'Garancie vratenia', desc: 'Bez udania dovodu' },
                { icon: '📞', num: 'Po-Pi', label: 'Zakaznicka podpora', desc: '8:00 - 16:00' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0">{s.icon}</div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{s.label}</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* === FEATURED PRODUCTS === */}
        {featuredProducts.length > 0 ? (
          <section className="py-12 md:py-16">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="section-title">🏆 Top produkty</h2>
                  <p className="text-gray-500 text-sm mt-1">Najviac predavane produkty tohto tyzdna</p>
                </div>
                <Link href="/products?sort=bestselling" className="text-sm font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Zobrazit vsetky &rarr;</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                {featuredProducts.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          </section>
        ) : (
          <section className="py-12 md:py-16">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pripravujeme produkty</h2>
              <p className="text-gray-500 mb-6">Čoskoro tu nájdete široký výber produktov za skvelé ceny.</p>
              <Link href="/admin" className="text-sm text-blue-600 hover:underline">Prejsť do administrácie →</Link>
            </div>
          </section>
        )}

        {/* === SALE PRODUCTS === */}
        {saleProducts.length > 0 && (
          <section className="py-12 md:py-16 bg-gradient-to-b from-red-50 to-white">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="section-title text-red-600">🔥 Vypredaj</h2>
                  <p className="text-gray-500 text-sm mt-1">Najlepsie zlavy len pre vas</p>
                </div>
                <Link href="/products?on_sale=true" className="text-sm font-semibold text-red-600 hover:underline">Zobrazit vsetky &rarr;</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
                {saleProducts.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          </section>
        )}

        {/* === CATEGORIES GRID === */}
        {categories.length > 0 ? (
          <section className="py-12 md:py-16">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <h2 className="section-title">Popularne kategorie</h2>
                <Link href="/categories" className="text-sm font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Vsetky kategorie &rarr;</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.slice(0, 8).map(cat => (
                  <Link key={cat.id} href={`/categories/${cat.slug}`} className="group p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 bg-white">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-4xl">{categoryEmojis[cat.slug] || '📦'}</span>
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-700 transition">{cat.name}</h3>
                        <span className="text-xs text-gray-400">{cat.product_count || 0} produktov</span>
                      </div>
                    </div>
                    {cat.children && cat.children.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cat.children.slice(0, 3).map(c => (
                          <span key={c.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{c.name}</span>
                        ))}
                        {cat.children.length > 3 && <span className="text-xs text-gray-400 px-1">+{cat.children.length - 3}</span>}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="py-12 md:py-16">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <div className="text-6xl mb-4">📂</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Kategórie sa načítavajú</h2>
              <p className="text-gray-500">Skontrolujte pripojenie k serveru alebo vytvorte kategórie v administrácii.</p>
            </div>
          </section>
        )}

        {/* === CTA BANNER === */}
        <section style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)' }}>
          <div className="max-w-7xl mx-auto px-4 py-16 text-center text-white">
            <h2 className="text-3xl font-extrabold mb-3">Doprava zadarmo nad 50 EUR</h2>
            <p className="text-blue-200 mb-8 max-w-xl mx-auto">Nakupte za viac ako 50 EUR a dopravne mate zadarmo. Rychle dorucenie po celom Slovensku do 1-2 pracovnych dni.</p>
            <Link href="/products" className="btn-primary text-base">
              Zacat nakupovat &rarr;
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
