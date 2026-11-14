import {
  readdirSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  statSync,
} from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
// A self-contained Worker preserves the current React/Vite app without introducing
// another framework or a public REST key. Sites Worker artifacts have no asset binding.
const root = path.resolve('dist')
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}
const assets = {}
function collect(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'server' || name === '.openai') continue
    const file = path.join(dir, name)
    if (statSync(file).isDirectory()) collect(file)
    else
      assets['/' + path.relative(root, file).split(path.sep).join('/')] = [
        mime[path.extname(file)] ?? 'application/octet-stream',
        readFileSync(file).toString('base64'),
      ]
  }
}
collect(root)
const api = readFileSync('server/places.mjs', 'utf8').replace(
  'export async function searchPlaces',
  'async function searchPlaces',
)
const worker =
  `${api}\nconst assets = ${JSON.stringify(assets)};\n` +
  `
export default { async fetch(request, env) {
  const url = new URL(request.url)
  if (url.pathname === '/api/places') return searchPlaces(request, env)
  if (url.pathname.startsWith('/api/')) return new Response('Not found', {status:404})
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405})
  const asset = assets[url.pathname === '/' ? '/index.html' : url.pathname]
  if (!asset) return new Response('Not found', {status:404})
  const bytes = Uint8Array.from(atob(asset[1]), c => c.charCodeAt(0))
  return new Response(request.method === 'HEAD' ? null : bytes, {headers:{'Content-Type':asset[0], 'Cache-Control':url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache', 'X-Content-Type-Options':'nosniff'}})
}};
`
mkdirSync(path.join(root, 'server'), { recursive: true })
writeFileSync(path.join(root, 'server/index.js'), worker)
mkdirSync(path.join(root, '.openai'), { recursive: true })
writeFileSync(
  path.join(root, '.openai/hosting.json'),
  readFileSync('.openai/hosting.json'),
)
console.log(
  `Worker built: ${Object.keys(assets).length} assets; gzip ${(gzipSync(worker).length / 1024 / 1024).toFixed(2)} MiB`,
)
