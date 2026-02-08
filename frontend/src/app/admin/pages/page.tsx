'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface PageItem {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  published: boolean;
  position: number;
  show_in_footer: boolean;
  footer_group: string;
  created_at: string;
  updated_at: string;
}

const emptyPage: Omit<PageItem, 'id' | 'created_at' | 'updated_at'> = {
  slug: '',
  title: '',
  content: '',
  meta_title: '',
  meta_description: '',
  published: true,
  position: 0,
  show_in_footer: true,
  footer_group: 'info',
};

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PageItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadPages(); }, []);

  async function loadPages() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/pages`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success && data.data) setPages(data.data);
    } catch (err) {
      console.error('Error:', err);
    }
    setLoading(false);
  }

  function startEdit(page: PageItem) {
    setEditing({ ...page });
    setIsNew(false);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = page.content;
    }, 50);
  }

  function startNew() {
    setEditing({ ...emptyPage, id: '', created_at: '', updated_at: '' } as PageItem);
    setIsNew(true);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = '';
    }, 50);
  }

  function updateField(field: string, value: any) {
    if (!editing) return;
    setEditing({ ...editing, [field]: value });
  }

  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function execCommand(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }

  function insertLink() {
    const url = prompt('Zadajte URL:');
    if (url) execCommand('createLink', url);
  }

  async function savePage() {
    if (!editing) return;
    setSaving(true);
    setMessage('');

    const content = editorRef.current?.innerHTML || editing.content;
    const pageData = { ...editing, content };

    try {
      const url = isNew ? `${API_BASE}/admin/pages` : `${API_BASE}/admin/pages/${editing.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(pageData),
      });
      const result = await res.json();
      if (result.success) {
        setMessage('success');
        setEditing(null);
        loadPages();
      } else {
        setMessage('error');
      }
    } catch (err) {
      console.error('Save error:', err);
      setMessage('error');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  }

  async function deletePage(id: string, title: string) {
    if (!confirm(`Naozaj chcete vymazať stránku "${title}"?`)) return;
    try {
      await fetch(`${API_BASE}/admin/pages/${id}`, { method: 'DELETE', headers: authHeaders() });
      loadPages();
    } catch (err) {
      console.error('Delete error:', err);
    }
  }

  async function togglePublished(page: PageItem) {
    try {
      await fetch(`${API_BASE}/admin/pages/${page.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ ...page, published: !page.published }),
      });
      loadPages();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  }

  // Editor view
  if (editing) {
    return (
      <div className="max-w-[900px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600 transition text-lg">←</button>
            <h1 className="text-xl font-bold text-gray-800">{isNew ? '➕ Nová stránka' : '✏️ Upraviť stránku'}</h1>
          </div>
          <div className="flex items-center gap-3">
            {message === 'success' && <span className="text-sm text-green-600 font-medium">✅ Uložené</span>}
            {message === 'error' && <span className="text-sm text-red-600 font-medium">❌ Chyba</span>}
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              Zrušiť
            </button>
            <button onClick={savePage} disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition">
              {saving ? '⏳ Ukladám...' : '💾 Uložiť'}
            </button>
          </div>
        </div>

        {/* Title & Slug */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Názov stránky</label>
              <input
                type="text"
                value={editing.title}
                onChange={(e) => {
                  updateField('title', e.target.value);
                  if (isNew) updateField('slug', generateSlug(e.target.value));
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="Obchodné podmienky"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">URL slug</label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">/page/</span>
                <input
                  type="text"
                  value={editing.slug}
                  onChange={(e) => updateField('slug', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="obchodne-podmienky"
                />
              </div>
            </div>
          </div>

          {/* Settings row */}
          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={editing.published} onChange={(e) => updateField('published', e.target.checked)} className="w-4 h-4 accent-green-600" />
              Publikovaná
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={editing.show_in_footer} onChange={(e) => updateField('show_in_footer', e.target.checked)} className="w-4 h-4 accent-blue-600" />
              Zobraziť v pätičke
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Poradie:</label>
              <input type="number" value={editing.position} onChange={(e) => updateField('position', parseInt(e.target.value) || 0)} className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center" />
            </div>
          </div>
        </div>

        {/* Rich Text Editor */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-gray-50 border-b border-gray-200">
            <button onClick={() => execCommand('bold')} className="p-2 rounded hover:bg-gray-200 transition text-sm font-bold" title="Tučné">B</button>
            <button onClick={() => execCommand('italic')} className="p-2 rounded hover:bg-gray-200 transition text-sm italic" title="Kurzíva">I</button>
            <button onClick={() => execCommand('underline')} className="p-2 rounded hover:bg-gray-200 transition text-sm underline" title="Podčiarknuté">U</button>
            <span className="w-px h-5 bg-gray-300 mx-1" />
            <button onClick={() => execCommand('formatBlock', 'h2')} className="p-2 rounded hover:bg-gray-200 transition text-xs font-bold" title="Nadpis 2">H2</button>
            <button onClick={() => execCommand('formatBlock', 'h3')} className="p-2 rounded hover:bg-gray-200 transition text-xs font-bold" title="Nadpis 3">H3</button>
            <button onClick={() => execCommand('formatBlock', 'p')} className="p-2 rounded hover:bg-gray-200 transition text-xs" title="Odsek">¶</button>
            <span className="w-px h-5 bg-gray-300 mx-1" />
            <button onClick={() => execCommand('insertUnorderedList')} className="p-2 rounded hover:bg-gray-200 transition text-sm" title="Odrážky">• —</button>
            <button onClick={() => execCommand('insertOrderedList')} className="p-2 rounded hover:bg-gray-200 transition text-sm" title="Číslovanie">1.</button>
            <span className="w-px h-5 bg-gray-300 mx-1" />
            <button onClick={insertLink} className="p-2 rounded hover:bg-gray-200 transition text-sm" title="Odkaz">🔗</button>
            <button onClick={() => execCommand('removeFormat')} className="p-2 rounded hover:bg-gray-200 transition text-sm" title="Odstrániť formátovanie">✕</button>
            <span className="w-px h-5 bg-gray-300 mx-1" />
            <button onClick={() => execCommand('justifyLeft')} className="p-2 rounded hover:bg-gray-200 transition text-xs" title="Zarovnať vľavo">⫷</button>
            <button onClick={() => execCommand('justifyCenter')} className="p-2 rounded hover:bg-gray-200 transition text-xs" title="Na stred">⫿</button>
          </div>

          {/* Editor area */}
          <div
            ref={editorRef}
            contentEditable
            className="min-h-[400px] px-6 py-4 text-sm text-gray-800 leading-relaxed focus:outline-none prose prose-sm max-w-none"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            onInput={() => {
              // Content is read from ref on save
            }}
          />
        </div>

        {/* SEO */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">🔍 SEO nastavenia</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Meta titulok</label>
              <input
                type="text"
                value={editing.meta_title}
                onChange={(e) => updateField('meta_title', e.target.value)}
                placeholder={editing.title}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Meta popis</label>
              <textarea
                value={editing.meta_description}
                onChange={(e) => updateField('meta_description', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
                placeholder="Stručný popis stránky pre vyhľadávače..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-[900px]">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📝 Stránky</h1>
          <p className="text-sm text-gray-500 mt-1">{pages.length} stránok • Obchodné podmienky, O nás, Kontakt...</p>
        </div>
        <button onClick={startNew} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          ➕ Nová stránka
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Načítavam...</div>
      ) : pages.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-16">
          <div className="text-5xl mb-4">📄</div>
          <h2 className="text-lg font-semibold text-gray-600 mb-1">Žiadne stránky</h2>
          <p className="text-sm text-gray-400 mb-4">Vytvorte prvú stránku — napr. Obchodné podmienky</p>
          <button onClick={startNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
            ➕ Vytvoriť stránku
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {pages.map((page) => (
            <div key={page.id} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{page.title}</span>
                  {!page.published && (
                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-medium rounded">Skrytá</span>
                  )}
                  {page.show_in_footer && (
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded">Pätička</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">/page/{page.slug}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePublished(page)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${page.published ? 'bg-green-500' : 'bg-gray-200'}`}
                  title={page.published ? 'Publikovaná' : 'Skrytá'}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${page.published ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                </button>

                <a href={`/page/${page.slug}`} target="_blank" className="p-2 text-gray-400 hover:text-blue-600 transition" title="Zobraziť">
                  👁
                </a>

                <button onClick={() => startEdit(page)} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">
                  ✏️ Upraviť
                </button>

                <button onClick={() => deletePage(page.id, page.title)} className="p-2 text-gray-400 hover:text-red-600 transition" title="Vymazať">
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
