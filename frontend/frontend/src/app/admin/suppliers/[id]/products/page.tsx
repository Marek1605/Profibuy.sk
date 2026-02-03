'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Search, Filter, Package, Image as ImageIcon, 
  ExternalLink, Check, X, Loader2, ChevronLeft, ChevronRight,
  Tag, Warehouse, Euro, Link2, Trash2
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

interface SupplierProduct {
  id: string;
  external_id: string;
  ean: string;
  manufacturer_part_number: string;
  name: string;
  price_net: number;
  price_vat: number;
  vat_rate: number;
  srp: number;
  stock: number;
  stock_status: string;
  category_tree: string;
  producer_name: string;
  images: ProductImage[];
  product_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductImage {
  url: string;
  is_main: boolean;
}

interface SupplierCategory {
  id: string;
  external_id: string;
  name: string;
  full_path: string;
}

interface SupplierBrand {
  id: string;
  external_id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
}

export default function SupplierProductsPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [categories, setCategories] = useState<SupplierCategory[]>([]);
  const [brands, setBrands] = useState<SupplierBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  
  // Link all state
  const [linking, setLinking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkProgress, setLinkProgress] = useState<{
    status: string;
    total: number;
    processed: number;
    created: number;
    updated: number;
    errors: number;
    message: string;
  } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [linkedFilter, setLinkedFilter] = useState<'all' | 'linked' | 'unlinked'>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

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

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${supplierId}/categories`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setCategories(data.data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, [supplierId]);

  const loadBrands = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${supplierId}/brands`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setBrands(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load brands:', err);
    }
  }, [supplierId]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedBrand) params.append('brand', selectedBrand);

      const res = await fetch(`${API_BASE}/admin/suppliers/${supplierId}/products?${params}`, { headers: authHeaders() });
      const data = await res.json();
      
      if (data.success) {
        let filtered = data.data || [];
        
        // Apply client-side filters
        if (stockFilter === 'in_stock') {
          filtered = filtered.filter((p: SupplierProduct) => p.stock > 0);
        } else if (stockFilter === 'out_of_stock') {
          filtered = filtered.filter((p: SupplierProduct) => p.stock === 0);
        }

        if (linkedFilter === 'linked') {
          filtered = filtered.filter((p: SupplierProduct) => p.product_id);
        } else if (linkedFilter === 'unlinked') {
          filtered = filtered.filter((p: SupplierProduct) => !p.product_id);
        }

        setProducts(filtered);
        setTotalProducts(data.total || filtered.length);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, [supplierId, page, limit, search, selectedCategory, selectedBrand, stockFilter, linkedFilter]);

  useEffect(() => {
    loadSupplier();
    loadCategories();
    loadBrands();
  }, [loadSupplier, loadCategories, loadBrands]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const totalPages = Math.ceil(totalProducts / limit);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sk-SK', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(price);
  };

  const getStockStatusColor = (stock: number, status: string) => {
    if (stock > 10) return 'text-green-600 bg-green-50';
    if (stock > 0) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getMainImage = (images: ProductImage[]) => {
    const main = images?.find(i => i.is_main);
    return main?.url || images?.[0]?.url || null;
  };

  // Link all products to main catalog
  const linkAllProducts = async () => {
    if (linking) return;
    
    if (!confirm('Prepojiť všetky produkty do hlavného katalógu? Toto vytvorí produkty, kategórie a značky.')) {
      return;
    }
    
    setLinking(true);
    setLinkProgress(null);
    
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${supplierId}/link-all`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      
      if (data.success && data.link_id) {
        // Poll for progress
        const pollProgress = async () => {
          const progressRes = await fetch(
            `${API_BASE}/admin/suppliers/${supplierId}/link/${data.link_id}/progress`,
            { headers: authHeaders() }
          );
          const progressData = await progressRes.json();
          
          if (progressData.success && progressData.data) {
            setLinkProgress(progressData.data);
            
            if (progressData.data.status === 'running') {
              setTimeout(pollProgress, 1000);
            } else {
              setLinking(false);
              // Reload products after linking
              loadProducts();
            }
          }
        };
        
        pollProgress();
      }
    } catch (err) {
      console.error('Failed to link products:', err);
      setLinking(false);
    }
  };

  // Delete all supplier products and linked main products
  const deleteAllProducts = async () => {
    if (deleting) return;
    
    const confirmMsg = 'POZOR! Toto vymaže všetky produkty tohto dodávateľa aj prepojené produkty z hlavného katalógu.\n\nNapíšte "VYMAZAT" pre potvrdenie:';
    const input = prompt(confirmMsg);
    
    if (input !== 'VYMAZAT') {
      alert('Mazanie zrušené.');
      return;
    }
    
    setDeleting(true);
    
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${supplierId}/delete-all-products`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`Vymazané! Produkty: ${data.deleted_supplier_products}, Hlavný katalóg: ${data.deleted_main_products}`);
        loadProducts();
      } else {
        alert('Chyba: ' + (data.error || 'Neznáma chyba'));
      }
    } catch (err) {
      console.error('Failed to delete products:', err);
      alert('Chyba pri mazaní produktov');
    } finally {
      setDeleting(false);
    }
  };

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
              {supplier?.name || 'Načítavam...'} - Produkty
            </h1>
            <p className="text-gray-500">
              {totalProducts.toLocaleString()} produktov
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Link All Button */}
            <button
              onClick={linkAllProducts}
              disabled={linking || deleting || totalProducts === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {linking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Prepájam...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Prepojiť všetko
                </>
              )}
            </button>
            
            {/* Delete All Button */}
            <button
              onClick={deleteAllProducts}
              disabled={linking || deleting || totalProducts === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mažem...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Vymazať všetko
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Link Progress */}
        {linkProgress && (
          <div className={`mt-4 p-4 rounded-lg ${
            linkProgress.status === 'completed' ? 'bg-green-50 border border-green-200' :
            linkProgress.status === 'failed' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">
                {linkProgress.status === 'running' && 'Prepájam produkty...'}
                {linkProgress.status === 'completed' && '✓ Prepojenie dokončené!'}
                {linkProgress.status === 'failed' && '✗ Chyba pri prepájaní'}
              </span>
              <span className="text-sm text-gray-500">
                {linkProgress.processed} / {linkProgress.total}
              </span>
            </div>
            {linkProgress.status === 'running' && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(linkProgress.processed / linkProgress.total) * 100}%` }}
                />
              </div>
            )}
            <p className="text-sm text-gray-600">{linkProgress.message}</p>
            {linkProgress.status === 'completed' && (
              <p className="text-sm text-green-700 mt-1">
                Vytvorených: {linkProgress.created}, Aktualizovaných: {linkProgress.updated}
                {linkProgress.errors > 0 && `, Chýb: ${linkProgress.errors}`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Hľadať podľa názvu, EAN, kódu..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Category filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Všetky kategórie</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.external_id}>
                  {cat.full_path || cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand filter */}
          <div>
            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Všetky značky</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.name}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock filter */}
          <div>
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value as 'all' | 'in_stock' | 'out_of_stock');
                setPage(1);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Všetky stavy skladu</option>
              <option value="in_stock">Na sklade</option>
              <option value="out_of_stock">Vypredané</option>
            </select>
          </div>
        </div>

        {/* Secondary filters */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <span className="text-sm text-gray-500">Prepojenie:</span>
          <div className="flex gap-2">
            {(['all', 'linked', 'unlinked'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => {
                  setLinkedFilter(filter);
                  setPage(1);
                }}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  linkedFilter === filter
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter === 'all' ? 'Všetky' : filter === 'linked' ? 'Prepojené' : 'Neprepojené'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products list */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">Žiadne produkty</h3>
          <p className="text-gray-500">
            {search || selectedCategory || selectedBrand
              ? 'Skúste zmeniť filtre'
              : 'Najprv importujte produkty z feedu'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Produkt
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      EAN / Kód
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Kategória
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Cena
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Sklad
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Prepojené
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((product) => {
                    const mainImage = getMainImage(product.images);
                    
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {mainImage ? (
                                <img 
                                  src={mainImage} 
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate max-w-xs">
                                {product.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {product.producer_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            {product.ean && (
                              <div className="flex items-center gap-1">
                                <Tag className="w-3 h-3 text-gray-400" />
                                {product.ean}
                              </div>
                            )}
                            {product.manufacturer_part_number && (
                              <div className="text-gray-500">
                                {product.manufacturer_part_number}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {product.category_tree || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm">
                            <div className="font-medium">
                              {formatPrice(product.price_vat)}
                            </div>
                            <div className="text-gray-500">
                              {formatPrice(product.price_net)} bez DPH
                            </div>
                            {product.srp > 0 && product.srp !== product.price_vat && (
                              <div className="text-xs text-gray-400">
                                MPC: {formatPrice(product.srp)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStockStatusColor(product.stock, product.stock_status)}`}>
                            <Warehouse className="w-3 h-3" />
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {product.product_id ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <Check className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-400">
                              <X className="w-4 h-4" />
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Zobrazujem {((page - 1) * limit) + 1} - {Math.min(page * limit, totalProducts)} z {totalProducts.toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg ${
                          page === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
