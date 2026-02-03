'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import { useAuthStore } from '@/lib/store'

export default function RegisterPage() {
  const router = useRouter()
  const register = useAuthStore(s => s.register)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', password2: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.password2) { setError('Hesla sa nezhoduju'); return }
    if (form.password.length < 6) { setError('Heslo musi mat aspon 6 znakov'); return }
    setLoading(true)
    setError('')
    const ok = await register({ email: form.email, password: form.password, first_name: form.first_name, last_name: form.last_name, phone: form.phone })
    if (ok) { router.push('/account') }
    else { setError('Registracia zlyhala. Skuste to znova.') }
    setLoading(false)
  }

  return (
    <>
      <Header />
      <main className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-6 text-center">Registracia</h1>
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Meno</label>
              <input type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priezvisko</label>
              <input type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="w-full border rounded px-3 py-2" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefon</label>
            <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Heslo</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Heslo znova</label>
            <input type="password" value={form.password2} onChange={e => setForm({...form, password2: e.target.value})} className="w-full border rounded px-3 py-2" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
            {loading ? 'Registrujem...' : 'Zaregistrovat sa'}
          </button>
        </form>
        <p className="text-center mt-6 text-sm text-gray-600">
          Uz mate ucet? <Link href="/login" className="text-blue-600 hover:underline">Prihlasit sa</Link>
        </p>
      </main>
      <Footer />
    </>
  )
}
