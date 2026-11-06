// Settings and helper functions shared by every page

export const SERVICES = [
  { key: 'product', name: 'Product Service', url: '/api/products', note: 'Product catalog', port: 8081 },
  { key: 'inventory', name: 'Inventory Service', url: '/api/inventory', note: 'Stock levels', port: 8082 },
  { key: 'recommendation', name: 'Recommendation Service', url: '/api/recommendations', note: 'Guarded by the circuit breaker', port: 8083 },
]
export const LATENCY = [
  { label: 'Normal', ms: 0 },
  { label: '3 s', ms: 3000 },
  { label: '5 s', ms: 5000 },
  { label: '8 s', ms: 8000 },
]
export const STATUS_TEXT = { UP: 'Healthy', FALLBACK: 'Serving fallback', LIMITED: 'Rate limited', BUSY: 'Bulkhead full', DOWN: 'Unreachable' }
export const TONE = { UP: 'ok', FALLBACK: 'warn', LIMITED: 'warn', BUSY: 'warn', DOWN: 'bad' }

// Calls one URL and works out what kind of answer came back
export async function probe(url) {
  const t0 = performance.now()
  try {
    const res = await fetch(url)
    const ms = Math.round(performance.now() - t0)
    let body = null
    try { body = await res.json() } catch { /* empty body */ }
    if (res.status === 429) return { status: 'LIMITED', ms, items: null }
    if (res.status === 503) return { status: 'BUSY', ms, items: null }
    if (!res.ok) return { status: 'DOWN', ms, items: null }
    if (body && body.fallback === true) return { status: 'FALLBACK', ms, items: body.items }
    return { status: 'UP', ms, items: Array.isArray(body) ? body : body?.items }
  } catch {
    return { status: 'DOWN', ms: Math.round(performance.now() - t0), items: null }
  }
}

export async function loadRegistry() {
  const r = await fetch('/eureka/apps', { headers: { Accept: 'application/json' } })
  const j = await r.json()
  return [].concat(j.applications.application || []).flatMap((a) =>
    [].concat(a.instance).map((i) => ({ app: a.name, status: i.status, port: i.port?.['$'], ip: i.ipAddr })))
}

export async function loadTraces() {
  const r = await fetch('/zipkin/api/v2/traces?serviceName=api-gateway&limit=12')
  const list = await r.json()
  return list
    .map((spans) => {
      const root = spans.find((s) => !s.parentId) || spans[0]
      return {
        id: root.traceId,
        name: root.name || 'request',
        ms: Math.round(Math.max(...spans.map((s) => s.duration || 0)) / 1000),
        services: [...new Set(spans.map((s) => s.localEndpoint?.serviceName).filter(Boolean))],
        ts: (root.timestamp || 0) / 1000,
      }
    })
    .sort((a, b) => b.ts - a.ts)
}

export function formatItem(item) {
  if (typeof item === 'string') return item
  if (item.name) return `${item.name} · ₹${item.price.toLocaleString('en-IN')}`
  if (item.productId) return `Product #${item.productId} · ${item.quantity} in stock`
  return JSON.stringify(item)
}

export const ago = (ts) => {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`
}