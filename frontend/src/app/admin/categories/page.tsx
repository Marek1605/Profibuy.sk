'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { getCategories } from '@/lib/api'
import type { Category } from '@/types'
import { Trash2, Loader2, RefreshCw, ChevronRight, ChevronDown, ImagePlus, Pencil, Save, X, Upload, Eye, EyeOff } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

export default function AdminCategoriesPage() {
  const { token } = useAuthStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', description: '', parent_id: '' })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', slug: '', description: '', image: '' })
  const [thumbnailModal, setThumbnailModal] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { const data = await getCategories(); setCategories(data || []) } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

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
    } catch { alert('Chyba pri mazaní') }
    finally { setActionLoading(null) }
  }

  async function handleAutoThumbnails() {
    if (!confirm('Automaticky nastaviť obrázky kategórií z produktov? Nastaví sa len kategóriám bez obrázku.')) return
    setActionLoading('autoThumbnails')
    try {
      const res = await fetch(`${API_BASE}/admin/categories/auto-thumbnails`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        alert(data.message || `Aktualizovaných ${data.updated} kategórií`)
        load()
      } else {
        alert('Chyba: ' + (data.error || 'Neznáma chyba'))
      }
    } catch { alert('Chyba pri nastavovaní obrázkov') }
    finally { setActionLoading(null) }
  }

  async function handleUpdate(id: string) {
    try {
      await fetch(`${API_BASE}/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm)
      })
      setEditingId(null)
      load()
    } catch { alert('Chyba pri ukladaní') }
  }

  async function handleSetThumbnail(id: string) {
    if (!thumbnailUrl.trim()) return
    try {
      await fetch(`${API_BASE}/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image: thumbnailUrl })
      })
      setThumbnailModal(null)
      setThumbnailUrl('')
      load()
    } catch { alert('Chyba pri nastavení obrázku') }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function expandAll() {
    const ids = new Set<string>()
    function collect(cats: Category[]) {
      for (const c of cats) {
        if (c.children && c.children.length > 0) {
          ids.add(c.id)
          collect(c.children)
        }
      }
    }
    collect(categories)
    setExpanded(ids)
  }

  function collapseAll() { setExpanded(new Set()) }

  function countCategories(cats: Category[]): number {
    let count = cats.length
    for (const cat of cats) {
      if (cat.children && cat.children.length > 0) count += countCategories(cat.children)
    }
    return count
  }

  // Flatten categories for parent select
  function flattenCategories(cats: Category[], prefix = ''): { id: string; label: string }[] {
    const result: { id: string; label: string }[] = []
    for (const cat of cats) {
      result.push({ id: cat.id, label: prefix + cat.name })
      if (cat.children && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, prefix + '  └─ '))
      }
    }
    return result
  }

  function renderCategory(cat: Category, level = 0): React.ReactNode {
    const hasChildren = cat.children && cat.children.length > 0
    const isExpanded = expanded.has(cat.id)
    const isEditing = editingId === cat.id

    return (
      <div key={cat.id}>
        <div 
          className={`flex items-center justify-between py-2.5 px-4 hover:bg-gray-50 border-b transition-colors ${level === 0 ? 'bg-white' : 'bg-gray-50/50'} ${cat.published === false ? 'opacity-40' : ''}`} 
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Expand/collapse toggle */}
            {hasChildren ? (
              <button 
                onClick={() => toggleExpand(cat.id)} 
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition flex-shrink-0"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>
            ) : (
              <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
              </span>
            )}

            {/* Thumbnail */}
            {cat.image ? (
              <img src={cat.image} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border" />
            ) : (
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 border border-dashed border-gray-300">
                <span className="text-gray-400 text-xs font-bold">{cat.name.charAt(0)}</span>
              </div>
            )}

            {/* Name & info */}
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="border rounded px-2 py-1 text-sm flex-1 min-w-0"
                  autoFocus
                />
                <button onClick={() => handleUpdate(cat.id)} className="text-green-600 hover:text-green-800"><Save className="w-4 h-4" /></button>
                <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <span className="font-medium text-gray-900 truncate block text-sm">{cat.name}</span>
                <span className="text-gray-400 text-xs">
                  {(cat.product_count || 0)} produktov
                  {hasChildren && ` · ${cat.children!.length} podkat.`}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <span className="text-gray-300 text-xs mr-2 hidden sm:inline">{cat.slug}</span>
              {/* Published toggle */}
              {level === 0 && (
                <button
                  onClick={async () => {
                    const newVal = cat.published === false ? true : false
                    try {
                      await fetch(`${API_BASE}/admin/categories/${cat.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ published: newVal })
                      })
                      load()
                    } catch {}
                  }}
                  className={`p-1.5 rounded transition ${cat.published === false ? 'bg-red-50 text-red-400 hover:text-red-600' : 'hover:bg-green-50 text-green-500 hover:text-green-700'}`}
                  title={cat.published === false ? 'Skrytá - klikni pre zobrazenie' : 'Viditeľná - klikni pre skrytie'}
                >
                  {cat.published === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
              <button 
                onClick={() => { setThumbnailModal(cat.id); setThumbnailUrl(cat.image || '') }}
                className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition" 
                title="Nastaviť obrázok"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
              <button 
                onClick={() => { setEditingId(cat.id); setEditForm({ name: cat.name, slug: cat.slug, description: cat.description, image: cat.image }) }}
                className="p-1.5 rounded hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition" 
                title="Upraviť"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(cat.id)} 
                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition" 
                title="Zmazať"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Children - expandable */}
        {hasChildren && isExpanded && (
          <div>
            {cat.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const totalCategories = countCategories(categories)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kategórie</h1>
          <p className="text-gray-500 text-sm">{totalCategories} kategórií celkom · {categories.length} hlavných</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={load} className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" title="Obnoviť">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={expandAll} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border">
            Rozbaliť
          </button>
          <button onClick={collapseAll} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border">
            Zbaliť
          </button>
          <button 
            onClick={handleDeleteAll}
            disabled={actionLoading !== null || categories.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
          >
            {actionLoading === 'deleteAll' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Vymazať všetky
          </button>
          <button 
            onClick={handleAutoThumbnails}
            disabled={actionLoading !== null || categories.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
          >
            {actionLoading === 'autoThumbnails' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            Auto-obrázky
          </button>
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Nová kategória
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded-lg p-4 mb-6 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input 
              type="text" placeholder="Názov" value={form.name} 
              onChange={e => setForm({...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[áä]/g, 'a').replace(/[éě]/g, 'e').replace(/[íý]/g, 'i').replace(/[óô]/g, 'o').replace(/[úů]/g, 'u').replace(/č/g, 'c').replace(/ď/g, 'd').replace(/[ľĺ]/g, 'l').replace(/ň/g, 'n').replace(/ř/g, 'r').replace(/š/g, 's').replace(/ť/g, 't').replace(/ž/g, 'z')})} 
              className="border rounded px-3 py-2 text-sm" required 
            />
            <input type="text" placeholder="Slug" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="border rounded px-3 py-2 text-sm" />
          </div>
          <select value={form.parent_id} onChange={e => setForm({...form, parent_id: e.target.value})} className="w-full border rounded px-3 py-2 text-sm">
            <option value="">-- Bez nadradenej kategórie (hlavná) --</option>
            {flattenCategories(categories).map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
          <textarea placeholder="Popis" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded px-3 py-2 h-16 text-sm" />
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">Vytvoriť</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm">Zrušiť</button>
          </div>
        </form>
      )}

      {/* Category tree */}
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

      {/* Thumbnail modal */}
      {thumbnailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setThumbnailModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-blue-600" />
              Nastaviť obrázok kategórie
            </h3>
            
            {/* Preview */}
            {thumbnailUrl && (
              <div className="mb-4 border rounded-lg overflow-hidden">
                <img src={thumbnailUrl} alt="Preview" className="w-full h-32 object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">URL obrázku</label>
                <input 
                  type="url" 
                  value={thumbnailUrl} 
                  onChange={e => setThumbnailUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleSetThumbnail(thumbnailModal)}
                  disabled={!thumbnailUrl.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Uložiť
                </button>
                <button 
                  onClick={() => { setThumbnailUrl(''); handleSetThumbnail(thumbnailModal) }}
                  className="px-4 py-2 border rounded-lg text-sm text-red-600 hover:bg-red-50"
                >
                  Odstrániť
                </button>
                <button onClick={() => setThumbnailModal(null)} className="px-4 py-2 border rounded-lg text-sm">
                  Zrušiť
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
