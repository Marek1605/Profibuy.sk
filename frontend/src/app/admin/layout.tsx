'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/products', label: 'Produkty', icon: '📦' },
  { href: '/admin/categories', label: 'Kategorie', icon: '📁' },
  { href: '/admin/orders', label: 'Objednavky', icon: '🛒' },
  { href: '/admin/suppliers', label: 'Dodavatelia', icon: '🏭' },
  { href: '/admin/settings', label: 'Nastavenia', icon: '⚙️' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
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
        <div className="p-4 border-t border-gray-700">
          <Link href="/" className="text-sm text-gray-400 hover:text-white">← Spat na obchod</Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="lg:hidden">
            <Link href="/admin" className="font-bold text-lg">ProfiBuy Admin</Link>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">Zobrazit obchod</Link>
          </div>
        </header>

        {/* Mobile nav */}
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

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
