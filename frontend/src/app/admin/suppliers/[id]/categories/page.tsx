'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, FolderTree, Folder, FolderOpen, ChevronRight, ChevronDown,
  Package, Loader2, Search, Link as LinkIcon, Check
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface SupplierCategory {
  id: string;
  external_id: string;
  parent_external_id: string;
  name: string;
  full_path: string;
  category_id: string | null;
  product_count?: number;
}

interface CategoryTree {
  id: string;
  external_id: string;
  name: string;
  full_path: string;
  category_id: string | null;
  product_count?: number;
  children: CategoryTree[];
}

interface Supplier {
  id: string;
  name: string;
  code: string;
}

export default function SupplierCategoriesPage() {
  const params = useParams();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [categories, setCategories] = useState<SupplierCategory[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const loadSupplier = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${supplierId}`);
      const data = await res.json();
      if (data.success) {
        setSupplier(data.data);
      }
    } catch (err) {
      console.error('Failed to load supplier:', err);
    }
  }, [supplierId]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${supplierId}/categories`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.data.categories || []);
        setCategoryTree(data.data.tree || []);
        
        // Expand first level by default
        const firstLevelIds = new Set<string>((data.data.tree || []).map((c: CategoryTree) => c.external_id));
        setExpandedIds(firstLevelIds);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    loadSupplier();
    loadCategories();
  }, [loadSupplier, loadCategories]);

  const toggleExpand = (externalId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(externalId)) {
        next.delete(externalId);
      } else {
        next.add(externalId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (items: CategoryTree[]) => {
      items.forEach(item => {
        allIds.add(item.external_id);
        if (item.children) collectIds(item.children);
      });
    };
    collectIds(categoryTree);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const filterTree = (items: CategoryTree[], searchTerm: string): CategoryTree[] => {
    if (!searchTerm) return items;
    
    const term = searchTerm.toLowerCase();
    
    return items
      .map(item => {
        const matchesSearch = item.name.toLowerCase().includes(term) ||
                              item.full_path?.toLowerCase().includes(term);
        const filteredChildren = filterTree(item.children || [], searchTerm);
        
        if (matchesSearch || filteredChildren.length > 0) {
          return {
            ...item,
            children: filteredChildren
          };
        }
        return null;
      })
      .filter((item): item is CategoryTree => item !== null);
  };

  const filteredTree = filterTree(categoryTree, search);

  const renderCategory = (category: CategoryTree, depth: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.external_id);
    const isMapped = !!category.category_id;

    return (
      <div key={category.external_id}>
        <div 
          className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg cursor-pointer group`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => hasChildren && toggleExpand(category.external_id)}
        >
          {/* Expand/collapse icon */}
          <div className="w-5 h-5 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )
            ) : (
              <span className="w-4" />
            )}
          </div>

          {/* Folder icon */}
          {hasChildren && isExpanded ? (
            <FolderOpen className="w-5 h-5 text-yellow-500" />
          ) : hasChildren ? (
            <Folder className="w-5 h-5 text-yellow-500" />
          ) : (
            <Folder className="w-5 h-5 text-gray-400" />
          )}

          {/* Category name */}
          <span className="flex-grow font-medium text-gray-700">
            {category.name}
          </span>

          {/* Product count */}
          {category.product_count !== undefined && category.product_count > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {category.product_count}
            </span>
          )}

          {/* Mapped indicator */}
          {isMapped && (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3" />
              Prepojené
            </span>
          )}

          {/* Map button */}
          <button 
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Open mapping modal
            }}
          >
            <LinkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {category.children.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const totalCategories = categories.length;
  const mappedCategories = categories.filter(c => c.category_id).length;

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
              {supplier?.name || 'Načítavam...'} - Kategórie
            </h1>
            <p className="text-gray-500">
              {totalCategories} kategórií • {mappedCategories} prepojených
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">{totalCategories}</div>
          <div className="text-sm text-gray-500">Celkom kategórií</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-2xl font-bold text-green-600">{mappedCategories}</div>
          <div className="text-sm text-gray-500">Prepojených</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-2xl font-bold text-orange-600">{totalCategories - mappedCategories}</div>
          <div className="text-sm text-gray-500">Neprepojených</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-grow relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadať kategóriu..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Expand/collapse buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Rozbaliť všetky
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Zbaliť všetky
            </button>
          </div>
        </div>
      </div>

      {/* Category tree */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : categoryTree.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FolderTree className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">Žiadne kategórie</h3>
          <p className="text-gray-500">
            Najprv importujte produkty z feedu
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-4">
          {filteredTree.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Žiadne výsledky pre "{search}"
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTree.map(category => renderCategory(category, 0))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
