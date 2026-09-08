import assert from 'node:assert/strict'
import test from 'node:test'
import { preparePost } from '../scripts/import-post.mjs'
import { finishAuth, startAuth } from '../server/oauth.js'

const env = { GITHUB_CLIENT_ID: 'test-id', GITHUB_CLIENT_SECRET: 'test-secret' }
test('OAuth requires setup and the canonical origin', () => {
  assert.equal(startAuth(new Request('https://2cz.com/api/auth'), {}).status, 503)
  assert.equal(startAuth(new Request('https://evil.example/api/auth'), env).status, 400)
  const res = startAuth(new Request('https://2cz.com/api/auth'), env)
  assert.equal(res.status, 302)
  assert.match(res.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/)
  assert.equal(new URL(res.headers.get('location')).searchParams.get('redirect_uri'), 'https://2cz.com/api/auth/callback')
})
test('OAuth rejects missing and mismatching states before sending any request', async () => {
  for (const cookie of ['', '__Host-2cz-oauth=wrong']) {
    const res = await finishAuth(new Request('https://2cz.com/api/auth/callback?state=expected&code=code', { headers: { Cookie: cookie } }), env, () => {
      throw new Error('must not fetch')
    })
    assert.equal(res.status, 400)
  }
})
test('OAuth rejects read-only GitHub accounts', async () => {
  const res = await finishAuth(new Request('https://2cz.com/api/auth/callback?state=ok&code=code', { headers: { Cookie: '__Host-2cz-oauth=ok' } }), env, async url => Response.json(url.includes('access_token') ? { access_token: 'test-token' } : { permissions: { push: false } }))
  assert.equal(res.status, 403)
  assert.doesNotMatch(await res.text(), /test-token/)
})
test('OAuth success uses only the expected opener and does not cache credentials', async () => {
  const res = await finishAuth(new Request('https://2cz.com/api/auth/callback?state=ok&code=code', { headers: { Cookie: '__Host-2cz-oauth=ok' } }), env, async url => Response.json(url.includes('access_token') ? { access_token: 'test-token' } : { permissions: { push: true } }))
  const html = await res.text()
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('cache-control'), 'no-store')
  assert.match(html, /e.source!==window.opener/)
  assert.match(html, /authorization:github:success/)
  assert.match(res.headers.get('set-cookie'), /Max-Age=0/)
})
test('Markdown import preserves content and always starts hidden', () => {
  const p = preparePost('---\ntitle: 测试\npublished: 2026-09-08\ndraft: false\n---\n正文', 'test.md')
  assert.equal(p.data.title, '测试')
  assert.equal(p.data.draft, true)
  assert.equal(p.body, '正文')
  assert.throws(() => preparePost('---\npublished: nonsense\n---\ntext', 'test.md'), /日期/)
})
