/**
 * 客户端设置生命周期：核心折叠先启动，slots/settingsScope 晚到时
 * 设置卡与实时文案自动接入，detach 后清理并可再连。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installDomGlobals, el, textNode } from './fake-dom.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const bundle = readFileSync(join(root, 'lib/client.js'), 'utf8')
let failures = 0

function assert(condition, label, detail = '') {
  const ok = Boolean(condition)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && detail ? `  (${detail})` : ''}`)
  if (!ok) failures += 1
}

function loadClient() {
  let exports = null
  globalThis.window.__ModuleLoader__ = {
    load(spec) {
      exports = spec.factory(() => { throw new Error('require unsupported in lifecycle stub') })
    },
  }
  eval(bundle)
  if (exports === null) throw new Error('bundle did not register')
  return exports
}

function makeScope(initialText) {
  let text = initialText
  const listeners = new Set()
  return {
    getSnapshot() {
      return {
        status: 'ready',
        value: { statusText: text },
        base: { statusText: 'Deep sleeping...' },
        user: { statusText: text },
        writable: true,
      }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async set(_field, value) { text = String(value) },
    async unset() { text = 'Deep sleeping...' },
    update(next) {
      text = next
      for (const listener of listeners) listener()
    },
    listenerCount() { return listeners.size },
  }
}

function attachServices(injection, scope) {
  const cleanups = []
  const state = {
    namespace: null,
    slotName: null,
    registration: null,
    registrationDisposed: false,
  }
  const settingsScope = {
    bind(spec) {
      state.namespace = spec.namespace
      return scope
    },
  }
  const slots = {
    inject(name, callback) {
      state.slotName = name
      const off = callback()
      return () => {
        if (typeof off === 'function') off()
      }
    },
    register(options, renderer) {
      state.registration = { options, renderer }
      return () => { state.registrationDisposed = true }
    },
  }
  const services = { settingsScope, slots }
  injection.setup({
    get(name) { return services[name] },
    effect(fn) {
      const cleanup = fn()
      if (typeof cleanup === 'function') cleanups.push(cleanup)
      return cleanup
    },
  })
  return {
    state,
    cleanup() {
      for (const off of cleanups.splice(0).reverse()) off()
    },
  }
}

console.log('\n=== 客户端设置服务晚到 / 重连 ===')
const env = installDomGlobals()
const { document } = env
const flow = el('div', { 'data-chat-flow': '' }, document.body)
flow.offsetParent = {}
flow.setRect({ width: 900, height: 500 })
const status = el('div', { role: 'status' }, flow)
textNode('深度求索中... 20秒', status)
// el()/textNode() 是轻量 fixture 助手，不经 document.createElement；
// 加入 FakeDocument 索引后，document.querySelectorAll 才能发现 flow/status。
document._all.push(flow, status)

const client = loadClient()
const rootCleanups = []
const injections = []
client.apply({
  effect(fn) {
    const cleanup = fn()
    if (typeof cleanup === 'function') rootCleanups.push(cleanup)
    return cleanup
  },
  inject(services, setup) {
    injections.push({ services: [...services], setup })
  },
})

await env.tick()
assert(document.getElementById('dshcf-style') !== null, '核心折叠不等设置服务即启动')
assert(status.textContent === 'Deep sleeping... 20秒', '服务未到时使用默认文案', status.textContent)
assert(document.getElementById('dshcf-settings-style') === null, '服务未到时不注册设置卡')
assert(
  injections.length === 1
    && injections[0].services.includes('settingsScope')
    && injections[0].services.includes('slots'),
  '通过 ctx.inject 等待 settingsScope + slots',
  JSON.stringify(injections.map(entry => entry.services)),
)

const scope = makeScope('正在检查...')
const first = attachServices(injections[0], scope)
await env.tick()
assert(first.state.namespace === 'dsh-auto-collapse', '绑定正确设置命名空间')
assert(first.state.slotName === 'settings.plugin.item', '注册到插件设置卡 slot')
assert(first.state.registration?.options?.key === 'dsh-auto-collapse', '设置卡 key 正确')
assert(document.getElementById('dshcf-settings-style') !== null, '晚到服务自动注入设置卡样式')
assert(scope.listenerCount() === 1, '设置订阅已接入')
assert(status.textContent === '正在检查... 20秒', '晚到设置立即替换当前状态文案', status.textContent)

scope.update('等待回应...')
await env.tick()
assert(status.textContent === '等待回应... 20秒', '非空设置之间切换立即生效', status.textContent)

first.cleanup()
await env.tick()
assert(scope.listenerCount() === 0, 'service detach 取消旧订阅')
assert(first.state.registrationDisposed, 'service detach 注销旧设置卡')
assert(document.getElementById('dshcf-settings-style') === null, 'service detach 清理设置卡样式')
assert(status.textContent === 'Deep sleeping... 20秒', 'service detach 回落默认文案', status.textContent)

scope.update('重连完成...')
const second = attachServices(injections[0], scope)
await env.tick()
assert(document.getElementById('dshcf-settings-style') !== null, '服务重连后重建设置卡')
assert(status.textContent === '重连完成... 20秒', '服务重连后重建实时设置源', status.textContent)

second.cleanup()
for (const off of rootCleanups.splice(0).reverse()) off()
assert(document.getElementById('dshcf-style') === null, '插件卸载清理核心样式')
assert(document.getElementById('dshcf-settings-style') === null, '插件卸载清理设置样式')
assert(status.textContent === '深度求索中... 20秒', '插件卸载还原宿主文案', status.textContent)
env.clearTimers()

if (failures > 0) {
  console.log(`\n[FAIL] client settings lifecycle: ${failures} 个断言失败`)
  process.exit(1)
} else {
  console.log('\n[ALL PASS] client settings lifecycle')
}
