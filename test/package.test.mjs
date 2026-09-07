import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { gunzipSync } from 'node:zlib'
import { preparePackage } from '../deploy.mjs'
import * as host from '../lib/index.js'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
function unpack(buffer) {
  const tar = gunzipSync(buffer)
  const files = new Map()
  for (let offset = 0; offset + 512 <= tar.length;) {
    const name = tar.subarray(offset, offset + 100).toString().replace(/\0.*$/, '')
    if (!name) break
    const size = parseInt(tar.subarray(offset + 124, offset + 136).toString().replace(/\0.*$/, '').trim(), 8) || 0
    files.set(name, tar.subarray(offset + 512, offset + 512 + size))
    offset += 512 + Math.ceil(size / 512) * 512
  }
  return files
}

test('complete tgz exposes both host and client with no legacy engine or development files', () => {
  const result = preparePackage({ build: false, outputDir: join(root, '.test-build/package') })
  assert.equal(result.version, '0.2.0')
  const files = unpack(readFileSync(result.file))
  const manifest = JSON.parse(files.get('package/package.json'))
  assert.equal(manifest.exports['./client'].default, './lib/client.js')
  assert.ok(files.has('package/lib/types/client.d.ts'))
  assert.ok(files.has('package/lib/types/index.d.ts'))
  assert.ok(files.has('package/assets/screenshot.png'))
  assert.ok(![...files.keys()].some(file => /\/(src|test|plan|node_modules)\//.test(file)))
  const client = files.get('package/lib/client.js').toString()
  assert.ok(!/mergedBodyTexts|discoverHollowWrappers|parseTurnDuration|runningSince/.test(client))
  let exported
  vm.runInNewContext(client, { window: { __ModuleLoader__: { load(spec) {
    assert.equal(spec.id, 'dsh-auto-collapse')
    exported = spec.factory(() => { throw new Error('Client registration should not eagerly require optional React') })
  } } } })
  assert.equal(exported.name, 'dsh-auto-collapse')
  assert.equal(typeof exported.apply, 'function')
})

test('host only registers its optional settings namespace and preserves blank values', () => {
  const registrations = []
  let attach
  host.apply({ inject(names, setup) { assert.deepEqual(names, ['settings']); attach = setup } }, { statusText: '' })
  assert.equal(registrations.length, 0)
  attach({ settings: { register(namespace, schema, options) { registrations.push({ namespace, schema, options }) } } })
  assert.equal(registrations[0].namespace, 'dsh-auto-collapse')
  assert.equal(registrations[0].options.base.statusText, '')
  assert.equal(typeof registrations[0].schema, 'function')
  assert.deepEqual(host.inject, [])
})
