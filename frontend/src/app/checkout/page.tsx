'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import { useCartStore, useAuthStore } from '@/lib/store'
import { formatPrice, getShippingMethods, getPaymentMethods } from '@/lib/api'
import type { ShippingMethod, PaymentMethod, Address } from '@/types'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, getTotal, getItemCount, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [selectedShipping, setSelectedShipping] = useState('')
  const [selectedPayment, setSelectedPayment] = useState('')
  const [note, setNote] = useState('')
  const [address, setAddress] = useState<Address>({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    street: '',
    city: '',
    postal_code: '',
    country: 'Slovensko',
    country_code: 'SK',
  })

  const shippingMethods: ShippingMethod[] = [
    { id: '1', code: 'packeta', name: 'Zasielkovna', description: 'Vyzdvihnite si zasielku na vybranom mieste', price: 2.99, free_from: 50, is_active: true },
    { id: '2', code: 'dpd', name: 'DPD kurier', description: 'Dorucenie na adresu do 1-2 dni', price: 4.49, free_from: 50, is_active: true },
    { id: '3', code: 'gls', name: 'GLS kurier', description: 'Dorucenie na adresu do 1-2 dni', price: 3.99, free_from: 50, is_active: true },
    { id: '4', code: 'posta', name: 'Slovenska posta', description: 'Dorucenie postou do 3-5 dni', price: 2.49, free_from: 50, is_active: true },
  ]

  const paymentMethods: PaymentMethod[] = [
    { id: '1', code: 'card', name: 'Platba kartou', description: 'Visa, Mastercard', fee: 0, is_active: true },
    { id: '2', code: 'transfer', name: 'Bankovy prevod', description: 'Platba vopred na ucet', fee: 0, is_active: true },
    { id: '3', code: 'cod', name: 'Dobierka', description: 'Platba pri prevzati', fee: 1.50, is_active: true },
  ]

  const total = getTotal()
  const count = getItemCount()
  const shipping = shippingMethods.find(s => s.id === selectedShipping)
  const shippingPrice = shipping ? (total >= shipping.free_from ? 0 : shipping.price) : 0
  const payment = paymentMethods.find(p => p.id === selectedPayment)
  const paymentFee = payment?.fee || 0

  if (count === 0) {
    return (
      <>
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Kosik je prazdny</h1>
          <Link href="/products" className="text-blue-600 hover:underline">Spat na produkty</Link>
        </main>
        <Footer />
      </>
    )
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, price: i.price })),
          billing_address: address,
          shipping_address: address,
          shipping_method: shipping?.code,
          payment_method: payment?.code,
          note,
        })
      })
      if (res.ok) {
        const order = await res.json()
        clearCart()
        router.push(`/checkout/success?order=${order.order_number || order.id}`)
      }
    } catch {}
    setSubmitting(false)
  }

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Objednavka</h1>

        {/* Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[{ n: 1, label: 'Adresa' }, { n: 2, label: 'Doprava' }, { n: 3, label: 'Platba' }, { n: 4, label: 'Suhrn' }].map(s => (
            <div key={s.n} className={`flex items-center gap-2 ${s.n <= step ? 'text-blue-600' : 'text-gray-400'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${s.n <= step ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{s.n}</span>
              <span className="hidden sm:inline font-medium">{s.label}</span>
              {s.n < 4 && <span className="text-gray-300 mx-2">—</span>}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Step 1: Address */}
            {step === 1 && (
              <div className="bg-white border rounded-lg p-6">
                <h2 className="font-bold text-lg mb-4">Dodacie udaje</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Meno *</label>
                    <input type="text" value={address.first_name} onChange={e => setAddress({...address, first_name: e.target.value})} className="w-full border rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Priezvisko *</label>
                    <input type="text" value={address.last_name} onChange={e => setAddress({...address, last_name: e.target.value})} className="w-full border rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input type="email" value={address.email} onChange={e => setAddress({...address, email: e.target.value})} className="w-full border rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Telefon *</label>
                    <input type="tel" value={address.phone} onChange={e => setAddress({...address, phone: e.target.value})} className="w-full border rounded px-3 py-2" required />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Ulica a cislo *</label>
                    <input type="text" value={address.street} onChange={e => setAddress({...address, street: e.target.value})} className="w-full border rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Mesto *</label>
                    <input type="text" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} className="w-full border rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">PSC *</label>
                    <input type="text" value={address.postal_code} onChange={e => setAddress({...address, postal_code: e.target.value})} className="w-full border rounded px-3 py-2" required />
                  </div>
                </div>
                <button onClick={() => setStep(2)} className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium">Pokracovat</button>
              </div>
            )}

            {/* Step 2: Shipping */}
            {step === 2 && (
              <div className="bg-white border rounded-lg p-6">
                <h2 className="font-bold text-lg mb-4">Sposob dopravy</h2>
                <div className="space-y-3">
                  {shippingMethods.map(method => (
                    <label key={method.id} className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition ${selectedShipping === method.id ? 'border-blue-600 bg-blue-50' : 'hover:border-gray-400'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="shipping" value={method.id} checked={selectedShipping === method.id} onChange={() => setSelectedShipping(method.id)} className="text-blue-600" />
                        <div>
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-gray-500">{method.description}</p>
                        </div>
                      </div>
                      <span className="font-medium">{total >= method.free_from ? <span className="text-green-600">Zadarmo</span> : formatPrice(method.price)}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(1)} className="px-6 py-3 border rounded-lg hover:bg-gray-50">Spat</button>
                  <button onClick={() => setStep(3)} disabled={!selectedShipping} className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">Pokracovat</button>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <div className="bg-white border rounded-lg p-6">
                <h2 className="font-bold text-lg mb-4">Sposob platby</h2>
                <div className="space-y-3">
                  {paymentMethods.map(method => (
                    <label key={method.id} className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition ${selectedPayment === method.id ? 'border-blue-600 bg-blue-50' : 'hover:border-gray-400'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="payment" value={method.id} checked={selectedPayment === method.id} onChange={() => setSelectedPayment(method.id)} className="text-blue-600" />
                        <div>
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-gray-500">{method.description}</p>
                        </div>
                      </div>
                      <span className="font-medium">{method.fee > 0 ? `+ ${formatPrice(method.fee)}` : 'Zadarmo'}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Poznamka k objednavke</label>
                  <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full border rounded px-3 py-2 h-20" placeholder="Volitelna poznamka..." />
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(2)} className="px-6 py-3 border rounded-lg hover:bg-gray-50">Spat</button>
                  <button onClick={() => setStep(4)} disabled={!selectedPayment} className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">Pokracovat</button>
                </div>
              </div>
            )}

            {/* Step 4: Summary */}
            {step === 4 && (
              <div className="bg-white border rounded-lg p-6">
                <h2 className="font-bold text-lg mb-4">Suhrn objednavky</h2>
                <div className="grid sm:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-medium text-sm text-gray-500 mb-1">Dodacia adresa</h3>
                    <p>{address.first_name} {address.last_name}</p>
                    <p>{address.street}</p>
                    <p>{address.postal_code} {address.city}</p>
                    <p>{address.email}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-gray-500 mb-1">Doprava a platba</h3>
                    <p>{shipping?.name}</p>
                    <p>{payment?.name}</p>
                  </div>
                </div>
                <div className="border-t pt-4 space-y-2">
                  {items.map(item => (
                    <div key={item.product_id} className="flex justify-between text-sm">
                      <span>{item.product?.name} x {item.quantity}</span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(3)} className="px-6 py-3 border rounded-lg hover:bg-gray-50">Spat</button>
                  <button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
                    {submitting ? 'Odosielam...' : 'Odoslat objednavku'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="bg-gray-50 rounded-lg p-6 h-fit">
            <h3 className="font-bold mb-4">Vas kosik</h3>
            <div className="space-y-2 text-sm">
              {items.map(item => (
                <div key={item.product_id} className="flex justify-between">
                  <span className="truncate mr-2">{item.product?.name} ({item.quantity}x)</span>
                  <span className="flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between"><span>Medzisucet</span><span>{formatPrice(total)}</span></div>
                <div className="flex justify-between"><span>Doprava</span><span>{shippingPrice === 0 && selectedShipping ? <span className="text-green-600">Zadarmo</span> : formatPrice(shippingPrice)}</span></div>
                {paymentFee > 0 && <div className="flex justify-between"><span>Poplatok za platbu</span><span>{formatPrice(paymentFee)}</span></div>}
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Celkom</span>
                  <span>{formatPrice(total + shippingPrice + paymentFee)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
