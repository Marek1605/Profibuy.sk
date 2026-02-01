'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import { getCategories } from '@/lib/api'
import type { Category } from '@/types'

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
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Kategorie</h1>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-32" />)}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-center py-20 text-gray-500">Ziadne kategorie</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map(cat => (
              <Link key={cat.id} href={`/categories/${cat.slug}`} className="bg-white border rounded-lg p-6 hover:shadow-md transition group">
                <h2 className="font-bold group-hover:text-blue-600">{cat.name}</h2>
                {cat.product_count > 0 && <p className="text-sm text-gray-500 mt-1">{cat.product_count} produktov</p>}
                {cat.children && cat.children.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {cat.children.slice(0, 3).map(c => (
                      <span key={c.id} className="text-xs bg-gray-100 px-2 py-1 rounded">{c.name}</span>
                    ))}
                    {cat.children.length > 3 && <span className="text-xs text-gray-400">+{cat.children.length - 3}</span>}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
