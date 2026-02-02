'use client'

import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import { useCartStore } from '@/lib/store'
import { formatPrice, getProductImage } from '@/lib/api'

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal, getItemCount, clearCart } = useCartStore()
  const total = getTotal()
  const count = getItemCount()
  const shippingFree = total >= 50
  const shipping = shippingFree ? 0 : 3.99

  if (count === 0) {
    return (
      <><Header />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h1 className="text-2xl font-extrabold mb-4">Vas kosik je prazdny</h1>
          <p className="text-gray-500 mb-8">Zacnite nakupovat a pridajte produkty do kosika</p>
          <Link href="/products" className="btn-primary text-base">Prezerať produkty</Link>
        </main>
      <Footer /></>
    )
  }

  return (
    <><Header />
      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-extrabold mb-8">Nakupny kosik <span className="text-gray-400 font-normal text-lg">({count} poloziek)</span></h1>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {items.map(item => (
                <div key={item.product_id} className="flex gap-4 p-4 bg-white rounded-2xl border hover:shadow-sm transition">
                  <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                    <img src={item.product ? getProductImage(item.product) : '/placeholder.png'} alt="" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.product?.slug || ''}`} className="font-semibold text-sm hover:text-blue-600 line-clamp-2">{item.product?.name || 'Produkt'}</Link>
                    <p className="text-xs text-gray-400 mt-1">{formatPrice(item.price)} / ks</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border rounded-lg overflow-hidden">
                        <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="px-3 py-1.5 hover:bg-gray-100 text-sm font-bold">-</button>
                        <span className="px-3 py-1.5 border-x text-sm font-bold min-w-[2.5rem] text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="px-3 py-1.5 hover:bg-gray-100 text-sm font-bold">+</button>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-extrabold">{formatPrice(item.price * item.quantity)}</span>
                        <button onClick={() => removeItem(item.product_id)} className="text-gray-400 hover:text-red-500 transition">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={clearCart} className="text-sm text-gray-400 hover:text-red-500 transition mt-2">Vyprazdnit kosik</button>
            </div>

            <div className="bg-white rounded-2xl border p-6 h-fit sticky top-32">
              <h2 className="font-bold text-lg mb-5">Sumar objednavky</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Produkty ({count} ks)</span><span className="font-semibold">{formatPrice(total)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Doprava</span>{shippingFree ? <span className="font-semibold text-green-600">Zadarmo</span> : <span className="font-semibold">{formatPrice(shipping)}</span>}</div>
                {!shippingFree && (
                  <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                    🚚 Este <strong>{formatPrice(50 - total)}</strong> do dopravy zadarmo!
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between font-extrabold text-lg">
                  <span>Celkom</span><span>{formatPrice(total + shipping)}</span>
                </div>
              </div>
              <Link href="/checkout" className="block w-full text-center py-3.5 rounded-xl mt-6 text-white font-bold text-base transition hover:scale-[1.02] hover:shadow-lg" style={{ background: 'var(--primary)' }}>
                Pokracovat k objednavke &rarr;
              </Link>
              <Link href="/products" className="block text-center text-sm text-gray-500 mt-4 hover:text-gray-700 transition">
                &larr; Pokracovat v nakupovani
              </Link>
            </div>
          </div>
        </div>
      </main>
    <Footer /></>
  )
}
