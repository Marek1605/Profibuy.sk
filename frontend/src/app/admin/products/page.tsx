'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { formatPrice, getProductImage } from '@/lib/api'
import type { Product } from '@/types'

export default function AdminProductsPage() {
  const { token } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  async function loadProducts() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/products?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setProducts(d.items || []); setTotal(d.total || 0) }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadProducts() }, [page, token])

  async function handleDelete(id: string) {
    if (!confirm('Naozaj chcete zmazat tento produkt?')) return
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    loadProducts()
  }

  async function deleteAll() {
    const input = prompt('POZOR! Toto vymaže VŠETKY produkty z katalógu.\n\nNapíšte "VYMAZAT" pre potvrdenie:')
    if (input !== 'VYMAZAT') { alert('Mazanie zrušené.'); return }
    
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/products/delete-all', { 
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` } 
      })
      const data = await res.json()
      if (data.success) {
        alert(`Vymazaných ${data.deleted} produktov`)
        loadProducts()
      } else {
        alert('Chyba: ' + (data.error || 'Neznáma chyba'))
      }
    } catch (err) {
      alert('Chyba pri mazaní')
    }
    setDeleting(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Produkty ({total})</h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={deleteAll} 
            disabled={deleting || total === 0}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
          >
            {deleting ? 'Mažem...' : 'Vymazať všetko'}
          </button>
          <Link href="/admin/products/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">+ Novy produkt</Link>
        </div>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Hladat produkty..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadProducts()} className="border rounded px-3 py-2 w-full max-w-md" />
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Produkt</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-right">Cena</th>
              <th className="px-4 py-3 text-right">Sklad</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="bg-gray-100 animate-pulse h-6 rounded" /></td></tr>
              ))
            ) : products.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">Ziadne produkty</td></tr>
            ) : products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={getProductImage(p)} alt="" className="w-10 h-10 rounded object-cover" />
                    <span className="font-medium truncate max-w-[200px]">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                <td className="px-4 py-3 text-right font-medium">{formatPrice(p.sale_price || p.price)}</td>
                <td className="px-4 py-3 text-right">{p.stock}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${p.status === 'active' ? 'bg-green-100 text-green-800' : p.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/products/${p.id}`} className="text-blue-600 hover:underline mr-3">Upravit</Link>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline">Zmazat</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: Math.ceil(total / 20) }).slice(0, 10).map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={`px-3 py-1 border rounded text-sm ${page === i + 1 ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}>{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  )
}
