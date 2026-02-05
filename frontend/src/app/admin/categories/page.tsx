'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { getCategories } from '@/lib/api'
import type { Category } from '@/types'
import { Trash2, Loader2, RefreshCw } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

export default function AdminCategoriesPage() {
  const { token } = useAuthStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', description: '', parent_id: '' })

  async function load() {
    setLoading(true)
    try { const data = await getCategories(); setCategories(data || []) } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      await fetch(`${API_BASE}/admin/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      })
      setShowForm(false)
      setForm({ name: '', slug: '', description: '', parent_id: '' })
      load()
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm('Naozaj zmazať kategóriu?')) return
    await fetch(`${API_BASE}/admin/categories/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    load()
  }

  async function handleDeleteAll() {
    if (!confirm('Naozaj vymazať VŠETKY kategórie? Táto akcia je nevratná!')) return
    if (!confirm('Ste si istý? Všetky kategórie budú vymazané!')) return
    
    setActionLoading('deleteAll')
    try {
      const res = await fetch(`${API_BASE}/admin/categories/all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        alert(`Vymazaných ${data.deleted} kategórií`)
        load()
      } else {
        alert('Chyba: ' + (data.error || 'Neznáma chyba'))
      }
    } catch (err) {
      alert('Chyba pri mazaní')
    } finally {
      setActionLoading(null)
    }
  }

  // Count all categories including nested
  function countCategories(cats: Category[]): number {
    let count = cats.length
    for (const cat of cats) {
      if (cat.children && cat.children.length > 0) {
        count += countCategories(cat.children)
      }
    }
    return count
  }

  function renderCategory(cat: Category, level = 0): React.ReactNode {
    return (
      <div key={cat.id}>
        <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 border-b" style={{ paddingLeft: `${level * 24 + 16}px` }}>
          <div className="flex items-center gap-2">
            {level > 0 && <span className="text-gray-300 mr-2">{'└─'}</span>}
            <span className="font-medium">{cat.name}</span>
            <span className="text-gray-400 text-sm ml-2">({cat.product_count || 0} produktov)</span>
          </div>
          <div className="flex gap-3 text-sm items-center">
            <span className="text-gray-400">{cat.slug}</span>
            <button onClick={() => handleDelete(cat.id)} className="text-red-600 hover:underline">Zmazať</button>
          </div>
        </div>
        {cat.children?.map(child => renderCategory(child, level + 1))}
      </div>
    )
  }

  const totalCategories = countCategories(categories)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kategórie</h1>
          <p className="text-gray-500 text-sm">{totalCategories} kategórií celkom</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => load()} 
            className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title="Obnoviť"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={handleDeleteAll}
            disabled={actionLoading !== null || categories.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
          >
            {actionLoading === 'deleteAll' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Vymazať všetky
          </button>
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Nová kategória
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded-lg p-4 mb-6 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input 
              type="text" 
              placeholder="Názov" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[áä]/g, 'a').replace(/[éě]/g, 'e').replace(/[íý]/g, 'i').replace(/[óô]/g, 'o').replace(/[úů]/g, 'u').replace(/č/g, 'c').replace(/ď/g, 'd').replace(/ľĺ/g, 'l').replace(/ň/g, 'n').replace(/ř/g, 'r').replace(/š/g, 's').replace(/ť/g, 't').replace(/ž/g, 'z')})} 
              className="border rounded px-3 py-2" 
              required 
            />
            <input 
              type="text" 
              placeholder="Slug" 
              value={form.slug} 
              onChange={e => setForm({...form, slug: e.target.value})} 
              className="border rounded px-3 py-2" 
            />
          </div>
          <select 
            value={form.parent_id} 
            onChange={e => setForm({...form, parent_id: e.target.value})}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">-- Bez nadradenej kategórie --</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <textarea 
            placeholder="Popis" 
            value={form.description} 
            onChange={e => setForm({...form, description: e.target.value})} 
            className="w-full border rounded px-3 py-2 h-20" 
          />
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Vytvoriť</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm">Zrušiť</button>
          </div>
        </form>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Načítavam...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Žiadne kategórie. Vytvorte novú alebo prepojte kategórie z dodávateľov.
          </div>
        ) : (
          categories.map(cat => renderCategory(cat))
        )}
      </div>
    </div>
  )
}
