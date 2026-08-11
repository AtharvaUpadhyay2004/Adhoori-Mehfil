export async function onRequestPost(context) {
  const { env, request } = context
  const EXPIRY = 60

  let body
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ count: 0 }), { status: 400 })
  }

  const sessionId = body.sessionId
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 64) {
    return new Response(JSON.stringify({ count: 0 }), { status: 400 })
  }

  const now = Math.floor(Date.now() / 1000)
  let sessions = {}

  try {
    const raw = await env.PRESENCE.get('sessions', 'json')
    if (raw) sessions = raw
  } catch {}

  // Clean expired sessions and add current one
  const active = {}
  for (const [id, ts] of Object.entries(sessions)) {
    if (now - ts < EXPIRY) active[id] = ts
  }
  active[sessionId] = now

  await env.PRESENCE.put('sessions', JSON.stringify(active))

  return new Response(JSON.stringify({ count: Object.keys(active).length }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
