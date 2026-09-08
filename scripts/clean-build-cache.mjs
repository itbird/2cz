import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const cache = path.resolve(root, 'node_modules', '.astro-build')
if (path.relative(root, cache) !== path.join('node_modules', '.astro-build'))
  throw new Error('Unexpected cache path')
console.log('Cleaning production content cache:', cache)
fs.rmSync(cache, { recursive: true, force: true })
