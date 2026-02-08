'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

export default function AdminSettingsPage() {
  const { token, user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState({
    shop_name: 'ProfiBuy.net',
    shop_email: 'info@profibuy.net',
    shop_phone: '+421 900 000 000',
    shop_address: 'Bratislava, Slovensko',
    currency: 'EUR',
    tax_rate: '20',
    free_shipping_from: '50',
    order_prefix: 'PB',
    comgate_merchant: '',
    comgate_secret: '',
    gopay_client_id: '',
    gopay_secret: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
  })

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`${API_BASE}/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwMessage(null)

    if (newPassword.length < 8) {
      setPwMessage({ type: 'error', text: 'Heslo musí mať aspoň 8 znakov' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'Heslá sa nezhodujú' })
      return
    }

    setPwSaving(true)
    try {
      const res = await fetch(`${API_BASE}/admin/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        setPwMessage({ type: 'success', text: 'Heslo úspešne zmenené' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPwMessage({ type: 'error', text: data.error || 'Nesprávne aktuálne heslo' })
      }
    } catch {
      setPwMessage({ type: 'error', text: 'Chyba pri zmene hesla' })
    }
    setPwSaving(false)
    setTimeout(() => setPwMessage(null), 5000)
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="font-bold text-lg mb-4">{title}</h2>
        <div className="grid sm:grid-cols-2 gap-4">{children}</div>
      </div>
    )
  }

  function Input({ label, field, type = 'text' }: { label: string; field: keyof typeof settings; type?: string }) {
    return (
      <div>
        <label className="block text-sm font-medium mb-1">{label}</label>
        <input type={type} value={settings[field]} onChange={e => setSettings({...settings, [field]: e.target.value})} className="w-full border rounded px-3 py-2" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">⚙️ Nastavenia</h1>
        <button onClick={handleSave} disabled={saving} className={`px-6 py-2 rounded-lg font-medium text-white ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50`}>
          {saved ? '✅ Uložené!' : saving ? '⏳ Ukladám...' : '💾 Uložiť nastavenia'}
        </button>
      </div>

      {/* Admin profile & password */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="font-bold text-lg mb-4">🔐 Admin účet</h2>
        <div className="flex items-center gap-4 mb-5 pb-5 border-b">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-800">{user?.first_name} {user?.last_name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <span className="ml-auto px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">Admin</span>
        </div>

        <form onSubmit={handlePasswordChange}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Zmeniť heslo</h3>
          {pwMessage && (
            <div className={`px-4 py-3 rounded-lg mb-4 text-sm ${pwMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {pwMessage.text}
            </div>
          )}
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Aktuálne heslo</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nové heslo</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required minLength={8} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Potvrdiť heslo</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required />
            </div>
          </div>
          <button type="submit" disabled={pwSaving} className="px-5 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-60 transition">
            {pwSaving ? '⏳ Mením...' : '🔑 Zmeniť heslo'}
          </button>
        </form>
      </div>

      <Section title="Základné údaje obchodu">
        <Input label="Názov obchodu" field="shop_name" />
        <Input label="Email" field="shop_email" type="email" />
        <Input label="Telefón" field="shop_phone" type="tel" />
        <Input label="Adresa" field="shop_address" />
      </Section>

      <Section title="Obchodné nastavenia">
        <Input label="Mena" field="currency" />
        <Input label="DPH (%)" field="tax_rate" type="number" />
        <Input label="Doprava zadarmo od (EUR)" field="free_shipping_from" type="number" />
        <Input label="Prefix objednávok" field="order_prefix" />
      </Section>

      <Section title="Platobná brána - Comgate">
        <Input label="Merchant ID" field="comgate_merchant" />
        <Input label="Secret" field="comgate_secret" type="password" />
      </Section>

      <Section title="Platobná brána - GoPay">
        <Input label="Client ID" field="gopay_client_id" />
        <Input label="Secret" field="gopay_secret" type="password" />
      </Section>

      <Section title="SMTP nastavenia">
        <Input label="SMTP Host" field="smtp_host" />
        <Input label="SMTP Port" field="smtp_port" />
        <Input label="SMTP Používateľ" field="smtp_user" />
        <Input label="SMTP Heslo" field="smtp_password" type="password" />
      </Section>
    </div>
  )
}
