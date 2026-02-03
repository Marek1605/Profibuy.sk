'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import { useAuthStore } from '@/lib/store'
import { formatPrice } from '@/lib/api'
import type { Order } from '@/types'

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Cakajuca', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Zaplatena', color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Spracovava sa', color: 'bg-indigo-100 text-indigo-800' },
  shipped: { label: 'Odoslana', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Dorucena', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Zrusena', color: 'bg-red-100 text-red-800' },
}

export default function AccountOrdersPage() {
  const { token } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!token) return
      try {
        const res = await fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          setOrders(data.items || [])
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [token])

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/account" className="hover:text-gray-800">Moj ucet</Link>
          <span>/</span>
          <span className="text-gray-800">Objednavky</span>
        </div>

        <h1 className="text-2xl font-bold mb-8">Moje objednavky</h1>

        {loading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-24" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-xl mb-4">Zatial ziadne objednavky</p>
            <Link href="/products" className="text-blue-600 hover:underline">Zacat nakupovat</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const status = statusLabels[order.status] || { label: order.status, color: 'bg-gray-100' }
              return (
                <div key={order.id} className="bg-white border rounded-lg p-4 hover:shadow-sm transition">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold">#{order.order_number}</span>
                      <span className="text-sm text-gray-500 ml-3">{new Date(order.created_at).toLocaleDateString('sk-SK')}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{order.items?.length || 0} poloziek</span>
                    <span className="font-bold">{formatPrice(order.total)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
