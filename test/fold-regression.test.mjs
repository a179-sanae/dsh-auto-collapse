/**
 * fold-regression.test.mjs — review 修复的回归测试。用真实 bundle
 * （lib/client.js）驱动会话流 fixture，覆盖：
 *
 *  1. P1-1：最终输出仍为 kind='assistant-step'（真实 DSH 契约）——中间 step
 *     过程正文必须整条折叠，不能残留可见。
 *  2. P1-2：正文后的遗留思考行（Think1-正文-Think2）——流末尾无堆积块时
 *     完成态必须折叠，不能残留可见。
 *  3. P2-1：flow 顶层装饰元素（TurnStatus role="status"）不打断工具组合并。
 *  4. 竞态：turn-tail 先于工具 done 到达 → pending → done 后恰一行已处理。
 *  5. 宿主被替换（极端重渲染）→ chip 自愈、无重复行、无残留。
 *  6. 切会话（flow 整体替换）→ 无串味、无残留搬移。
 *  7. stop() 完整性：全部还原、无残留节点、状态提示词还原。
 *  8. 纯文本回合（无 think/tool）不生成一级行（既有产品语义确认）。
 *
 * 用法：node test/fold-regression.test.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { installDomGlobals, el, textNode, makeToolRow, makeThinkRow } from './fake-dom.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const bundlePath = join(root, 'lib/client.js')

const code = readFileSync(bundlePath, 'utf8')

let failures = 0
function assert(cond, label, extra = '') {
  const ok = Boolean(cond)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && extra ? `  (${extra})` : ''}`)
  if (!ok) failures++
}

// ---------------------------------------------------------------------------
// 通用启动：返回 { env, flow, apply 后的 cleanup, 重新登记 document._all 的 helper }
// ---------------------------------------------------------------------------
function boot() {
  const env = installDomGlobals()
  const { document } = env
  let moduleExports = null
  globalThis.window.__ModuleLoader__ = {
    load(spec) {
      moduleExports = spec.factory(() => { throw new Error('require unsupported in stub') })
    },
  }
  eval(code)
  if (moduleExports === null) throw new Error('bundle did not register')
  let cleanup = null
  moduleExports.apply({ effect: (fn) => { cleanup = fn() } })
  const flow = el('div', { 'data-chat-flow': '' })
  flow.offsetParent = {}
  flow.setRect({ width: 800, height: 600 })
  function register() {
    const seen = new Set(document._all)
    const walk = (node) => {
      for (const c of node.childNodes) {
        if (c.nodeType === 1) {
          if (!seen.has(c)) { seen.add(c); document._all.push(c) }
          walk(c)
        }
      }
    }
    walk(document.body)
  }
  return { env, document, flow, register, cleanup: () => { cleanup?.(); env.clearTimers() } }
}

function seat(flow, kind, key, h) {
  const s = el('div', { 'data-chat-anchor-key': key, 'data-chat-flow-kind': kind, class: 'flowItem' }, flow)
  s.setRect({ height: h })
  return s
}

function addThink(seatEl, { state = 'ok', summary = '', bodyText = null }) {
  const md = el('div', { class: 'assistant-markdown-root' }, seatEl)
  const body = el('div', { class: 'assistant-markdown-body' }, md)
  return makeThinkRow({ state, summary, bodyText, parent: body })
}

function addBodyText(seatEl, text) {
  const md = el('div', { class: 'assistant-markdown-root' }, seatEl)
  const body = el('div', { class: 'assistant-markdown-body' }, md)
  const markdown = el('div', { class: 'markdown' }, body)
  textNode(text, markdown)
  return markdown
}

// ---------------------------------------------------------------------------
// 场景 1：P1-1 最终输出 kind='assistant-step'
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 1: P1-1 最终输出 kind=assistant-step（中间过程正文整条折叠） ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('帮我读文件', user)
  const step1 = seat(flow, 'assistant-step', 's1', 80)
  addThink(step1, { summary: '第一步思考' })
  addBodyText(step1, '第一步过程正文')
  const tool = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'Get-Content a.txt', parent: tool })
  const step2 = seat(flow, 'assistant-step', 's2', 80)
  addThink(step2, { summary: '第二步思考' })
  addBodyText(step2, '第二步过程正文')
  const final = seat(flow, 'assistant-step', 'a1', 100)
  addThink(final, { summary: '最终思考' })
  addBodyText(final, '最终正文')
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()

  const rows = () => flow.querySelectorAll('.dshcf-processed')
  assert(rows().length === 1, '恰一行 .dshcf-processed')
  assert(step1.style.display === 'none', '中间 step1 整条折叠', `display=${step1.style.display}`)
  assert(step2.style.display === 'none', '中间 step2 整条折叠（修复前残留可见）', `display=${step2.style.display}`)
  assert(tool.style.display === 'none', '工具卡 seat 折叠', `display=${tool.style.display}`)
  assert(final.style.display === '', '最终输出宿主可见', `display=${final.style.display}`)
  const finalThink = final.querySelector('[data-variant="think"]')
  assert(finalThink.style.display === 'none', '最终输出 think 行折叠', `display=${finalThink.style.display}`)
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 2：P1-2 遗留思考行（Think1-正文-Think2，流末尾）
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 2: P1-2 正文后遗留思考行完成态折叠 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('问个问题', user)
  const final = seat(flow, 'assistant-step', 'a1', 120)
  const t1 = addThink(final, { summary: '先想' })
  addBodyText(final, '中间正文')
  const t2 = addThink(final, { summary: '再想' })
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()

  assert(t1.style.display === 'none', 'Think1 完成态折叠', `display=${t1.style.display}`)
  assert(t2.style.display === 'none', 'Think2（遗留行）完成态折叠（修复前残留可见）', `display=${t2.style.display}`)
  // 一级展开：宿主可见，二级 chip 保持收起（思考行仍隐藏，素材对齐）
  const row = flow.querySelector('.dshcf-processed')
  row.dispatchEvent('click')
  await env.tick()
  assert(final.style.display === '', '一级展开后宿主可见', `display=${final.style.display}`)
  const chip = flow.querySelector('.dshcf-chip')
  assert(chip !== null, '一级展开后生成二级 chip')
  assert(t1.style.display === 'none' && t2.style.display === 'none', '二级收起态思考行保持隐藏')
  // 点击二级 chip 展开：连续思考合并为三级行（设计），原始行由合并行承载
  chip.dispatchEvent('click')
  await env.tick()
  const merged = flow.querySelector('.dshcf-merged-think')
  assert(merged !== null, '二级展开后连续思考合并为三级行')
  assert(t1.style.display === 'none' && t2.style.display === 'none', '原始思考行由合并行承载（隐藏）')
  // 点击三级合并行：显示合并内容块（原始四级行不出现，README 契约）
  merged.dispatchEvent('click')
  await env.tick()
  const body = flow.querySelector('.dshcf-merged-body')
  assert(body !== null, '三级展开后生成合并内容块')
  const bodyText = body.textContent ?? ''
  assert(bodyText.includes('先想') && bodyText.includes('再想'), '内容块包含全部思考文本（含遗留行）', bodyText)
  assert(t1.style.display === 'none' && t2.style.display === 'none', '原始思考行保持隐藏（四级行不出现）')
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 3：P2-1 装饰元素（TurnStatus）不打断合并
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 3: P2-1 TurnStatus 装饰元素不打断工具组合并 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('跑命令', user)
  const t1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd1', parent: t1 })
  const status = el('div', { role: 'status' }, flow)
  textNode('Deep diving...', status)
  const t2 = seat(flow, 'tool-call', 't2', 30)
  makeToolRow({ callId: 'call:2', tool: 'read', summary: 'cmd2', parent: t2 })
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()

  const chips = () => flow.querySelectorAll('.dshcf-chip')
  assert(chips().length === 0, '完成态 chip 未创建（整块收进已处理行）', `chips=${chips().length}`)
  const st = flow.querySelector('[role="status"]')
  assert(st.textContent.includes('Deep sleeping...'), '状态行文本替换为 Deep sleeping...')
  // 一级展开 → 工具组合并为恰一个 chip（TurnStatus 未断开合并）
  const row = flow.querySelector('.dshcf-processed')
  row.dispatchEvent('click')
  await env.tick()
  assert(chips().length === 1, '工具组未被装饰元素断开（恰一个 chip）', `chips=${chips().length}`)
  // 点击 chip 第一次：展开（一级展开后二级默认收起）——两条命令行都显示
  const chip = chips()[0]
  chip.dispatchEvent('click')
  await env.tick()
  const r1 = t1.querySelector('[data-chat-call-id]')
  const r2 = t2.querySelector('[data-chat-call-id]')
  assert(r1.style.display === '' && r2.style.display === '', '同一块内两条命令行一起展开', `r1=${r1.style.display} r2=${r2.style.display}`)
  // 再点：一起收起
  chip.dispatchEvent('click')
  await env.tick()
  assert(r1.style.display === 'none' && r2.style.display === 'none', '同一块内两条命令行一起收起', `r1=${r1.style.display} r2=${r2.style.display}`)
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 4：竞态（turn-tail 先到，工具后 done）
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 4: 竞态 turn-tail 先到 / 工具后 done ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('跑命令', user)
  const t1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'long cmd', state: 'running', parent: t1 })
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()

  assert(flow.querySelectorAll('.dshcf-processed').length === 0, '工具 running 时边界挂起（pending）')
  // 工具完成
  t1.querySelector('[data-tool]').setAttribute('data-state', 'ok')
  await env.tick()
  await env.tick()
  assert(flow.querySelectorAll('.dshcf-processed').length === 1, 'done 后恰生成一行已处理')
  // 再次 tick 不应重复
  await env.tick()
  assert(flow.querySelectorAll('.dshcf-processed').length === 1, '后续 pass 不重复插行')
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 5：宿主被替换（极端重渲染）→ 自愈、无残留
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 5: 宿主替换后自愈无残留 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('跑命令', user)
  const t1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: t1 })
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()
  assert(flow.querySelectorAll('.dshcf-processed').length === 1, '完成态一行已处理')
  assert(flow.querySelectorAll('.dshcf-chip').length === 0, '完成态 chip 未创建')

  // 模拟 React 极端重建：移除 t1 宿主，插入同结构新元素
  t1.remove()
  const t1b = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: t1b })
  // React 替换保持 seat 的逻辑位置与稳定 key，不把该回合工作移到 turn-tail 后。
  t1b.remove()
  flow.insertBefore(t1b, tail)
  register()
  await env.tick()
  await env.tick()

  assert(flow.querySelectorAll('.dshcf-chip').length === 0, '完成态无残留 chip')
  assert(flow.querySelectorAll('.dshcf-processed').length === 1, '已处理行不重复')
  flow.querySelector('.dshcf-processed').dispatchEvent('click')
  await env.tick()
  assert(flow.querySelectorAll('.dshcf-chip').length === 1, '展开后只为替换宿主创建一个 chip')
  const replacementChip = flow.querySelector('.dshcf-chip')
  replacementChip.dispatchEvent('click')
  await env.tick()
  assert(t1b.querySelector('[data-chat-call-id]').style.display === '', '替换宿主由新 chip 正确控制')
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 6：切会话（flow 整体替换）→ 无串味
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 6: 切会话 flow 替换无串味 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('回合A', user)
  const t1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmdA', parent: t1 })
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()
  assert(flow.querySelectorAll('.dshcf-processed').length === 1, '会话A完成态')

  // 切到会话 B：移除旧 flow，插入新 flow（独立元素）
  flow.remove()
  const flowB = el('div', { 'data-chat-flow': '' })
  flowB.offsetParent = {}
  flowB.setRect({ width: 800, height: 600 })
  const userB = seat(flowB, 'user', 'u1', 40)
  textNode('回合B', userB)
  const tB = seat(flowB, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'read', summary: 'cmdB', parent: tB })
  const tailB = seat(flowB, 'turn-tail', 'tt1', 24)
  textNode('用时 3秒', tailB)
  document.body.appendChild(flowB)
  register()
  await env.tick()
  await env.tick()

  assert(flowB.querySelectorAll('.dshcf-processed').length === 1, '会话B自己收尾一行')
  assert(flowB.querySelectorAll('.dshcf-chip').length === 0, '会话B完成态 chip 未创建（不串味）')
  assert(flowB.querySelectorAll('.dshcf-processed').length === 1, '旧会话的行没有被搬到新 flow')
  // 一级展开后新会话 chip 唯一正常
  flowB.querySelector('.dshcf-processed').dispatchEvent('click')
  await env.tick()
  assert(flowB.querySelectorAll('.dshcf-chip').length === 1, '新会话 chip 正常')
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 7：stop() 完整性
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 7: stop() 完整还原 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('跑命令', user)
  const t1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: t1 })
  const final = seat(flow, 'assistant-step', 'a1', 80)
  addThink(final, { summary: '想' })
  addBodyText(final, '正文')
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  const status = el('div', { role: 'status' }, flow)
  textNode('Deep diving...', status)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()
  // 制造一些展开态
  flow.querySelector('.dshcf-processed').dispatchEvent('click')
  await env.tick()
  flow.querySelector('.dshcf-chip').dispatchEvent('click')
  await env.tick()

  const { cleanup: stop } = { cleanup: () => cleanup?.() }
  stop()

  const row = t1.querySelector('[data-chat-call-id]')
  assert(row.style.display === '', '工具行还原')
  assert(t1.style.display === '', '工具 seat 还原')
  assert(final.style.display === '', '最终宿主还原')
  assert(flow.querySelectorAll('.dshcf-chip').length === 0, 'chip 全部移除')
  assert(flow.querySelectorAll('.dshcf-processed').length === 0, '已处理行移除')
  assert(document.getElementById('dshcf-style') === null, 'style 移除')
  assert(status.textContent.includes('Deep diving'), 'Deep sleeping... 还原为 Deep diving')
  env.clearTimers()
}

// ---------------------------------------------------------------------------
// 场景 8.5：整分/整小时时长格式（15分00秒 → 15分）
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 8.5: 整分时长省略秒位 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('跑命令', user)
  const t1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: t1 })
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 15分00秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()
  const row = flow.querySelector('.dshcf-processed')
  assert(row !== null, '整分回合生成已处理行')
  assert(row.textContent.includes('已处理 15分'), '整分省略秒位（15分00秒 → 15分）', row.textContent)
  assert(!row.textContent.includes('00秒'), '不残留 00秒', row.textContent)
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 9：纯文本回合不生成一级行（产品语义）
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 8: 纯文本回合无一级行 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('嗨', user)
  const final = seat(flow, 'assistant-step', 'a1', 60)
  addBodyText(final, '你好')
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()
  assert(flow.querySelectorAll('.dshcf-processed').length === 0, '无 think/tool 回合不生成已处理行')
  assert(final.style.display === '', '纯文本最终输出可见')
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 10：完成态收尾时最终输出正文尚未渲染（流式竞态），正文后到应恢复
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 10: 收尾时正文未渲染，正文后到恢复显示 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('问个问题', user)
  const t1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: t1 })
  const final = seat(flow, 'assistant-step', 'a1', 60)
  addThink(final, { summary: '想' }) // 有 think 无正文（正文尚未流式到达）
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()
  assert(final.style.display === 'none', '收尾时正文未渲染 → 宿主隐藏', `display=${final.style.display}`)
  // 正文流式渲染进来
  addBodyText(final, '最终正文')
  register()
  await env.tick()
  await env.tick()
  assert(final.style.display === '', '正文渲染后宿主恢复显示', `display=${final.style.display}`)
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 10b：正文缓存定向失效（生产路径）——带 target 的 mutation 记录命中
// 宿主消息后，下一 pass 必须重算正文判定并恢复显示（空批次兜底之外的
// 细粒度路径；同时验证未命中的其他消息缓存不被无谓丢弃）。
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 10b: mutation 记录定向失效正文缓存 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('问个问题', user)
  const t1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: t1 })
  const final = seat(flow, 'assistant-step', 'a1', 60)
  addThink(final, { summary: '想' }) // 有 think 无正文 → 宿主隐藏且缓存 false
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()
  assert(final.style.display === 'none', '收尾时正文未渲染 → 宿主隐藏', `display=${final.style.display}`)
  // 正文流式渲染进来，并投递一条指向新文本节点的真实形状 mutation 记录；
  // 只刷 rAF 不走 tick()——tick 自带的空批次通知会触发全量兜底，
  // 掩盖定向失效路径的回归。
  const markdown = addBodyText(final, '最终正文')
  const text = markdown.childNodes[0]
  register()
  env.notifyMutations([{ target: text }])
  env.flushRaf()
  await new Promise(r => setTimeout(r, 5))
  env.flushRaf()
  assert(final.style.display === '', '定向失效后宿主恢复显示', `display=${final.style.display}`)
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 11：流式空 seat（assistant-step 占位，无 think 无正文）不打断工具组合并
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 11: 空 seat 不打断工具组合并 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('跑命令', user)
  const t1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd1', parent: t1 })
  // 流式早期无内容的 assistant-step 占位（有 key、无 think、无正文）
  seat(flow, 'assistant-step', 's-empty', 0)
  const t2 = seat(flow, 'tool-call', 't2', 30)
  makeToolRow({ callId: 'call:2', tool: 'read', summary: 'cmd2', parent: t2 })
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()
  const row = flow.querySelector('.dshcf-processed')
  assert(row !== null, '完成态生成已处理行')
  row.dispatchEvent('click')
  await env.tick()
  assert(flow.querySelectorAll('.dshcf-chip').length === 1, '空 seat 未断开工具组（恰一个 chip）', `chips=${flow.querySelectorAll('.dshcf-chip').length}`)
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 12：顶部 context（permission/user-approval）独立成二级块
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 12: context 独立成二级块 ===')
  const { env, document, flow, register, cleanup } = boot()
  const ctx1 = seat(flow, 'context', 'c1', 30)
  const d1 = el('div', { 'data-disclosure-row': '' }, ctx1)
  el('span', { class: 'leading' }, d1)
  el('span', { class: 'title', text: 'permission preset' }, d1)
  el('span', { class: 'sep' }, d1)
  el('span', { class: 'summary', text: 'danger-full-access' }, d1)
  const ctx2 = seat(flow, 'context', 'c2', 30)
  const d2 = el('div', { 'data-disclosure-row': '' }, ctx2)
  el('span', { class: 'leading' }, d2)
  el('span', { class: 'title', text: '上下文注入' }, d2)
  el('span', { class: 'sep' }, d2)
  el('span', { class: 'summary', text: 'user-approval' }, d2)
  const user = seat(flow, 'user', 'u1', 40)
  textNode('干活', user)
  const t1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: t1 })
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()
  const row = flow.querySelector('.dshcf-processed')
  assert(row !== null, '完成态生成已处理行')
  assert(ctx1.style.display === 'none' && ctx2.style.display === 'none', '完成态 context 随一级折叠', `c1=${ctx1.style.display} c2=${ctx2.style.display}`)
  row.dispatchEvent('click')
  await env.tick()
  const chips = flow.querySelectorAll('.dshcf-chip')
  assert(chips.length === 2, '两个 chip：context 块 + 工具块', `chips=${chips.length}`)
  const ctxChip = [...chips].find(c => c.textContent.includes('上下文注入'))
  assert(ctxChip !== undefined, '存在上下文注入 chip')
  assert(ctx1.style.display === 'none' && ctx2.style.display === 'none', '一级展开后 context 仍折叠（二级收起态）', `c1=${ctx1.style.display} c2=${ctx2.style.display}`)
  ctxChip.dispatchEvent('click') // 展开二级
  await env.tick()
  assert(ctx1.style.display === '' && ctx2.style.display === '', '二级展开后 context 显示', `c1=${ctx1.style.display} c2=${ctx2.style.display}`)
  ctxChip.dispatchEvent('click') // 收起
  await env.tick()
  assert(ctx1.style.display === 'none' && ctx2.style.display === 'none', '二级收起后两个 context 一起隐藏', `c1=${ctx1.style.display} c2=${ctx2.style.display}`)
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 13：多回合——回合 1 顶部 context 归回合 1，回合 2 收尾不跨用户消息
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 13: context 不跨回合折叠 ===')
  const { env, document, flow, register, cleanup } = boot()
  const ctx1 = seat(flow, 'context', 'c1', 30)
  const d1 = el('div', { 'data-disclosure-row': '' }, ctx1)
  el('span', { class: 'leading' }, d1)
  el('span', { class: 'title', text: '上下文注入' }, d1)
  el('span', { class: 'sep' }, d1)
  el('span', { class: 'summary', text: 'permission' }, d1)
  const user1 = seat(flow, 'user', 'u1', 40)
  textNode('回合1', user1)
  const t1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd1', parent: t1 })
  const tail1 = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail1)
  const user2 = seat(flow, 'user', 'u2', 40)
  textNode('回合2', user2)
  const t2 = seat(flow, 'tool-call', 't2', 30)
  makeToolRow({ callId: 'call:2', tool: 'read', summary: 'cmd2', parent: t2 })
  const tail2 = seat(flow, 'turn-tail', 'tt2', 24)
  textNode('用时 3秒', tail2)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()
  const rows = flow.querySelectorAll('.dshcf-processed')
  assert(rows.length === 2, '两个回合各一行已处理', `rows=${rows.length}`)
  // 回合 2 的行（第二个）不应控制回合 1 的 context
  rows[1].dispatchEvent('click')
  await env.tick()
  rows[1].dispatchEvent('click')
  await env.tick()
  assert(ctx1.style.display === 'none', '回合 2 展开/收起不影响回合 1 的 context', `c1=${ctx1.style.display}`)
  // 展开回合 1 的行：context 归属回合 1（二级仍收起 → 元素隐藏，chip 存在）
  rows[0].dispatchEvent('click')
  await env.tick()
  assert(ctx1.style.display === 'none', '回合 1 展开后 context 由二级 chip 控制（仍收起）', `c1=${ctx1.style.display}`)
  const ctxChip = [...flow.querySelectorAll('.dshcf-chip')].find(c => c.textContent.includes('上下文注入'))
  assert(ctxChip !== undefined, '回合 1 展开后有上下文注入 chip')
  ctxChip.dispatchEvent('click')
  await env.tick()
  assert(ctx1.style.display === '', '回合 1 的 context 二级展开后显示', `c1=${ctx1.style.display}`)
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 16：历史会话分批渲染——turn-tail 先收尾、回合内正文后挂载 → 补折叠
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 16: 分批渲染后到正文补折叠 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('问', user)
  const t1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: t1 })
  const mid = seat(flow, 'assistant-step', '14:assistant-step2:75', 60)
  addThink(mid, { summary: '中间思考' })
  addBodyText(mid, '中间正文（分批渲染后到）')
  const tail = seat(flow, 'turn-tail', '9:turn-tail2', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()
  // 此时 mid 是回合内最后一个有正文 → 保持显示（等待最终输出确认）
  assert(mid.style.display === '', '最终输出未到时中间正文保持显示', `mid=${mid.style.display}`)
  // 最终输出后挂载（分批渲染：DOM 位置在 turn-tail 前、回合内）
  const final = seat(flow, 'assistant-step', '14:assistant-step2:98', 60)
  addThink(final, { summary: '最终思考' })
  addBodyText(final, '最终正文')
  tail.before(final)
  register()
  await env.tick()
  await env.tick()
  assert(mid.style.display === 'none', '最终输出挂载后中间正文补折叠', `mid=${mid.style.display}`)
  assert(final.style.display === '', '最终输出正文显示', `final=${final.style.display}`)
  // 一级展开后中间正文恢复
  const row = flow.querySelector('.dshcf-processed')
  row.dispatchEvent('click')
  await env.tick()
  assert(mid.style.display === '', '一级展开后中间正文恢复', `mid=${mid.style.display}`)
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 17：分批渲染 steering 伪首边界（subagent 现场复现）——前序批次后挂载
// 时 steering 完成收尾，中段正文折叠进一级行（修复前：永不收尾、暴露）
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 17: steering 伪首边界分批渲染收尾 ===')
  const { env, document, flow, register, cleanup } = boot()
  // 批次 2（先挂载）：steering → 工具 → 中段正文 → 最终正文 → turn-tail
  const steering = seat(flow, 'steering', 'st1', 40)
  textNode('send_message · 请现在继续执行', steering)
  const tool1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: tool1 })
  const mid2 = seat(flow, 'assistant-step', 'm2', 80)
  addThink(mid2, { summary: '中段思考2' })
  addBodyText(mid2, '中段正文2')
  const final2 = seat(flow, 'assistant-step', 'f2', 80)
  addBodyText(final2, '批次2最终正文')
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()

  // 批次 1（后挂载，插到 steering 前）：user → 两条中段正文
  const user = seat(flow, 'user', 'u1', 40)
  textNode('触发任务', user)
  const mid1 = seat(flow, 'assistant-step', 'm1', 80)
  addThink(mid1, { summary: '中段思考1' })
  addBodyText(mid1, '中段正文1')
  const mid1b = seat(flow, 'assistant-step', 'm1b', 80)
  addThink(mid1b, { summary: '中段思考1b' })
  addBodyText(mid1b, '中段正文1b')
  flow.insertBefore(user, steering)
  flow.insertBefore(mid1, steering)
  flow.insertBefore(mid1b, steering)
  register()
  await env.tick()
  await env.tick()

  const rows = () => flow.querySelectorAll('.dshcf-processed')
  assert(rows().length === 2, 'steering 伪首边界最终收尾：两段各一行（修复前永不收尾）', `rows=${rows().length}`)
  assert(mid1.style.display === 'none', '批次1中间正文 mid1 折叠（修复前暴露）', `mid1=${mid1.style.display}`)
  assert(mid1b.style.display === '', '批次1最终正文 mid1b 显示（最终输出不折叠）', `mid1b=${mid1b.style.display}`)
  assert(mid2.style.display === 'none', '批次2中间正文 mid2 折叠', `mid2=${mid2.style.display}`)
  assert(final2.style.display === '', '批次2最终正文 final2 显示', `final2=${final2.style.display}`)
  assert(tool1.style.display === 'none', '批次2工具折叠', `tool1=${tool1.style.display}`)
  // 一级展开批次1的行（第一个）：正文恢复
  rows()[0].dispatchEvent('click')
  await env.tick()
  assert(mid1.style.display === '' && mid1b.style.display === '', '展开批次1行：中段正文恢复', `mid1=${mid1.style.display} mid1b=${mid1b.style.display}`)
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 17b：steering 前无 user/steering（其 user 在前序未加载批次）——
// steering 不是"真·首"（前面有同回合中段内容），必须收尾前段
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 17b: steering 前无 user（回合中段截断） ===')
  const { env, document, flow, register, cleanup } = boot()
  // 批次 2（先挂载）：steering → 工具 → 中段正文 → 最终正文 → turn-tail
  const steering = seat(flow, 'steering', 'st1', 40)
  textNode('send_message · 请继续', steering)
  const tool1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: tool1 })
  const mid2 = seat(flow, 'assistant-step', 'm2', 80)
  addThink(mid2, { summary: '中段思考2' })
  addBodyText(mid2, '中段正文2')
  const final2 = seat(flow, 'assistant-step', 'f2', 80)
  addBodyText(final2, '批次2最终正文')
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()

  // 批次 1（后挂载，插到 steering 前）：无 user——两条中段正文
  const mid1 = seat(flow, 'assistant-step', 'm1', 80)
  addThink(mid1, { summary: '中段思考1' })
  addBodyText(mid1, '中段正文1')
  const mid1b = seat(flow, 'assistant-step', 'm1b', 80)
  addThink(mid1b, { summary: '中段思考1b' })
  addBodyText(mid1b, '中段正文1b')
  flow.insertBefore(mid1, steering)
  flow.insertBefore(mid1b, steering)
  register()
  await env.tick()
  await env.tick()

  const rows = () => flow.querySelectorAll('.dshcf-processed')
  assert(rows().length === 2, 'steering 收尾前段：两段各一行（修复前永不收尾）', `rows=${rows().length}`)
  assert(mid1.style.display === 'none', '前段中间正文 mid1 折叠（修复前暴露）', `mid1=${mid1.style.display}`)
  assert(mid1b.style.display === '', '前段最后正文 mid1b 显示（最终输出不折叠）', `mid1b=${mid1b.style.display}`)
  assert(mid2.style.display === 'none', '后段中间正文 mid2 折叠', `mid2=${mid2.style.display}`)
  assert(final2.style.display === '', '后段最终正文 final2 显示', `final2=${final2.style.display}`)
  // 一级展开前段行：中段正文恢复
  rows()[0].dispatchEvent('click')
  await env.tick()
  assert(mid1.style.display === '' && mid1b.style.display === '', '展开前段行：中段正文恢复', `mid1=${mid1.style.display} mid1b=${mid1b.style.display}`)
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 18：每个回合的最终输出保持显示（中间正文折叠、最终输出不折叠）
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 18: 最终输出保持显示（各回合） ===')
  const { env, document, flow, register, cleanup } = boot()
  // 回合 1
  const user1 = seat(flow, 'user', 'u1', 40)
  textNode('回合1', user1)
  const tool1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd1', parent: tool1 })
  const mid1 = seat(flow, 'assistant-step', 'm1', 80)
  addBodyText(mid1, '回合1过程正文')
  const final1 = seat(flow, 'assistant-step', 'f1', 80)
  addBodyText(final1, '回合1最终正文')
  const tail1 = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail1)
  // 回合 2
  const user2 = seat(flow, 'user', 'u2', 40)
  textNode('回合2', user2)
  const tool2 = seat(flow, 'tool-call', 't2', 30)
  makeToolRow({ callId: 'call:2', tool: 'read', summary: 'cmd2', parent: tool2 })
  const final2 = seat(flow, 'assistant-step', 'f2', 80)
  addBodyText(final2, '回合2最终正文')
  const tail2 = seat(flow, 'turn-tail', 'tt2', 24)
  textNode('用时 3秒', tail2)
  // 回合 3（最新）
  const user3 = seat(flow, 'user', 'u3', 40)
  textNode('回合3', user3)
  const tool3 = seat(flow, 'tool-call', 't3', 30)
  makeToolRow({ callId: 'call:3', tool: 'grep', summary: 'cmd3', parent: tool3 })
  const final3 = seat(flow, 'assistant-step', 'f3', 80)
  addBodyText(final3, '回合3最终正文')
  const tail3 = seat(flow, 'turn-tail', 'tt3', 24)
  textNode('用时 1秒', tail3)
  document.body.appendChild(flow)
  register()
  await env.tick()
  await env.tick()

  const rows = () => flow.querySelectorAll('.dshcf-processed')
  assert(rows().length === 3, '三个回合各一行', `rows=${rows().length}`)
  assert(mid1.style.display === 'none', '回合1中间正文折叠')
  assert(final1.style.display === '', '回合1最终输出显示（历史回合不折叠最终输出）', `f1=${final1.style.display}`)
  assert(final2.style.display === '', '回合2最终输出显示', `f2=${final2.style.display}`)
  assert(final3.style.display === '', '回合3最终输出显示', `f3=${final3.style.display}`)
  // 新回合 4 出现：之前的最终输出仍显示
  const user4 = seat(flow, 'user', 'u4', 40)
  textNode('回合4', user4)
  const final4 = seat(flow, 'assistant-step', 'f4', 80)
  addBodyText(final4, '回合4最终正文')
  const tail4 = seat(flow, 'turn-tail', 'tt4', 24)
  textNode('用时 2秒', tail4)
  register()
  await env.tick()
  await env.tick()
  assert(final3.style.display === '', '新回合出现后回合3最终输出仍显示', `f3=${final3.style.display}`)
  assert(final4.style.display === '', '回合4最终输出显示', `f4=${final4.style.display}`)
  // 一级展开回合1行：过程正文恢复
  rows()[0].dispatchEvent('click')
  await env.tick()
  assert(mid1.style.display === '', '展开回合1行：中间正文恢复', `mid1=${mid1.style.display}`)
  cleanup()
}

console.log(`\n${failures === 0 ? '[ALL PASS]' : `[${failures} FAILURE(S)]`}`)
process.exitCode = failures === 0 ? 0 : 1
