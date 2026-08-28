import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const files = [
  'test/fold-behavior.test.mjs',
  'test/fold-regression.test.mjs',
  'test/fold-reconcile.test.mjs',
  'test/fold-animation.test.mjs',
  'test/adversarial-race.mjs',
  'test/adversarial-session.mjs',
  'test/external-display.test.mjs',
  'test/lifecycle.test.mjs',
  'test/issue14-followup.test.mjs',
  'test/deploy-platform.test.mjs',
]

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
  })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run([join(root, 'build.mjs')])
for (const file of files) run([join(root, file)])
