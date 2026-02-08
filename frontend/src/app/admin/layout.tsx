'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/products', label: 'Produkty', icon: '📦' },
  { href: '/admin/categories', label: 'Kategorie', icon: '📁' },
  { href: '/admin/navigation', label: 'Navigácia', icon: '🧭' },
  { href: '/admin/pages', label: 'Stránky', icon: '📝' },
  { href: '/admin/orders', label: 'Objednavky', icon: '🛒' },
  { href: '/admin/suppliers', label: 'Dodavatelia', icon: '🏭' },
  { href: '/admin/filters', label: 'Filtrovanie', icon: '🔍' },
  { href: '/admin/export', label: 'XML Export', icon: '📤' },
  { href: '/admin/settings', label: 'Nastavenia', icon: '⚙️' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const token = useAuthStore(s => s.token)
  const logout = useAuthStore(s => s.logout)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setChecked(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!checked) return
    // Allow login page without auth
    if (pathname === '/admin/login') return
    if (!token || !user) {
      router.replace('/admin/login')
    } else if (user.role !== 'admin') {
      router.replace('/')
    }
  }, [checked, token, user, router, pathname])

  // Login page - render without sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  // Loading / not authenticated
  if (!checked || !token || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Overujem prístup...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-gray-900 text-white flex-shrink-0 hidden lg:flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <Link href="/admin" className="text-xl font-bold">ProfiBuy Admin</Link>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 text-sm transition ${active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-700 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
              {user.email?.charAt(0).toUpperCase()}
            </span>
            <span className="truncate">{user.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition">← Obchod</Link>
            <span className="text-gray-600">|</span>
            <button onClick={() => { logout(); router.push('/') }} className="text-sm text-red-400 hover:text-red-300 transition">
              Odhlásiť
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="lg:hidden">
            <Link href="/admin" className="font-bold text-lg">ProfiBuy Admin</Link>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">Zobrazit obchod</Link>
            <button onClick={() => { logout(); router.push('/') }} className="text-sm text-red-500 hover:text-red-700">Odhlásiť sa</button>
          </div>
        </header>

        <div className="lg:hidden flex overflow-x-auto gap-1 p-2 bg-white border-b">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-1 px-3 py-2 rounded text-xs whitespace-nowrap ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <span>{item.icon}</span> {item.label}
              </Link>
            )
          })}
        </div>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
