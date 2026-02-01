'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types'
import { formatPrice, getProductImage, calculateDiscount } from '@/lib/api'
import { useCartStore } from '@/lib/store'
import { ShoppingCart, Heart } from 'lucide-react'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, isLoading } = useCartStore()
  const discount = calculateDiscount(product.price, product.sale_price)
  const currentPrice = product.sale_price || product.price
  const imageUrl = getProductImage(product)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem(product)
  }

  return (
    <Link href={`/product/${product.slug}`} className="card group overflow-hidden">
      {/* Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="badge badge-error">-{discount}%</span>
          )}
          {product.stock === 0 && (
            <span className="badge bg-secondary text-white">Vypredané</span>
          )}
        </div>

        {/* Quick actions */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-2 bg-white rounded-full shadow-md hover:bg-primary hover:text-white transition-colors"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // TODO: Add to wishlist
            }}
          >
            <Heart size={18} />
          </button>
        </div>

        {/* Add to cart button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleAddToCart}
            disabled={isLoading || product.stock === 0}
            className="btn-primary w-full text-sm"
          >
            <ShoppingCart size={18} className="mr-2" />
            Do košíka
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name */}
        <h3 className="font-medium text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className={product.sale_price ? 'price-sale' : 'price'}>
            {formatPrice(currentPrice, product.currency)}
          </span>
          {product.sale_price && (
            <span className="price-original">
              {formatPrice(product.price, product.currency)}
            </span>
          )}
        </div>

        {/* Stock indicator */}
        {product.stock > 0 && product.stock < 5 && (
          <p className="text-xs text-warning mt-2">
            Posledných {product.stock} ks
          </p>
        )}
      </div>
    </Link>
  )
}

// Loading skeleton
export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-square skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton w-3/4" />
        <div className="h-4 skeleton w-1/2" />
        <div className="h-6 skeleton w-1/3" />
      </div>
    </div>
  )
}
