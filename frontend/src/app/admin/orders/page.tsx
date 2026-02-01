'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { formatPrice } from '@/lib/api'
import type { Order } from '@/types'

const statusOptions = [
  { value: '', label: 'Vsetky' },
  { value: 'pending', label: 'Cakajuce' },
  { value: 'paid', label: 'Zaplatene' },
  { value: 'processing', label: 'Spracovavaju sa' },
  { value: 'shipped', label: 'Odoslane' },
  { value: 'delivered', label: 'Dorucene' },
  { value: 'cancelled', label: 'Zrusene' },
]

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function AdminOrdersPage() {
  const { token } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  async function loadOrders() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter) params.set('status', filter)
      const res = await fetch(`/api/admin/orders?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setOrders(d.items || []); setTotal(d.total || 0) }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadOrders() }, [filter, token])

  async function updateStatus(orderId: string, status: string) {
    try {
      await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      })
      loadOrders()
    } catch {}
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Objednavky ({total})</h1>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {statusOptions.map(s => (
          <button key={s.value} onClick={() => setFilter(s.value)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${filter === s.value ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{s.label}</button>
        ))}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Objednavka</th>
              <th className="px-4 py-3 text-left">Zakaznik</th>
              <th className="px-4 py-3 text-right">Suma</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-left">Datum</th>
              <th className="px-4 py-3 text-right">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="bg-gray-100 animate-pulse h-6 rounded" /></td></tr>)
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">Ziadne objednavky</td></tr>
            ) : orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">#{order.order_number}</td>
                <td className="px-4 py-3">
                  <div className="text-sm">{order.billing_address?.first_name} {order.billing_address?.last_name}</div>
                  <div className="text-xs text-gray-500">{order.billing_address?.email}</div>
                </td>
                <td className="px-4 py-3 text-right font-bold">{formatPrice(order.total)}</td>
                <td className="px-4 py-3 text-center">
                  <select value={order.status} onChange={e => updateStatus(order.id, e.target.value)} className={`px-2 py-1 rounded text-xs font-medium border-0 ${statusColors[order.status] || 'bg-gray-100'}`}>
                    {statusOptions.filter(s => s.value).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('sk-SK')}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:underline text-sm">Detail</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
