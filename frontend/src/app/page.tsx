import Link from 'next/link'
import { getCategories, getProducts } from '@/lib/api'
import { Header } from '@/components/shop/Header'
import { Footer } from '@/components/shop/Footer'
import { ProductCard } from '@/components/shop/ProductCard'
import { CategoryCard } from '@/components/shop/CategoryCard'

export const revalidate = 60 // Revalidate every 60 seconds

export default async function HomePage() {
  // Fetch data in parallel
  const [categories, newProducts, saleProducts] = await Promise.all([
    getCategories().catch(() => []),
    getProducts(new URLSearchParams({ limit: '8', sort: 'newest' })).catch(() => ({ items: [] })),
    getProducts(new URLSearchParams({ limit: '8', on_sale: 'true' })).catch(() => ({ items: [] }))
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Vitajte v MegaShop
              </h1>
              <p className="text-xl text-white/90 mb-8">
                Objavte tisíce produktov za skvelé ceny. Rýchle doručenie po celom Slovensku.
              </p>
              <div className="flex gap-4">
                <Link href="/products" className="btn bg-white text-primary hover:bg-white/90">
                  Prezerať produkty
                </Link>
                <Link href="/categories" className="btn border-2 border-white text-white hover:bg-white/10">
                  Kategórie
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl md:text-3xl font-bold">Kategórie</h2>
                <Link href="/categories" className="text-primary hover:underline">
                  Všetky kategórie →
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {categories.slice(0, 6).map((category) => (
                  <CategoryCard key={category.id} category={category} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Sale Products */}
        {saleProducts.items && saleProducts.items.length > 0 && (
          <section className="py-12 md:py-16 bg-muted">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="badge badge-error mb-2">VÝPREDAJ</span>
                  <h2 className="text-2xl md:text-3xl font-bold">Akciové produkty</h2>
                </div>
                <Link href="/products?on_sale=true" className="text-primary hover:underline">
                  Všetky akcie →
                </Link>
              </div>
              <div className="product-grid">
                {saleProducts.items.slice(0, 8).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* New Products */}
        {newProducts.items && newProducts.items.length > 0 && (
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="badge badge-primary mb-2">NOVINKA</span>
                  <h2 className="text-2xl md:text-3xl font-bold">Najnovšie produkty</h2>
                </div>
                <Link href="/products?sort=newest" className="text-primary hover:underline">
                  Všetky novinky →
                </Link>
              </div>
              <div className="product-grid">
                {newProducts.items.slice(0, 8).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Features */}
        <section className="py-12 md:py-16 bg-muted">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Rýchle doručenie</h3>
                <p className="text-secondary text-sm">Doručenie do 24 hodín</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Bezpečný nákup</h3>
                <p className="text-secondary text-sm">SSL šifrované platby</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Vrátenie do 14 dní</h3>
                <p className="text-secondary text-sm">Bez udania dôvodu</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Zákaznícka podpora</h3>
                <p className="text-secondary text-sm">Po-Pia 8:00 - 18:00</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
