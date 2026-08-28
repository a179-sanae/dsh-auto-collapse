/**
 * FoldController 生命周期回归：可重复 start，以及 body 延迟创建时的安全启动。
 */
import { installDomGlobals } from './fake-dom.mjs'
import { FoldController } from '../src/fold.ts'

let failures = 0
function check(name, condition, detail = '') {
  const ok = Boolean(condition)
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

const env = installDomGlobals()
const { document } = env
globalThis.__dshcf_observers = []
globalThis.__dshcf_observer_options = []

console.log('\n=== FoldController 生命周期 ===')
const originalBody = document.body
document.body = null
const delayed = new FoldController(undefined, { auditIntervalMs: 100000 })

// body 尚未创建时不应抛异常，也不应重复注册等待监听器。
delayed.start()
delayed.start()
check('body 缺失时 start 安全返回', globalThis.__dshcf_observers.length === 0)

// 模拟 DOMContentLoaded 后 body 出现，控制器应自动完成一次启动。
document.body = originalBody
document.dispatchEvent('DOMContentLoaded')
await new Promise(resolve => setTimeout(resolve, 0))
check('DOMContentLoaded 后自动启动 observer', globalThis.__dshcf_observers.length === 1)

// 已启动控制器再次 start 不得创建第二个 observer。
delayed.start()
check('重复 start 不重复注册 observer', globalThis.__dshcf_observers.length === 1)
delayed.stop()
env.clearTimers()

console.log(`\n[DONE] failures=${failures}`)
process.exit(failures === 0 ? 0 : 1)
