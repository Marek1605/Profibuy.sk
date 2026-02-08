'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/lib/store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface AttributeStat {
  name: string;
  product_count: number;
  total_values: number;
}

interface FilterSettings {
  enabled: Record<string, { enabled: boolean; max_values: number }>;
  global_max_values: number;
  show_counts: boolean;
  display_limit: number;
}

const limitOptions = [
  { value: 10, label: 'Top 10' },
  { value: 20, label: 'Top 20' },
  { value: 50, label: 'Top 50' },
  { value: 100, label: 'Top 100' },
  { value: 0, label: 'Všetky' },
];

export default function AdminFiltersPage() {
  const [attributes, setAttributes] = useState<AttributeStat[]>([]);
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    enabled: {},
    global_max_values: 10,
    show_counts: true,
    display_limit: 20,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(20);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const statsRes = await fetch(`${API_BASE}/admin/attributes/stats`, {
        headers: authHeaders(),
      });
      const statsData = await statsRes.json();
      if (statsData.success && statsData.data) {
        const sorted = [...statsData.data].sort(
          (a: AttributeStat, b: AttributeStat) => b.product_count - a.product_count
        );
        setAttributes(sorted);
      }

      const settingsRes = await fetch(`${API_BASE}/admin/filter-settings`, {
        headers: authHeaders(),
      });
      const settingsData = await settingsRes.json();
      if (settingsData.success && settingsData.data?.enabled) {
        const s = {
          enabled: settingsData.data.enabled,
          global_max_values: settingsData.data.global_max_values || 10,
          show_counts: settingsData.data.show_counts !== false,
          display_limit: settingsData.data.display_limit || 20,
        };
        setFilterSettings(s);
        setDisplayLimit(s.display_limit);
      }
    } catch (err) {
      console.error('Error loading filter data:', err);
    }
    setLoading(false);
  }

  function toggleAttribute(attrName: string) {
    setFilterSettings((prev) => {
      const next = { ...prev, enabled: { ...prev.enabled } };
      if (!next.enabled[attrName]) {
        next.enabled[attrName] = { enabled: true, max_values: prev.global_max_values };
      } else {
        next.enabled[attrName] = { ...next.enabled[attrName], enabled: !next.enabled[attrName].enabled };
      }
      return next;
    });
  }

  function updateMaxValues(attrName: string, value: number) {
    setFilterSettings((prev) => {
      const next = { ...prev, enabled: { ...prev.enabled } };
      if (!next.enabled[attrName]) {
        next.enabled[attrName] = { enabled: true, max_values: value };
      } else {
        next.enabled[attrName] = { ...next.enabled[attrName], max_values: value };
      }
      return next;
    });
  }

  function isEnabled(attrName: string) {
    return filterSettings.enabled[attrName]?.enabled === true;
  }

  function getMaxValues(attrName: string) {
    return filterSettings.enabled[attrName]?.max_values || filterSettings.global_max_values;
  }

  const filteredAttributes = useMemo(() => {
    if (!searchQuery) return attributes;
    return attributes.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [attributes, searchQuery]);

  const displayedAttributes = useMemo(() => {
    return displayLimit > 0 ? filteredAttributes.slice(0, displayLimit) : filteredAttributes;
  }, [filteredAttributes, displayLimit]);

  const enabledCount = useMemo(() => {
    return Object.values(filterSettings.enabled).filter((v) => v.enabled).length;
  }, [filterSettings.enabled]);

  function selectAllVisible() {
    setFilterSettings((prev) => {
      const next = { ...prev, enabled: { ...prev.enabled } };
      displayedAttributes.forEach((attr) => {
        next.enabled[attr.name] = { enabled: true, max_values: next.enabled[attr.name]?.max_values || prev.global_max_values };
      });
      return next;
    });
  }

  function deselectAllVisible() {
    setFilterSettings((prev) => {
      const next = { ...prev, enabled: { ...prev.enabled } };
      displayedAttributes.forEach((attr) => {
        if (next.enabled[attr.name]) {
          next.enabled[attr.name] = { ...next.enabled[attr.name], enabled: false };
        }
      });
      return next;
    });
  }

  function applyGlobalMaxToAll() {
    setFilterSettings((prev) => {
      const next = { ...prev, enabled: { ...prev.enabled } };
      Object.keys(next.enabled).forEach((key) => {
        next.enabled[key] = { ...next.enabled[key], max_values: prev.global_max_values };
      });
      return next;
    });
  }

  async function saveSettings() {
    setSaving(true);
    setMessage('');
    const toSave = { ...filterSettings, display_limit: displayLimit };
    try {
      const res = await fetch(`${API_BASE}/admin/filter-settings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(toSave),
      });
      const result = await res.json();
      setMessage(result.success ? 'success' : 'error');
    } catch (err) {
      console.error('Save error:', err);
      setMessage('error');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 4000);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-amber-600 rounded-full animate-spin mb-4" />
        <p className="text-sm">Načítavam atribúty...</p>
      </div>
    );
  }

  if (attributes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="text-5xl mb-4">📦</div>
        <h2 className="text-lg font-semibold text-gray-600 mb-1">Žiadne atribúty</h2>
        <p className="text-sm">Najprv importujte produkty cez dodávateľa</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🔍 Nastavenie filtrov</h1>
          <p className="text-sm text-gray-500 mt-1">{attributes.length} atribútov • {enabledCount} aktívnych</p>
        </div>
        <div className="flex items-center gap-3">
          {message === 'success' && <span className="text-sm font-medium text-green-600">✅ Uložené</span>}
          {message === 'error' && <span className="text-sm font-medium text-red-600">❌ Chyba</span>}
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-60 transition"
          >
            {saving ? '⏳ Ukladám...' : '💾 Uložiť'}
          </button>
        </div>
      </div>

      {/* Global Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📐 Všeobecné nastavenia</h3>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Zobraziť atribútov:</label>
            <select
              value={displayLimit}
              onChange={(e) => setDisplayLimit(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[120px]"
            >
              {limitOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Max. hodnôt na filter:</label>
            <input
              type="number"
              value={filterSettings.global_max_values}
              onChange={(e) => setFilterSettings((prev) => ({ ...prev, global_max_values: parseInt(e.target.value) || 10 }))}
              min={1} max={100}
              className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm text-center"
            />
            <button onClick={applyGlobalMaxToAll} className="px-3 py-2 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">
              Aplikovať na všetky
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={filterSettings.show_counts}
              onChange={(e) => setFilterSettings((prev) => ({ ...prev, show_counts: e.target.checked }))}
              className="w-4 h-4 accent-amber-600"
            />
            Zobrazovať počty
          </label>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <input
          type="text"
          placeholder="🔎 Hľadať atribút..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm w-56 bg-white focus:outline-none focus:border-amber-400"
        />
        <span className="text-xs text-gray-500">
          Zobrazených: {displayedAttributes.length} z {filteredAttributes.length}
        </span>
        <div className="flex gap-2">
          <button onClick={selectAllVisible} className="px-3 py-2 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">
            ✓ Vybrať zobrazené
          </button>
          <button onClick={deselectAllVisible} className="px-3 py-2 text-xs bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            ✗ Zrušiť zobrazené
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-20 px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Aktívny</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase min-w-[200px]">Názov atribútu</th>
              <th className="w-24 px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Produktov</th>
              <th className="w-24 px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Hodnôt</th>
              <th className="w-32 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Max.</th>
            </tr>
          </thead>
          <tbody>
            {displayedAttributes.map((attr, index) => {
              const enabled = isEnabled(attr.name);
              return (
                <tr key={attr.name} className={`border-b border-gray-50 hover:bg-gray-50 transition ${enabled ? 'bg-amber-50 hover:bg-amber-100/60' : ''}`}>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleAttribute(attr.name)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-amber-500' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded min-w-[28px] text-center">#{index + 1}</span>
                      <span className="text-sm font-medium text-gray-800">{attr.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium">{attr.product_count}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-500">{attr.total_values}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={getMaxValues(attr.name)}
                      onChange={(e) => updateMaxValues(attr.name, parseInt(e.target.value) || 10)}
                      min={1} max={100}
                      disabled={!enabled}
                      className={`w-16 px-2 py-1.5 border rounded-lg text-sm text-center transition ${enabled ? 'border-gray-200 bg-white text-gray-800' : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {displayedAttributes.length === 0 && searchQuery && (
          <div className="text-center py-10 text-gray-400 text-sm">Žiadne atribúty pre &quot;{searchQuery}&quot;</div>
        )}

        {displayLimit > 0 && filteredAttributes.length > displayLimit && (
          <div className="text-center py-4 border-t border-gray-100">
            <button
              onClick={() => setDisplayLimit(0)}
              className="px-4 py-2 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
            >
              Zobraziť všetkých {filteredAttributes.length} atribútov
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
