'use client'

import Link from 'next/link'
import { formatPrice, calculateDiscount, getProductImage } from '@/lib/api'
import { useCartStore } from '@/lib/store'
import type { Product } from '@/types'

export default function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore(s => s.addItem)
  const discount = calculateDiscount(product.price, product.sale_price)
  const image = getProductImage(product)

  return (
    <div className="group bg-white border rounded-lg overflow-hidden hover:shadow-lg transition relative">
      {discount > 0 && (
        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded z-10 font-bold">-{discount}%</span>
      )}
      
      <Link href={`/products/${product.slug}`}>
        <div className="aspect-square bg-gray-50 flex items-center justify-center p-4">
          <img src={image} alt={product.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      </Link>

      <div className="p-3">
        <Link href={`/products/${product.slug}`} className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-blue-600 min-h-[2.5rem]">
          {product.name}
        </Link>

        <div className="mt-2 flex items-center gap-2">
          {product.sale_price ? (
            <>
              <span className="font-bold text-red-600">{formatPrice(product.sale_price)}</span>
              <span className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>
            </>
          ) : (
            <span className="font-bold text-gray-900">{formatPrice(product.price)}</span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className={`text-xs ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {product.stock > 0 ? 'Skladom' : 'Nedostupne'}
          </span>
          {product.stock > 0 && (
            <button onClick={(e) => { e.preventDefault(); addItem(product) }} className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 transition">
              Do kosika
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
