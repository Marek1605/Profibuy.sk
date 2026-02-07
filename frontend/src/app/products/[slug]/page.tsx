'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import { getProductBySlug, formatPrice, calculateDiscount, getProductImage, getProductOffers } from '@/lib/api'
import { useCartStore } from '@/lib/store'
import type { Product, Offer } from '@/types'

export default function ProductDetailPage() {
  const params = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeTab, setActiveTab] = useState<'offers' | 'description' | 'params' | 'shipping'>('description')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const addItem = useCartStore(s => s.addItem)

  useEffect(() => {
    async function load() {
      try {
        const p = await getProductBySlug(params.slug as string)
        setProduct(p)
        // Load offers if available
        if (p?.id) {
          try {
            const o = await getProductOffers(p.id)
            setOffers(o || [])
          } catch {}
        }
      } catch (e) {
        console.error('Failed to load product:', e)
      }
      setLoading(false)
    }
    load()
  }, [params.slug])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowLeft') prevImage()
      if (e.key === 'ArrowRight') nextImage()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxOpen, selectedImage])

  const images = product?.images?.map(img => img.url) || (product ? [getProductImage(product)] : ['/placeholder.svg'])
  const mainImage = images[selectedImage] || '/placeholder.svg'
  
  const prevImage = useCallback(() => {
    setSelectedImage(i => (i - 1 + images.length) % images.length)
  }, [images.length])
  
  const nextImage = useCallback(() => {
    setSelectedImage(i => (i + 1) % images.length)
  }, [images.length])

  function handleAddToCart() {
    if (!product) return
    addItem(product, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  function toggleWishlist() {
    setIsWishlisted(!isWishlisted)
  }

  if (loading) return (
    <>
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="skeleton aspect-square rounded-2xl" />
          <div className="space-y-4">
            <div className="skeleton h-8 w-3/4 rounded-xl" />
            <div className="skeleton h-6 w-1/3 rounded-xl" />
            <div className="skeleton h-40 rounded-xl" />
          </div>
        </div>
      </div>
      <Footer />
    </>
  )

  if (!product) return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold mb-4">Produkt nebol najdeny</h1>
        <Link href="/products" className="text-blue-600 hover:underline font-medium">Spat na produkty</Link>
      </div>
      <Footer />
    </>
  )

  const discount = calculateDiscount(product.price, product.sale_price)

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
            <Link href="/" className="hover:text-gray-800">Domov</Link>
            <span className="text-gray-300">›</span>
            <Link href="/products" className="hover:text-gray-800">Produkty</Link>
            <span className="text-gray-300">›</span>
            <span className="text-gray-800 line-clamp-1">{product.name}</span>
          </nav>

          <div className="bg-white rounded-2xl border p-6 lg:p-8">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              {/* Gallery */}
              <div>
                <div className="bg-gray-50 rounded-2xl overflow-hidden aspect-square flex items-center justify-center p-8 mb-4 relative cursor-zoom-in" onClick={() => setLightboxOpen(true)}>
                  {discount > 0 && <span className="sale-badge text-sm">-{discount}%</span>}
                  <img src={mainImage} alt={product.name} className="max-w-full max-h-full object-contain transition-transform hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg' }} />
                  {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs">
                      {selectedImage + 1} / {images.length}
                    </div>
                  )}
                </div>
                
                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {images.map((img, i) => (
                      <button 
                        key={i} 
                        onClick={() => setSelectedImage(i)} 
                        className={`w-16 h-16 rounded-xl border-2 overflow-hidden flex-shrink-0 transition ${i === selectedImage ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-400'}`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg' }} />
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
                      {discount > 0 && <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-bold">Ušetríte {discount}%</span>}
                    </>
                  ) : (
                    <span className="text-4xl font-extrabold text-gray-900">{formatPrice(product.price)}</span>
                  )}
                </div>

                {/* Stock */}
                <div className="mb-6">
                  {(product.stock || 0) > 0 ? (
                    <div className="flex items-center gap-2.5 text-green-700 bg-green-50 px-4 py-2.5 rounded-xl w-fit">
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="font-semibold text-sm">Skladom ({product.stock} ks) - Odošleme dnes</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 text-red-600 bg-red-50 px-4 py-2.5 rounded-xl w-fit">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                      <span className="font-semibold text-sm">Momentálne nedostupné</span>
                    </div>
                  )}
                </div>

                {/* Add to cart */}
                {(product.stock || 0) > 0 && (
                  <div className="flex items-center gap-3 mb-8">
                    <div className="flex items-center border-2 rounded-xl overflow-hidden">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-3 hover:bg-gray-100 text-lg font-bold transition">-</button>
                      <span className="px-5 py-3 border-x-2 min-w-[3.5rem] text-center font-bold">{quantity}</span>
                      <button onClick={() => setQuantity(Math.min(product.stock || 1, quantity + 1))} className="px-4 py-3 hover:bg-gray-100 text-lg font-bold transition">+</button>
                    </div>
                    <button onClick={handleAddToCart} className={`flex-1 py-3.5 px-8 rounded-xl font-bold text-white text-base transition-all duration-200 ${added ? 'bg-green-500 scale-[1.02]' : 'hover:scale-[1.02] hover:shadow-lg'}`} style={!added ? { background: 'var(--primary)' } : {}}>
                      {added ? '✓ Pridané do košíka!' : '🛒 Pridať do košíka'}
                    </button>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={toggleWishlist}
                    className={`p-3 rounded-xl border-2 transition ${isWishlisted ? 'border-red-500 bg-red-50 text-red-500' : 'border-gray-200 hover:border-gray-400'}`}
                    title="Pridať do obľúbených"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </button>
                  <button className="p-3 rounded-xl border-2 border-gray-200 hover:border-gray-400 transition" title="Porovnať">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                  </button>
                </div>

                {/* Benefits */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: '🚚', text: 'Doprava od 2,99 EUR' },
                    { icon: '↩️', text: 'Vrátenie do 14 dní' },
                    { icon: '🔒', text: 'Bezpečný nákup' },
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
            <div className="flex border-b overflow-x-auto no-scrollbar">
              {[
                { key: 'description' as const, label: '📝 Popis' },
                { key: 'params' as const, label: `📋 Parametre${product.attributes?.length ? ` (${product.attributes.length})` : ''}` },
                { key: 'shipping' as const, label: '🚚 Doprava' },
                ...(offers.length > 0 ? [{ key: 'offers' as const, label: `📊 Ponuky (${offers.length})` }] : []),
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-6 py-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.key ? 'text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`} style={activeTab === tab.key ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : {}}>{tab.label}</button>
              ))}
            </div>
            <div className="p-6 lg:p-8">
              {activeTab === 'description' && (
                <div>
                  {product.description ? (
                    <>
                      <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: product.description }} />
                      {/* Show attributes below description if available */}
                      {product.attributes && product.attributes.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-gray-100">
                          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            Technické parametre
                          </h3>
                          <ProductAttributesTable attributes={product.attributes} />
                        </div>
                      )}
                    </>
                  ) : (
                    /* No description - show attributes as primary content */
                    product.attributes && product.attributes.length > 0 ? (
                      <div>
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)', opacity: 0.1 }}>
                            <svg className="w-5 h-5" style={{ color: 'var(--primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">Technické parametre</h3>
                            <p className="text-sm text-gray-400">{product.attributes.length} parametrov</p>
                          </div>
                        </div>
                        <ProductAttributesTable attributes={product.attributes} />
                      </div>
                    ) : (
                      <p className="text-gray-400">Popis nie je dostupný.</p>
                    )
                  )}
                </div>
              )}
              {activeTab === 'params' && (
                product.attributes && product.attributes.length > 0 ? (
                  <ProductAttributesTable attributes={product.attributes} />
                ) : <p className="text-gray-400">Žiadne parametre.</p>
              )}
              {activeTab === 'shipping' && (
                <div className="space-y-4 text-sm text-gray-700">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <span className="text-xl">📦</span>
                    <div><p className="font-bold">Zásielkovňa</p><p className="text-gray-500">2,99 EUR | Doručenie 1-2 dni</p></div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <span className="text-xl">🚚</span>
                    <div><p className="font-bold">DPD / GLS kuriér</p><p className="text-gray-500">3,99 - 4,49 EUR | Doručenie 1-2 dni</p></div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                    <span className="text-xl">🎁</span>
                    <div><p className="font-bold text-green-700">Doprava zadarmo</p><p className="text-green-600">Pri objednávke nad 50 EUR</p></div>
                  </div>
                </div>
              )}
              {activeTab === 'offers' && offers.length > 0 && (
                <div className="space-y-3">
                  {offers.map((offer, i) => (
                    <div key={offer.id || i} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition ${i === 0 ? 'border-amber-200 bg-amber-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                      <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-gray-700 font-bold text-lg flex-shrink-0">
                        {offer.shop_logo ? (
                          <img src={offer.shop_logo} alt="" className="w-full h-full object-contain p-2" />
                        ) : (
                          offer.initials?.toUpperCase() || offer.shop_name?.slice(0, 2).toUpperCase() || 'OB'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900">{offer.shop_name}</div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          {offer.rating && (
                            <span className="flex items-center gap-1">
                              <svg viewBox="0 0 24 24" fill="#fbbf24" width="12" height="12"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                              {offer.rating.toFixed(1)}
                            </span>
                          )}
                          <span className={offer.stock_status === 'instock' ? 'text-green-600' : 'text-red-500'}>
                            {offer.stock_status === 'instock' ? '✓ Skladom' : '✗ Nedostupné'}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 hidden md:block">
                        🚚 {offer.delivery}
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-extrabold text-gray-900">{formatPrice(offer.price)}</div>
                        <div className="text-xs text-gray-400">
                          {(offer.shipping || 0) === 0 ? 'Doprava zdarma' : `+ ${formatPrice(offer.shipping || 0)}`}
                        </div>
                      </div>
                      <a
                        href={offer.affiliate_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg transition flex-shrink-0"
                      >
                        Do obchodu →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
          <button className="absolute top-4 right-4 w-12 h-12 bg-white/10 rounded-full text-white text-2xl hover:bg-white/20 transition" onClick={() => setLightboxOpen(false)}>×</button>
          {images.length > 1 && (
            <>
              <button className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full text-white text-2xl hover:bg-white/20 transition" onClick={(e) => { e.stopPropagation(); prevImage() }}>‹</button>
              <button className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full text-white text-2xl hover:bg-white/20 transition" onClick={(e) => { e.stopPropagation(); nextImage() }}>›</button>
            </>
          )}
          <img src={mainImage} alt={product.name} className="max-w-[90%] max-h-[90%] object-contain" onClick={(e) => e.stopPropagation()} />
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">{selectedImage + 1} / {images.length}</div>
          )}
        </div>
      )}

      <Footer />
    </>
  )
}

// Beautiful attributes table with zebra stripes and grouped sections
function ProductAttributesTable({ attributes }: { attributes: { name: string; value: string; unit?: string }[] }) {
  if (!attributes || attributes.length === 0) return null

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <tbody>
          {attributes.map((attr, i) => (
            <tr key={i} className={`${i % 2 === 0 ? 'bg-gray-50/70' : 'bg-white'} ${i < attributes.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <td className="px-5 py-3.5 text-sm text-gray-500 font-medium w-2/5 align-top">
                {attr.name}
              </td>
              <td className="px-5 py-3.5 text-sm text-gray-900 font-semibold">
                {attr.value}{attr.unit ? <span className="text-gray-400 font-normal ml-1">{attr.unit}</span> : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
