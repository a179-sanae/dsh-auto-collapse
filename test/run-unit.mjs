import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
await build({ absWorkingDir: root, entryPoints: ['src/work-groups.ts', 'src/summary.ts'], bundle: true, outdir: '.test-build', format: 'esm', platform: 'node', target: 'node22' })
const files = readdirSync(join(root, 'test/unit')).filter(file => file.endsWith('.test.mjs')).map(file => join(root, 'test/unit', file))
const result = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
