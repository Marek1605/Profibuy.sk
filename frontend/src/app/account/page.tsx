'use client'

import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import { useAuthStore } from '@/lib/store'

export default function AccountPage() {
  const { user, logout } = useAuthStore()

  if (!user) {
    return (
      <>
        <Header />
        <main className="max-w-md mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Prihlaste sa</h1>
          <Link href="/login" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-block">Prihlasenie</Link>
        </main>
        <Footer />
      </>
    )
  }

  const menuItems = [
    { href: '/account/orders', label: 'Moje objednavky', icon: '📦', desc: 'Prehlad vasich objednavok' },
    { href: '/account/addresses', label: 'Adresy', icon: '📍', desc: 'Spravovat dodacie adresy' },
    { href: '/account/settings', label: 'Nastavenia', icon: '⚙️', desc: 'Zmena hesla a udajov' },
  ]

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Moj ucet</h1>
            <p className="text-gray-600">Vitajte, {user.first_name} {user.last_name}</p>
          </div>
          <button onClick={logout} className="text-red-600 hover:text-red-800 text-sm font-medium">Odhlasit sa</button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map(item => (
            <Link key={item.href} href={item.href} className="p-6 bg-white border rounded-lg hover:shadow-md transition">
              <span className="text-3xl">{item.icon}</span>
              <h2 className="font-bold mt-3">{item.label}</h2>
              <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="font-bold mb-3">Udaje uctu</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Email:</span> {user.email}</div>
            <div><span className="text-gray-500">Telefon:</span> {user.phone || 'Nevyplnene'}</div>
            <div><span className="text-gray-500">Rola:</span> {user.role === 'admin' ? 'Administrator' : 'Zakaznik'}</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
