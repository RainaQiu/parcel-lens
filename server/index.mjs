import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'
import { handleExplanationRequest } from './explanations.mjs'

const root = resolve('dist')
const port = Number(process.env.PORT) || 4173
const routes = [
  ['/api/parcels', 'https://gisdata.alleghenycounty.us', '/arcgis/rest/services/OPENDATA/Parcels/MapServer/0'],
  ['/api/ckan', 'https://data.wprdc.org', '/api/3/action'],
  ['/api/zoning', 'https://services1.arcgis.com', '/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebZoning/FeatureServer/0'],
  ['/api/pgh', 'https://services1.arcgis.com', '/YZCmUqbcsUpOKfj7/arcgis/rest/services'],
  ['/api/pasda', 'https://mapservices.pasda.psu.edu', '/server/rest/services/pasda/PittsburghCity/MapServer'],
  ['/api/fema', 'https://hazards.fema.gov', '/arcgis/rest/services/public/NFHL/MapServer/28'],
]
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }

async function proxy(req, res, url) {
  const route = routes.find(([prefix]) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))
  if (!route) return false
  if (!['GET', 'POST'].includes(req.method)) { res.writeHead(405); res.end(); return true }
  const [prefix, origin, upstreamPrefix] = route
  let tail = url.pathname.slice(prefix.length)
  if (prefix === '/api/pgh') {
    const match = tail.match(/^\/([A-Za-z0-9_-]+)(\/.*)?$/)
    if (!match) { res.writeHead(400); res.end(); return true }
    tail = `/${match[1]}/FeatureServer/0${match[2] ?? ''}`
  }
  if (prefix === '/api/pasda' && !/^\/\d+\//.test(tail)) { res.writeHead(400); res.end(); return true }
  const target = new URL(origin + upstreamPrefix + tail + url.search)
  let body
  if (req.method === 'POST') {
    const chunks = []
    let bytes = 0
    for await (const chunk of req) {
      bytes += chunk.length
      if (bytes > 1024 * 1024) { res.writeHead(413); res.end(); return true }
      chunks.push(chunk)
    }
    body = Buffer.concat(chunks)
  }
  try {
    const response = await fetch(target, { method: req.method, body, headers: body ? { 'content-type': req.headers['content-type'] ?? 'application/x-www-form-urlencoded' } : {}, signal: AbortSignal.timeout(20_000) })
    res.writeHead(response.status, { 'Content-Type': response.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store' })
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end('{"error":"Public data source unavailable"}') }
  return true
}

async function serve(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return }
  const requested = resolve(root, `.${decodeURIComponent(url.pathname)}`)
  if (requested !== root && !requested.startsWith(root + sep)) { res.writeHead(403); res.end(); return }
  let file = requested
  try { if (!(await stat(file)).isFile()) file = url.pathname.startsWith('/assets/') ? '' : resolve(root, 'index.html') } catch { file = url.pathname.startsWith('/assets/') ? '' : resolve(root, 'index.html') }
  if (!file) { res.writeHead(404); res.end(); return }
  try {
    const bytes = await readFile(file)
    res.writeHead(200, { 'Content-Type': `${mime[extname(file)] ?? 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600' })
    res.end(req.method === 'HEAD' ? undefined : bytes)
  } catch { res.writeHead(404); res.end() }
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    if (url.pathname === '/api/explanations') { await handleExplanationRequest(req, res); return }
    if (url.pathname.startsWith('/api/')) { if (!await proxy(req, res, url)) { res.writeHead(404); res.end() }; return }
    await serve(req, res, url)
  } catch { if (!res.headersSent) res.writeHead(500); res.end() }
}).listen(port, '0.0.0.0', () => { process.stdout.write(`Parcel Lens listening on port ${port}\n`) })
