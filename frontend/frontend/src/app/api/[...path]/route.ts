import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.API_URL || 'http://backend:8080'

async function proxyRequest(req: NextRequest) {
  const url = new URL(req.url)
  const path = url.pathname // /api/admin/suppliers etc
  const targetUrl = `${BACKEND_URL}${path}${url.search}`

  console.log(`[PROXY] ${req.method} ${path} -> ${targetUrl}`)

  try {
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      if (key !== 'host' && key !== 'connection') {
        headers[key] = value
      }
    })

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        const body = await req.text()
        if (body) fetchOptions.body = body
      } catch {
        // no body
      }
    }

    const response = await fetch(targetUrl, fetchOptions)

    const responseHeaders = new Headers()
    response.headers.forEach((value, key) => {
      if (key !== 'transfer-encoding') {
        responseHeaders.set(key, value)
      }
    })

    const responseBody = await response.text()
    console.log(`[PROXY] ${req.method} ${path} -> ${response.status} (${responseBody.length} bytes)`)

    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error: any) {
    console.error(`[PROXY] ERROR ${req.method} ${path}:`, error.message)
    return NextResponse.json(
      { 
        success: false, 
        error: `Backend unreachable: ${error.message}`,
        debug: {
          target: targetUrl,
          backend_url: BACKEND_URL,
          method: req.method,
        }
      },
      { status: 502 }
    )
  }
}

export async function GET(req: NextRequest) { return proxyRequest(req) }
export async function POST(req: NextRequest) { return proxyRequest(req) }
export async function PUT(req: NextRequest) { return proxyRequest(req) }
export async function DELETE(req: NextRequest) { return proxyRequest(req) }
export async function PATCH(req: NextRequest) { return proxyRequest(req) }
