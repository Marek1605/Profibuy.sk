'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import { getCategories } from '@/lib/api'
import type { Category } from '@/types'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeLetter, setActiveLetter] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try { const data = await getCategories(); setCategories(data || []) } catch {}
      setLoading(false)
    }
    load()
  }, [])

  // Get unique first letters from root categories
  const letters = useMemo(() => {
    const set = new Set<string>()
    categories.forEach(cat => {
      const first = cat.name.charAt(0).toUpperCase()
      set.add(first)
    })
    return Array.from(set).sort()
  }, [categories])

  // Filter by active letter or show all
  const filteredCategories = useMemo(() => {
    if (!activeLetter) return categories
    return categories.filter(cat => cat.name.charAt(0).toUpperCase() === activeLetter)
  }, [categories, activeLetter])

  function getLetterColor(letter: string): string {
    const colors = [
      'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-orange-600',
      'bg-pink-600', 'bg-teal-600', 'bg-indigo-600', 'bg-red-600',
      'bg-cyan-600', 'bg-amber-600', 'bg-fuchsia-600', 'bg-lime-700',
    ]
    return colors[letter.charCodeAt(0) % colors.length]
  }

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Všetky kategórie</h1>
          <p className="text-gray-500 mb-6">Prezrite si našu kompletnú ponuku podľa kategórií</p>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center py-20 text-gray-500">Žiadne kategórie</p>
          ) : (
            <>
              {/* Alphabet tabs - horizontal scroll */}
              <div className="bg-white rounded-xl border mb-6 overflow-hidden">
                <div className="flex items-center overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setActiveLetter(null)}
                    className={`flex-shrink-0 px-5 py-3.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                      !activeLetter 
                        ? 'border-blue-600 text-blue-600 bg-blue-50' 
                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    Všetky
                  </button>
                  {letters.map(letter => {
                    const firstCat = categories.find(c => c.name.charAt(0).toUpperCase() === letter)
                    return (
                      <button
                        key={letter}
                        onClick={() => setActiveLetter(activeLetter === letter ? null : letter)}
                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                          activeLetter === letter 
                            ? 'border-blue-600 text-blue-600 bg-blue-50' 
                            : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-md text-white text-xs flex items-center justify-center font-bold ${getLetterColor(letter)}`}>
                          {letter}
                        </span>
                        {firstCat?.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Categories grid with subcategories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredCategories.map(cat => (
                  <div key={cat.id} className="bg-white rounded-xl border hover:shadow-lg transition-all duration-300 overflow-hidden">
                    {/* Category header */}
                    <Link href={`/categories/${cat.slug}`} className="block">
                      <div className="flex items-center gap-3 p-4 pb-3 group">
                        <span className={`w-10 h-10 rounded-lg text-white text-lg flex items-center justify-center font-bold flex-shrink-0 ${getLetterColor(cat.name.charAt(0).toUpperCase())}`}>
                          {cat.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 group-hover:text-blue-700 transition truncate">{cat.name}</h3>
                          <span className="text-xs text-gray-400">
                            {(cat.product_count || 0) > 0 ? `${cat.product_count} produktov` : ''}
                            {cat.children && cat.children.length > 0 && ` · ${cat.children.length} podkategórií`}
                          </span>
                        </div>
                      </div>
                      {cat.image && (
                        <div className="px-4 pb-2">
                          <img src={cat.image} alt={cat.name} className="w-full h-24 object-cover rounded-lg" loading="lazy" />
                        </div>
                      )}
                    </Link>

                    {/* Subcategories */}
                    {cat.children && cat.children.length > 0 && (
                      <div className="px-4 pb-4 pt-1">
                        <div className="border-t pt-3 space-y-1.5">
                          {cat.children.map(sub => (
                            <div key={sub.id}>
                              <Link 
                                href={`/categories/${sub.slug}`} 
                                className="text-sm text-gray-700 hover:text-blue-700 font-medium transition flex items-center justify-between"
                              >
                                <span className="truncate">{sub.name}</span>
                                {(sub.product_count || 0) > 0 && (
                                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{sub.product_count}</span>
                                )}
                              </Link>
                              {sub.children && sub.children.length > 0 && (
                                <div className="ml-3 mt-1 flex flex-wrap gap-x-1 gap-y-0.5">
                                  {sub.children.slice(0, 5).map((ssub, i) => (
                                    <Link key={ssub.id} href={`/categories/${ssub.slug}`} className="text-xs text-gray-400 hover:text-blue-600 transition">
                                      {ssub.name}{i < Math.min(sub.children!.length, 5) - 1 && ' · '}
                                    </Link>
                                  ))}
                                  {sub.children.length > 5 && <span className="text-xs text-gray-300">+{sub.children.length - 5}</span>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
