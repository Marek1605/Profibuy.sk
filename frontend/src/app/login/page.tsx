'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import { useAuthStore } from '@/lib/store'

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore(s => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const ok = await login(email, password)
    if (ok) { router.push('/account') }
    else { setError('Nespravny email alebo heslo') }
    setLoading(false)
  }

  return (
    <>
      <Header />
      <main className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-6 text-center">Prihlasenie</h1>
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Heslo</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
            {loading ? 'Prihlasovanie...' : 'Prihlasit sa'}
          </button>
        </form>
        <p className="text-center mt-6 text-sm text-gray-600">
          Nemáte ucet? <Link href="/register" className="text-blue-600 hover:underline">Zaregistrovat sa</Link>
        </p>
      </main>
      <Footer />
    </>
  )
}
