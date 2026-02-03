'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Database, FileText, Download, Trash2, Check, Clock,
  AlertCircle, Loader2, Calendar, HardDrive, Package, FolderTree, Tag
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

interface StoredFeed {
  id: string;
  supplier_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  file_hash: string;
  downloaded_at: string;
  download_duration_ms: number;
  total_products: number;
  total_categories: number;
  total_brands: number;
  status: string;
  is_current: boolean;
  expires_at: string | null;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
  max_downloads_per_day: number;
  download_count_today: number;
}

export default function SupplierFeedsPage() {
  const params = useParams();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [feeds, setFeeds] = useState<StoredFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadSupplier = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${supplierId}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setSupplier(data.data);
      }
    } catch (err) {
      console.error('Failed to load supplier:', err);
    }
  }, [supplierId]);

  const loadFeeds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${supplierId}/feeds`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setFeeds(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load feeds:', err);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    loadSupplier();
    loadFeeds();
  }, [loadSupplier, loadFeeds]);

  const deleteFeed = async (feedId: string) => {
    if (!confirm('Naozaj chcete vymazať tento feed?')) return;
    
    setDeleting(feedId);
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${supplierId}/feeds/${feedId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        loadFeeds();
      } else {
        alert(`Chyba: ${data.error}`);
      }
    } catch (err) {
      alert('Chyba pri mazaní feedu');
    } finally {
      setDeleting(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'imported':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'downloaded':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'imported':
        return 'Importovaný';
      case 'downloaded':
        return 'Stiahnutý';
      case 'failed':
        return 'Zlyhalo';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'imported':
        return 'bg-green-100 text-green-700';
      case 'downloaded':
        return 'bg-blue-100 text-blue-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const totalSize = feeds.reduce((sum, f) => sum + f.file_size, 0);

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
            <h1 className="text-2xl font-bold">
              {supplier?.name || 'Načítavam...'} - História feedov
            </h1>
            <p className="text-gray-500">
              {feeds.length} feedov • {formatBytes(totalSize)} celkom
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">{feeds.length}</div>
          <div className="text-sm text-gray-500">Celkom feedov</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-2xl font-bold text-green-600">
            {feeds.filter(f => f.status === 'imported').length}
          </div>
          <div className="text-sm text-gray-500">Importovaných</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-2xl font-bold text-blue-600">{formatBytes(totalSize)}</div>
          <div className="text-sm text-gray-500">Celková veľkosť</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-gray-900">
              {supplier?.download_count_today || 0}
            </div>
            <div className="text-sm text-gray-400">/ {supplier?.max_downloads_per_day || 8}</div>
          </div>
          <div className="text-sm text-gray-500">Stiahnutí dnes</div>
        </div>
      </div>

      {/* Feeds list */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : feeds.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Database className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">Žiadne feedy</h3>
          <p className="text-gray-500">
            Zatiaľ neboli stiahnuté žiadne feedy
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feeds.map((feed) => (
            <div 
              key={feed.id} 
              className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                feed.is_current ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      feed.is_current ? 'bg-primary-100' : 'bg-gray-100'
                    }`}>
                      <FileText className={`w-8 h-8 ${
                        feed.is_current ? 'text-primary-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{feed.filename}</h3>
                        {feed.is_current && (
                          <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full font-medium">
                            Aktuálny
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(feed.downloaded_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-4 h-4" />
                          {formatBytes(feed.file_size)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(feed.download_duration_ms)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(feed.status)}`}>
                      {getStatusIcon(feed.status)}
                      {getStatusText(feed.status)}
                    </span>
                    
                    <button
                      onClick={() => deleteFeed(feed.id)}
                      disabled={deleting === feed.id || feed.is_current}
                      className={`p-2 rounded-lg transition ${
                        feed.is_current
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                      title={feed.is_current ? 'Aktuálny feed sa nedá zmazať' : 'Zmazať feed'}
                    >
                      {deleting === feed.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Feed stats */}
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      <span className="font-medium">{feed.total_products.toLocaleString()}</span> produktov
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      <span className="font-medium">{feed.total_categories}</span> kategórií
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      <span className="font-medium">{feed.total_brands}</span> značiek
                    </span>
                  </div>
                </div>

                {/* File hash */}
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs text-gray-400 font-mono">
                    SHA-256: {feed.file_hash}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
