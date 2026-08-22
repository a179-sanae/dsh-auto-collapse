/**
 * 新协调器的真实契约回归：所有 assistant 输出都使用 assistant-step，覆盖
 * 原地流式更新、稳定 key 换节点、乱序历史挂载和非 tool-call 工作卡。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installDomGlobals, el, textNode, makeThinkRow, makeToolRow } from './fake-dom.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const bundle = readFileSync(join(root, 'lib/client.js'), 'utf8')
let failures = 0

function assert(condition, label, detail = '') {
  const ok = Boolean(condition)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && detail ? `  (${detail})` : ''}`)
  if (!ok) failures++
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

function seat(parent, kind, key, height = 40) {
  const node = el('div', {
    'data-chat-anchor-key': key,
    'data-chat-flow-key': key,
    'data-chat-flow-kind': kind,
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

function addImage(node) {
  const root = el('div', { class: 'assistant-markdown-root' }, node)
  const body = el('div', { class: 'assistant-markdown-body' }, root)
  return el('img', { src: 'blob:test', alt: 'result' }, body)
}

function addThink(node, summary, state = 'ok') {
  const root = el('div', { class: 'assistant-markdown-root' }, node)
  const body = el('div', { class: 'assistant-markdown-body' }, root)
  return makeThinkRow({ state, summary, parent: body, followEnd: state === 'running' })
}

function makeCommand(host, summary, state = 'ok', suffix = null) {
  const card = el('div', { 'data-variant': 'others', 'data-state': state }, host)
  const row = el('div', { 'data-disclosure-row': '' }, card)
  el('span', { class: 'leading' }, row)
  el('span', { class: 'title', text: 'Command' }, row)
  el('span', { class: 'sep', 'aria-hidden': 'true' }, row)
  el('span', { class: 'summary', text: summary }, row)
  if (suffix !== null) el('span', { class: 'suffix', text: suffix }, row)
  return card
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

await scenario('同一 assistant-step 原地补正文后重新判定 final', async () => {
  const ctx = boot()
  const { env, document, flow, register, cleanup } = ctx
  seat(flow, 'user', 'u1')
  const first = seat(flow, 'assistant-step', 's1')
  addThink(first, 'first')
  addBody(first, '中间正文')
  const tool = seat(flow, 'tool-call', 't1')
  makeToolRow({ callId: 'call:1', tool: 'read', summary: 'a.txt', parent: tool })
  const final = seat(flow, 'assistant-step', 's2')
  addThink(final, 'final pending')
  const tail = seat(flow, 'turn-tail', 'tt1')
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  assert(first.style.display === '', '正文未到时当前最后正文保持显示')
  addBody(final, '最终正文')
  register()
  await env.tick()
  assert(flow.querySelectorAll('.dshcf-processed').length === 1, '原地更新后仍恰一条一级行')
  assert(first.style.display === 'none', '旧 final 收敛为中间正文')
  assert(final.style.display === '', '补正文的同一节点成为可见 final')
  assert(tool.style.display === 'none', '工具过程保持折叠')
  cleanup()
})

await scenario('稳定 key 换节点、一级行自愈与原始 display 恢复', async () => {
  const { env, document, flow, register, cleanup } = boot()
  seat(flow, 'user', 'u1')
  const oldTool = seat(flow, 'tool-call', 't1')
  oldTool.style.display = 'grid'
  const oldRow = makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: oldTool })
  oldRow.style.display = 'flex'
  const final = seat(flow, 'assistant-step', 'f1')
  addBody(final, 'done')
  const tail = seat(flow, 'turn-tail', 'tt1')
  textNode('用时 2秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  assert(oldTool.style.display === 'none', '完成态隐藏旧宿主')

  oldTool.remove()
  const replacement = seat(flow, 'tool-call', 't1')
  replacement.style.display = 'grid'
  const replacementRow = makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: replacement })
  replacementRow.style.display = 'flex'
  replacement.remove()
  flow.insertBefore(replacement, final)
  register()
  await env.tick()
  assert(oldTool.style.display === 'grid', '断开的旧宿主恢复原始 display')
  assert(replacement.style.display === 'none', '替换宿主自动接管折叠')
  assert(flow.querySelectorAll('.dshcf-processed').length === 1, '替换后一级行不重复')

  let row = flow.querySelector('.dshcf-processed')
  row.dispatchEvent('click')
  await env.tick()
  assert(replacement.style.display === 'grid', '一级展开精确恢复 grid')
  const chip = replacement.querySelector('.dshcf-chip')
  chip.dispatchEvent('click')
  await env.tick()
  assert(replacementRow.style.display === 'flex', '二级展开精确恢复 flex')

  row.remove()
  await env.tick()
  row = flow.querySelector('.dshcf-processed')
  assert(row.getAttribute('aria-expanded') === 'true', 'React 清行后保留一级展开状态')
  assert(replacement.style.display === 'grid', '重建后展开内容与 ARIA 一致')
  cleanup()
  assert(replacement.style.display === 'grid' && replacementRow.style.display === 'flex', 'stop() 精确恢复原始样式')
})

await scenario('外部隐藏整段不生成孤立一级行', async () => {
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1')
  textNode('question', user)
  const tool = seat(flow, 'tool-call', 't1')
  makeToolRow({ callId: 'call:1', tool: 'read', summary: 'a.txt', parent: tool })
  const final = seat(flow, 'assistant-step', 'f1')
  addBody(final, 'answer')
  const tail = seat(flow, 'turn-tail', 'tt1')
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()
  let row = flow.querySelector('.dshcf-processed')
  assert(row !== null, '隐藏前正常生成一级行')
  assert(tool.style.display === 'none', '隐藏前工具宿主由插件控制')

  user.style.display = 'none'
  final.style.display = 'none'
  row?.remove()
  await env.tick()
  await env.tick()
  assert(flow.querySelectorAll('.dshcf-processed').length === 0, '整段不可见且旧行被清理后不重建孤立一级行')
  assert([...flow.querySelectorAll('.dshcf-chip')].every(chip => chip.style.display === 'none'), '不可见 segment 不显示残留 chip')
  assert(user.style.display === 'none' && final.style.display === 'none', '外部隐藏样式不被插件恢复')

  user.style.display = ''
  final.style.display = ''
  await env.tick()
  await env.tick()
  row = flow.querySelector('.dshcf-processed')
  assert(row !== null, '解除外部隐藏后恢复一级行')
  assert(flow.querySelectorAll('.dshcf-processed').length === 1, '恢复后不重复生成一级行')
  assert(final.style.display === '' && tool.style.display === 'none', '恢复后 final 可见且工具继续折叠')
  cleanup()
})
await scenario('command 与 manual-compaction 进入统一工作折叠', async () => {
  const { env, document, flow, register, cleanup } = boot()
  seat(flow, 'user', 'u1')
  const command = seat(flow, 'command', 'cmd1')
  const commandCard = makeCommand(command, '/help')
  const compact = seat(flow, 'manual-compaction', 'compact1')
  const compactCard = makeCommand(compact, '/compact')
  const final = seat(flow, 'assistant-step', 'f1')
  addBody(final, '完成')
  const tail = seat(flow, 'turn-tail', 'tt1')
  textNode('用时 1秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  assert(command.style.display === 'none' && compact.style.display === 'none', '两类顶层命令完成态都隐藏')
  const row = flow.querySelector('.dshcf-processed')
  assert(row !== null, '命令回合生成一级行')
  row.dispatchEvent('click')
  await env.tick()
  const chip = command.querySelector('.dshcf-chip')
  assert(chip !== null && chip.textContent.includes('运行了命令'), '展开后生成命令二级 chip')
  assert(!chip.classList.contains('dshcf-has-body'), '命令卡 chip 不误判 has-body（避免折叠态 32px 悬空间距）')
  chip.dispatchEvent('click')
  await env.tick()
  assert(commandCard.style.display === '' && compactCard.style.display === '', '二级展开显示两张命令卡')
  cleanup()
})

await scenario('纯图片 assistant-step 保持为 final', async () => {
  const { env, document, flow, register, cleanup } = boot()
  seat(flow, 'user', 'u1')
  const tool = seat(flow, 'tool-call', 't1')
  makeToolRow({ callId: 'call:1', tool: 'read', summary: 'image.png', parent: tool })
  const final = seat(flow, 'assistant-step', 'f1')
  const think = addThink(final, 'render image')
  addImage(final)
  const tail = seat(flow, 'turn-tail', 'tt1')
  textNode('用时 3秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  assert(final.style.display === '', '图片 final 宿主可见')
  assert(final.querySelector('img') !== null, '图片节点仍在 DOM')
  assert(think.style.display === 'none' && tool.style.display === 'none', '思考与工具过程折叠')
  cleanup()
})

await scenario('thinking carry 不穿过 steering 硬边界', async () => {
  const { env, document, flow, register, cleanup } = boot()
  seat(flow, 'user', 'u1')
  const first = seat(flow, 'assistant-step', 's1')
  const root1 = el('div', { class: 'assistant-markdown-root' }, first)
  const body1 = el('div', { class: 'assistant-markdown-body' }, root1)
  makeThinkRow({ summary: 'Think1', parent: body1 })
  el('div', { class: 'markdown', text: '段一 final' }, body1)
  const trailing = makeThinkRow({ summary: 'Think2', parent: body1 })
  seat(flow, 'steering', 'st1')
  const secondTool = seat(flow, 'tool-call', 't2')
  makeToolRow({ callId: 'call:2', tool: 'grep', summary: 'needle', parent: secondTool })
  const secondFinal = seat(flow, 'assistant-step', 'f2')
  addBody(secondFinal, '段二 final')
  const tail = seat(flow, 'turn-tail', 'tt2')
  textNode('用时 2秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  const rows = flow.querySelectorAll('.dshcf-processed')
  assert(rows.length === 2, 'steering 前后各自生成一级行')
  rows[1].dispatchEvent('click')
  await env.tick()
  assert(first.querySelector('.dshcf-chip') === null, '展开第二段不会生成第一段 chip')
  assert(trailing.style.display === 'none', '第一段尾部 thinking 仍由第一段折叠')
  rows[0].dispatchEvent('click')
  await env.tick()
  assert(first.querySelector('.dshcf-chip') !== null, '展开第一段才出现其 thinking chip')
  cleanup()
})

await scenario('空边界先到、工作后到仍会补建一级行', async () => {
  const { env, document, flow, register, cleanup } = boot()
  seat(flow, 'user', 'u1')
  const tail = seat(flow, 'turn-tail', 'tt1')
  textNode('用时 4秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  assert(flow.querySelector('.dshcf-processed') === null, '空回合暂不生成一级行')
  const tool = seat(flow, 'tool-call', 't1')
  makeToolRow({ callId: 'call:1', tool: 'bash', summary: 'echo ok', parent: tool })
  const final = seat(flow, 'assistant-step', 'f1')
  addBody(final, 'ok')
  tool.remove()
  final.remove()
  flow.insertBefore(tool, tail)
  flow.insertBefore(final, tail)
  register()
  await env.tick()
  assert(flow.querySelectorAll('.dshcf-processed').length === 1, '后到工作触发一级行')
  assert(tool.style.display === 'none' && final.style.display === '', '后到内容正确分类')
  cleanup()
})

await scenario('工具摘要忽略 summarySuffix', async () => {
  const { env, document, flow, register, cleanup } = boot()
  seat(flow, 'user', 'u1')
  const tool = seat(flow, 'tool-call', 't1')
  const row = makeToolRow({ callId: 'call:1', tool: 'pwsh', state: 'running', summary: 'Get-Content a.txt', parent: tool })
  const disclosure = row.querySelector('[data-disclosure-row]')
  disclosure.children[2].setAttribute('aria-hidden', 'true')
  el('span', { class: 'summarySuffix', text: '(live)' }, disclosure)
  document.body.appendChild(flow)
  register()
  await env.tick()
  const chip = tool.querySelector('.dshcf-chip')
  assert(chip.textContent.includes('Get-Content a.txt'), 'chip 使用主摘要')
  assert(!chip.textContent.includes('(live)'), 'chip 不误取 suffix')
  cleanup()
})

await scenario('Deep sleeping... 只改当前 flow', async () => {
  const { env, document, flow, register, cleanup } = boot()
  const external = el('div', { role: 'status', text: 'Deep diving outside' }, document.body)
  const active = el('div', { role: 'status', text: 'Deep diving active' }, flow)
  document.body.appendChild(flow)
  register()
  await env.tick()
  assert(external.textContent === 'Deep diving outside', 'flow 外状态文案不变')
  assert(active.textContent === 'Deep sleeping... active', '当前 flow 状态文案替换')
  cleanup()
  assert(active.textContent === 'Deep diving active', 'stop() 恢复当前 flow 原文')
})

await scenario('context 与工具保持两个独立二级块', async () => {
  const { env, document, flow, register, cleanup } = boot()
  seat(flow, 'user', 'u1')
  const context = seat(flow, 'context', 'c1')
  makeCommand(context, 'preset')
  const tool = seat(flow, 'tool-call', 't1')
  makeToolRow({ callId: 'call:1', tool: 'read', state: 'running', summary: 'a.txt', parent: tool })
  document.body.appendChild(flow)
  register()
  await env.tick()
  const chips = flow.querySelectorAll('.dshcf-chip')
  assert(chips.length === 2, 'context 与 tool 各有一个 chip', `chips=${chips.length}`)
  assert(chips.some(chip => chip.textContent.includes('上下文注入')), '存在独立上下文注入摘要')
  const css = document.getElementById('dshcf-style')?.textContent ?? ''
  assert(/\.dshcf-chip\.dshcf-flow-chip\s*\{\s*margin-bottom:\s*0;\s*\}/.test(css), 'flow 级 context chip 不叠加宿主 row-gap')
  cleanup()
})

await scenario('一级行只重置本回合二级展开状态', async () => {
  const { env, document, flow, register, cleanup } = boot()
  const tools = []
  for (let turn = 1; turn <= 2; turn++) {
    seat(flow, 'user', `u${turn}`)
    const tool = seat(flow, 'tool-call', `t${turn}`)
    const toolRow = makeToolRow({ callId: `call:${turn}`, tool: 'read', summary: `${turn}.txt`, parent: tool })
    const final = seat(flow, 'assistant-step', `f${turn}`)
    addBody(final, `final ${turn}`)
    const tail = seat(flow, 'turn-tail', `tt${turn}`)
    textNode('用时 1秒', tail)
    tools.push({ tool, toolRow })
  }
  document.body.appendChild(flow)
  register()
  await env.tick()
  const rows = flow.querySelectorAll('.dshcf-processed')
  rows[0].dispatchEvent('click')
  rows[1].dispatchEvent('click')
  await env.tick()
  const chip1 = tools[0].tool.querySelector('.dshcf-chip')
  chip1.dispatchEvent('click')
  await env.tick()
  assert(chip1.getAttribute('aria-expanded') === 'true', '第一回合二级已展开')
  rows[1].dispatchEvent('click')
  await env.tick()
  rows[1].dispatchEvent('click')
  await env.tick()
  assert(chip1.getAttribute('aria-expanded') === 'true', '重开第二回合不重置第一回合二级')
  assert(tools[0].toolRow.style.display === '', '第一回合工具行继续可见')
  cleanup()
})

await scenario('官方回合时长优先于本地 running 计时', async () => {
  const { env, document, flow, register, cleanup } = boot()
  seat(flow, 'user', 'u1')
  const tool = seat(flow, 'tool-call', 't1')
  const toolRow = makeToolRow({ callId: 'call:1', tool: 'pwsh', state: 'running', summary: 'sleep', parent: tool })
  const final = seat(flow, 'assistant-step', 'f1')
  addBody(final, 'done')
  const tail = seat(flow, 'turn-tail', 'tt1')
  textNode('用时 16秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  toolRow.querySelector('[data-tool]').setAttribute('data-state', 'ok')
  await env.tick()
  assert(flow.querySelector('.dshcf-processed')?.textContent.includes('已处理 16秒'), '完成态采用宿主官方时长')
  cleanup()
})

await scenario('左栏切换时旧 flow 断连可由容器 mutation 接管新 flow', async () => {
  const { env, document, flow, register, cleanup } = boot()
  seat(flow, 'user', 'u1')
  const oldTool = seat(flow, 'tool-call', 't1')
  makeToolRow({ callId: 'call:old', tool: 'read', summary: 'old.txt', parent: oldTool })
  const oldFinal = seat(flow, 'assistant-step', 'f1')
  addBody(oldFinal, 'old final')
  const oldTail = seat(flow, 'turn-tail', 'tt1')
  textNode('用时 2秒', oldTail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  assert(flow.querySelectorAll('.dshcf-processed').length === 1, '旧会话初始协调完成')

  flow.remove()
  const nextFlow = el('div', { 'data-chat-flow': '' })
  nextFlow.offsetParent = {}
  nextFlow.setRect({ width: 900, height: 700 })
  seat(nextFlow, 'user', 'u2')
  const nextTool = seat(nextFlow, 'tool-call', 't2')
  makeToolRow({ callId: 'call:new', tool: 'grep', summary: 'new.txt', parent: nextTool })
  const nextFinal = seat(nextFlow, 'assistant-step', 'f2')
  addBody(nextFinal, 'new final')
  const nextTail = seat(nextFlow, 'turn-tail', 'tt2')
  textNode('用时 3秒', nextTail)
  document.body.appendChild(nextFlow)
  register()

  // 不调用 env.tick() 的空 records 捷径；准确模拟真实 observer 收到的
  // body childList record，确保测试能复现旧实现的漏调度。
  env.notifyMutations([{
    type: 'childList',
    target: document.body,
    addedNodes: [nextFlow],
    removedNodes: [flow],
  }])
  env.flushRaf()

  const rows = nextFlow.querySelectorAll('.dshcf-processed')
  assert(rows.length === 1 && rows[0].textContent.includes('已处理 3秒'), '新会话无需刷新即生成一级行')
  assert(flow.querySelectorAll('.dshcf-processed').length === 0, '旧会话插件行已清理')
  assert(nextTool.style.display === 'none' && nextFinal.style.display === '', '新 flow 折叠状态完整')
  cleanup()
})

await scenario('40 组双回合乱序挂载全部最终收敛', async () => {
  const failed = []
  let seed = 0x5eed1234
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 0x100000000
  }
  for (let iteration = 0; iteration < 40; iteration++) {
    const { env, document, flow, register, cleanup } = boot()
    const u1 = seat(null, 'user', `u1-${iteration}`)
    const t1 = seat(null, 'tool-call', `t1-${iteration}`)
    makeToolRow({ callId: `call:1:${iteration}`, tool: 'read', summary: 'one', parent: t1 })
    const m1 = seat(null, 'assistant-step', `m1-${iteration}`)
    addBody(m1, 'middle one')
    const f1 = seat(null, 'assistant-step', `f1-${iteration}`)
    addBody(f1, 'final one')
    const tt1 = seat(null, 'turn-tail', `tt1-${iteration}`)
    textNode('用时 1秒', tt1)
    const u2 = seat(null, 'user', `u2-${iteration}`)
    const t2 = seat(null, 'tool-call', `t2-${iteration}`)
    makeToolRow({ callId: `call:2:${iteration}`, tool: 'grep', summary: 'two', parent: t2 })
    const m2 = seat(null, 'assistant-step', `m2-${iteration}`)
    addBody(m2, 'middle two')
    const f2 = seat(null, 'assistant-step', `f2-${iteration}`)
    addBody(f2, 'final two')
    const tt2 = seat(null, 'turn-tail', `tt2-${iteration}`)
    textNode('用时 2秒', tt2)
    const canonical = [u1, t1, m1, f1, tt1, u2, t2, m2, f2, tt2]
    const order = canonical.map((_, index) => index)
    for (let index = order.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1))
      ;[order[index], order[other]] = [order[other], order[index]]
    }
    document.body.appendChild(flow)
    register()
    for (const index of order) {
      const successor = canonical.slice(index + 1).find(node => node.parentElement === flow) ?? null
      flow.insertBefore(canonical[index], successor)
      register()
      await env.tick()
    }
    await env.tick()
    const rows = flow.querySelectorAll('.dshcf-processed')
    let ok = rows.length === 2
      && t1.style.display === 'none'
      && m1.style.display === 'none'
      && f1.style.display === ''
      && t2.style.display === 'none'
      && m2.style.display === 'none'
      && f2.style.display === ''
    if (ok) {
      rows[0].dispatchEvent('click')
      await env.tick()
      ok = t1.style.display === '' && m1.style.display === ''
        && t2.style.display === 'none' && m2.style.display === 'none'
      rows[0].dispatchEvent('click')
      rows[1].dispatchEvent('click')
      await env.tick()
      ok = ok && t1.style.display === 'none' && m1.style.display === 'none'
        && t2.style.display === '' && m2.style.display === ''
    }
    if (!ok) failed.push(iteration)
    cleanup()
  }
  assert(failed.length === 0, '40/40 排列满足行数、可见性与回合归属不变量', `failed=${failed.join(',')}`)
})

console.log(`\n${failures === 0 ? '[ALL PASS]' : `[${failures} FAILURE(S)]`}`)
process.exitCode = failures === 0 ? 0 : 1
