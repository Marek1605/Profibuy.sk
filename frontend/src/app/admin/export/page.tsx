'use client'

import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ExportInfo {
  feeds: {
    name: string
    description: string
    url: string
    format: string
    products: number
    categories: number
    brands: number
  }[]
  note: string
}

export default function AdminExportPage() {
  const [info, setInfo] = useState<ExportInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchInfo()
  }, [])

  async function fetchInfo() {
    try {
      const res = await fetch(`${API_URL}/api/export/info`)
      if (res.ok) {
        const data = await res.json()
        setInfo(data)
      } else {
        setError('Nepodarilo sa načítať info o exporte')
      }
    } catch {
      setError('Chyba pripojenia k serveru')
    }
    setLoading(false)
  }

  function getFullFeedURL(path: string) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${path}`
    }
    return path
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const input = document.createElement('input')
      input.value = text
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">XML Export / CPC Feed</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
          {error}
        </div>
      )}

      {/* Feed URL Card */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="font-bold text-lg mb-2">🔗 Heureka XML Feed URL</h2>
        <p className="text-sm text-gray-500 mb-4">
          Túto URL zadaj do CPC porovnávača (MegaPrice.sk, Heureka.sk, atď.)
        </p>
        
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-50 border rounded-lg px-4 py-3 font-mono text-sm break-all">
            {getFullFeedURL('/api/export/heureka.xml')}
          </div>
          <button
            onClick={() => copyToClipboard(getFullFeedURL('/api/export/heureka.xml'))}
            className={`px-4 py-3 rounded-lg font-medium text-white whitespace-nowrap ${
              copied ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {copied ? '✓ Skopírované!' : '📋 Kopírovať'}
          </button>
        </div>

        <div className="flex gap-3 mt-4">
          <a
            href={`${API_URL}/api/export/heureka.xml`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            🔍 Zobraziť XML
          </a>
          <a
            href={`${API_URL}/api/export/heureka.xml`}
            download={`heureka_feed_${new Date().toISOString().slice(0,10)}.xml`}
            className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            ⬇️ Stiahnuť XML
          </a>
        </div>
      </div>

      {/* Stats */}
      {info && info.feeds && info.feeds.length > 0 && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">📊 Štatistiky feedu</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {info.feeds.map((feed, i) => (
              <div key={i}>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-700">{feed.products?.toLocaleString() || 0}</div>
                  <div className="text-sm text-blue-600 mt-1">Aktívnych produktov</div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-50 border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-700">{feed.categories?.toLocaleString() || 0}</div>
                    <div className="text-sm text-gray-500 mt-1">Kategórií</div>
                  </div>
                  <div className="bg-gray-50 border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-700">{feed.brands?.toLocaleString() || 0}</div>
                    <div className="text-sm text-gray-500 mt-1">Značiek</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feed Format Info */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="font-bold text-lg mb-4">📋 Štruktúra XML feedu</h2>
        <p className="text-sm text-gray-500 mb-3">Feed je v Heureka formáte a obsahuje:</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { icon: '🏷️', label: 'ITEM_ID, PRODUCTNAME, PRODUCT' },
            { icon: '📝', label: 'DESCRIPTION (bez HTML)' },
            { icon: '🔗', label: 'URL produktu' },
            { icon: '🖼️', label: 'IMGURL + IMGURL_ALTERNATIVE' },
            { icon: '💰', label: 'PRICE_VAT (s DPH)' },
            { icon: '🏭', label: 'MANUFACTURER' },
            { icon: '📂', label: 'CATEGORYTEXT (Hlavná | Sub | Subsub)' },
            { icon: '📊', label: 'EAN kódy' },
            { icon: '⚙️', label: 'PARAM (atribúty + tech. špecifikácie)' },
            { icon: '🚚', label: 'DELIVERY (DPD, GLS, Zásielkovňa, Pošta)' },
            { icon: '📅', label: 'DELIVERY_DATE (dni doručenia)' },
            { icon: '🛡️', label: 'EXTENDED_WARRANTY' },
            { icon: '🔢', label: 'ITEMGROUP_ID (varianty)' },
            { icon: '💳', label: 'HEUREKA_CPC (vlastný bid)' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm py-1">
              <span>{item.icon}</span>
              <span className="text-gray-700">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      {info?.note && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          ℹ️ {info.note}
        </div>
      )}
    </div>
  )
}
