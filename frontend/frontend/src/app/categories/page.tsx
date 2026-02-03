'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import { getCategories } from '@/lib/api'
import type { Category } from '@/types'

const emojis: Record<string, string> = { 'automobilove-produkty': '🚗', 'cestovanie': '✈️', 'dom-a-zahrada': '🏡', 'domace-spotrebice': '🔌', 'elektronika': '💻', 'kancelaria': '📎', 'ostatne': '📦', 'pre-deti': '🧸' }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try { const data = await getCategories(); setCategories(data || []) } catch {}
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="section-title mb-2">Vsetky kategorie</h1>
          <p className="text-gray-500 mb-8">Prezrite si nasu kompletnu ponuku podla kategorii</p>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}</div>
          ) : categories.length === 0 ? (
            <p className="text-center py-20 text-gray-500">Ziadne kategorie</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {categories.map(cat => (
                <div key={cat.id} className="bg-white rounded-2xl border p-6 hover:shadow-lg transition-all duration-300 group">
                  <Link href={`/categories/${cat.slug}`} className="flex items-center gap-4 mb-4">
                    <span className="text-5xl">{emojis[cat.slug] || '📦'}</span>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition">{cat.name}</h2>
                      <span className="text-sm text-gray-400">{cat.product_count} produktov</span>
                    </div>
                  </Link>
                  {cat.children && cat.children.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                      {cat.children.map(c => (
                        <Link key={c.id} href={`/categories/${c.slug}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition text-sm text-gray-600 hover:text-blue-700">
                          <span className="text-base">{emojis[c.slug] || '📁'}</span>
                          <span>{c.name}</span>
                          {c.product_count > 0 && <span className="text-xs text-gray-400 ml-auto">{c.product_count}</span>}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
