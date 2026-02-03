'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Save, Trash2, Loader2, Truck, Settings, Globe,
  Download, FileText, AlertCircle, Check, Image as ImageIcon
} from 'lucide-react';

import { useAuthStore } from '@/lib/store';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

interface Supplier {
  id: string;
  name: string;
  code: string;
  description: string;
  feed_url: string;
  feed_type: string;
  feed_format: string;
  auth_type: string;
  auth_credentials: string;
  field_mappings: Record<string, any>;
  max_downloads_per_day: number;
  download_count_today: number;
  last_download_date: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    feed_url: '',
    feed_type: 'xml',
    feed_format: 'action',
    auth_type: 'none',
    auth_credentials: '',
    // Action CDN credentials
    action_cid: '',
    action_uid: '',
    action_pid: '',
    max_downloads_per_day: 8,
    is_active: true,
    priority: 0,
  });

  const loadSupplier = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${supplierId}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setSupplier(data.data);
        
        // Parse Action CDN credentials from auth_credentials JSON
        let actionCid = '';
        let actionUid = '';
        let actionPid = '';
        if (data.data.auth_credentials && typeof data.data.auth_credentials === 'object') {
          actionCid = data.data.auth_credentials.action_cid || '';
          actionUid = data.data.auth_credentials.action_uid || '';
          actionPid = data.data.auth_credentials.action_pid || '';
        }
        
        setFormData({
          name: data.data.name || '',
          code: data.data.code || '',
          description: data.data.description || '',
          feed_url: data.data.feed_url || '',
          feed_type: data.data.feed_type || 'xml',
          feed_format: data.data.feed_format || 'action',
          auth_type: data.data.auth_type || 'none',
          auth_credentials: typeof data.data.auth_credentials === 'string' ? data.data.auth_credentials : '',
          action_cid: actionCid,
          action_uid: actionUid,
          action_pid: actionPid,
          max_downloads_per_day: data.data.max_downloads_per_day || 8,
          is_active: data.data.is_active ?? true,
          priority: data.data.priority || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load supplier:', err);
      setError('Nepodarilo sa načítať dodávateľa');
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    loadSupplier();
  }, [loadSupplier]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Build auth_credentials JSON for Action CDN
      const authCredentials = formData.feed_format === 'action' && (formData.action_cid || formData.action_uid || formData.action_pid)
        ? {
            action_cid: formData.action_cid,
            action_uid: formData.action_uid,
            action_pid: formData.action_pid,
          }
        : formData.auth_credentials || {};
      
      const payload = {
        ...formData,
        auth_credentials: authCredentials,
      };
      
      const res = await fetch(`${API_BASE}/admin/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('Dodávateľ bol úspešne uložený');
        setSupplier(data.data);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Nepodarilo sa uložiť dodávateľa');
      }
    } catch (err) {
      setError('Nepodarilo sa uložiť dodávateľa');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Naozaj chcete vymazať tohto dodávateľa? Táto akcia je nevratná.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${supplierId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        router.push('/admin/suppliers');
      } else {
        setError(data.error || 'Nepodarilo sa vymazať dodávateľa');
      }
    } catch (err) {
      setError('Nepodarilo sa vymazať dodávateľa');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('sk-SK');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/admin/suppliers"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Späť na dodávateľov
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Nastavenia dodávateľa</h1>
            <p className="text-gray-500">{supplier?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
              Vymazať
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Uložiť
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
          <Check className="w-5 h-5 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-gray-400" />
              Základné informácie
            </h2>
            
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Názov</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Kód</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Kód sa nedá zmeniť po vytvorení</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Popis</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium">
                  Aktívny dodávateľ
                </label>
              </div>
            </div>
          </div>

          {/* Feed settings */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-gray-400" />
              Nastavenia feedu
            </h2>
            
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">URL feedu</label>
                <input
                  type="url"
                  value={formData.feed_url}
                  onChange={(e) => setFormData({ ...formData, feed_url: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Typ feedu</label>
                  <select
                    value={formData.feed_type}
                    onChange={(e) => setFormData({ ...formData, feed_type: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="xml">XML</option>
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Formát</label>
                  <select
                    value={formData.feed_format}
                    onChange={(e) => setFormData({ ...formData, feed_format: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="action">Action</option>
                    <option value="heureka">Heureka</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Autentifikácia</label>
                  <select
                    value={formData.auth_type}
                    onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="none">Žiadna</option>
                    <option value="basic">Basic Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="api_key">API Key</option>
                  </select>
                </div>

                {formData.auth_type !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Prihlasovacie údaje</label>
                    <input
                      type="password"
                      value={formData.auth_credentials}
                      onChange={(e) => setFormData({ ...formData, auth_credentials: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder={formData.auth_type === 'basic' ? 'user:password' : 'token'}
                    />
                  </div>
                )}
              </div>
              
              {/* Action CDN Settings - show only for Action format */}
              {formData.feed_format === 'action' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Action CDN - Nastavenie obrázkov
                  </h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Pre sťahovanie obrázkov z Action CDN zadajte vaše prihlasovacie údaje z Action portálu.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-1">CID (Company ID)</label>
                      <input
                        type="text"
                        value={formData.action_cid}
                        onChange={(e) => setFormData({ ...formData, action_cid: e.target.value })}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        placeholder="napr. 00001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-1">UID (Login)</label>
                      <input
                        type="text"
                        value={formData.action_uid}
                        onChange={(e) => setFormData({ ...formData, action_uid: e.target.value })}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        placeholder="login bez prefixu"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-1">PID (Auth Key)</label>
                      <input
                        type="password"
                        value={formData.action_pid}
                        onChange={(e) => setFormData({ ...formData, action_pid: e.target.value })}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        placeholder="Unique Authentication Key"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Tieto údaje nájdete v Action B2B portáli v sekcii "Unique Authentication Key"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Download settings */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-gray-400" />
              Nastavenia sťahovania
            </h2>
            
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Max stiahnutí za deň</label>
                  <input
                    type="number"
                    value={formData.max_downloads_per_day}
                    onChange={(e) => setFormData({ ...formData, max_downloads_per_day: parseInt(e.target.value) || 8 })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    min={1}
                    max={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Priorita</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    min={0}
                  />
                  <p className="text-xs text-gray-500 mt-1">Vyššia priorita = spracuje sa skôr</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" />
              Stav
            </h2>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Stiahnutí dnes</div>
                <div className="text-lg font-semibold">
                  {supplier?.download_count_today || 0} / {supplier?.max_downloads_per_day || 8}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Posledné stiahnutie</div>
                <div className="text-lg font-semibold">
                  {formatDate(supplier?.last_download_date || null)}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Vytvorené</div>
                <div className="text-lg font-semibold">
                  {formatDate(supplier?.created_at || null)}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Aktualizované</div>
                <div className="text-lg font-semibold">
                  {formatDate(supplier?.updated_at || null)}
                </div>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold mb-4">Rýchle odkazy</h2>
            
            <div className="space-y-2">
              <Link
                href={`/admin/suppliers/${supplierId}/products`}
                className="block w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition"
              >
                → Produkty
              </Link>
              <Link
                href={`/admin/suppliers/${supplierId}/categories`}
                className="block w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition"
              >
                → Kategórie
              </Link>
              <Link
                href={`/admin/suppliers/${supplierId}/feeds`}
                className="block w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition"
              >
                → História feedov
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
