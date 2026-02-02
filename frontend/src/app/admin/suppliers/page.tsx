'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  Truck, Download, Play, Pause, RefreshCw, Eye, Settings, Trash2,
  CheckCircle, AlertCircle, Clock, FileText, Plus, ChevronRight,
  Database, Package, FolderTree, Loader2
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface Supplier {
  id: string;
  name: string;
  code: string;
  description: string;
  feed_url: string;
  feed_type: string;
  feed_format: string;
  max_downloads_per_day: number;
  download_count_today: number;
  last_download_date: string | null;
  is_active: boolean;
  product_count: number;
  current_feed: StoredFeed | null;
  created_at: string;
}

interface StoredFeed {
  id: string;
  filename: string;
  file_size: number;
  downloaded_at: string;
  total_products: number;
  total_categories: number;
  total_brands: number;
  status: string;
  is_current: boolean;
}

interface DownloadStatus {
  can_download: boolean;
  downloads_today: number;
  max_downloads: number;
  downloads_remaining: number;
  current_feed: StoredFeed | null;
}

interface ImportProgress {
  id: string;
  status: string;
  total_items: number;
  processed: number;
  created: number;
  updated: number;
  errors: number;
  progress_percent: number;
  current_item: string;
  logs: string[];
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<Record<string, DownloadStatus>>({});

  // New supplier form
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    code: '',
    description: '',
    feed_url: '',
    feed_type: 'xml',
    feed_format: 'action',
    max_downloads_per_day: 8,
  });

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers`);
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDownloadStatus = useCallback(async (supplierId: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${supplierId}/download-status`);
      const data = await res.json();
      if (data.success) {
        setDownloadStatus(prev => ({ ...prev, [supplierId]: data.data }));
      }
    } catch (err) {
      console.error('Failed to load download status:', err);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    suppliers.forEach(s => loadDownloadStatus(s.id));
  }, [suppliers, loadDownloadStatus]);

  // Poll import progress
  useEffect(() => {
    if (!importing || !importProgress) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/suppliers/${importing}/import/${importProgress.id}/progress`);
        const data = await res.json();
        if (data.success) {
          setImportProgress(data.data);
          if (data.data.status === 'completed' || data.data.status === 'failed') {
            setImporting(null);
            loadSuppliers();
          }
        }
      } catch (err) {
        console.error('Failed to get progress:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [importing, importProgress, loadSuppliers]);

  const downloadFeed = async (supplier: Supplier) => {
    setDownloading(supplier.id);
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${supplier.id}/download`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data.success) {
        // Poll for download progress
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`${API_BASE}/admin/suppliers/${supplier.id}/download-status`);
            const statusData = await statusRes.json();
            
            if (statusData.success && statusData.data?.active_download) {
              const dl = statusData.data.active_download;
              if (dl.status === 'completed') {
                clearInterval(pollInterval);
                setDownloading(null);
                alert(`Feed úspešne stiahnutý! ${(dl.bytes_downloaded / 1024 / 1024).toFixed(1)} MB`);
                loadSuppliers();
                loadDownloadStatus(supplier.id);
              } else if (dl.status === 'failed') {
                clearInterval(pollInterval);
                setDownloading(null);
                alert(`Chyba pri sťahovaní: ${dl.error}`);
              }
              // Still downloading - update UI would happen here
            } else {
              // No active download - might be done
              clearInterval(pollInterval);
              setDownloading(null);
              loadSuppliers();
              loadDownloadStatus(supplier.id);
            }
          } catch {
            // Continue polling
          }
        }, 3000); // Poll every 3 seconds
        
        // Safety: stop polling after 30 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          setDownloading(null);
        }, 30 * 60 * 1000);
      } else {
        alert(`Chyba: ${data.error}`);
        setDownloading(null);
      }
    } catch (err) {
      alert('Chyba pri sťahovaní feedu');
      setDownloading(null);
    }
  };

  const startImport = async (supplier: Supplier) => {
    setImporting(supplier.id);
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${supplier.id}/import`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data.success) {
        setImportProgress(data.data);
        setSelectedSupplier(supplier);
        setShowFeedModal(true);
      } else {
        alert(`Chyba: ${data.error}`);
        setImporting(null);
      }
    } catch (err) {
      alert('Chyba pri spúšťaní importu');
      setImporting(null);
    }
  };

  const createSupplier = async () => {
    try {
      console.log('[DEBUG] Creating supplier:', JSON.stringify(newSupplier));
      const res = await fetch(`${API_BASE}/admin/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier),
      });
      
      const text = await res.text();
      console.log('[DEBUG] Response:', res.status, text);
      
      let data;
      try { data = JSON.parse(text); } catch {
        alert(`Server error (HTTP ${res.status}):\n${text.substring(0, 500)}`);
        return;
      }
      
      if (data.success) {
        setShowAddModal(false);
        setNewSupplier({
          name: '',
          code: '',
          description: '',
          feed_url: '',
          feed_type: 'xml',
          feed_format: 'action',
          max_downloads_per_day: 8,
        });
        loadSuppliers();
      } else {
        alert(`Chyba (HTTP ${res.status}):\n\n${data.error || JSON.stringify(data)}`);
      }
    } catch (err: any) {
      alert(`Sieťová chyba:\n\n${err.message || String(err)}`);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dodávatelia</h1>
          <p className="text-gray-500">Správa XML feedov od dodávateľov</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          <Plus className="w-5 h-5" />
          Pridať dodávateľa
        </button>
      </div>

      {suppliers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Truck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">Žiadni dodávatelia</h3>
          <p className="text-gray-500 mb-4">Pridajte prvého dodávateľa pre import produktov</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Pridať dodávateľa
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {suppliers.map((supplier) => {
            const status = downloadStatus[supplier.id];
            const isDownloading = downloading === supplier.id;
            const isImporting = importing === supplier.id;

            return (
              <div key={supplier.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${supplier.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <Truck className={`w-8 h-8 ${supplier.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{supplier.name}</h2>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="px-2 py-0.5 bg-gray-100 rounded">{supplier.code}</span>
                          <span>•</span>
                          <span>{supplier.feed_format.toUpperCase()} feed</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/suppliers/${supplier.id}`}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Settings className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50 border-b">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{supplier.product_count.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Produktov</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {supplier.current_feed?.total_categories || 0}
                    </div>
                    <div className="text-sm text-gray-500">Kategórií</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {supplier.current_feed?.total_brands || 0}
                    </div>
                    <div className="text-sm text-gray-500">Značiek</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-gray-900">
                        {status?.downloads_remaining ?? supplier.max_downloads_per_day - supplier.download_count_today}
                      </div>
                      <div className="text-sm text-gray-400">/ {supplier.max_downloads_per_day}</div>
                    </div>
                    <div className="text-sm text-gray-500">Stiahnutí zostáva</div>
                  </div>
                </div>

                {/* Current Feed */}
                {supplier.current_feed && (
                  <div className="p-6 border-b">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Aktuálny feed
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{supplier.current_feed.filename}</div>
                          <div className="text-sm text-gray-500">
                            {formatBytes(supplier.current_feed.file_size)} • 
                            Stiahnuté: {formatDate(supplier.current_feed.downloaded_at)}
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          supplier.current_feed.status === 'imported' ? 'bg-green-100 text-green-700' :
                          supplier.current_feed.status === 'downloaded' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {supplier.current_feed.status === 'imported' ? 'Importovaný' : 
                           supplier.current_feed.status === 'downloaded' ? 'Pripravený' : 
                           supplier.current_feed.status}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Import Progress */}
                {isImporting && importProgress && (
                  <div className="p-6 border-b bg-blue-50">
                    <h3 className="font-medium mb-3 flex items-center gap-2 text-blue-700">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Import prebieha...
                    </h3>
                    
                    {/* Progress bar */}
                    <div className="h-4 bg-blue-200 rounded-full overflow-hidden mb-4">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${importProgress.progress_percent}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-center mb-4">
                      <div>
                        <div className="text-xl font-bold text-blue-700">{importProgress.processed}</div>
                        <div className="text-xs text-blue-600">Spracovaných</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-green-600">{importProgress.created}</div>
                        <div className="text-xs text-gray-500">Vytvorených</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-yellow-600">{importProgress.updated}</div>
                        <div className="text-xs text-gray-500">Aktualizovaných</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-red-600">{importProgress.errors}</div>
                        <div className="text-xs text-gray-500">Chýb</div>
                      </div>
                    </div>

                    {importProgress.current_item && (
                      <div className="text-sm text-blue-600 truncate">
                        Spracovávam: {importProgress.current_item}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="p-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => downloadFeed(supplier)}
                    disabled={isDownloading || (status && !status.can_download)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                      isDownloading || (status && !status.can_download)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isDownloading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                    {isDownloading ? 'Sťahujem...' : 'Stiahnuť feed'}
                  </button>

                  <button
                    onClick={() => startImport(supplier)}
                    disabled={isImporting || !supplier.current_feed}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                      isImporting || !supplier.current_feed
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isImporting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                    {isImporting ? 'Importujem...' : 'Spustiť import'}
                  </button>

                  <Link
                    href={`/admin/suppliers/${supplier.id}/products`}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    <Package className="w-5 h-5" />
                    Produkty
                    <ChevronRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href={`/admin/suppliers/${supplier.id}/categories`}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    <FolderTree className="w-5 h-5" />
                    Kategórie
                    <ChevronRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href={`/admin/suppliers/${supplier.id}/feeds`}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    <Database className="w-5 h-5" />
                    História feedov
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Pridať dodávateľa</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Názov</label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Action S.A."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Kód</label>
                <input
                  type="text"
                  value={newSupplier.code}
                  onChange={(e) => setNewSupplier({ ...newSupplier, code: e.target.value.toLowerCase() })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="action"
                />
                <p className="text-xs text-gray-500 mt-1">Unikátny identifikátor (malé písmená)</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">URL feedu</label>
                <input
                  type="url"
                  value={newSupplier.feed_url}
                  onChange={(e) => setNewSupplier({ ...newSupplier, feed_url: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Typ feedu</label>
                  <select
                    value={newSupplier.feed_type}
                    onChange={(e) => setNewSupplier({ ...newSupplier, feed_type: e.target.value })}
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
                    value={newSupplier.feed_format}
                    onChange={(e) => setNewSupplier({ ...newSupplier, feed_format: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="action">Action</option>
                    <option value="heureka">Heureka</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Max stiahnutí za deň</label>
                <input
                  type="number"
                  value={newSupplier.max_downloads_per_day}
                  onChange={(e) => setNewSupplier({ ...newSupplier, max_downloads_per_day: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  min={1}
                  max={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Popis</label>
                <textarea
                  value={newSupplier.description}
                  onChange={(e) => setNewSupplier({ ...newSupplier, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Zrušiť
              </button>
              <button
                onClick={createSupplier}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                Vytvoriť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
