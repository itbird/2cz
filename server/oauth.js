export const ORIGIN = 'https://2cz.com'
const COOKIE = '__Host-2cz-oauth'
const secureHeaders = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }
const cookie = (value, age = 600) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`
export function startAuth(request, env) {
  if (new URL(request.url).origin !== ORIGIN)
    return new Response('请从 https://2cz.com/admin/ 登录。', { status: 400, headers: secureHeaders })
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET)
    return new Response('后台登录尚未配置。请先在 Cloudflare 设置 GitHub OAuth 凭据。', { status: 503, headers: secureHeaders })
  const state = crypto.randomUUID()
  const url = new URL('https://github.com/login/oauth/authorize')
  url.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: `${ORIGIN}/api/auth/callback`, scope: 'public_repo', state })
  return new Response(null, { status: 302, headers: { ...secureHeaders, 'Location': url.href, 'Set-Cookie': cookie(state) } })
}
export async function finishAuth(request, env, fetcher = fetch) {
  const url = new URL(request.url)
  const state = url.searchParams.get('state')
  const saved = (request.headers.get('Cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  const headers = { ...secureHeaders, 'Set-Cookie': cookie('', 0) }
  if (url.origin !== ORIGIN || !state || !saved || state !== saved || !url.searchParams.get('code'))
    return new Response('登录验证失败，请关闭窗口并重新登录。', { status: 400, headers })
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET)
    return new Response('后台登录尚未配置。', { status: 503, headers })
  try {
    const exchange = await fetcher('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code: url.searchParams.get('code'), redirect_uri: `${ORIGIN}/api/auth/callback` }),
    })
    const data = await exchange.json()
    if (!exchange.ok || typeof data.access_token !== 'string')
      return new Response('GitHub 授权失败，请重试。', { status: 401, headers })
    const repo = await fetcher('https://api.github.com/repos/itbird/2cz', { headers: { 'Authorization': `Bearer ${data.access_token}`, 'Accept': 'application/vnd.github+json', 'User-Agent': '2cz-cms' } })
    if (!repo.ok || !(await repo.json()).permissions?.push)
      return new Response('此账户没有 2cz 仓库的写入权限。', { status: 403, headers })
    const payload = JSON.stringify(`authorization:github:success:${JSON.stringify({ token: data.access_token, provider: 'github' })}`).replace(/</g, '\\u003c')
    const nonce = crypto.randomUUID()
    const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>登录成功</title><p>登录成功，正在返回编辑器。</p><script nonce="${nonce}">const origin=${JSON.stringify(ORIGIN)};function receive(e){if(e.origin!==origin||e.source!==window.opener)return;window.removeEventListener('message',receive);window.opener.postMessage(${payload},origin);window.close();}window.addEventListener('message',receive);if(window.opener)window.opener.postMessage('authorizing:github',origin);</script></html>`
    return new Response(html, { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'` } })
  }
  catch { return new Response('登录服务暂时不可用，请稍后重试。', { status: 502, headers }) }
}
