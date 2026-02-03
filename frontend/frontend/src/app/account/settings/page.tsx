'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import { useAuthStore } from '@/lib/store'

export default function AccountSettingsPage() {
  const { user, logout } = useAuthStore()
  const [saved, setSaved] = useState(false)

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/account" className="hover:text-gray-800">Moj ucet</Link>
          <span>/</span>
          <span className="text-gray-800">Nastavenia</span>
        </div>
        <h1 className="text-2xl font-bold mb-8">Nastavenia uctu</h1>

        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="font-bold mb-4">Osobne udaje</h2>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Meno</label>
                <input type="text" defaultValue={user?.first_name} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priezvisko</label>
                <input type="text" defaultValue={user?.last_name} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" defaultValue={user?.email} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefon</label>
              <input type="tel" defaultValue={user?.phone} className="w-full border rounded px-3 py-2" />
            </div>
            <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }} className={`px-6 py-2 rounded-lg font-medium text-white ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {saved ? 'Ulozene!' : 'Ulozit zmeny'}
            </button>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="font-bold mb-4">Zmena hesla</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Sucasne heslo</label>
              <input type="password" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nove heslo</label>
              <input type="password" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Potvrdenie noveho hesla</label>
              <input type="password" className="w-full border rounded px-3 py-2" />
            </div>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium">Zmenit heslo</button>
          </div>
        </div>

        <div className="bg-white border border-red-200 rounded-lg p-6">
          <h2 className="font-bold text-red-600 mb-2">Odhlasenie</h2>
          <p className="text-sm text-gray-600 mb-4">Po odhlaseni budete presmerovani na hlavnu stranku.</p>
          <button onClick={logout} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-medium">Odhlasit sa</button>
        </div>
      </main>
      <Footer />
    </>
  )
}
