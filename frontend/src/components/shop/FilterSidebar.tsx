'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { FilterOptions, AttributeFilter } from '@/types'
import { getFilters, formatPrice } from '@/lib/api'

interface FilterSidebarProps {
  categorySlug: string
  onFilterChange?: () => void
  totalProducts?: number
}

export default function FilterSidebar({ categorySlug, onFilterChange, totalProducts }: FilterSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<FilterOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    price: true,
    brands: false,
    stock: true,
  })
  const [brandSearch, setBrandSearch] = useState('')
  const [showAllBrands, setShowAllBrands] = useState(false)
  const [localMinPrice, setLocalMinPrice] = useState('')
  const [localMaxPrice, setLocalMaxPrice] = useState('')
  const priceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Current filter state from URL
  const selectedBrands = searchParams.get('brands')?.split(',').filter(Boolean) || []
  const minPrice = searchParams.get('min_price') || ''
  const maxPrice = searchParams.get('max_price') || ''
  const inStock = searchParams.get('in_stock') === 'true'
  const onSale = searchParams.get('on_sale') === 'true'
  const selectedAttributes: Record<string, string[]> = {}

  // Parse attribute params from URL (format: attr_Name=value1,value2)
  searchParams.forEach((value, key) => {
    if (key.startsWith('attr_')) {
      const attrName = key.replace('attr_', '').replace(/_/g, ' ')
      selectedAttributes[attrName] = value.split(',').filter(Boolean)
    }
  })

  // Sync local price state with URL
  useEffect(() => {
    setLocalMinPrice(minPrice)
    setLocalMaxPrice(maxPrice)
  }, [minPrice, maxPrice])

  // Load filters
  useEffect(() => {
    async function loadFilters() {
      setLoading(true)
      try {
        const data = await getFilters(categorySlug)
        setFilters(data)
        // Auto-expand first 3 attribute sections
        if (data?.attributes) {
          const expanded: Record<string, boolean> = { price: true, brands: true, stock: true }
          data.attributes.slice(0, 3).forEach(a => { expanded[`attr_${a.name}`] = true })
          setExpandedSections(expanded)
        }
      } catch (e) {
        console.error('Failed to load filters:', e)
      }
      setLoading(false)
    }
    loadFilters()
  }, [categorySlug])

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const p = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        p.delete(key)
      } else {
        p.set(key, value)
      }
    })
    p.set('page', '1')
    router.push(`/categories/${categorySlug}?${p.toString()}`)
    onFilterChange?.()
  }, [searchParams, categorySlug, router, onFilterChange])

  function toggleBrand(brandId: string) {
    const current = new Set(selectedBrands)
    if (current.has(brandId)) {
      current.delete(brandId)
    } else {
      current.add(brandId)
    }
    updateParams({ brands: current.size > 0 ? Array.from(current).join(',') : null })
  }

  function toggleAttribute(attrName: string, value: string) {
    const key = `attr_${attrName.replace(/ /g, '_')}`
    const current = new Set(selectedAttributes[attrName] || [])
    if (current.has(value)) {
      current.delete(value)
    } else {
      current.add(value)
    }
    updateParams({ [key]: current.size > 0 ? Array.from(current).join(',') : null })
  }

  function handlePriceChange(field: 'min_price' | 'max_price', value: string) {
    if (field === 'min_price') setLocalMinPrice(value)
    else setLocalMaxPrice(value)
    
    if (priceTimeoutRef.current) clearTimeout(priceTimeoutRef.current)
    priceTimeoutRef.current = setTimeout(() => {
      updateParams({ [field]: value || null })
    }, 600)
  }

  function toggleSection(key: string) {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function clearAllFilters() {
    router.push(`/categories/${categorySlug}`)
    onFilterChange?.()
  }

  const hasActiveFilters = selectedBrands.length > 0 || minPrice || maxPrice || inStock || onSale || Object.keys(selectedAttributes).length > 0

  const activeFilterCount = selectedBrands.length 
    + (minPrice ? 1 : 0) 
    + (maxPrice ? 1 : 0) 
    + (inStock ? 1 : 0) 
    + (onSale ? 1 : 0) 
    + Object.values(selectedAttributes).reduce((sum, vals) => sum + vals.length, 0)

  // Filter brands by search
  const filteredBrands = filters?.brands?.filter(b => 
    b.name.toLowerCase().includes(brandSearch.toLowerCase())
  ) || []
  const displayedBrands = showAllBrands ? filteredBrands : filteredBrands.slice(0, 8)

  if (loading) {
    return <FilterSkeleton />
  }

  return (
    <aside className="filter-sidebar w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Filtre</h2>
          {activeFilterCount > 0 && (
            <span className="min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold text-white flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              {activeFilterCount}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs font-medium text-red-500 hover:text-red-700 transition flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Zrušiť všetky
          </button>
        )}
      </div>

      {/* Active filters chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 mb-5 pb-5 border-b border-gray-100">
          {selectedBrands.map(id => {
            const brand = filters?.brands?.find(b => b.id === id)
            return brand ? (
              <button key={id} onClick={() => toggleBrand(id)} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition">
                {brand.name}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            ) : null
          })}
          {(minPrice || maxPrice) && (
            <button onClick={() => updateParams({ min_price: null, max_price: null })} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition">
              {minPrice && `od ${minPrice}€`}{minPrice && maxPrice && ' - '}{maxPrice && `do ${maxPrice}€`}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
          {inStock && (
            <button onClick={() => updateParams({ in_stock: null })} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition">
              Skladom
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
          {onSale && (
            <button onClick={() => updateParams({ on_sale: null })} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition">
              V akcii
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
          {Object.entries(selectedAttributes).map(([name, values]) =>
            values.map(v => (
              <button key={`${name}-${v}`} onClick={() => toggleAttribute(name, v)} className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition">
                {v}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            ))
          )}
        </div>
      )}

      {/* Availability section */}
      <FilterSection title="Dostupnosť" sectionKey="stock" expanded={expandedSections.stock} onToggle={toggleSection}>
        <label className="flex items-center gap-3 py-1.5 cursor-pointer group">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${inStock ? 'border-green-500 bg-green-500' : 'border-gray-300 group-hover:border-gray-400'}`}>
            {inStock && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          </div>
          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition">Skladom</span>
          <input type="checkbox" checked={inStock} onChange={() => updateParams({ in_stock: inStock ? null : 'true' })} className="sr-only" />
        </label>
        <label className="flex items-center gap-3 py-1.5 cursor-pointer group">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${onSale ? 'border-red-500 bg-red-500' : 'border-gray-300 group-hover:border-gray-400'}`}>
            {onSale && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          </div>
          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition">V akcii</span>
          <input type="checkbox" checked={onSale} onChange={() => updateParams({ on_sale: onSale ? null : 'true' })} className="sr-only" />
        </label>
      </FilterSection>

      {/* Price section */}
      <FilterSection title="Cena" sectionKey="price" expanded={expandedSections.price} onToggle={toggleSection}>
        {filters?.price_range && (
          <div className="text-xs text-gray-400 mb-3">
            {formatPrice(filters.price_range.min)} — {formatPrice(filters.price_range.max)}
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              placeholder="Od"
              value={localMinPrice}
              onChange={(e) => handlePriceChange('min_price', e.target.value)}
              className="w-full pl-3 pr-7 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
          </div>
          <div className="w-3 h-px bg-gray-300" />
          <div className="relative flex-1">
            <input
              type="number"
              placeholder="Do"
              value={localMaxPrice}
              onChange={(e) => handlePriceChange('max_price', e.target.value)}
              className="w-full pl-3 pr-7 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
          </div>
        </div>
      </FilterSection>

      {/* Brands section */}
      {filters?.brands && filters.brands.length > 0 && (
        <FilterSection title="Značka" sectionKey="brands" expanded={expandedSections.brands} onToggle={toggleSection} count={selectedBrands.length}>
          {filters.brands.length > 8 && (
            <div className="relative mb-3">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Hľadať značku..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          )}
          <div className="space-y-0.5 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
            {displayedBrands.map(brand => (
              <label key={brand.id} className="flex items-center gap-3 py-1.5 cursor-pointer group rounded-lg hover:bg-gray-50 px-1 -mx-1 transition">
                <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${selectedBrands.includes(brand.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-gray-400'}`} style={selectedBrands.includes(brand.id) ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}>
                  {selectedBrands.includes(brand.id) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className="text-sm text-gray-700 group-hover:text-gray-900 flex-1 truncate transition">{brand.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{brand.count}</span>
                <input type="checkbox" checked={selectedBrands.includes(brand.id)} onChange={() => toggleBrand(brand.id)} className="sr-only" />
              </label>
            ))}
          </div>
          {filteredBrands.length > 8 && !brandSearch && (
            <button
              onClick={() => setShowAllBrands(!showAllBrands)}
              className="mt-2 text-xs font-medium hover:underline transition"
              style={{ color: 'var(--primary)' }}
            >
              {showAllBrands ? 'Zobraziť menej' : `Zobraziť všetky (${filteredBrands.length})`}
            </button>
          )}
        </FilterSection>
      )}

      {/* Dynamic attribute sections */}
      {filters?.attributes?.map(attr => (
        <AttributeFilterSection
          key={attr.name}
          attribute={attr}
          selected={selectedAttributes[attr.name] || []}
          expanded={expandedSections[`attr_${attr.name}`] ?? false}
          onToggle={(val) => toggleAttribute(attr.name, val)}
          onToggleSection={() => toggleSection(`attr_${attr.name}`)}
        />
      ))}
    </aside>
  )
}

// Collapsible section wrapper
function FilterSection({ 
  title, sectionKey, expanded, onToggle, children, count 
}: { 
  title: string; sectionKey: string; expanded: boolean; onToggle: (key: string) => void; children: React.ReactNode; count?: number 
}) {
  return (
    <div className="border-b border-gray-100 py-4">
      <button
        onClick={() => onToggle(sectionKey)}
        className="flex items-center justify-between w-full group"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 transition">{title}</span>
          {count && count > 0 ? (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: 'var(--primary)' }}>
              {count}
            </span>
          ) : null}
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${expanded ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  )
}

// Attribute filter section with search for many values
function AttributeFilterSection({
  attribute, selected, expanded, onToggle, onToggleSection
}: {
  attribute: AttributeFilter; selected: string[]; expanded: boolean; onToggle: (val: string) => void; onToggleSection: () => void
}) {
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)

  const filtered = attribute.values.filter(v =>
    v.value.toLowerCase().includes(search.toLowerCase())
  )
  const displayed = showAll ? filtered : filtered.slice(0, 6)

  return (
    <FilterSection
      title={attribute.name}
      sectionKey={`attr_${attribute.name}`}
      expanded={expanded}
      onToggle={onToggleSection}
      count={selected.length}
    >
      {attribute.values.length > 6 && (
        <div className="relative mb-2">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={`Hľadať...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400 transition"
          />
        </div>
      )}
      <div className="space-y-0.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
        {displayed.map(val => (
          <label key={val.value} className="flex items-center gap-3 py-1 cursor-pointer group rounded-lg hover:bg-gray-50 px-1 -mx-1 transition">
            <div className={`w-[18px] h-[18px] rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${selected.includes(val.value) ? 'border-purple-600 bg-purple-600' : 'border-gray-300 group-hover:border-gray-400'}`}>
              {selected.includes(val.value) && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </div>
            <span className="text-xs text-gray-700 group-hover:text-gray-900 flex-1 truncate transition">{val.value}</span>
            <span className="text-[10px] text-gray-400 flex-shrink-0">{val.count}</span>
            <input type="checkbox" checked={selected.includes(val.value)} onChange={() => onToggle(val.value)} className="sr-only" />
          </label>
        ))}
      </div>
      {filtered.length > 6 && !search && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-1.5 text-xs font-medium hover:underline transition"
          style={{ color: 'var(--primary)' }}
        >
          {showAll ? 'Menej' : `Všetky (${filtered.length})`}
        </button>
      )}
    </FilterSection>
  )
}

// Skeleton loader
function FilterSkeleton() {
  return (
    <aside className="w-full space-y-5">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
        <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
      </div>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="py-4 border-b border-gray-100">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="space-y-2">
            {[1, 2, 3].map(j => (
              <div key={j} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 flex-1 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </aside>
  )
}
