'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCartStore, useAuthStore } from '@/lib/store'
import { getCategories } from '@/lib/api'
import type { Category } from '@/types'

export default function Header() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [megaMenuOpen, setMegaMenuOpen] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const closeTimeout = useRef<NodeJS.Timeout | null>(null)
  const getItemCount = useCartStore(s => s.getItemCount)
  const getTotal = useCartStore(s => s.getTotal)
  const user = useAuthStore(s => s.user)
  const cartCount = getItemCount()

  useEffect(() => {
    async function load() {
      try {
        const cats = await getCategories()
        setCategories(cats || [])
      } catch (e) {
        console.error('Failed to load categories:', e)
      }
    }
    load()

    // Scroll handler for collapsed state
    const handleScroll = () => {
      setIsCollapsed(window.scrollY > 150)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) router.push(`/search?q=${encodeURIComponent(search.trim())}`)
  }

  function openMegaMenu(cat: Category) {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current)
      closeTimeout.current = null
    }
    if (cat.children && cat.children.length > 0) {
      setActiveCategoryId(cat.id)
      setMegaMenuOpen(true)
    }
  }

  function scheduleMegaClose() {
    closeTimeout.current = setTimeout(() => {
      setMegaMenuOpen(false)
      setActiveCategoryId(null)
    }, 150)
  }

  function cancelMegaClose() {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current)
      closeTimeout.current = null
    }
  }

  function getInitial(name: string) {
    return (name || 'K').charAt(0).toUpperCase()
  }

  const activeCategory = categories.find(c => c.id === activeCategoryId)

  return (
    <header className="sticky top-0 z-50 bg-white">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a87] text-white text-sm">
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
            <Link href="/order-tracking" className="hover:text-white transition">Sledovať zásielku</Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          {/* Mobile menu toggle */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm bg-[#1e3a5f]">P</div>
            <span className="text-xl font-extrabold text-[#1e3a5f]">PROFI</span>
            <span className="text-xl font-extrabold text-gray-900">BUY</span>
            <span className="text-xs text-gray-400 ml-0.5">.sk</span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:flex">
            <div className="flex w-full rounded-xl overflow-hidden border-2 border-gray-200 focus-within:border-[#c4956a] transition">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať produkt, značku..." className="flex-1 px-4 py-2.5 focus:outline-none text-sm" />
              <button type="submit" className="px-5 text-white bg-[#1e3a5f] hover:bg-[#2d5a87] transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-4 ml-auto">
            <button className="hidden md:flex flex-col items-center text-gray-500 hover:text-red-500 transition p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </button>
            
            {user ? (
              <Link href="/account" className="hidden md:flex flex-col items-center text-gray-500 hover:text-gray-800 transition p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </Link>
            ) : (
              <Link href="/login" className="hidden md:flex flex-col items-center text-gray-500 hover:text-gray-800 transition p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </Link>
            )}

            {/* Cart */}
            <Link href="/cart" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition relative">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
              {cartCount > 0 && (
                <>
                  <span className="text-sm font-bold">{getTotal().toFixed(2)} €</span>
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{cartCount}</span>
                </>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Category navigation - MEGA MENU like profibuy.sk */}
      <nav className={`border-b bg-white hidden lg:block relative ${isCollapsed ? 'shadow-md' : ''}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center overflow-x-auto no-scrollbar">
            {categories.slice(0, 10).map(cat => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-[1px] ${
                  activeCategoryId === cat.id 
                    ? 'text-[#c4956a] border-[#c4956a] bg-orange-50/50' 
                    : 'text-gray-700 border-transparent hover:text-[#c4956a] hover:bg-orange-50/30'
                }`}
                onMouseEnter={() => openMegaMenu(cat)}
                onMouseLeave={scheduleMegaClose}
              >
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {cat.image ? (
                    <img src={cat.image} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-base">{getInitial(cat.name)}</span>
                  )}
                </span>
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Mega Menu Dropdown */}
        {megaMenuOpen && activeCategory && activeCategory.children && activeCategory.children.length > 0 && (
          <div 
            className="absolute left-0 right-0 top-full bg-white border-t shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200"
            onMouseEnter={cancelMegaClose}
            onMouseLeave={scheduleMegaClose}
          >
            <div className="max-w-7xl mx-auto px-6 py-5">
              <div className="grid grid-cols-4 gap-x-6 gap-y-4 max-h-[50vh] overflow-y-auto">
                {activeCategory.children.map(subcat => (
                  <div key={subcat.id} className="py-2 border-b border-gray-100 last:border-0">
                    {/* Subcategory header with image */}
                    <Link 
                      href={`/categories/${subcat.slug}`}
                      className="flex items-center gap-3 mb-2 group"
                    >
                      <div className="w-11 h-11 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {subcat.image ? (
                          <img src={subcat.image} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-semibold text-gray-400">
                            {getInitial(subcat.name)}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-gray-900 group-hover:text-[#c4956a] transition">
                        {subcat.name}
                      </span>
                    </Link>
                    
                    {/* Grandchildren - inline links with bullets */}
                    {subcat.children && subcat.children.length > 0 && (
                      <div className="flex flex-wrap items-center gap-0 pl-0 text-xs leading-relaxed">
                        {subcat.children.slice(0, 8).map((grandchild, i) => (
                          <Link
                            key={grandchild.id}
                            href={`/categories/${grandchild.slug}`}
                            className="text-gray-500 hover:text-[#c4956a] transition whitespace-nowrap"
                          >
                            {i > 0 && <span className="text-gray-300 mx-1">•</span>}
                            {grandchild.name}
                          </Link>
                        ))}
                        {subcat.children.length > 8 && (
                          <Link href={`/categories/${subcat.slug}`} className="text-[#c4956a] font-medium ml-1">
                            +{subcat.children.length - 8}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile search */}
      <div className="md:hidden px-4 py-2 border-b bg-white">
        <form onSubmit={handleSearch} className="flex rounded-lg overflow-hidden border">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať..." className="flex-1 px-3 py-2 text-sm focus:outline-none" />
          <button type="submit" className="px-4 text-white bg-[#1e3a5f]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
        </form>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-[300px] max-w-[85vw] bg-white z-50 shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-r from-[#1e3a5f] to-[#2d5a87] text-white">
              <span className="text-lg font-bold">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-60px)]">
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  className="flex items-center gap-3 px-4 py-3 border-b hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm">
                    {getInitial(cat.name)}
                  </span>
                  <span className="font-medium text-gray-800">{cat.name}</span>
                  {(cat.product_count || 0) > 0 && (
                    <span className="text-xs text-gray-400 ml-auto">{cat.product_count}</span>
                  )}
                </Link>
              ))}
              <Link href="/products" className="block px-4 py-3 text-[#c4956a] font-semibold" onClick={() => setMobileMenuOpen(false)}>
                Všetky produkty →
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  )
}
