import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
  })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run([join(root, 'build.mjs')])
run([join(root, 'test/run-unit.mjs')])
run([join(root, 'node_modules/@playwright/test/cli.js'), 'test'])
run(['--test', join(root, 'test/package.test.mjs')])
