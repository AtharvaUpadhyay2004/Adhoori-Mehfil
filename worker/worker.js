const EXPIRY = 60
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ count: 0 }), { status: 405, headers: CORS_HEADERS })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ count: 0 }), { status: 400, headers: CORS_HEADERS })
    }

    const sessionId = body.sessionId
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 64) {
      return new Response(JSON.stringify({ count: 0 }), { status: 400, headers: CORS_HEADERS })
    }

    const now = Math.floor(Date.now() / 1000)
    let sessions = {}

    try {
      const raw = await env.PRESENCE.get('sessions', 'json')
      if (raw) sessions = raw
    } catch {}

    const active = {}
    for (const [id, ts] of Object.entries(sessions)) {
      if (now - ts < EXPIRY) active[id] = ts
    }
    active[sessionId] = now

    await env.PRESENCE.put('sessions', JSON.stringify(active))

    return new Response(JSON.stringify({ count: Object.keys(active).length }), { headers: CORS_HEADERS })
  },
}
