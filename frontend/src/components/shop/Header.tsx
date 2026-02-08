'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCartStore, useAuthStore } from '@/lib/store'
import { getCategories } from '@/lib/api'
import type { Category } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

interface NavItem {
  category_id: string
  label_sk: string
  label_en: string
  position: number
  visible: boolean
  show_in_mega: boolean
}

interface NavSettings {
  items: NavItem[]
  megamenu_enabled: boolean
  sticky_header: boolean
  sticky_categories: boolean
}

const MAX_VISIBLE = 10

export default function Header() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [navSettings, setNavSettings] = useState<NavSettings | null>(null)
  const [megaMenuOpen, setMegaMenuOpen] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const closeTimeout = useRef<NodeJS.Timeout | null>(null)
  const moreTimeout = useRef<NodeJS.Timeout | null>(null)
  const getItemCount = useCartStore(s => s.getItemCount)
  const getTotal = useCartStore(s => s.getTotal)
  const user = useAuthStore(s => s.user)
  const cartCount = getItemCount()

  const stickyHeader = navSettings ? navSettings.sticky_header : false
  const stickyCategories = navSettings ? navSettings.sticky_categories : false
  const megamenuEnabled = navSettings ? navSettings.megamenu_enabled !== false : true

  useEffect(() => {
    setMounted(true)
    async function load() {
      try {
        const cats = await getCategories()
        setCategories(cats || [])
        try {
          const navRes = await fetch(`${API_BASE}/navigation`)
          const navData = await navRes.json()
          if (navData.success && navData.data?.items && navData.data.items.length > 0) {
            setNavSettings(navData.data)
          }
        } catch (e) {}
      } catch (e) {}
    }
    load()

    const handleScroll = () => setIsScrolled(window.scrollY > 120)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) router.push(`/search?q=${encodeURIComponent(search.trim())}`)
  }

  function openMegaMenu(cat: Category) {
    if (closeTimeout.current) { clearTimeout(closeTimeout.current); closeTimeout.current = null }
    if (cat.children && cat.children.length > 0) {
      setActiveCategoryId(cat.id)
      setMegaMenuOpen(true)
    }
  }

  function scheduleMegaClose() {
    closeTimeout.current = setTimeout(() => { setMegaMenuOpen(false); setActiveCategoryId(null) }, 200)
  }

  function cancelMegaClose() {
    if (closeTimeout.current) { clearTimeout(closeTimeout.current); closeTimeout.current = null }
  }

  // Build nav categories
  const navCategories: { cat: Category; label: string; showMega: boolean }[] = []

  if (navSettings && navSettings.items.length > 0) {
    navSettings.items
      .filter(item => item.visible)
      .sort((a, b) => a.position - b.position)
      .forEach(item => {
        const cat = categories.find(c => c.id === item.category_id)
        if (cat) navCategories.push({ cat, label: item.label_sk || item.label_en || cat.name, showMega: item.show_in_mega })
      })
  } else {
    categories.filter(c => c.published !== false).forEach(cat => navCategories.push({ cat, label: cat.name, showMega: true }))
  }

  const visibleCategories = navCategories.slice(0, MAX_VISIBLE)
  const overflowCategories = navCategories.slice(MAX_VISIBLE)
  const activeCategory = categories.find(c => c.id === activeCategoryId)
  const collapsed = isScrolled && stickyCategories

  return (
    <header className={`bg-white z-50 ${stickyHeader || stickyCategories ? 'sticky top-0' : 'relative'}`}>
      {/* Top nav - hide on scroll */}
      {!collapsed && (
        <div className="border-b">
          <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center gap-6 text-xs font-semibold">
            <Link href="/" className="text-blue-600 hover:text-blue-700">DOMOV</Link>
            <Link href="/page/obchodne-podmienky" className="text-gray-600 hover:text-gray-900">OBCHODNÉ PODMIENKY</Link>
            <Link href="/page/reklamacie-a-vratenie" className="text-gray-600 hover:text-gray-900 hidden md:block">REKLAMÁCIE A VRÁTENIE TOVARU</Link>
            <Link href="/page/ochrana-osobnych-udajov" className="text-gray-600 hover:text-gray-900 hidden lg:block">OCHRANA OSOBNÝCH ÚDAJOV</Link>
            <Link href="/page/doprava-a-platba" className="text-gray-600 hover:text-gray-900 hidden lg:block">DOPRAVA A PLATBA</Link>
            <Link href="/page/kontakt" className="text-gray-600 hover:text-gray-900 hidden md:block">KONTAKT</Link>
          </div>
        </div>
      )}

      {/* Logo + Search + Icons */}
      {(!collapsed || stickyHeader) && (
        <div className="border-b">
          <div className={`max-w-7xl mx-auto px-4 flex items-center gap-4 transition-all ${collapsed ? 'py-1.5' : 'py-3'}`}>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <Link href="/" className="flex-shrink-0 flex items-center">
              <div className={`rounded-lg flex items-center justify-center font-black text-white bg-blue-600 transition-all ${collapsed ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-lg'}`}>P</div>
              {!collapsed && (
                <div className="ml-1.5">
                  <span className="text-2xl font-extrabold tracking-tight"><span className="text-gray-900">ROFI</span><span className="text-blue-600">BUY</span></span>
                  <span className="text-[10px] text-gray-400 block -mt-1">.sk</span>
                </div>
              )}
            </Link>
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:flex">
              <div className="flex w-full rounded-xl overflow-hidden border-2 border-gray-200 focus-within:border-blue-500 transition">
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať produkt, značku..." className={`flex-1 px-4 focus:outline-none text-sm transition-all ${collapsed ? 'py-1.5' : 'py-2.5'}`} />
                <button type="submit" className="px-5 text-white bg-blue-600 hover:bg-blue-700 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
              </div>
            </form>
            <div className="flex items-center gap-2 ml-auto">
              {!collapsed && (
                <>
                  <button className="hidden md:flex p-2 text-gray-400 hover:text-red-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg></button>
                  <Link href={user ? '/account' : '/login'} className="hidden md:flex p-2 text-gray-400 hover:text-gray-700"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></Link>
                </>
              )}
              <Link href="/cart" className="flex items-center gap-1.5 px-2 py-1 text-gray-700 hover:text-blue-600 relative">
                <svg className={`${collapsed ? 'w-5 h-5' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                {mounted && <span className="text-sm font-semibold">{getTotal().toFixed(2)} €</span>}
                {mounted && cartCount > 0 && <span className="absolute -top-1 left-3 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">{cartCount}</span>}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Categories bar */}
      <div 
        className="hidden lg:block border-b relative z-50"
        onMouseLeave={() => { scheduleMegaClose(); if (moreTimeout.current) clearTimeout(moreTimeout.current); setTimeout(() => setMoreMenuOpen(false), 200); }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end overflow-x-auto no-scrollbar" style={{ minHeight: '90px' }}>
            {mounted && visibleCategories.map(({ cat, label, showMega }) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className={`flex flex-col items-center px-3 py-3 min-w-[105px] max-w-[125px] text-center group flex-shrink-0 border-b-2 transition-all ${
                  activeCategoryId === cat.id ? 'border-blue-500' : 'border-transparent hover:border-blue-300'
                }`}
                onMouseEnter={() => megamenuEnabled && openMegaMenu(cat)}
              >
                <div className="w-14 h-14 flex items-center justify-center mb-1.5">
                  {cat.image ? <img src={cat.image} alt={label} className="max-w-full max-h-full object-contain" /> : <span className="text-2xl text-gray-300">{label.charAt(0)}</span>}
                </div>
                <span className={`text-[11px] font-semibold leading-tight line-clamp-2 ${
                  activeCategoryId === cat.id ? 'text-blue-600' : 'text-gray-700 group-hover:text-blue-600'
                }`}>{label}</span>
              </Link>
            ))}

            {/* "Ďalšie" hamburger with dropdown - like profibuy.sk */}
            {mounted && overflowCategories.length > 0 && (
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => { if (moreTimeout.current) clearTimeout(moreTimeout.current); setMoreMenuOpen(true) }}
                onMouseLeave={() => { moreTimeout.current = setTimeout(() => setMoreMenuOpen(false), 200) }}
              >
                <button
                  className="flex flex-col items-center px-4 py-3 min-w-[70px] border-b-2 border-transparent hover:border-blue-300 transition-all"
                >
                  <div className="w-14 h-14 flex items-center justify-center mb-1.5">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </div>
                </button>

                {/* Dropdown with remaining categories */}
                {moreMenuOpen && (
                  <div className="absolute right-0 top-full bg-white rounded-b-xl shadow-xl border border-t-0 z-50 min-w-[220px] py-1" style={{ animation: 'fadeIn 0.15s ease-out' }}>
                    {overflowCategories.map(({ cat, label }) => (
                      <Link
                        key={cat.id}
                        href={`/categories/${cat.slug}`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition"
                        onClick={() => setMoreMenuOpen(false)}
                      >
                        <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                          {cat.image ? <img src={cat.image} alt="" className="max-w-full max-h-full object-contain" /> : <span className="text-xs font-bold text-gray-300">{label.charAt(0)}</span>}
                        </div>
                        <span className="text-sm text-gray-800 font-medium">{label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mega menu */}
        {megamenuEnabled && megaMenuOpen && activeCategory && activeCategory.children && activeCategory.children.length > 0 && (
          <div className="absolute left-0 right-0 top-full bg-white border-t-2 border-blue-500 shadow-2xl z-50" style={{ animation: 'fadeIn 0.15s ease-out' }}>
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="grid grid-cols-4 gap-x-8 gap-y-5 max-h-[60vh] overflow-y-auto">
                {activeCategory.children.map(sub => (
                  <div key={sub.id}>
                    <Link href={`/categories/${sub.slug}`} className="flex items-center gap-3 mb-2 group/s">
                      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                        {sub.image ? <img src={sub.image} alt="" className="max-w-full max-h-full object-contain" /> : <span className="text-sm font-bold text-gray-300">{sub.name.charAt(0)}</span>}
                      </div>
                      <span className="text-sm font-bold text-gray-900 group-hover/s:text-blue-600">{sub.name}</span>
                    </Link>
                    {sub.children && sub.children.length > 0 && (
                      <div className="space-y-0.5 ml-[52px]">
                        {sub.children.slice(0, 8).map(gc => (
                          <Link key={gc.id} href={`/categories/${gc.slug}`} className="block text-xs text-gray-500 hover:text-blue-600">• {gc.name}</Link>
                        ))}
                        {sub.children.length > 8 && <Link href={`/categories/${sub.slug}`} className="block text-xs text-blue-600 font-medium">+{sub.children.length - 8} ďalších</Link>}
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
        <form onSubmit={handleSearch} className="flex rounded-xl overflow-hidden border-2 border-gray-200">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať..." className="flex-1 px-4 py-2 text-sm focus:outline-none" />
          <button type="submit" className="px-4 text-white bg-blue-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
        </form>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-[300px] max-w-[85vw] bg-white z-50 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 bg-blue-600 text-white">
              <span className="text-lg font-bold">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">✕</button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-60px)]">
              {navCategories.map(({ cat, label }) => (
                <Link key={cat.id} href={`/categories/${cat.slug}`} className="flex items-center gap-3 px-4 py-3 border-b hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                    {cat.image ? <img src={cat.image} alt="" className="max-w-full max-h-full object-contain" /> : <span className="text-sm font-bold text-gray-400">{label.charAt(0)}</span>}
                  </div>
                  <span className="font-medium text-gray-800 text-sm">{label}</span>
                </Link>
              ))}
              <div className="border-t mt-2 pt-2">
                <Link href="/page/obchodne-podmienky" className="block px-4 py-2 text-sm text-gray-600" onClick={() => setMobileMenuOpen(false)}>Obchodné podmienky</Link>
                <Link href="/page/doprava-a-platba" className="block px-4 py-2 text-sm text-gray-600" onClick={() => setMobileMenuOpen(false)}>Doprava a platba</Link>
                <Link href="/page/kontakt" className="block px-4 py-2 text-sm text-gray-600" onClick={() => setMobileMenuOpen(false)}>Kontakt</Link>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </header>
  )
}
