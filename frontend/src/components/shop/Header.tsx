'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCartStore, useAuthStore } from '@/lib/store'

export default function Header() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const getItemCount = useCartStore(s => s.getItemCount)
  const user = useAuthStore(s => s.user)
  const cartCount = getItemCount()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/search?q=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white text-sm">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
          <span>Doprava zadarmo nad 50 EUR</span>
          <div className="hidden sm:flex items-center gap-4">
            <Link href="/contact" className="hover:underline">Kontakt</Link>
            <Link href="/order-tracking" className="hover:underline">Sledovat zasielku</Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Mobile menu button */}
        <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-blue-700 flex-shrink-0">ProfiBuy</Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:flex">
          <div className="flex w-full">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Hladat produkty..." className="flex-1 border border-r-0 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-r-lg hover:bg-blue-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/account" className="flex items-center gap-1 text-sm hover:text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span className="hidden sm:inline">{user.first_name}</span>
            </Link>
          ) : (
            <Link href="/login" className="flex items-center gap-1 text-sm hover:text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span className="hidden sm:inline">Prihlasit</span>
            </Link>
          )}
          <Link href="/cart" className="relative p-2 hover:text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{cartCount}</span>
            )}
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 hidden lg:flex items-center gap-6 py-2 text-sm font-medium border-t">
        <Link href="/products" className="hover:text-blue-600">Vsetky produkty</Link>
        <Link href="/products?on_sale=true" className="text-red-600 hover:text-red-700">Vypredaj</Link>
        <Link href="/products?sort=newest" className="hover:text-blue-600">Novinky</Link>
        <Link href="/categories" className="hover:text-blue-600">Kategorie</Link>
      </nav>

      {/* Mobile search */}
      <div className="md:hidden px-4 pb-3">
        <form onSubmit={handleSearch} className="flex">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Hladat..." className="flex-1 border rounded-l px-3 py-2 text-sm" />
          <button type="submit" className="bg-blue-600 text-white px-4 rounded-r">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
        </form>
      </div>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="lg:hidden bg-white border-t">
          <Link href="/products" className="block px-4 py-3 border-b hover:bg-gray-50" onClick={() => setMobileMenu(false)}>Vsetky produkty</Link>
          <Link href="/products?on_sale=true" className="block px-4 py-3 border-b hover:bg-gray-50 text-red-600" onClick={() => setMobileMenu(false)}>Vypredaj</Link>
          <Link href="/categories" className="block px-4 py-3 border-b hover:bg-gray-50" onClick={() => setMobileMenu(false)}>Kategorie</Link>
          <Link href="/account" className="block px-4 py-3 border-b hover:bg-gray-50" onClick={() => setMobileMenu(false)}>Moj ucet</Link>
        </div>
      )}
    </header>
  )
}
