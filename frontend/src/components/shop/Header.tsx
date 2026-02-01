'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useCartStore, useUIStore, useAuthStore } from '@/lib/store'
import { Search, ShoppingCart, User, Menu, X } from 'lucide-react'

export function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const { getItemCount } = useCartStore()
  const { isMobileMenuOpen, toggleMobileMenu, toggleCart } = useUIStore()
  const { user, logout } = useAuthStore()

  const itemCount = getItemCount()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/products?q=${encodeURIComponent(searchQuery)}`
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      {/* Top bar */}
      <div className="bg-foreground text-white text-sm py-2">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <p>Doprava zadarmo nad 50 €</p>
          <div className="flex gap-4">
            <Link href="/contact" className="hover:text-white/80">Kontakt</Link>
            <Link href="/tracking" className="hover:text-white/80">Sledovať zásielku</Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 hover:bg-muted rounded-lg"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-primary">
            MegaShop
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-auto">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Hľadať produkty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pr-12"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-secondary hover:text-primary"
              >
                <Search size={20} />
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* User */}
            {user ? (
              <div className="relative group">
                <button className="p-2 hover:bg-muted rounded-lg flex items-center gap-2">
                  <User size={24} />
                  <span className="hidden lg:inline">{user.first_name}</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-border py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link href="/account" className="block px-4 py-2 hover:bg-muted">
                    Môj účet
                  </Link>
                  <Link href="/account/orders" className="block px-4 py-2 hover:bg-muted">
                    Objednávky
                  </Link>
                  <hr className="my-2" />
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 hover:bg-muted text-error"
                  >
                    Odhlásiť sa
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/login" className="p-2 hover:bg-muted rounded-lg flex items-center gap-2">
                <User size={24} />
                <span className="hidden lg:inline">Prihlásiť</span>
              </Link>
            )}

            {/* Cart */}
            <button
              onClick={toggleCart}
              className="p-2 hover:bg-muted rounded-lg relative"
            >
              <ShoppingCart size={24} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={handleSearch} className="md:hidden mt-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Hľadať produkty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-12"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-secondary hover:text-primary"
            >
              <Search size={20} />
            </button>
          </div>
        </form>
      </div>

      {/* Navigation */}
      <nav className="hidden lg:block border-t border-border">
        <div className="container mx-auto px-4">
          <ul className="flex gap-8 py-3">
            <li>
              <Link href="/products" className="hover:text-primary">
                Všetky produkty
              </Link>
            </li>
            <li>
              <Link href="/products?on_sale=true" className="text-error hover:text-error/80">
                Výpredaj
              </Link>
            </li>
            <li>
              <Link href="/products?sort=newest" className="hover:text-primary">
                Novinky
              </Link>
            </li>
            <li>
              <Link href="/categories" className="hover:text-primary">
                Kategórie
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-white">
          <nav className="container mx-auto px-4 py-4">
            <ul className="space-y-4">
              <li>
                <Link href="/products" className="block py-2 hover:text-primary" onClick={toggleMobileMenu}>
                  Všetky produkty
                </Link>
              </li>
              <li>
                <Link href="/products?on_sale=true" className="block py-2 text-error" onClick={toggleMobileMenu}>
                  Výpredaj
                </Link>
              </li>
              <li>
                <Link href="/products?sort=newest" className="block py-2 hover:text-primary" onClick={toggleMobileMenu}>
                  Novinky
                </Link>
              </li>
              <li>
                <Link href="/categories" className="block py-2 hover:text-primary" onClick={toggleMobileMenu}>
                  Kategórie
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  )
}
