'use client'

import { useState, useEffect, useMemo } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface AttributeStat {
  name: string
  product_count: number
  total_values: number
}

interface FilterEnabled {
  enabled: boolean
  max_values: number
}

interface FilterSettings {
  enabled: Record<string, FilterEnabled>
  global_max_values: number
  show_counts: boolean
  display_limit: number
}

export default function AdminFiltersPage() {
  const [attributes, setAttributes] = useState<AttributeStat[]>([])
  const [settings, setSettings] = useState<FilterSettings>({
    enabled: {},
    global_max_values: 10,
    show_counts: true,
    display_limit: 20,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<'success' | 'error' | ''>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [displayLimit, setDisplayLimit] = useState(20)

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [statsRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/admin/attributes/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/filter-settings`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const statsData = await statsRes.json()
      const settingsData = await settingsRes.json()

      if (statsData.success && statsData.data) {
        setAttributes(statsData.data.sort((a: AttributeStat, b: AttributeStat) => b.product_count - a.product_count))
      }
      if (settingsData.success && settingsData.data?.enabled) {
        setSettings({
          enabled: settingsData.data.enabled || {},
          global_max_values: settingsData.data.global_max_values || 10,
          show_counts: settingsData.data.show_counts !== false,
          display_limit: settingsData.data.display_limit || 20,
        })
        setDisplayLimit(settingsData.data.display_limit || 20)
      }
    } catch (err) {
      console.error('Error loading filter data:', err)
    }
    setLoading(false)
  }

  function toggleAttribute(name: string) {
    setSettings(prev => {
      const next = { ...prev, enabled: { ...prev.enabled } }
      if (!next.enabled[name]) {
        next.enabled[name] = { enabled: true, max_values: prev.global_max_values }
      } else {
        next.enabled[name] = { ...next.enabled[name], enabled: !next.enabled[name].enabled }
      }
      return next
    })
  }

  function updateMaxValues(name: string, value: number) {
    setSettings(prev => {
      const next = { ...prev, enabled: { ...prev.enabled } }
      if (!next.enabled[name]) {
        next.enabled[name] = { enabled: true, max_values: value }
      } else {
        next.enabled[name] = { ...next.enabled[name], max_values: value }
      }
      return next
    })
  }

  function isEnabled(name: string) {
    return settings.enabled[name]?.enabled === true
  }

  function getMaxValues(name: string) {
    return settings.enabled[name]?.max_values || settings.global_max_values
  }

  function selectAll() {
    setSettings(prev => {
      const next = { ...prev, enabled: { ...prev.enabled } }
      displayedAttributes.forEach(attr => {
        if (!next.enabled[attr.name]) {
          next.enabled[attr.name] = { enabled: true, max_values: prev.global_max_values }
        } else {
          next.enabled[attr.name] = { ...next.enabled[attr.name], enabled: true }
        }
      })
      return next
    })
  }

  function deselectAll() {
    setSettings(prev => {
      const next = { ...prev, enabled: { ...prev.enabled } }
      displayedAttributes.forEach(attr => {
        if (next.enabled[attr.name]) {
          next.enabled[attr.name] = { ...next.enabled[attr.name], enabled: false }
        }
      })
      return next
    })
  }

  function applyGlobalMaxToAll() {
    setSettings(prev => {
      const next = { ...prev, enabled: { ...prev.enabled } }
      Object.keys(next.enabled).forEach(key => {
        next.enabled[key] = { ...next.enabled[key], max_values: prev.global_max_values }
      })
      return next
    })
  }

  async function saveSettings() {
    setSaving(true)
    setMessage('')
    try {
      const payload = { ...settings, display_limit: displayLimit }
      const res = await fetch(`${API_URL}/admin/filter-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      setMessage(result.success ? 'success' : 'error')
    } catch {
      setMessage('error')
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 4000)
  }

  const filteredAttributes = useMemo(() =>
    searchQuery
      ? attributes.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : attributes
  , [attributes, searchQuery])

  const displayedAttributes = useMemo(() =>
    displayLimit > 0 ? filteredAttributes.slice(0, displayLimit) : filteredAttributes
  , [filteredAttributes, displayLimit])

  const enabledCount = Object.values(settings.enabled).filter(v => v.enabled).length

  if (loading) {
    return (
      <div className="max-w-5xl">
        <div className="text-center py-20">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Načítavam atribúty...</p>
        </div>
      </div>
    )
  }

  if (attributes.length === 0) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Nastavenie filtrov</h1>
        <div className="bg-white rounded-xl shadow-sm p-16 text-center">
          <div className="text-5xl mb-4">📦</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Žiadne atribúty</h2>
          <p className="text-gray-500">Najprv importujte produkty cez dodávateľov a spustite Link All.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nastavenie filtrov</h1>
          <p className="text-sm text-gray-500 mt-1">{attributes.length} atribútov &middot; {enabledCount} aktívnych</p>
        </div>
        <div className="flex items-center gap-3">
          {message === 'success' && <span className="text-sm font-medium text-green-600">✅ Uložené</span>}
          {message === 'error' && <span className="text-sm font-medium text-red-600">❌ Chyba pri ukladaní</span>}
          <button onClick={saveSettings} disabled={saving} className="px-5 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-70" style={{ background: 'var(--accent, #c4956a)' }}>
            {saving ? '⏳ Ukladám...' : '💾 Uložiť'}
          </button>
        </div>
      </div>

      {/* Global settings */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📐 Všeobecné nastavenia</h3>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2.5">
            <label className="text-sm text-gray-500 whitespace-nowrap">Zobraziť atribútov:</label>
            <select value={displayLimit} onChange={e => setDisplayLimit(Number(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[120px]">
              {[{ v: 10, l: 'Top 10' }, { v: 20, l: 'Top 20' }, { v: 50, l: 'Top 50' }, { v: 100, l: 'Top 100' }, { v: 0, l: 'Všetky' }].map(o => (
                <option key={o.v} value={o.v}>{o.l}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2.5">
            <label className="text-sm text-gray-500 whitespace-nowrap">Max. hodnôt na filter:</label>
            <input type="number" value={settings.global_max_values} onChange={e => setSettings(p => ({ ...p, global_max_values: Number(e.target.value) || 10 }))} min={1} max={100} className="w-16 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center" />
            <button onClick={applyGlobalMaxToAll} className="px-3 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 transition">Aplikovať na všetky</button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500">
            <input type="checkbox" checked={settings.show_counts} onChange={e => setSettings(p => ({ ...p, show_counts: e.target.checked }))} className="w-4 h-4 rounded accent-amber-500" />
            Zobrazovať počty
          </label>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <input type="text" placeholder="🔍 Hľadať atribút..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm w-56 bg-white" />
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Zobrazených: {displayedAttributes.length} z {filteredAttributes.length}</span>
          <button onClick={selectAll} className="px-3 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 transition">✓ Vybrať zobrazené</button>
          <button onClick={deselectAll} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition">✗ Zrušiť zobrazené</button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-20 text-center">Aktívny</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase min-w-[200px]">Názov atribútu</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-24">Produktov</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-24">Hodnôt</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-32">Max. na výber</th>
            </tr>
          </thead>
          <tbody>
            {displayedAttributes.map((attr, index) => (
              <tr key={attr.name} className={`border-b border-gray-50 transition ${isEnabled(attr.name) ? 'bg-amber-50/50' : 'hover:bg-gray-50'}`}>
                <td className="px-4 py-3 text-center">
                  <label className="relative inline-block w-11 h-6 cursor-pointer">
                    <input type="checkbox" checked={isEnabled(attr.name)} onChange={() => toggleAttribute(attr.name)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-transform after:shadow-sm peer-checked:after:translate-x-5" />
                  </label>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded min-w-[28px] text-center">#{index + 1}</span>
                    <span className="text-sm font-medium text-gray-800">{attr.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-block bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">{attr.product_count}</span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-500">{attr.total_values}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={getMaxValues(attr.name)}
                    onChange={e => updateMaxValues(attr.name, parseInt(e.target.value) || 10)}
                    min={1} max={100}
                    disabled={!isEnabled(attr.name)}
                    className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {displayedAttributes.length === 0 && searchQuery && (
          <div className="py-12 text-center text-gray-400">Žiadne atribúty pre &quot;{searchQuery}&quot;</div>
        )}

        {displayLimit > 0 && filteredAttributes.length > displayLimit && (
          <div className="py-4 text-center border-t border-gray-100">
            <button onClick={() => setDisplayLimit(0)} className="px-4 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 transition">
              Zobraziť všetkých {filteredAttributes.length} atribútov
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
