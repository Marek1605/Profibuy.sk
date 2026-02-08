import { notFound } from 'next/navigation'

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:8080/api'

async function getPage(slug: string) {
  try {
    const res = await fetch(`${API_URL}/pages/${slug}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const page = await getPage(params.slug)
  if (!page) return { title: 'Stránka nenájdená' }
  return {
    title: page.meta_title || page.title,
    description: page.meta_description || '',
  }
}

export default async function PageView({ params }: { params: { slug: string } }) {
  const page = await getPage(params.slug)
  if (!page) notFound()

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{page.title}</h1>
      <div
        className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-li:text-gray-700"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  )
}
