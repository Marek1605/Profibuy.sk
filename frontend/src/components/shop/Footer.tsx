import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">ProfiBuy.sk</h3>
            <p className="text-sm">Vas spolahlivy e-shop s tisickami produktov za skvelé ceny. Rychle dorucenie po celom Slovensku.</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">Nakup</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="hover:text-white">Vsetky produkty</Link></li>
              <li><Link href="/categories" className="hover:text-white">Kategorie</Link></li>
              <li><Link href="/products?on_sale=true" className="hover:text-white">Vypredaj</Link></li>
              <li><Link href="/products?sort=newest" className="hover:text-white">Novinky</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">Informacie</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white">O nas</Link></li>
              <li><Link href="/contact" className="hover:text-white">Kontakt</Link></li>
              <li><Link href="/shipping" className="hover:text-white">Doprava a platba</Link></li>
              <li><Link href="/returns" className="hover:text-white">Reklamacie a vratenie</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Ochrana osobnych udajov</Link></li>
              <li><Link href="/terms" className="hover:text-white">Obchodne podmienky</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">Kontakt</h4>
            <ul className="space-y-2 text-sm">
              <li>info@profibuy.sk</li>
              <li>+421 900 000 000</li>
              <li>Po-Pi: 8:00 - 16:00</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-wrap items-center justify-between gap-4 text-sm">
          <p>&copy; {new Date().getFullYear()} ProfiBuy.sk. Vsetky prava vyhradene.</p>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>Visa</span>
            <span>Mastercard</span>
            <span>Zasielkovna</span>
            <span>DPD</span>
            <span>GLS</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
