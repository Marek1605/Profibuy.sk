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
  const [activeTab, setActiveTab] = useState<'description' | 'params' | 'shipping'>('description')
  const addItem = useCartStore(s => s.addItem)

  useEffect(() => {
    async function load() {
      try { const p = await getProductBySlug(params.slug as string); setProduct(p) } catch {}
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
    <><Header /><div className="max-w-7xl mx-auto px-4 py-8"><div className="grid md:grid-cols-2 gap-10"><div className="skeleton aspect-square rounded-2xl" /><div className="space-y-4"><div className="skeleton h-8 w-3/4 rounded-xl" /><div className="skeleton h-6 w-1/3 rounded-xl" /><div className="skeleton h-40 rounded-xl" /></div></div></div><Footer /></>
  )

  if (!product) return (
    <><Header /><div className="max-w-4xl mx-auto px-4 py-20 text-center"><div className="text-5xl mb-4">😕</div><h1 className="text-2xl font-bold mb-4">Produkt nebol najdeny</h1><Link href="/products" className="text-blue-600 hover:underline font-medium">Spat na produkty</Link></div><Footer /></>
  )

  const discount = calculateDiscount(product.price, product.sale_price)
  const mainImage = product.images?.[selectedImage]?.url || getProductImage(product)

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-gray-800">Domov</Link>
            <span className="text-gray-300">/</span>
            <Link href="/products" className="hover:text-gray-800">Produkty</Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-800 line-clamp-1">{product.name}</span>
          </nav>

          <div className="bg-white rounded-2xl border p-6 lg:p-8">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              {/* Gallery */}
              <div>
                <div className="bg-gray-50 rounded-2xl overflow-hidden aspect-square flex items-center justify-center p-8 mb-4 relative">
                  {discount > 0 && <span className="sale-badge text-sm">-{discount}%</span>}
                  <img src={mainImage} alt={product.name} className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png' }} />
                </div>
                {product.images && product.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {product.images.map((img, i) => (
                      <button key={i} onClick={() => setSelectedImage(i)} className={`w-16 h-16 rounded-xl border-2 overflow-hidden flex-shrink-0 transition ${i === selectedImage ? 'border-blue-500' : 'border-gray-200 hover:border-gray-400'}`}>
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product info */}
              <div>
                <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-3 leading-tight">{product.name}</h1>
                {product.sku && <p className="text-sm text-gray-400 mb-4">SKU: {product.sku}</p>}

                {/* Price */}
                <div className="flex items-end gap-3 mb-6 pb-6 border-b">
                  {product.sale_price ? (
                    <>
                      <span className="text-4xl font-extrabold text-red-600">{formatPrice(product.sale_price)}</span>
                      <span className="text-xl text-gray-400 line-through">{formatPrice(product.price)}</span>
                      {discount > 0 && <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-bold">Usetrite {discount}%</span>}
                    </>
                  ) : (
                    <span className="text-4xl font-extrabold text-gray-900">{formatPrice(product.price)}</span>
                  )}
                </div>

                {/* Stock */}
                <div className="mb-6">
                  {product.stock > 0 ? (
                    <div className="flex items-center gap-2.5 text-green-700 bg-green-50 px-4 py-2.5 rounded-xl w-fit">
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="font-semibold text-sm">Skladom ({product.stock} ks) - Odosleme dnes</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 text-red-600 bg-red-50 px-4 py-2.5 rounded-xl w-fit">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                      <span className="font-semibold text-sm">Momentalne nedostupne</span>
                    </div>
                  )}
                </div>

                {/* Add to cart */}
                {product.stock > 0 && (
                  <div className="flex items-center gap-3 mb-8">
                    <div className="flex items-center border-2 rounded-xl overflow-hidden">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-3 hover:bg-gray-100 text-lg font-bold transition">-</button>
                      <span className="px-5 py-3 border-x-2 min-w-[3.5rem] text-center font-bold">{quantity}</span>
                      <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="px-4 py-3 hover:bg-gray-100 text-lg font-bold transition">+</button>
                    </div>
                    <button onClick={handleAddToCart} className={`flex-1 py-3.5 px-8 rounded-xl font-bold text-white text-base transition-all duration-200 ${added ? 'bg-green-500 scale-[1.02]' : 'hover:scale-[1.02] hover:shadow-lg'}`} style={!added ? { background: 'var(--accent)' } : {}}>
                      {added ? '✓ Pridane do kosika!' : '🛒 Pridat do kosika'}
                    </button>
                  </div>
                )}

                {/* Benefits */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: '🚚', text: 'Doprava od 2,99 EUR' },
                    { icon: '↩️', text: 'Vratenie do 14 dni' },
                    { icon: '🔒', text: 'Bezpecny nakup' },
                    { icon: '💳', text: 'Platba kartou/prevodom' },
                  ].map(b => (
                    <div key={b.text} className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl text-sm">
                      <span className="text-lg">{b.icon}</span>
                      <span className="text-gray-700">{b.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border mt-6 overflow-hidden">
            <div className="flex border-b">
              {[
                { key: 'description' as const, label: 'Popis' },
                { key: 'params' as const, label: 'Parametre' },
                { key: 'shipping' as const, label: 'Doprava' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-6 py-4 text-sm font-semibold transition-colors border-b-2 ${activeTab === tab.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{tab.label}</button>
              ))}
            </div>
            <div className="p-6 lg:p-8">
              {activeTab === 'description' && (
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                  {product.description ? <div dangerouslySetInnerHTML={{ __html: product.description }} /> : <p className="text-gray-400">Popis nie je dostupny.</p>}
                </div>
              )}
              {activeTab === 'params' && (
                product.attributes && product.attributes.length > 0 ? (
                  <table className="w-full text-sm">
                    <tbody>
                      {product.attributes.map((attr, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="py-3 px-4 font-semibold text-gray-600 w-1/3">{attr.name}</td>
                          <td className="py-3 px-4 text-gray-900">{attr.value}{attr.unit ? ` ${attr.unit}` : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-gray-400">Ziadne parametre.</p>
              )}
              {activeTab === 'shipping' && (
                <div className="space-y-4 text-sm text-gray-700">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <span className="text-xl">📦</span>
                    <div><p className="font-bold">Zasielkovna</p><p className="text-gray-500">2,99 EUR | Dorucenie 1-2 dni</p></div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <span className="text-xl">🚚</span>
                    <div><p className="font-bold">DPD / GLS kurier</p><p className="text-gray-500">3,99 - 4,49 EUR | Dorucenie 1-2 dni</p></div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                    <span className="text-xl">🎁</span>
                    <div><p className="font-bold text-green-700">Doprava zadarmo</p><p className="text-green-600">Pri objednavke nad 50 EUR</p></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
