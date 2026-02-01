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
      <>
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h1 className="text-2xl font-bold mb-4">Vas kosik je prazdny</h1>
          <p className="text-gray-600 mb-8">Zacnite nakupovat a pridajte produkty do kosika</p>
          <Link href="/products" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium">Prezerať produkty</Link>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Nakupny kosik ({count} ks)</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <div key={item.product_id} className="flex gap-4 p-4 bg-white rounded-lg border">
                <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  <img src={item.product ? getProductImage(item.product) : '/placeholder.png'} alt={item.product?.name || ''} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.product?.slug || item.product_id}`} className="font-medium hover:text-blue-600 line-clamp-2">{item.product?.name || 'Produkt'}</Link>
                  <p className="text-sm text-gray-500 mt-1">Cena: {formatPrice(item.price)}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border rounded">
                      <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="px-2 py-1 hover:bg-gray-100 text-sm">-</button>
                      <span className="px-3 py-1 border-x text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="px-2 py-1 hover:bg-gray-100 text-sm">+</button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
                      <button onClick={() => removeItem(item.product_id)} className="text-red-500 hover:text-red-700 text-sm">Odstranit</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={clearCart} className="text-sm text-gray-500 hover:text-red-600">Vyprazdnit kosik</button>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-6 h-fit sticky top-4">
            <h2 className="font-bold text-lg mb-4">Sumar objednavky</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Produkty ({count} ks)</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Doprava</span>
                <span>{shippingFree ? <span className="text-green-600">Zadarmo</span> : formatPrice(shipping)}</span>
              </div>
              {!shippingFree && (
                <p className="text-xs text-gray-500">Este {formatPrice(50 - total)} do dopravy zadarmo</p>
              )}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                <span>Spolu</span>
                <span>{formatPrice(total + shipping)}</span>
              </div>
            </div>
            <Link href="/checkout" className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg mt-6 hover:bg-blue-700 font-medium">
              Pokracovat k objednavke
            </Link>
            <Link href="/products" className="block text-center text-sm text-gray-500 mt-3 hover:text-gray-700">
              Pokracovat v nakupovani
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
