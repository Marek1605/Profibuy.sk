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
}

export default function Header() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [navSettings, setNavSettings] = useState<NavSettings | null>(null)
  const [megaMenuOpen, setMegaMenuOpen] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
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
        try {
          const navRes = await fetch(`${API_BASE}/navigation`)
          const navData = await navRes.json()
          if (navData.success && navData.data?.items && navData.data.items.length > 0) {
            setNavSettings(navData.data)
          }
        } catch (e) {}
      } catch (e) {
        console.error('Failed to load categories:', e)
      }
    }
    load()
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

  // Build nav categories from settings or fallback
  const navCategories: { cat: Category; label: string; showMega: boolean }[] = []
  const megamenuEnabled = navSettings?.megamenu_enabled !== false // default true

  if (navSettings && navSettings.items.length > 0) {
    navSettings.items
      .filter(item => item.visible)
      .sort((a, b) => a.position - b.position)
      .forEach(item => {
        const cat = categories.find(c => c.id === item.category_id)
        if (cat) navCategories.push({ cat, label: item.label_sk || item.label_en || cat.name, showMega: item.show_in_mega })
      })
  } else {
    categories.slice(0, 12).forEach(cat => navCategories.push({ cat, label: cat.name, showMega: true }))
  }

  const activeCategory = categories.find(c => c.id === activeCategoryId)

  return (
    <header className="bg-white">
      {/* Top bar - links */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-blue-600 font-semibold hover:text-blue-700 transition">DOMOV</Link>
            <Link href="/page/obchodne-podmienky" className="text-gray-600 font-semibold hover:text-gray-900 transition">OBCHODNÉ PODMIENKY</Link>
            <Link href="/page/reklamacie-a-vratenie" className="text-gray-600 font-semibold hover:text-gray-900 transition">REKLAMÁCIE A VRÁTENIE TOVARU</Link>
            <Link href="/page/ochrana-osobnych-udajov" className="text-gray-600 font-semibold hover:text-gray-900 transition hidden lg:block">OCHRANA OSOBNÝCH ÚDAJOV</Link>
            <Link href="/page/doprava-a-platba" className="text-gray-600 font-semibold hover:text-gray-900 transition hidden lg:block">DOPRAVA A PLATBA</Link>
            <Link href="/page/kontakt" className="text-gray-600 font-semibold hover:text-gray-900 transition hidden md:block">KONTAKT</Link>
          </div>
        </div>
      </div>

      {/* Main header - logo, search, icons */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-6">
          {/* Mobile menu toggle */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-0.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg bg-blue-600">P</div>
            <div className="ml-1">
              <div className="flex items-baseline">
                <span className="text-2xl font-extrabold text-gray-900 tracking-tight">ROFI</span>
                <span className="text-2xl font-extrabold text-blue-600 tracking-tight">BUY</span>
              </div>
              <span className="text-[10px] text-gray-400 -mt-1 block">.sk</span>
            </div>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:flex">
            <div className="flex w-full rounded-full overflow-hidden border-2 border-gray-200 focus-within:border-blue-500 transition">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať produkt, značku..." className="flex-1 px-5 py-2.5 focus:outline-none text-sm" />
              <button type="submit" className="px-6 text-white bg-blue-600 hover:bg-blue-700 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
            </div>
          </form>

          {/* Right icons */}
          <div className="flex items-center gap-3 ml-auto">
            <button className="hidden md:flex p-2 text-gray-400 hover:text-red-500 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </button>
            
            <Link href={user ? '/account' : '/login'} className="hidden md:flex p-2 text-gray-400 hover:text-gray-700 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </Link>

            <Link href="/cart" className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-blue-600 transition relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
              <span className="text-sm font-semibold">{getTotal().toFixed(2)} €</span>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 left-5 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{cartCount}</span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Category bar - large circular icons like profibuy.sk */}
      <div className="hidden lg:block border-b bg-gray-50/50 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-stretch justify-center gap-0 overflow-x-auto no-scrollbar">
            {navCategories.map(({ cat, label, showMega }) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className={`flex flex-col items-center gap-1.5 px-4 py-4 min-w-[100px] text-center transition group ${
                  activeCategoryId === cat.id ? 'bg-blue-50' : 'hover:bg-gray-100'
                }`}
                onMouseEnter={() => megamenuEnabled && showMega && openMegaMenu(cat)}
                onMouseLeave={scheduleMegaClose}
              >
                {/* Circular icon with image */}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border-2 transition ${
                  activeCategoryId === cat.id ? 'border-blue-500 shadow-md' : 'border-gray-200 group-hover:border-blue-300'
                } bg-white`}>
                  {cat.image ? (
                    <img src={cat.image} alt={label} className="w-12 h-12 object-contain" />
                  ) : (
                    <span className="text-2xl font-bold text-gray-300">{label.charAt(0)}</span>
                  )}
                </div>
                {/* Label */}
                <span className={`text-xs font-semibold leading-tight max-w-[90px] line-clamp-2 ${
                  activeCategoryId === cat.id ? 'text-blue-600' : 'text-gray-700 group-hover:text-blue-600'
                }`}>
                  {label}
                </span>
              </Link>
            ))}
            {/* More button if categories overflow */}
            {navCategories.length > 10 && (
              <Link href="/categories" className="flex flex-col items-center gap-1.5 px-4 py-4 min-w-[80px] text-center group">
                <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-gray-200 bg-white group-hover:border-blue-300 transition">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </div>
                <span className="text-xs font-semibold text-gray-500">Všetky</span>
              </Link>
            )}
          </div>
        </div>

        {/* MEGA MENU DROPDOWN - full width with subcategory images */}
        {megamenuEnabled && megaMenuOpen && activeCategory && activeCategory.children && activeCategory.children.length > 0 && (
          <div 
            className="absolute left-0 right-0 top-full bg-white border-t-2 border-blue-500 shadow-2xl z-50"
            onMouseEnter={cancelMegaClose}
            onMouseLeave={scheduleMegaClose}
            style={{ animation: 'fadeSlideDown 0.15s ease-out' }}
          >
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="grid grid-cols-4 gap-x-8 gap-y-5 max-h-[60vh] overflow-y-auto">
                {activeCategory.children.map(subcat => (
                  <div key={subcat.id}>
                    {/* Subcategory with image */}
                    <Link href={`/categories/${subcat.slug}`} className="flex items-center gap-3 mb-2 group/sub">
                      <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {subcat.image ? (
                          <img src={subcat.image} alt="" className="w-10 h-10 object-contain" />
                        ) : (
                          <span className="text-sm font-bold text-gray-300">{subcat.name.charAt(0)}</span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-gray-900 group-hover/sub:text-blue-600 transition">
                        {subcat.name}
                      </span>
                    </Link>
                    
                    {/* Grandchildren as bullet list */}
                    {subcat.children && subcat.children.length > 0 && (
                      <div className="pl-0 space-y-0.5">
                        {subcat.children.slice(0, 8).map(grandchild => (
                          <Link
                            key={grandchild.id}
                            href={`/categories/${grandchild.slug}`}
                            className="block text-xs text-gray-500 hover:text-blue-600 transition pl-[60px] leading-relaxed"
                          >
                            • {grandchild.name}
                          </Link>
                        ))}
                        {subcat.children.length > 8 && (
                          <Link href={`/categories/${subcat.slug}`} className="block text-xs text-blue-600 font-medium pl-[60px]">
                            +{subcat.children.length - 8} ďalších
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
      </div>

      {/* Mobile search */}
      <div className="md:hidden px-4 py-2 border-b bg-white">
        <form onSubmit={handleSearch} className="flex rounded-full overflow-hidden border-2 border-gray-200">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať..." className="flex-1 px-4 py-2 text-sm focus:outline-none" />
          <button type="submit" className="px-4 text-white bg-blue-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
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
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
                    {cat.image ? <img src={cat.image} alt="" className="w-8 h-8 object-contain" /> : <span className="text-sm font-bold text-gray-400">{label.charAt(0)}</span>}
                  </div>
                  <span className="font-medium text-gray-800 text-sm">{label}</span>
                  {(cat.product_count || 0) > 0 && <span className="text-xs text-gray-400 ml-auto">{cat.product_count}</span>}
                </Link>
              ))}
              <div className="border-t mt-2 pt-2">
                <Link href="/page/obchodne-podmienky" className="block px-4 py-2 text-sm text-gray-600 hover:text-blue-600" onClick={() => setMobileMenuOpen(false)}>Obchodné podmienky</Link>
                <Link href="/page/doprava-a-platba" className="block px-4 py-2 text-sm text-gray-600 hover:text-blue-600" onClick={() => setMobileMenuOpen(false)}>Doprava a platba</Link>
                <Link href="/page/kontakt" className="block px-4 py-2 text-sm text-gray-600 hover:text-blue-600" onClick={() => setMobileMenuOpen(false)}>Kontakt</Link>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  )
}
