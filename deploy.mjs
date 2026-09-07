/** Build a complete installable package. No profiles, credentials or running services are touched. */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || `Exit ${result.status}`).trim())
  return result.stdout
}

export function npmCli() {
  const candidates = [process.env.npm_execpath, join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')]
  const cli = candidates.find(file => file && existsSync(file))
  if (!cli) throw new Error('Run this command with npm run package so npm_execpath is available')
  return cli
}

export function preparePackage({ outputDir = join(root, 'artifacts'), build = true } = {}) {
  if (build) run(process.execPath, [join(root, 'build.mjs')])
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  if (manifest.name !== 'dsh-auto-collapse') throw new Error('Unexpected package identity')
  const destination = resolve(outputDir)
  mkdirSync(destination, { recursive: true })
  const result = JSON.parse(run(process.execPath, [npmCli(), 'pack', '--ignore-scripts', '--json', '--pack-destination', destination]))
  if (result.length !== 1 || result[0].name !== manifest.name || result[0].version !== manifest.version) throw new Error('Unexpected npm pack result')
  const entry = result[0]
  if (basename(entry.filename) !== entry.filename) throw new Error('Unexpected package filename')
  const required = ['lib/client.js', 'lib/index.js', 'lib/types/client.d.ts', 'lib/types/index.d.ts', 'cordis.patch.yml']
  for (const path of required) if (!entry.files.some(file => file.path === path && file.size > 0)) throw new Error(`Package is missing ${path}`)
  const file = join(destination, entry.filename)
  return { file, sha256: createHash('sha256').update(readFileSync(file)).digest('hex'), files: entry.files.map(file => file.path), version: manifest.version }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = preparePackage()
  console.log(`Package: ${result.file}`)
  console.log(`SHA-256: ${result.sha256}`)
  console.log(`Install when ready: dsh plugin --profile web add "${result.file}"`)
  console.log('The package is ready; this command does not install it or restart DSH.')
}
