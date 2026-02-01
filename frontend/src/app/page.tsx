'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import ProductCard from '@/components/shop/ProductCard'
import { getProducts, getCategories } from '@/lib/api'
import type { Product, Category } from '@/types'

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [newProducts, setNewProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams({ limit: '8', sort: 'bestselling' })
        const featured = await getProducts(params)
        setFeaturedProducts(featured.items || [])
      } catch {}
      try {
        const params = new URLSearchParams({ limit: '4', sort: 'newest' })
        const newest = await getProducts(params)
        setNewProducts(newest.items || [])
      } catch {}
      try {
        const cats = await getCategories()
        setCategories(cats?.slice(0, 8) || [])
      } catch {}
    }
    load()
  }, [])

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
          <div className="max-w-7xl mx-auto px-4 py-16 lg:py-24">
            <div className="max-w-2xl">
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">Vitajte na ProfiBuy.sk</h1>
              <p className="text-lg text-blue-100 mb-8">Objavte tisice produktov za skvelé ceny. Rychle dorucenie po celom Slovensku.</p>
              <div className="flex flex-wrap gap-4">
                <Link href="/products" className="bg-white text-blue-900 px-8 py-3 rounded-lg font-medium hover:bg-blue-50 transition">Prezerať produkty</Link>
                <Link href="/categories" className="border-2 border-white px-8 py-3 rounded-lg font-medium hover:bg-white hover:text-blue-900 transition">Kategorie</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '🚚', title: 'Rychle dorucenie', desc: 'Do 1-2 pracovnych dni' },
              { icon: '🔒', title: 'Bezpecny nakup', desc: 'Sifrovana platba' },
              { icon: '↩️', title: 'Vratenie do 14 dni', desc: 'Bez udania dovodu' },
              { icon: '📞', title: 'Zakaznicka podpora', desc: 'Po-Pi 8:00-16:00' },
            ].map(f => (
              <div key={f.title} className="flex items-center gap-3">
                <span className="text-3xl">{f.icon}</span>
                <div>
                  <p className="font-medium text-sm">{f.title}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Kategorie</h2>
              <Link href="/categories" className="text-blue-600 text-sm hover:underline">Zobrazit vsetky</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map(cat => (
                <Link key={cat.id} href={`/categories/${cat.slug}`} className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-md transition group">
                  <p className="font-medium group-hover:text-blue-600">{cat.name}</p>
                  {cat.product_count > 0 && <p className="text-sm text-gray-400 mt-1">{cat.product_count} produktov</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured products */}
        {featuredProducts.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Odporucane produkty</h2>
              <Link href="/products" className="text-blue-600 text-sm hover:underline">Zobrazit vsetky</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* New products */}
        {newProducts.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Novinky</h2>
              <Link href="/products?sort=newest" className="text-blue-600 text-sm hover:underline">Zobrazit vsetky</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {newProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="bg-blue-50">
          <div className="max-w-7xl mx-auto px-4 py-16 text-center">
            <h2 className="text-2xl font-bold mb-4">Doprava zadarmo nad 50 EUR</h2>
            <p className="text-gray-600 mb-6">Nakupte za viac ako 50 EUR a dopravne mate zadarmo</p>
            <Link href="/products" className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium">Zacat nakupovat</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
