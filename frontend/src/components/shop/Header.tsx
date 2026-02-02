'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCartStore, useAuthStore } from '@/lib/store'
import { getCategories } from '@/lib/api'
import type { Category } from '@/types'

const categoryIcons: Record<string, string> = {
  'automobilove-produkty': 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.7-2.8C12.1 6.1 10.8 6 9.4 6H5.2C3.9 6 2.7 6.7 2 7.8L1 10v6c0 .6.4 1 1 1h1',
  'cestovanie': 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3C9.2 3 7 5.2 7 8s5 8 5 8 5-5 5-8-2.2-5-5-5z',
  'dom-a-zahrada': 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  'domace-spotrebice': 'M5 2h14a1 1 0 011 1v18a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z M12 18a2 2 0 100-4 2 2 0 000 4z M8 6h8 M8 9h8',
  'elektronika': 'M12 18h.01 M8 21h8 M7 21a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7z',
  'kancelaria': 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  'ostatne': 'M4 6h16M4 12h16M4 18h16',
  'pre-deti': 'M12 2a10 10 0 100 20 10 10 0 000-20zM8 14s1.5 2 4 2 4-2 4-2 M9 9h.01 M15 9h.01',
}

function CategoryIcon({ slug, className = '' }: { slug: string; className?: string }) {
  const path = categoryIcons[slug]
  if (!path) return <div className={`w-8 h-8 bg-gray-200 rounded-lg ${className}`} />
  return (
    <svg className={`w-7 h-7 ${className}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

export default function Header() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const menuTimeout = useRef<NodeJS.Timeout | null>(null)
  const getItemCount = useCartStore(s => s.getItemCount)
  const getTotal = useCartStore(s => s.getTotal)
  const user = useAuthStore(s => s.user)
  const cartCount = getItemCount()

  useEffect(() => {
    async function load() {
      try { const cats = await getCategories(); setCategories(cats || []) } catch {}
    }
    load()
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) router.push(`/search?q=${encodeURIComponent(search.trim())}`)
  }

  function enterCategory(slug: string) {
    if (menuTimeout.current) clearTimeout(menuTimeout.current)
    setActiveCategory(slug)
  }

  function leaveCategory() {
    menuTimeout.current = setTimeout(() => setActiveCategory(null), 200)
  }

  const activeCat = categories.find(c => c.slug === activeCategory)

  return (
    <header className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${scrolled ? 'header-shadow' : ''}`}>
      {/* Top announcement bar */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)' }} className="text-white text-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Doprava zadarmo nad 50 EUR
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-5 text-white/80">
            <Link href="/contact" className="hover:text-white transition">Kontakt</Link>
            <span className="text-white/30">|</span>
            <Link href="/order-tracking" className="hover:text-white transition">Sledovat zasielku</Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          {/* Mobile menu toggle */}
          <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm" style={{ background: 'var(--primary)' }}>P</div>
            <span className="text-xl font-extrabold" style={{ color: 'var(--primary)' }}>PROFI</span>
            <span className="text-xl font-extrabold text-gray-900">BUY</span>
            <span className="text-xs text-gray-400 ml-0.5">.sk</span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:flex">
            <div className="flex w-full rounded-xl overflow-hidden border-2 border-gray-200 focus-within:border-blue-400 transition">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Hladat produkty..." className="flex-1 px-4 py-2.5 focus:outline-none text-sm" />
              <button type="submit" className="px-5 text-white" style={{ background: 'var(--accent)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            {/* Wishlist */}
            <button className="hidden md:flex flex-col items-center text-gray-500 hover:text-red-500 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </button>

            {/* Account */}
            {user ? (
              <Link href="/account" className="hidden md:flex flex-col items-center text-gray-500 hover:text-gray-800 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span className="text-xs mt-0.5">{user.first_name}</span>
              </Link>
            ) : (
              <Link href="/login" className="hidden md:flex flex-col items-center text-gray-500 hover:text-gray-800 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span className="text-xs mt-0.5">Prihlasit</span>
              </Link>
            )}

            {/* Cart */}
            <Link href="/cart" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition relative">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
              {cartCount > 0 && (
                <>
                  <span className="text-sm font-bold">{getTotal().toFixed(2)} &euro;</span>
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{cartCount}</span>
                </>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Category navigation bar */}
      <div className="border-b bg-white hidden lg:block relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-0">
            {categories.slice(0, 8).map(cat => (
              <div key={cat.id} className="relative" onMouseEnter={() => enterCategory(cat.slug)} onMouseLeave={leaveCategory}>
                <Link href={`/categories/${cat.slug}`} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition whitespace-nowrap ${activeCategory === cat.slug ? 'text-blue-700 bg-blue-50' : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'}`}>
                  <CategoryIcon slug={cat.slug} className="text-gray-500" />
                  <span>{cat.name}</span>
                </Link>
              </div>
            ))}
            {categories.length > 8 && (
              <button className="flex items-center gap-1 px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* Mega Menu Dropdown */}
        {activeCategory && activeCat && activeCat.children && activeCat.children.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border-t shadow-2xl z-50" onMouseEnter={() => enterCategory(activeCategory)} onMouseLeave={leaveCategory}>
            <div className="max-w-7xl mx-auto px-4 py-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {activeCat.children.map(sub => (
                  <div key={sub.id}>
                    <Link href={`/categories/${sub.slug}`} className="flex items-center gap-3 mb-2 group">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition">
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h10v10H7z" /></svg>
                      </div>
                      <span className="font-semibold text-sm text-gray-900 group-hover:text-blue-700">{sub.name}</span>
                    </Link>
                    {sub.children && sub.children.length > 0 && (
                      <div className="ml-13 space-y-1 pl-[52px]">
                        {sub.children.slice(0, 5).map(child => (
                          <Link key={child.id} href={`/categories/${child.slug}`} className="block text-xs text-gray-500 hover:text-blue-600 transition py-0.5">{child.name}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile search */}
      <div className="md:hidden px-4 py-2 border-b">
        <form onSubmit={handleSearch} className="flex rounded-lg overflow-hidden border">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Hladat..." className="flex-1 px-3 py-2 text-sm focus:outline-none" />
          <button type="submit" className="px-4 text-white" style={{ background: 'var(--accent)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
        </form>
      </div>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="lg:hidden bg-white border-t shadow-lg">
          {categories.slice(0, 10).map(cat => (
            <Link key={cat.id} href={`/categories/${cat.slug}`} className="flex items-center gap-3 px-4 py-3 border-b hover:bg-gray-50" onClick={() => setMobileMenu(false)}>
              <CategoryIcon slug={cat.slug} className="text-gray-400" />
              <span className="text-sm font-medium">{cat.name}</span>
              {cat.product_count > 0 && <span className="text-xs text-gray-400 ml-auto">{cat.product_count}</span>}
            </Link>
          ))}
          <Link href="/products" className="block px-4 py-3 text-sm font-medium text-blue-600 hover:bg-gray-50" onClick={() => setMobileMenu(false)}>Vsetky produkty</Link>
          <Link href="/account" className="block px-4 py-3 text-sm text-gray-600 hover:bg-gray-50" onClick={() => setMobileMenu(false)}>Moj ucet</Link>
        </div>
      )}
    </header>
  )
}
