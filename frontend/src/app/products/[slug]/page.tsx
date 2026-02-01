'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import { getProductBySlug, formatPrice, calculateDiscount, getProductImage } from '@/lib/api'
import { useCartStore } from '@/lib/store'
import type { Product } from '@/types'

export default function ProductDetailPage() {
  const params = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore(s => s.addItem)

  useEffect(() => {
    async function load() {
      try {
        const p = await getProductBySlug(params.slug as string)
        setProduct(p)
      } catch {}
      setLoading(false)
    }
    load()
  }, [params.slug])

  function handleAddToCart() {
    if (!product) return
    addItem(product, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) return (
    <>
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse grid md:grid-cols-2 gap-8">
          <div className="bg-gray-200 rounded-lg aspect-square" />
          <div className="space-y-4">
            <div className="bg-gray-200 h-8 w-3/4 rounded" />
            <div className="bg-gray-200 h-6 w-1/3 rounded" />
            <div className="bg-gray-200 h-32 rounded" />
          </div>
        </div>
      </div>
      <Footer />
    </>
  )

  if (!product) return (
    <>
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Produkt nebol najdeny</h1>
        <Link href="/products" className="text-blue-600 hover:underline">Spat na produkty</Link>
      </div>
      <Footer />
    </>
  )

  const discount = calculateDiscount(product.price, product.sale_price)
  const mainImage = product.images?.[selectedImage]?.url || getProductImage(product)

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-800">Domov</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-gray-800">Produkty</Link>
          <span>/</span>
          <span className="text-gray-800">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Image gallery */}
          <div>
            <div className="bg-gray-50 rounded-lg overflow-hidden aspect-square flex items-center justify-center mb-4">
              <img src={mainImage} alt={product.name} className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png' }} />
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)} className={`w-16 h-16 rounded border-2 overflow-hidden flex-shrink-0 ${i === selectedImage ? 'border-blue-600' : 'border-gray-200'}`}>
                    <img src={img.url} alt={img.alt || ''} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            
            {product.sku && <p className="text-sm text-gray-500 mb-4">SKU: {product.sku}</p>}

            <div className="flex items-center gap-3 mb-6">
              {product.sale_price ? (
                <>
                  <span className="text-3xl font-bold text-red-600">{formatPrice(product.sale_price)}</span>
                  <span className="text-xl text-gray-400 line-through">{formatPrice(product.price)}</span>
                  {discount > 0 && <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm font-medium">-{discount}%</span>}
                </>
              ) : (
                <span className="text-3xl font-bold text-gray-900">{formatPrice(product.price)}</span>
              )}
            </div>

            {/* Stock */}
            <div className="mb-6">
              {product.stock > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-green-700 font-medium">Skladom ({product.stock} ks)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-red-700 font-medium">Nedostupne</span>
                </div>
              )}
            </div>

            {/* Add to cart */}
            {product.stock > 0 && (
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center border rounded">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 hover:bg-gray-100">-</button>
                  <span className="px-4 py-2 border-x min-w-[3rem] text-center">{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="px-3 py-2 hover:bg-gray-100">+</button>
                </div>
                <button onClick={handleAddToCart} className={`flex-1 py-3 px-6 rounded-lg font-medium text-white transition ${added ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {added ? 'Pridane do kosika!' : 'Pridat do kosika'}
                </button>
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-2 gap-3 mb-8 text-sm">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                <span>🚚</span> Doprava od 2,99 EUR
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                <span>↩️</span> Vratenie do 14 dni
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                <span>🔒</span> Bezpecny nakup
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                <span>💳</span> Platba kartou
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="border-t pt-6">
                <h2 className="font-bold text-lg mb-3">Popis</h2>
                <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: product.description }} />
              </div>
            )}

            {/* Attributes */}
            {product.attributes && product.attributes.length > 0 && (
              <div className="border-t pt-6 mt-6">
                <h2 className="font-bold text-lg mb-3">Parametre</h2>
                <table className="w-full text-sm">
                  <tbody>
                    {product.attributes.map((attr, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-2 px-3 font-medium text-gray-600">{attr.name}</td>
                        <td className="py-2 px-3">{attr.value}{attr.unit ? ` ${attr.unit}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
