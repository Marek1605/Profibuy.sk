'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { getCategories } from '@/lib/api'
import type { Category } from '@/types'

export default function AdminCategoriesPage() {
  const { token } = useAuthStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
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
      await fetch('/api/admin/categories', {
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
    if (!confirm('Naozaj zmazat kategoriu?')) return
    await fetch(`/api/admin/categories/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    load()
  }

  function renderCategory(cat: Category, level = 0): React.ReactNode {
    return (
      <div key={cat.id}>
        <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 border-b" style={{ paddingLeft: `${level * 24 + 16}px` }}>
          <div>
            {level > 0 && <span className="text-gray-300 mr-2">{'└─'}</span>}
            <span className="font-medium">{cat.name}</span>
            <span className="text-gray-400 text-sm ml-2">({cat.product_count} produktov)</span>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="text-gray-400">{cat.slug}</span>
            <button onClick={() => handleDelete(cat.id)} className="text-red-600 hover:underline">Zmazat</button>
          </div>
        </div>
        {cat.children?.map(child => renderCategory(child, level + 1))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kategorie</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">+ Nova kategoria</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded-lg p-4 mb-6 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Nazov" value={form.name} onChange={e => setForm({...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} className="border rounded px-3 py-2" required />
            <input type="text" placeholder="Slug" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="border rounded px-3 py-2" />
          </div>
          <textarea placeholder="Popis" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded px-3 py-2 h-20" />
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Vytvorit</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm">Zrusit</button>
          </div>
        </form>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Nacitavam...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Ziadne kategorie</div>
        ) : (
          categories.map(cat => renderCategory(cat))
        )}
      </div>
    </div>
  )
}
