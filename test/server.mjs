import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const here = dirname(fileURLToPath(import.meta.url))
const root = dirname(here)
const fixture = await build({ entryPoints: [join(here, 'fixtures/app.jsx')], bundle: true, format: 'iife', platform: 'browser', write: false, logLevel: 'silent' })
const port = Number(process.env.DSH_TEST_PORT ?? 43190)
createServer((request, response) => {
  const path = new URL(request.url ?? '/', 'http://localhost').pathname
  if (path === '/favicon.ico') { response.writeHead(204).end(); return }
  const file = path === '/client.js' ? join(root, 'lib/client.js') : path === '/native-tool.js' ? join(here, 'fixtures/native-tool.js') : path === '/' ? join(here, 'fixtures/index.html') : null
  if (path === '/fixture.js') { response.writeHead(200, { 'Content-Type': 'text/javascript' }); response.end(fixture.outputFiles[0].contents); return }
  if (file === null) { response.writeHead(404).end(); return }
  response.writeHead(200, { 'Content-Type': path.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(readFileSync(file))
}).listen(port, '127.0.0.1', () => console.log(`DSH contract fixture: http://127.0.0.1:${port}/`))
