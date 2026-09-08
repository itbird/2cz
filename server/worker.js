import { finishAuth, startAuth } from './oauth.js'

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname.replace(/\/$/, '')
    if (pathname === '/api/auth' || pathname === '/api/auth/callback') {
      if (request.method !== 'GET')
        return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } })
      return pathname.endsWith('/callback') ? finishAuth(request, env) : startAuth(request, env)
    }
    return env.ASSETS.fetch(request)
  },
}
