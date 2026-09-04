/**
 * 原生 TurnProcess 协同回归（DSH 0.1.2+）：
 * - turn-process 行透明跳过（不当正文、不切断工具组合并、不建块）；
 * - 同 segment 有原生摘要行时一级行让位（免双摘要）；
 * - 原生收起时隐藏插件 overlay（chip/合并行），展开后按原样恢复；
 * - observer 订阅包含原生 attribute（fake-dom 明确标注的覆盖缺口）。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installDomGlobals, el, textNode, makeToolRow } from './fake-dom.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const bundle = readFileSync(join(root, 'lib/client.js'), 'utf8')
let failures = 0

function assert(condition, label, detail = '') {
  const ok = Boolean(condition)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && detail ? `  (${detail})` : ''}`)
  if (!ok) failures++
}

async function scenario(name, fn) {
  console.log(`\n=== ${name} ===`)
  try {
    await fn()
  } catch (error) {
    failures++
    console.log(`FAIL  场景异常: ${error?.stack ?? error}`)
  }
}

function boot() {
  const env = installDomGlobals()
  const { document } = env
  let exports = null
  globalThis.window.__ModuleLoader__ = {
    load(spec) {
      exports = spec.factory(() => { throw new Error('require unsupported in stub') })
    },
  }
  eval(bundle)
  if (exports === null) throw new Error('bundle did not register')
  let stop = null
  exports.apply({ effect: fn => { stop = fn() } })
  const flow = el('div', { 'data-chat-flow': '' })
  flow.offsetParent = {}
  flow.setRect({ width: 900, height: 700 })
  document.body.appendChild(flow)
  const register = () => {
    const known = new Set(document._all)
    const walk = node => {
      for (const child of node.childNodes) {
        if (child.nodeType !== 1) continue
        if (!known.has(child)) {
          known.add(child)
          document._all.push(child)
        }
        walk(child)
      }
    }
    walk(document.body)
  }
  return {
    env,
    document,
    flow,
    register,
    cleanup() {
      stop?.()
      env.clearTimers()
    },
  }
}

function seat(parent, kind, key, turn, height = 40) {
  const node = el('div', {
    'data-chat-anchor-key': key,
    'data-chat-flow-key': key,
    'data-chat-flow-kind': kind,
    'data-chat-turn': turn,
    class: 'flowItem',
  }, parent)
  node.setRect({ height })
  return node
}

function addBody(node, value) {
  const root = el('div', { class: 'assistant-markdown-root' }, node)
  const body = el('div', { class: 'assistant-markdown-body' }, root)
  const markdown = el('div', { class: 'markdown' }, body)
  textNode(value, markdown)
  return markdown
}

/** 原生回合摘要行：flow 顶层 turn-process 消息 + 计数按钮（镜像宿主 DOM 契约）。 */
function makeTurnProcess({ turn, open = true, toolCalls = 2, messages = 1, subagents = 0, parent, withButton = true }) {
  const node = seat(parent, 'turn-process', `turn-process:${turn}`, turn)
  if (withButton) {
    const attrs = {
      'data-turn-process': turn,
      'data-turn-process-messages': String(messages),
      'data-turn-process-tool-calls': String(toolCalls),
      'data-turn-process-subagents': String(subagents),
      'aria-expanded': open ? 'true' : 'false',
    }
    // React 以 `"data-open": open || void 0` 渲染：收起态属性缺失。
    if (open) attrs['data-open'] = ''
    const button = el('button', attrs, node)
    const label = el('span', { class: 'label' }, button)
    textNode(`${toolCalls} 次工具调用 · ${messages} 条消息`, label)
    return { node, button }
  }
  return { node, button: null }
}

/** 已完成回合骨架：user →（可选原生行）→ 两个工具组 → 正文 → turn-tail。 */
function completedTurn(flow, { turn = 't1', native = null } = {}) {
  seat(flow, 'user', 'u1', 't0')
  let nativeRefs = null
  if (native !== null) {
    nativeRefs = makeTurnProcess({ turn, parent: flow, ...native })
  }
  const a1 = seat(flow, 'tool-call', 'a1', turn)
  makeToolRow({ callId: 'call:1', tool: 'bash', summary: 'echo hi', parent: a1 })
  const a2 = seat(flow, 'tool-call', 'a2', turn)
  makeToolRow({ callId: 'call:2', tool: 'read', summary: 'f.ts', parent: a2 })
  const a3 = seat(flow, 'assistant-step', 'a3', turn)
  addBody(a3, '最终正文输出')
  seat(flow, 'turn-tail', 'tail1', turn)
  return { a1, a2, a3, nativeRefs }
}

await scenario('observer 订阅原生开合属性', async () => {
  const t = boot()
  const filters = (globalThis.__dshcf_observer_options ?? []).map(entry => entry.options?.attributeFilter ?? [])
  assert(filters.length > 0, 'observer 已订阅')
  assert(
    filters.some(filter => filter.includes('data-turn-process-hidden') && filter.includes('data-open')),
    'attributeFilter 包含原生开合属性',
    JSON.stringify(filters[0] ?? []),
  )
  t.cleanup()
})

await scenario('原生行透明：不切断合并 + 一级行让位 + 原生行不受触碰', async () => {
  const t = boot()
  const { flow, register } = t
  const { nativeRefs } = completedTurn(flow, { native: { open: true } })
  register()
  await t.env.tick()
  await t.env.tick()
  const chips = [...flow.querySelectorAll('.dshcf-chip')]
  assert(chips.length === 1, '原生行两侧工具组合并为 1 个 chip', `chips=${chips.length}`)
  assert(chips.length === 1 && chips[0].style.display !== 'none', '原生展开时 chip 可见')
  assert(flow.querySelectorAll('.dshcf-processed').length === 0, '有原生摘要行时不渲染一级行')
  assert(
    nativeRefs !== null && nativeRefs.node.style.display !== 'none' && nativeRefs.node.isConnected,
    '插件永不隐藏原生摘要行',
  )
  t.cleanup()
})

await scenario('无原生行时一级行照常（0.1.1 行为不变）', async () => {
  const t = boot()
  const { flow, register } = t
  completedTurn(flow)
  register()
  await t.env.tick()
  await t.env.tick()
  // 完成态默认收起到一级：无可见 chip；点开一级后二级 chip 出现（老行为）。
  assert(flow.querySelectorAll('.dshcf-chip').length === 0, '完成态收起时无残留 chip')
  assert(flow.querySelectorAll('.dshcf-processed').length === 1, '无原生行时一级行照常渲染')
  flow.querySelector('.dshcf-processed').dispatchEvent('click')
  await t.env.tick()
  const chips = [...flow.querySelectorAll('.dshcf-chip')]
  assert(chips.length === 1 && chips[0].style.display !== 'none', '一级展开后工具组合并为 1 个可见 chip')
  t.cleanup()
})

await scenario('原生收起隐藏 overlay，展开后按原样恢复（含二级展开态）', async () => {
  const t = boot()
  const { flow, register } = t
  const { a1, nativeRefs } = completedTurn(flow, { native: { open: true } })
  register()
  await t.env.tick()
  await t.env.tick()
  const chip = flow.querySelector('.dshcf-chip')
  assert(chip !== null && chip.style.display !== 'none', '前置：原生展开时 chip 可见')
  // 先把二级 chip 点开，再收原生：验证展开态在原生折叠期间不丢失。
  chip.dispatchEvent('click')
  await t.env.tick()
  const toolRow = a1.querySelector('[data-chat-call-id]')
  assert(toolRow !== null && toolRow.style.display !== 'none', '前置：chip 点开展示成员行')
  // 模拟宿主收起：按钮 data-open 移除 + aria 收起 + 成员打标（与宿主一致）。
  nativeRefs.button.removeAttribute('data-open')
  nativeRefs.button.setAttribute('aria-expanded', 'false')
  await t.env.tick()
  await t.env.tick()
  assert(chip.style.display === 'none', '原生收起时 chip 隐藏')
  assert(nativeRefs.node.style.display !== 'none', '原生收起时原生行自身仍可见')
  // 模拟宿主再展开：overlay 按原样恢复，二级展开态保留。
  nativeRefs.button.setAttribute('data-open', '')
  nativeRefs.button.setAttribute('aria-expanded', 'true')
  await t.env.tick()
  await t.env.tick()
  assert(chip.style.display !== 'none', '原生再展开时 chip 恢复可见')
  assert(toolRow.style.display !== 'none', '原生再展开时二级展开态保留')
  t.cleanup()
})

await scenario('无按钮空壳原生行视为不存在（双方摘要都不丢）', async () => {
  const t = boot()
  const { flow, register } = t
  completedTurn(flow, { native: { withButton: false } })
  register()
  await t.env.tick()
  await t.env.tick()
  assert(flow.querySelectorAll('.dshcf-processed').length === 1, '空壳原生行不触发让位，一级行照常')
  t.cleanup()
})

if (failures > 0) {
  console.log(`\n[FAIL] turn-process: ${failures} 个断言失败`)
  process.exit(1)
} else {
  console.log('\n[ALL PASS] turn-process native cooperation')
}
