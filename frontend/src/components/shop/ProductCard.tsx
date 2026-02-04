'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatPrice, calculateDiscount, getProductImage } from '@/lib/api'
import { useCartStore } from '@/lib/store'
import type { Product } from '@/types'

export default function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore(s => s.addItem)
  const [wishlisted, setWishlisted] = useState(false)
  const [added, setAdded] = useState(false)
  const [imgError, setImgError] = useState(false)
  
  const discount = calculateDiscount(product?.price, product?.sale_price)
  const image = imgError ? '/placeholder.svg' : getProductImage(product)

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  if (!product) return null

  return (
    <div className="product-card group relative">
      {/* Sale badge */}
      {discount > 0 && (
        <span className="sale-badge">-{discount}%</span>
      )}

      {/* Action buttons */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted) }} className={`w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center transition hover:scale-110 ${wishlisted ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
          <svg className="w-4 h-4" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
        </button>
        <button className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-gray-400 hover:text-blue-600 transition hover:scale-110">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </button>
      </div>

      {/* Image */}
      <Link href={`/products/${product.slug}`}>
        <div className="aspect-square bg-gray-50 flex items-center justify-center p-6 overflow-hidden">
          <img 
            src={image} 
            alt={product.name || 'Produkt'} 
            className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-110" 
            onError={() => setImgError(true)} 
            loading="lazy" 
          />
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Brand */}
        {product.brand_id && (
          <span className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--accent)' }}>Brand</span>
        )}

        {/* Name */}
        <Link href={`/products/${product.slug}`} className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-blue-700 transition leading-tight min-h-[2.5rem] block mb-3">
          {product.name || 'Bez názvu'}
        </Link>

        {/* Price */}
        <div className="flex items-end gap-2 mb-3">
          {product.sale_price ? (
            <>
              <span className="text-xl font-extrabold text-red-600">{formatPrice(product.sale_price)}</span>
              <span className="text-sm text-gray-400 line-through">{formatPrice(product.price)}</span>
            </>
          ) : (
            <span className="text-xl font-extrabold text-gray-900">{formatPrice(product.price)}</span>
          )}
        </div>

        {/* Stock + Add to cart */}
        <div className="flex items-center justify-between">
          <span className={`flex items-center gap-1.5 text-xs font-medium ${(product.stock || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
            <span className={`w-2 h-2 rounded-full ${(product.stock || 0) > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            {(product.stock || 0) > 0 ? 'Skladom' : 'Nedostupne'}
          </span>
          {(product.stock || 0) > 0 && (
            <button onClick={handleAddToCart} className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 ${added ? 'bg-green-500' : 'hover:scale-105'}`} style={!added ? { background: 'var(--primary)' } : {}}>
              {added ? '✓' : 'Do kosika'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
