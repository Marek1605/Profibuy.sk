'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

export default function AdminLoginPage() {
  const router = useRouter()
  const login = useAuthStore(s => s.login)
  const user = useAuthStore(s => s.user)
  const token = useAuthStore(s => s.token)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // If already logged in as admin, redirect
  useEffect(() => {
    if (token && user && user.role === 'admin') {
      router.replace('/admin')
    }
  }, [token, user, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const ok = await login(email, password)
    if (ok) {
      // Check if user is admin after login
      const currentUser = useAuthStore.getState().user
      if (currentUser?.role === 'admin') {
        router.push('/admin')
      } else {
        useAuthStore.getState().logout()
        setError('Prístup len pre administrátorov')
      }
    } else {
      setError('Nesprávny email alebo heslo')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg">P</div>
            <span className="text-2xl font-extrabold text-white">ProfiBuy</span>
          </div>
          <p className="text-gray-400 text-sm">Administrácia eshopu</p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-gray-800 mb-6 text-center">🔐 Prihlásenie</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                placeholder="admin@profibuy.sk"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition text-sm"
            >
              {loading ? '⏳ Prihlasujem...' : '→ Prihlásiť sa'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs text-gray-500">
          <a href="/" className="hover:text-gray-300 transition">← Späť na obchod</a>
        </p>
      </div>
    </div>
  )
}
