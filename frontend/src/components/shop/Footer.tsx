import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      {/* Newsletter */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-white text-lg font-bold mb-1">Odber noviniek</h3>
            <p className="text-sm">Zostan v obraze o najlepsich ponukach a novinkach</p>
          </div>
          <div className="flex w-full md:w-auto">
            <input type="email" placeholder="Zadajte vas email..." className="px-4 py-3 bg-gray-800 rounded-l-xl text-sm text-white placeholder-gray-500 focus:outline-none w-full md:w-72" />
            <button className="px-6 py-3 rounded-r-xl text-sm font-semibold text-white whitespace-nowrap" style={{ background: 'var(--primary)' }}>Odoberať</button>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-1 mb-4">
              <div className="w-7 h-7 rounded-md flex items-center justify-center font-black text-white text-xs" style={{ background: '#2d5a87' }}>P</div>
              <span className="text-lg font-extrabold text-white">PROFIBUY</span>
              <span className="text-xs text-gray-500">.sk</span>
            </div>
            <p className="text-sm leading-relaxed mb-4">Vas spolahlivy e-shop s tisickami produktov za skvele ceny. Rychle dorucenie po celom Slovensku.</p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition text-sm">f</a>
              <a href="#" className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-pink-600 transition text-sm">ig</a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Nakup</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/products" className="hover:text-white transition">Vsetky produkty</Link></li>
              <li><Link href="/categories" className="hover:text-white transition">Kategorie</Link></li>
              <li><Link href="/products?on_sale=true" className="hover:text-white transition">Vypredaj</Link></li>
              <li><Link href="/products?sort=newest" className="hover:text-white transition">Novinky</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Informacie</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/about" className="hover:text-white transition">O nas</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Kontakt</Link></li>
              <li><Link href="/shipping" className="hover:text-white transition">Doprava a platba</Link></li>
              <li><Link href="/returns" className="hover:text-white transition">Reklamacie a vratenie</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition">Ochrana osobnych udajov</Link></li>
              <li><Link href="/terms" className="hover:text-white transition">Obchodne podmienky</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Kontakt</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2">📧 info@profibuy.sk</li>
              <li className="flex items-center gap-2">📞 +421 900 000 000</li>
              <li className="flex items-center gap-2">🕐 Po-Pi: 8:00 - 16:00</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              <div className="px-3 py-1.5 bg-gray-800 rounded text-xs font-medium text-gray-300">Visa</div>
              <div className="px-3 py-1.5 bg-gray-800 rounded text-xs font-medium text-gray-300">Mastercard</div>
              <div className="px-3 py-1.5 bg-gray-800 rounded text-xs font-medium text-gray-300">GoPay</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} ProfiBuy.sk. Vsetky prava vyhradene.</p>
          <div className="flex items-center gap-4">
            <span>Zasielkovna</span>
            <span>DPD</span>
            <span>GLS</span>
            <span>Slovenska posta</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
