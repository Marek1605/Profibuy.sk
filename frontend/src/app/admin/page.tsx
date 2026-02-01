'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { formatPrice } from '@/lib/api'

interface Stats {
  total_revenue: number
  today_revenue: number
  total_orders: number
  today_orders: number
  pending_orders: number
  total_products: number
  low_stock_products: number
  total_customers: number
}

export default function AdminDashboard() {
  const { token } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) setStats(await res.json())
      } catch {}
    }
    if (token) load()
  }, [token])

  const cards = [
    { label: 'Celkove trzby', value: formatPrice(stats?.total_revenue || 0), icon: '💰', color: 'bg-green-50 border-green-200' },
    { label: 'Trzby dnes', value: formatPrice(stats?.today_revenue || 0), icon: '📈', color: 'bg-blue-50 border-blue-200' },
    { label: 'Celkom objednavok', value: String(stats?.total_orders || 0), icon: '🛒', color: 'bg-purple-50 border-purple-200' },
    { label: 'Dnes objednavok', value: String(stats?.today_orders || 0), icon: '📦', color: 'bg-orange-50 border-orange-200' },
    { label: 'Cakajuce', value: String(stats?.pending_orders || 0), icon: '⏳', color: 'bg-yellow-50 border-yellow-200' },
    { label: 'Produktov', value: String(stats?.total_products || 0), icon: '📋', color: 'bg-indigo-50 border-indigo-200' },
    { label: 'Nizky sklad', value: String(stats?.low_stock_products || 0), icon: '⚠️', color: 'bg-red-50 border-red-200' },
    { label: 'Zakaznikov', value: String(stats?.total_customers || 0), icon: '👥', color: 'bg-teal-50 border-teal-200' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className={`${card.color} border rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{card.icon}</span>
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm text-gray-600">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-bold mb-4">Rychle akcie</h2>
          <div className="space-y-2">
            <Link href="/admin/products" className="block p-3 bg-gray-50 rounded hover:bg-gray-100 transition">📦 Spravovat produkty</Link>
            <Link href="/admin/orders" className="block p-3 bg-gray-50 rounded hover:bg-gray-100 transition">🛒 Spravovat objednavky</Link>
            <Link href="/admin/suppliers" className="block p-3 bg-gray-50 rounded hover:bg-gray-100 transition">🏭 Import z dodavatelov</Link>
            <Link href="/admin/categories" className="block p-3 bg-gray-50 rounded hover:bg-gray-100 transition">📁 Spravovat kategorie</Link>
            <Link href="/admin/settings" className="block p-3 bg-gray-50 rounded hover:bg-gray-100 transition">⚙️ Nastavenia obchodu</Link>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-bold mb-4">Info</h2>
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">Vitajte v administracii ProfiBuy.sk. Odtialto mozete spravovat cely vas e-shop.</p>
            <div className="border-t pt-3">
              <p><strong>Verzia:</strong> 1.0.0</p>
              <p><strong>Backend:</strong> Go + PostgreSQL</p>
              <p><strong>Frontend:</strong> Next.js 14</p>
              <p><strong>Server:</strong> Coolify Docker</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
