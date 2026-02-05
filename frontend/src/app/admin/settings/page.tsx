'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store'

export default function AdminSettingsPage() {
  const { token } = useAuthStore()
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

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
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
        <h1 className="text-2xl font-bold">Nastavenia</h1>
        <button onClick={handleSave} disabled={saving} className={`px-6 py-2 rounded-lg font-medium text-white ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50`}>
          {saved ? 'Ulozene!' : saving ? 'Ukladam...' : 'Ulozit nastavenia'}
        </button>
      </div>

      <Section title="Zakladne udaje obchodu">
        <Input label="Nazov obchodu" field="shop_name" />
        <Input label="Email" field="shop_email" type="email" />
        <Input label="Telefon" field="shop_phone" type="tel" />
        <Input label="Adresa" field="shop_address" />
      </Section>

      <Section title="Obchodne nastavenia">
        <Input label="Mena" field="currency" />
        <Input label="DPH (%)" field="tax_rate" type="number" />
        <Input label="Doprava zadarmo od (EUR)" field="free_shipping_from" type="number" />
        <Input label="Prefix objednavok" field="order_prefix" />
      </Section>

      <Section title="Platobna brana - Comgate">
        <Input label="Merchant ID" field="comgate_merchant" />
        <Input label="Secret" field="comgate_secret" type="password" />
      </Section>

      <Section title="Platobna brana - GoPay">
        <Input label="Client ID" field="gopay_client_id" />
        <Input label="Secret" field="gopay_secret" type="password" />
      </Section>

      <Section title="SMTP nastavenia">
        <Input label="SMTP Host" field="smtp_host" />
        <Input label="SMTP Port" field="smtp_port" />
        <Input label="SMTP Uzivatel" field="smtp_user" />
        <Input label="SMTP Heslo" field="smtp_password" type="password" />
      </Section>
    </div>
  )
}
