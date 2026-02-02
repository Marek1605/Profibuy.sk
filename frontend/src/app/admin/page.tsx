'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { formatPrice } from '@/lib/api'

export default function AdminDashboard() {
  const { token } = useAuthStore()
  const [stats, setStats] = useState<Record<string, number>>({})

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
    { label: 'Celkove trzby', value: formatPrice(stats.total_revenue || 0), icon: '💰', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Trzby dnes', value: formatPrice(stats.today_revenue || 0), icon: '📈', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: 'Objednavky', value: String(stats.total_orders || 0), icon: '🛒', bg: 'bg-purple-50', border: 'border-purple-200' },
    { label: 'Objednavky dnes', value: String(stats.today_orders || 0), icon: '📦', bg: 'bg-orange-50', border: 'border-orange-200' },
    { label: 'Cakajuce', value: String(stats.pending_orders || 0), icon: '⏳', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    { label: 'Produktov', value: String(stats.total_products || 0), icon: '📋', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className={`${c.bg} ${c.border} border rounded-2xl p-5`}>
            <span className="text-2xl">{c.icon}</span>
            <p className="text-2xl font-extrabold mt-2">{c.value}</p>
            <p className="text-sm text-gray-600 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-bold mb-4">Rychle akcie</h2>
          <div className="space-y-2">
            {[
              { href: '/admin/products', label: '📦 Spravovat produkty' },
              { href: '/admin/orders', label: '🛒 Spravovat objednavky' },
              { href: '/admin/suppliers', label: '🏭 Import z dodavatelov' },
              { href: '/admin/categories', label: '📁 Spravovat kategorie' },
              { href: '/admin/settings', label: '⚙️ Nastavenia obchodu' },
            ].map(a => (
              <Link key={a.href} href={a.href} className="block p-3 bg-gray-50 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition text-sm font-medium">{a.label}</Link>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-bold mb-4">System info</h2>
          <div className="text-sm space-y-2 text-gray-600">
            <p><strong>Backend:</strong> Go + PostgreSQL + Redis</p>
            <p><strong>Frontend:</strong> Next.js 14 + Tailwind</p>
            <p><strong>Deploy:</strong> Coolify Docker</p>
            <p><strong>Verzia:</strong> 2.0.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
