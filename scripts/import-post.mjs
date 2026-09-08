import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { parse, stringify } from 'yaml'

export function preparePost(source, filename, now = new Date()) {
  const text = source.replace(/^\uFEFF/, '')
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  const meta = match ? parse(match[1]) : {}
  if (!meta || typeof meta !== 'object' || Array.isArray(meta))
    throw new Error('文章头部必须是 YAML 对象。')
  const published = new Date(meta.published || now)
  if (Number.isNaN(published.valueOf()))
    throw new Error('published 日期无效。')
  const data = { ...meta, title: meta.title || path.basename(filename, path.extname(filename)), published: published.toISOString(), draft: true, lang: 'zh' }
  if (typeof data.title !== 'string')
    throw new Error('标题必须是文字。')
  return { data, body: match ? text.slice(match[0].length) : text }
}
export function importPost(filename, slug) {
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error('请提供英文短名，例如 morning-notes。')
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
  const input = path.resolve(filename)
  const output = path.join(root, 'src/content/posts', `${slug}.md`)
  if (fs.existsSync(output))
    throw new Error('同名文章已存在，未覆盖。')
  let { data, body } = preparePost(fs.readFileSync(input, 'utf8'), input)
  const images = []
  body = body.replace(/!\[([^\]]*)\]\(([^\s)]+)(\s+"[^"]*")?\)/g, (full, alt, url, title = '') => {
    if (/^(?:https?:|data:|\/uploads\/)/i.test(url))
      return full
    if (url.startsWith('/') || url.includes('://'))
      throw new Error('图片请使用文章目录内的相对路径或 https 链接。')
    const source = path.resolve(path.dirname(input), decodeURIComponent(url))
    const base = fs.realpathSync(path.dirname(input)) + path.sep
    if (!fs.realpathSync(source).startsWith(base))
      throw new Error('图片路径超出了文章所在目录。')
    const bytes = fs.readFileSync(source)
    const ext = path.extname(source).toLowerCase()
    if (!['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'].includes(ext))
      throw new Error('图片仅支持 PNG/JPEG/WebP/GIF/AVIF。')
    if (bytes.length > 20 * 1024 * 1024)
      throw new Error('单张图片不能超过 20 MB。')
    const name = `${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}${ext}`
    images.push({ bytes, name })
    return `![${alt}](/uploads/${name}${title})`
  })
  const uploads = path.join(root, 'public/uploads')
  fs.mkdirSync(uploads, { recursive: true })
  for (const { bytes, name } of images) {
    const target = path.join(uploads, name)
    if (!fs.existsSync(target))
      fs.writeFileSync(target, bytes, { flag: 'wx' })
  }
  fs.writeFileSync(output, `---\n${stringify(data)}---\n\n${body}`, { flag: 'wx' })
  return output
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(`已导入为隐藏草稿：${importPost(process.argv[2], process.argv[3])}\n预览确认后，将 draft 改为 false，再提交发布。`)
  }
  catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
