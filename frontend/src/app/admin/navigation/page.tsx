'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  image: string;
  product_count: number;
  children?: CategoryItem[];
}

interface NavItem {
  category_id: string;
  label_sk: string;
  label_en: string;
  position: number;
  visible: boolean;
  show_in_mega: boolean;
  icon: string;
}

interface NavSettings {
  items: NavItem[];
  max_visible: number;
  show_product_counts: boolean;
}

export default function AdminNavigationPage() {
  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);
  const [navSettings, setNavSettings] = useState<NavSettings>({
    items: [],
    max_visible: 10,
    show_product_counts: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load all categories
      const catRes = await fetch(`${API_BASE}/categories`);
      const cats = await catRes.json();
      if (Array.isArray(cats)) {
        setAllCategories(cats);
      }

      // Load saved nav settings
      const settingsRes = await fetch(`${API_BASE}/admin/navigation`, {
        headers: authHeaders(),
      });
      const settingsData = await settingsRes.json();
      if (settingsData.success && settingsData.data?.items) {
        setNavSettings(settingsData.data);
      } else if (Array.isArray(cats) && cats.length > 0) {
        // Auto-generate from existing categories
        const autoItems: NavItem[] = cats.map((cat: CategoryItem, i: number) => ({
          category_id: cat.id,
          label_sk: '',
          label_en: cat.name,
          position: i,
          visible: true,
          show_in_mega: true,
          icon: '',
        }));
        setNavSettings(prev => ({ ...prev, items: autoItems }));
      }
    } catch (err) {
      console.error('Error loading nav data:', err);
    }
    setLoading(false);
  }

  function getCategoryName(id: string): string {
    const cat = allCategories.find(c => c.id === id);
    return cat?.name || 'Neznáma kategória';
  }

  function getCategoryInfo(id: string): CategoryItem | undefined {
    return allCategories.find(c => c.id === id);
  }

  function getChildCount(id: string): number {
    const cat = allCategories.find(c => c.id === id);
    return cat?.children?.length || 0;
  }

  function toggleVisible(index: number) {
    setNavSettings(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], visible: !items[index].visible };
      return { ...prev, items };
    });
  }

  function toggleMega(index: number) {
    setNavSettings(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], show_in_mega: !items[index].show_in_mega };
      return { ...prev, items };
    });
  }

  function updateLabel(index: number, value: string) {
    setNavSettings(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], label_sk: value };
      return { ...prev, items };
    });
  }

  function moveItem(from: number, to: number) {
    if (to < 0 || to >= navSettings.items.length) return;
    setNavSettings(prev => {
      const items = [...prev.items];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...prev, items: items.map((item, i) => ({ ...item, position: i })) };
    });
  }

  function removeItem(index: number) {
    setNavSettings(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, position: i })),
    }));
  }

  function addCategory(catId: string) {
    if (navSettings.items.find(i => i.category_id === catId)) return;
    const cat = allCategories.find(c => c.id === catId);
    if (!cat) return;
    setNavSettings(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          category_id: catId,
          label_sk: '',
          label_en: cat.name,
          position: prev.items.length,
          visible: true,
          show_in_mega: true,
          icon: '',
        },
      ],
    }));
  }

  function addAllCategories() {
    const newItems = allCategories
      .filter(c => !navSettings.items.find(i => i.category_id === c.id))
      .map((cat, i) => ({
        category_id: cat.id,
        label_sk: '',
        label_en: cat.name,
        position: navSettings.items.length + i,
        visible: true,
        show_in_mega: true,
        icon: '',
      }));
    setNavSettings(prev => ({
      ...prev,
      items: [...prev.items, ...newItems].map((item, i) => ({ ...item, position: i })),
    }));
  }

  function setAllMega(value: boolean) {
    setNavSettings(prev => ({
      ...prev,
      items: prev.items.map(item => ({ ...item, show_in_mega: value })),
    }));
  }

  function setAllVisible(value: boolean) {
    setNavSettings(prev => ({
      ...prev,
      items: prev.items.map(item => ({ ...item, visible: value })),
    }));
  }

  function removeAllItems() {
    if (!confirm('Naozaj odstrániť všetky kategórie z navigácie?')) return;
    setNavSettings(prev => ({ ...prev, items: [] }));
  }

  // Drag and drop
  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      moveItem(dragIndex, index);
      setDragIndex(index);
    }
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  async function saveSettings() {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/navigation`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(navSettings),
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

  const visibleCount = navSettings.items.filter(i => i.visible).length;
  const usedIds = new Set(navSettings.items.map(i => i.category_id));
  const availableCategories = allCategories.filter(c => !usedIds.has(c.id));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-sm">Načítavam kategórie...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🧭 Navigácia eshopu</h1>
          <p className="text-sm text-gray-500 mt-1">
            {navSettings.items.length} kategórií v menu • {visibleCount} viditeľných
          </p>
        </div>
        <div className="flex items-center gap-3">
          {message === 'success' && <span className="text-sm font-medium text-green-600">✅ Uložené</span>}
          {message === 'error' && <span className="text-sm font-medium text-red-600">❌ Chyba</span>}
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {saving ? '⏳ Ukladám...' : '💾 Uložiť navigáciu'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-800">
        <strong>Tip:</strong> Potiahni kategórie na zmenu poradia. Zadaj slovenský preklad — ak je prázdny, zobrazí sa anglický názov.
        Mega menu sa zobrazí po navedení myšou na kategóriu (ak má podkategórie).
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {availableCategories.length > 0 && (
          <button onClick={addAllCategories} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition">
            ➕ Pridať všetky ({availableCategories.length})
          </button>
        )}
        {navSettings.items.length > 0 && (
          <>
            <button onClick={() => setAllMega(true)} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition">
              🟣 Mega ON všetkým
            </button>
            <button onClick={() => setAllMega(false)} className="px-3 py-1.5 bg-gray-400 text-white rounded-lg text-xs font-medium hover:bg-gray-500 transition">
              ⚪ Mega OFF všetkým
            </button>
            <button onClick={() => setAllVisible(true)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition">
              👁 Zobraziť všetky
            </button>
            <button onClick={() => setAllVisible(false)} className="px-3 py-1.5 bg-gray-400 text-white rounded-lg text-xs font-medium hover:bg-gray-500 transition">
              🚫 Skryť všetky
            </button>
            <button onClick={removeAllItems} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition ml-auto">
              🗑 Odstrániť všetky
            </button>
          </>
        )}
      </div>

      {/* Navigation items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-5">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-4">
          <span className="text-xs font-semibold text-gray-500 uppercase w-8 text-center">#</span>
          <span className="text-xs font-semibold text-gray-500 uppercase w-8">⠿</span>
          <span className="text-xs font-semibold text-gray-500 uppercase flex-1">Kategória</span>
          <span className="text-xs font-semibold text-gray-500 uppercase w-48">Slovenský názov</span>
          <span className="text-xs font-semibold text-gray-500 uppercase w-16 text-center">Mega</span>
          <span className="text-xs font-semibold text-gray-500 uppercase w-16 text-center">Viditeľná</span>
          <span className="text-xs font-semibold text-gray-500 uppercase w-20 text-center">Akcie</span>
        </div>

        {navSettings.items.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            Žiadne kategórie v navigácii. Pridajte ich nižšie.
          </div>
        ) : (
          navSettings.items.map((item, index) => {
            const cat = getCategoryInfo(item.category_id);
            const childCount = getChildCount(item.category_id);
            return (
              <div
                key={item.category_id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-4 px-4 py-3 border-b border-gray-50 transition ${
                  dragIndex === index ? 'bg-blue-50 opacity-70' : item.visible ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 opacity-60'
                }`}
              >
                {/* Position */}
                <span className="text-xs text-gray-400 w-8 text-center font-mono">{index + 1}</span>

                {/* Drag handle */}
                <span className="text-gray-300 cursor-grab active:cursor-grabbing w-8 text-center text-lg select-none">⠿</span>

                {/* Category info */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {cat?.image ? (
                      <img src={cat.image} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-sm font-bold text-gray-400">
                        {(item.label_sk || item.label_en || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {item.label_en}
                    </div>
                    <div className="text-xs text-gray-400">
                      {cat?.product_count || 0} produktov
                      {childCount > 0 && ` • ${childCount} podkategórií`}
                    </div>
                  </div>
                </div>

                {/* Slovak label */}
                <input
                  type="text"
                  value={item.label_sk}
                  onChange={(e) => updateLabel(index, e.target.value)}
                  placeholder={item.label_en}
                  className="w-48 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                />

                {/* Mega menu toggle */}
                <div className="w-16 text-center">
                  <button
                    onClick={() => toggleMega(index)}
                    disabled={childCount === 0}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      item.show_in_mega && childCount > 0 ? 'bg-purple-500' : 'bg-gray-200'
                    } ${childCount === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                    title={childCount === 0 ? 'Žiadne podkategórie' : 'Zobraziť mega menu'}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      item.show_in_mega && childCount > 0 ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {/* Visible toggle */}
                <div className="w-16 text-center">
                  <button
                    onClick={() => toggleVisible(index)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      item.visible ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      item.visible ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {/* Actions */}
                <div className="w-20 flex items-center justify-center gap-1">
                  <button
                    onClick={() => moveItem(index, index - 1)}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition"
                    title="Hore"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveItem(index, index + 1)}
                    disabled={index === navSettings.items.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition"
                    title="Dole"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => removeItem(index)}
                    className="p-1 text-red-400 hover:text-red-600 transition"
                    title="Odstrániť"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add category */}
      {availableCategories.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">➕ Pridať kategóriu do navigácie</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {availableCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => addCategory(cat.id)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition text-left"
              >
                <div className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                  {cat.image ? (
                    <img src={cat.image} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs font-bold text-gray-400">{cat.name.charAt(0)}</span>
                  )}
                </div>
                <span className="truncate">{cat.name}</span>
                <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{cat.product_count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
