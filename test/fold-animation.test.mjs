/**
 * fold-animation.test.mjs — issue #2 动画回归（Phase 1 展开方向 + Phase 2 收起方向）。
 *
 * 覆盖：手势门控（点击才动画）、WAAPI stub 结算与 oncancel/reject 契约、
 * 同向跳过、反向仲裁（cancel + 终态 + 异步派发断言）、switchFlow 清理、
 * reduced-motion / 无 WAAPI 降级、merged-body 高度动画样板（含
 * marginBottom 关键帧与内联清理）、过期删守卫路径、断连清扫、stop() 清理；
 * Phase 2：一级收起 seat 高度动画 + gap 补偿值（-rowGap）、二级内部行收起
 * 无补偿（分层规则）、祖先 seat 在途跳过后代申请、反向取消同步清锁高内联。
 *
 * 用法：node test/fold-animation.test.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { installDomGlobals, el, textNode, makeToolRow, makeThinkRow } from './fake-dom.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const code = readFileSync(join(root, 'lib/client.js'), 'utf8')

let failures = 0
function assert(cond, label, extra = '') {
  const ok = Boolean(cond)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && extra ? `  (${extra})` : ''}`)
  if (!ok) failures++
}

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
  return {
    env, document, flow, register,
    /** 仅触发 client teardown（controller.stop()），不清桩定时器——
     *  stop 的异步 oncancel 派发需要随后手动排空。 */
    teardown: () => { cleanup?.() },
    /** teardown + 清空全部桩定时器（场景收尾用）。 */
    cleanup: () => { cleanup?.(); env.clearTimers() },
  }
}

function seat(flow, kind, key, h) {
  const s = el('div', { 'data-chat-anchor-key': key, 'data-chat-flow-kind': kind, class: 'flowItem' }, flow)
  s.setRect({ height: h })
  return s
}

function addBodyText(seatEl, text) {
  const md = el('div', { class: 'assistant-markdown-root' }, seatEl)
  const body = el('div', { class: 'assistant-markdown-body' }, md)
  const markdown = el('div', { class: 'markdown' }, body)
  textNode(text, markdown)
  return markdown
}

/** 标准回合：user + 中间正文(a1) + 工具(t1) + 最终正文(a2) + tail。
 * 完成收起后，a1 是 middleStep（隐藏），t1 是块宿主（隐藏）。 */
function buildTurn(flow) {
  const user = seat(flow, 'user', 'u1', 40)
  textNode('问个问题', user)
  const a1 = seat(flow, 'assistant-step', 'a1', 60)
  addBodyText(a1, '中间正文')
  const t1 = seat(flow, 'tool-call', 't1', 30)
  const row = makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: t1 })
  const a2 = seat(flow, 'assistant-step', 'a2', 60)
  addBodyText(a2, '最终正文')
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  return { a1, t1, row, a2 }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// 场景 A：手势展开 → reveal 动画创建于 middleStep；排空后终态正确、可再收起
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 A: 手势展开创建 reveal 动画 ===')
  const { env, document, flow, register, cleanup } = boot()
  const { a1 } = buildTurn(flow)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  assert(a1.style.display === 'none', '完成态中间正文隐藏')
  flow.querySelector('.dshcf-processed').dispatchEvent('click')
  env.flushRaf()
  assert((a1._animations?.length ?? 0) === 1, 'middleStep 创建 1 个 reveal 动画', `got ${a1._animations?.length ?? 0}`)
  assert(a1.style.display === '', '占位即刻出现')
  await env.tick()
  assert(a1.style.display === '', 'onfinish 后保持显示')
  // 账本对齐黑盒验证：随后收起立即生效（无粘滞）
  flow.querySelector('.dshcf-processed').dispatchEvent('click')
  await env.tick()
  assert(a1.style.display === 'none', '再次收起立即生效')
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 B：同向跳过——reveal 在途重复 pass 不新增动画
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 B: 同向跳过 ===')
  const { env, document, flow, register, cleanup } = boot()
  const { a1 } = buildTurn(flow)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  flow.querySelector('.dshcf-processed').dispatchEvent('click')
  env.flushRaf()
  const count = a1._animations.length
  env.notifyMutations([])
  env.flushRaf()
  assert(a1._animations.length === count, '在途时重复 pass 不新增动画', `got ${a1._animations.length}`)
  await sleep(5)
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 C：反向仲裁——展开在途点击收起 → 立即隐藏 + 旧动画取消
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 C: 反向仲裁 cancel+终态 ===')
  const { env, document, flow, register, cleanup } = boot()
  const { a1 } = buildTurn(flow)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  const processed = flow.querySelector('.dshcf-processed')
  processed.dispatchEvent('click')
  env.flushRaf()
  const revealAnim = a1._animations[0]
  // 桩契约前置登记：finished 必须在 cancel 时 reject（WAAPI 语义）
  let finishedRejected = false
  revealAnim.finished.catch(() => { finishedRejected = true })
  // v11：手势收起 = 渐隐（镜像 reveal），无几何锁、非瞬切
  processed.dispatchEvent('click')
  env.flushRaf()
  const collapseAnim = a1._animations[1]
  assert(collapseAnim !== undefined, '手势收起创建渐隐动画')
  assert(collapseAnim.keyframes[1].opacity === '0', '收起关键帧淡出到 0')
  assert(a1.style.display === '', '收起动画期间保持显示（非瞬切）')
  assert(a1.style.height === '' && a1.style.overflow === '', '无几何锁（卷帘方案已弃用）')
  // 收起在途反向展开：同步 cancel + 立即写终态可见
  processed.dispatchEvent('click')
  env.flushRaf()
  assert(collapseAnim._done === true, '旧收起动画已取消')
  assert(a1.style.display === '', '冲突方向立即写终态可见')
  await sleep(5)
  assert(collapseAnim._cancelDispatched === true, '桩契约：cancel 异步派发 oncancel（防桩回归掏空守卫覆盖）')
  assert(finishedRejected, '桩契约：finished 在 cancel 时 reject')
  assert(a1.style.display === '', '异步 oncancel 排空后终态不变')
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 D：reduced-motion → 瞬时展开，零动画
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 D: reduced-motion 降级 ===')
  const { env, document, flow, register, cleanup } = boot()
  const { a1 } = buildTurn(flow)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  const realMatchMedia = globalThis.matchMedia
  globalThis.matchMedia = (q) => ({ matches: true, media: q })
  try {
    flow.querySelector('.dshcf-processed').dispatchEvent('click')
    env.flushRaf()
    assert((a1._animations?.length ?? 0) === 0, 'reduced-motion 下不创建动画')
    assert(a1.style.display === '', '瞬时恢复显示')
  } finally {
    globalThis.matchMedia = realMatchMedia
  }
  await sleep(5)
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 E：无 WAAPI（删除 el.animate）→ 降级瞬时
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 E: 无 WAAPI 降级 ===')
  const { env, document, flow, register, cleanup } = boot()
  const { a1 } = buildTurn(flow)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  const proto = Object.getPrototypeOf(a1)
  const savedAnimate = proto.animate
  delete proto.animate
  try {
    flow.querySelector('.dshcf-processed').dispatchEvent('click')
    env.flushRaf()
    assert((a1._animations?.length ?? 0) === 0, '无 WAAPI 不创建动画')
    assert(a1.style.display === '', '瞬时恢复显示')
  } finally {
    proto.animate = savedAnimate
  }
  await sleep(5)
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 F：switchFlow 取消在途动画
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 F: switchFlow 清理在途动画 ===')
  const { env, document, flow, register, cleanup } = boot()
  const { a1 } = buildTurn(flow)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  flow.querySelector('.dshcf-processed').dispatchEvent('click')
  env.flushRaf()
  const anim = a1._animations[0]
  // 切会话：旧 flow 整体 detach，新 flow 挂入
  const newFlow = el('div', { 'data-chat-flow': '' })
  newFlow.offsetParent = {}
  newFlow.setRect({ width: 800, height: 600 })
  document.body.appendChild(newFlow)
  flow.remove()
  register()
  await env.tick()
  assert(anim._done === true, '在途动画被 switchFlow 取消', `done=${anim._done}`)
  assert(a1.style.display === '', '旧 flow 元素被完整还原', `display=${JSON.stringify(a1.style.display)}`)
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 G：merged-body 展开高度动画样板（含 marginBottom 关键帧 + 内联清理）
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 G: merged-body 高度动画样板 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('想一下', user)
  const thinkSeat = seat(flow, 'assistant-step', 'a1', 80)
  const md = el('div', { class: 'assistant-markdown-root' }, thinkSeat)
  const body = el('div', { class: 'assistant-markdown-body' }, md)
  makeThinkRow({ summary: '第一段思考', parent: body })
  makeThinkRow({ summary: '第二段思考', parent: body })
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 3秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  // 收起完成态不渲染 chip：先点一级行展开，chip 才会出现
  flow.querySelector('.dshcf-processed').dispatchEvent('click')
  await env.tick()
  const chip = thinkSeat.querySelector('.dshcf-chip')
  assert(chip !== null, '一级展开后 chip 出现')
  // 一级展开是手势：thinkSeat 宿主带动画，chip 在其内部随宿主淡入（不叠加）
  assert((thinkSeat._animations?.length ?? 0) === 1, '宿主带 1 个 reveal', `got ${thinkSeat._animations?.length ?? 0}`)
  assert((chip._animations?.length ?? 0) === 0, '宿主内部 chip 不叠加独立动画', `got ${chip._animations?.length ?? 0}`)
  chip.dispatchEvent('click')
  await env.tick()
  const mergedBtn = thinkSeat.querySelector('.dshcf-merged-think')
  assert(mergedBtn !== null, '连续思考合并行出现')
  assert((mergedBtn._animations?.length ?? 0) === 1, '合并行出现带视觉 reveal', `got ${mergedBtn._animations?.length ?? 0}`)
  // gBCR 桩默认高度 0：仅对 merged-body 放大，模拟真实布局高度
  const origGBCR = Object.getPrototypeOf(mergedBtn).getBoundingClientRect
  Object.getPrototypeOf(mergedBtn).getBoundingClientRect = function () {
    const r = origGBCR.call(this)
    if (this.classList?.contains('dshcf-merged-body')) return { ...r, height: 42 }
    return r
  }
  try {
    mergedBtn.dispatchEvent('click')
    const mergedBody = mergedBtn.nextElementSibling
    assert(mergedBody !== null && mergedBody.classList.contains('dshcf-merged-body'), '内容块创建')
    assert((mergedBody._animations?.length ?? 0) === 1, '内容块创建 1 个高度动画')
    const anim = mergedBody._animations[0]
    assert(anim.keyframes[1].marginBottom === '16px', '关键帧含 marginBottom 0→16 终值')
    assert(mergedBody.style.height === '0px', '锁高起步')
    await env.tick()
    assert(mergedBody.style.height === '', 'onfinish 清内联锁高')
    assert(mergedBody.style.overflow === '' && mergedBody.style.marginBottom === '', 'overflow/margin 一并清理')
  } finally {
    Object.getPrototypeOf(mergedBtn).getBoundingClientRect = origGBCR
  }
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 H：过期删守卫——cancel 后同元素立刻起新动画，旧 oncancel 异步触发
// 不得影响新动画记录（行为级：全序列状态一致、新动画正常结算）
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 H: 过期删守卫路径 ===')
  const { env, document, flow, register, cleanup } = boot()
  const { a1 } = buildTurn(flow)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  const processed = flow.querySelector('.dshcf-processed')
  processed.dispatchEvent('click')
  env.flushRaf()                    // 动画 A 在途
  processed.dispatchEvent('click')  // 手势收起：高度动画起步（Phase 2 非瞬切）
  env.flushRaf()
  processed.dispatchEvent('click')  // 再展开：仲裁取消收起动画 + 动画 B
  env.flushRaf()
  assert((a1._animations?.length ?? 0) === 3, '第二次展开创建新动画 B', `got ${a1._animations?.length ?? 0}`)
  await sleep(10)                   // 排空 A/收起 的异步 oncancel 与 B 的 onfinish
  assert(a1.style.display === '', 'B 结算后保持显示')
  assert(a1._animations.every(a => a._done === true), '全部动画已结算')
  // 桩契约：A/收起 走 cancel 派发、B 走自然 finish——两条路径都被真实执行
  assert(a1._animations[0]._cancelDispatched === true, 'A 经 cancel 路径派发 oncancel')
  assert(a1._animations[1]._cancelDispatched === true, '收起动画经反向仲裁取消')
  assert(a1._animations[2]._cancelDispatched === false, 'B 经自然 finish 路径（未派发 oncancel）')
  processed.dispatchEvent('click')
  await env.tick()
  assert(a1.style.display === 'none', '后续收起结算为隐藏（账本未粘滞）')
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 I：断连清扫——在途动画元素脱离文档后，pass() 移除其 pendingAnims 条目；
// 后续全流程（重挂、收起、展开）保持一致。行为级冒烟：清扫路径真实执行且无残留影响
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 I: 断连清扫 ===')
  const { env, document, flow, register, cleanup } = boot()
  const { a1 } = buildTurn(flow)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  flow.querySelector('.dshcf-processed').dispatchEvent('click')
  env.flushRaf()                    // 动画 A 在途
  a1.remove()                       // 元素断连（flow 不变）
  register()
  await env.tick(); await env.tick()// pass 清扫条目；A 的 finish 守卫空转
  assert(a1.isConnected === false, '元素保持断连')
  // 重挂后全周期仍正常：清扫不留粘滞账本
  flow.insertBefore(a1, flow.children[1] ?? null)
  register()
  await env.tick()
  const processed = flow.querySelector('.dshcf-processed')
  processed.dispatchEvent('click')  // 收起
  await env.tick()
  assert(a1.style.display === 'none', '清扫后收起立即生效')
  processed.dispatchEvent('click')  // 再展开
  await env.tick()
  assert(a1.style.display === '', '清扫后再展开正常')
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 J：stop() 清理——在途动画全量 cancel、显示完整还原、disposed 后不再响应
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 J: stop 清理 ===')
  const { env, document, flow, register, teardown } = boot()
  const { a1 } = buildTurn(flow)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  flow.querySelector('.dshcf-processed').dispatchEvent('click')
  env.flushRaf()
  const anim = a1._animations[0]
  let finishedRejected = false
  anim.finished.catch(() => { finishedRejected = true })
  teardown()                        // client teardown → controller.stop()
  await sleep(5)                    // 排空异步 oncancel 派发（未被 clearTimers 吞掉）
  assert(anim._done === true, 'stop 取消在途动画')
  assert(anim._cancelDispatched === true, 'stop 路径同样派发 oncancel')
  assert(finishedRejected, 'finished 在 stop 取消时 reject')
  assert(a1.style.display === '', 'stop 还原全部受控显示')
  // disposed 后新 mutation 不再驱动 pass：不生成折叠行
  const t9 = seat(flow, 'tool-call', 't9', 30)
  makeToolRow({ callId: 'call:9', tool: 'pwsh', summary: 'x', parent: t9 })
  register()
  await env.tick(); await env.tick()
  assert(flow.querySelector('.dshcf-processed') === null, 'disposed 后不再生成折叠行')
  env.clearTimers()
}


// ---------------------------------------------------------------------------
// 场景 K：插件全资元素（chip）的视觉 reveal——手势出现带动画、
// reduced-motion 瞬时、协调器路径瞬时、收起再现可重复动画
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 K: chip 视觉 reveal ===')
  const { env, document, flow, register, cleanup } = boot()
  const { t1 } = buildTurn(flow)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  const processed = flow.querySelector('.dshcf-processed')
  // mount='inside' 的 chip 随动画宿主一起淡入（不叠加独立动画）
  processed.dispatchEvent('click')   // 手势展开：宿主动画，chip 随宿主
  env.flushRaf()
  let chip = t1.querySelector('.dshcf-chip')
  assert(chip !== null, 'chip 已挂载')
  assert((t1._animations?.length ?? 0) === 1, '手势展开：宿主带 1 个 reveal', `got ${t1?._animations?.length ?? 0}`)
  assert((chip._animations?.length ?? 0) === 0, '宿主内部 chip 不叠加独立动画', `got ${chip?._animations?.length ?? 0}`)
  await env.tick()
  // 收起（chip 隐藏）→ 再展开：宿主可重复动画
  // 收起：手势路径走渐隐动画，无几何锁，结算后隐藏
  processed.dispatchEvent('click')
  env.flushRaf()
  assert((t1._animations?.length ?? 0) === 2, '一级收起创建渐隐动画', `got ${t1._animations?.length ?? 0}`)
  assert(t1.style.height === '' && t1.style.overflow === '', '收起不写几何锁')
  await env.tick()
  assert(chip.style.display === 'none', '一级收起后 chip 隐藏')
  assert(t1.style.display === 'none', '一级收起结算为隐藏')
  processed.dispatchEvent('click')
  env.flushRaf()
  assert((t1._animations?.length ?? 0) === 3, '再次出现时宿主重新动画', `got ${t1._animations?.length ?? 0}`)
  await env.tick()
  // reduced-motion：收起/展开均瞬时零动画
  const realMatchMedia = globalThis.matchMedia
  globalThis.matchMedia = (q) => ({ matches: true, media: q })
  try {
    processed.dispatchEvent('click')
    await env.tick()
    processed.dispatchEvent('click')
    env.flushRaf()
    assert((t1._animations?.length ?? 0) === 3, 'reduced-motion 下宿主不动画')
    assert(chip.style.display === '', 'reduced-motion 下 chip 瞬时出现')
  } finally {
    globalThis.matchMedia = realMatchMedia
  }
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 K2：flow 级 context chip 收起未结算时再次展开，不能被旧 fade 隐藏
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 K2: context + 已思考二级 chip 反向仲裁 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('问个问题', user)
  const context = seat(flow, 'context', 'c1', 30)
  const contextRow = el('div', { 'data-disclosure-row': '' }, context)
  el('span', { class: 'title', text: '上下文注入' }, contextRow)
  el('span', { class: 'summary', text: 'AGENTS.md' }, contextRow)
  const think = seat(flow, 'assistant-step', 'think1', 60)
  const thinkRoot = el('div', { class: 'assistant-markdown-root' }, think)
  const thinkBody = el('div', { class: 'assistant-markdown-body' }, thinkRoot)
  makeThinkRow({ summary: '已完成思考', parent: thinkBody })
  const final = seat(flow, 'assistant-step', 'final1', 60)
  addBodyText(final, '最终回答')
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  const processed = flow.querySelector('.dshcf-processed')
  assert(processed !== null, 'context + think 回合生成一级行')
  processed.dispatchEvent('click')
  await env.tick()
  const chips = () => [...flow.querySelectorAll('.dshcf-chip')]
  assert(chips().length === 2, '一级展开后有 context 与已思考两个 chip')
  const contextChip = chips().find(chip => chip.textContent.includes('上下文注入'))
  const thinkChip = chips().find(chip => chip.textContent.includes('已思考'))
  assert(contextChip !== undefined && thinkChip !== undefined, '两个 chip 类型正确')
  assert((context._animations?.length ?? 0) === 0, '二级收起的 context 原生宿主不先 reveal 再 fade')
  assert((contextChip._animations?.length ?? 0) === 1, 'context 只由独立 chip 播放 reveal')
  processed.dispatchEvent('click')
  env.flushRaf()
  assert(contextChip.style.display !== 'none', '收起动画期间 context chip 仍在 DOM')
  processed.dispatchEvent('click')
  env.flushRaf()
  assert(contextChip.style.display === '' && thinkChip.style.display === '', '未结算收起后立即再展开两个 chip 都可见')
  await env.tick()
  assert(contextChip.style.display === '' && thinkChip.style.display === '', '旧收起动画结算后不再隐藏第二个 chip')
  cleanup()
}
// ---------------------------------------------------------------------------
// 场景 L：块宿主兼 middleStep（think+正文消息）的一级展开——
// 修复前 reconcileBlock 先瞬时恢复宿主并删账本，middleSteps 动画路径
// early-return，导致「第一次正文输出」瞬现；修复后宿主走动画路径，
// 且 chip reveal 被跳过（防双重淡入）
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 L: 块宿主兼 middleStep ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('问个问题', user)
  const mid = seat(flow, 'assistant-step', 'a1', 90)
  const md = el('div', { class: 'assistant-markdown-root' }, mid)
  const bd = el('div', { class: 'assistant-markdown-body' }, md)
  const thinkRow = makeThinkRow({ summary: '思考一下', parent: bd })
  addBodyText(mid, '第一次正文输出')
  const t1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: t1 })
  const a2 = seat(flow, 'assistant-step', 'a2', 60)
  addBodyText(a2, '最终正文')
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  assert(mid.style.display === 'none', '完成态中间消息隐藏')
  flow.querySelector('.dshcf-processed').dispatchEvent('click')
  env.flushRaf()
  assert((mid._animations?.length ?? 0) === 1, '块宿主兼 middleStep 走动画路径', `got ${mid._animations?.length ?? 0}`)
  assert(mid.style.display === '', '宿主即刻可见')
  // 宿主在途时 chip 不叠加动画（防双重淡入）
  const chip = mid.querySelector('.dshcf-chip')
  assert(chip !== null, 'chip 已挂载')
  assert((chip._animations?.length ?? 0) === 0, '宿主在途时 chip 跳过 reveal')
  // 祖先 seat 在途仲裁：内部行同样跳过 reveal（防嵌套双重淡入，随宿主整体呈现）
  assert((thinkRow._animations?.length ?? 0) === 0, '祖先宿主在途时内部行跳过 reveal', `got ${thinkRow?._animations?.length ?? 0}`)
  await env.tick()
  assert(mid.style.display === '', '结算后保持显示')
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 M：一级手势收起——渐隐动画（镜像 reveal）、无几何锁、记账对称
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 M: 一级收起渐隐动画 ===')
  const { env, document, flow, register, cleanup } = boot()
  const { a1 } = buildTurn(flow)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  const processed = flow.querySelector('.dshcf-processed')
  processed.dispatchEvent('click')   // 展开
  await env.tick()
  processed.dispatchEvent('click')   // 手势收起
  env.flushRaf()
  const collapse = a1._animations[a1._animations.length - 1]
  assert(collapse !== undefined && collapse.keyframes[1].opacity === '0', '透明度过渡到 0')
  assert(collapse.keyframes[1].transform === 'translateY(4px)', '镜像 reveal 的微位移')
  assert(a1.style.display === '', '动画期间保持显示（非瞬切）')
  assert(a1.style.height === '' && a1.style.marginBottom === '', '无几何锁与 margin 补偿')
  await env.tick()
  assert(a1.style.display === 'none', '淡完后结算隐藏')
  // 记账对称：终态隐藏保持双条目 → 再展开仍走账本且带动画
  processed.dispatchEvent('click')
  env.flushRaf()
  assert(a1.style.display === '', '终态隐藏后账本未粘滞，可再展开')
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 N：二级 chip 收起——内部行渐隐动画、宿主不叠加动画
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 N: 二级收起内部行渐隐 ===')
  const { env, document, flow, register, cleanup } = boot()
  const { t1, row } = buildTurn(flow)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  const processed = flow.querySelector('.dshcf-processed')
  processed.dispatchEvent('click')   // 一级展开
  await env.tick()
  const chip = t1.querySelector('.dshcf-chip')
  assert(chip !== null, 'chip 已挂载')
  const hostAnimsBefore = t1._animations?.length ?? 0
  chip.dispatchEvent('click')        // 二级展开（行可见）
  await env.tick()
  chip.dispatchEvent('click')        // 二级收起（手势）
  env.flushRaf()
  const anims = row._animations ?? []
  assert(anims.length >= 1, '内部行创建收起动画', `got ${anims.length}`)
  const last = anims[anims.length - 1]
  assert(last.keyframes[1].opacity === '0', '内部行渐隐到 0')
  assert(row.style.height === '' && row.style.marginBottom === '', '内部行无几何锁与补偿')
  assert((t1._animations?.length ?? 0) === hostAnimsBefore, '宿主不叠加二级收起动画')
  await env.tick()
  assert(row.style.display === 'none', '内部行结算为隐藏')
  assert(row.style.height === '' && row.style.overflow === '', '内部行结算清锁高内联')
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 O：多 seat 块（host + container）一级收起——containers 是 flow 直接子级
// 的独立 seat，与 host 同属 seat 层，同样走渐隐收起动画（v9 评审 P1 回归：
// 漏传 animate 导致容器瞬切跳变；v11 起动画形态为渐隐）
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 O: 多 seat 块一级收起 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('问个问题', user)
  // 相邻两个工具组 seat → t2 作为 container 并入 t1 宿主的块
  const t1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: t1 })
  const t2 = seat(flow, 'tool-call', 't2', 50)
  makeToolRow({ callId: 'call:2', tool: 'read', summary: 'file', parent: t2 })
  const a2 = seat(flow, 'assistant-step', 'a2', 60)
  addBodyText(a2, '最终正文')
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  const processed = flow.querySelector('.dshcf-processed')
  processed.dispatchEvent('click')   // 一级展开
  await env.tick()
  const chip = t1.querySelector('.dshcf-chip')
  assert(chip !== null, 'chip 挂载于宿主 t1')
  chip.dispatchEvent('click')        // 二级展开（行可见，模拟用户看过详情）
  await env.tick()
  processed.dispatchEvent('click')   // 一级收起（手势）
  env.flushRaf()
  // host 与 container 都有渐隐收起动画（v11：无几何锁、无 gap 补偿）
  const hAnim = t1._animations[t1._animations.length - 1]
  const cAnim = t2._animations[t2._animations.length - 1]
  assert(t1._animations.length === 2, '宿主 reveal+收起 共 2 个动画', `got ${t1._animations.length}`)
  assert(t2._animations.length === 2, 'container reveal+收起 共 2 个动画（非瞬切）', `got ${t2._animations.length}`)
  assert(hAnim.keyframes[1].opacity === '0', '宿主渐隐到 0')
  assert(cAnim.keyframes[1].opacity === '0', 'container 渐隐到 0')
  assert(t1.style.height === '' && t2.style.height === '', '双 seat 无几何锁')
  await env.tick()
  assert(t1.style.display === 'none' && t2.style.display === 'none', '双 seat 结算为隐藏')
  cleanup()
}


// ---------------------------------------------------------------------------
// 场景 P：一级收起冻结规则——宿主渐隐时内部行不叠加动画、保持可见随整体
// 消失（v12 修复：内部瞬隐导致宿主高度骤缩的起步跳变）
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 P: 一级收起后代冻结 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('问个问题', user)
  const host = seat(flow, 'tool-call', 't1', 30)
  const row1 = makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: host })
  row1.setRect({ height: 30 })
  const t2 = seat(flow, 'tool-call', 't2', 40)
  const row2 = makeToolRow({ callId: 'call:2', tool: 'read', summary: 'file', parent: t2 })
  row2.setRect({ height: 30 })
  const a2 = seat(flow, 'assistant-step', 'a2', 60)
  addBodyText(a2, '最终正文')
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  flow.querySelector('.dshcf-processed').dispatchEvent('click')   // 一级展开
  await env.tick()
  const chip = flow.querySelector('.dshcf-chip')
  chip.dispatchEvent('click')                                      // 二级展开
  await env.tick()
  // 基线清零，隔离本手势的动画计数
  for (const s of [host, t2]) if (s._animations) s._animations.length = 0
  const rows = [row1, row2]   // 插件管理的是外层行（[data-chat-call-id]）
  for (const r of rows) if (r._animations) r._animations.length = 0
  flow.querySelector('.dshcf-processed').dispatchEvent('click')   // 一级收起（手势）
  env.flushRaf()
  // 冻结断言：行无自身动画且仍可见（随宿主整体淡出）
  for (const r of rows) assert((r._animations?.length ?? 0) === 0, '行被冻结不叠加动画', `got ${r._animations?.length ?? 0}`)
  for (const r of rows) assert(r.style.display !== 'none' && r.getBoundingClientRect().height > 0, '行在宿主渐隐期间保持可见')
  assert(host._animations.length === 1, '宿主带 1 个渐隐收起动画', `got ${host._animations.length}`)
  assert(t2._animations.length === 1, '容器 seat 独立渐隐', `got ${t2._animations.length}`)
  await env.tick()
  assert(host.style.display === 'none' && t2.style.display === 'none', '结算后全部隐藏')
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 Q：二级展开容器先行——容器行骑容器淡入（0 自身动画），宿主行自身
// 动画（4px），消除复合位移幅度不一致（v12 修复）
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 Q: 容器先行分层 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('问个问题', user)
  const host = seat(flow, 'tool-call', 't1', 30)
  const row1 = makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: host })
  const t2 = seat(flow, 'tool-call', 't2', 40)
  const row2 = makeToolRow({ callId: 'call:2', tool: 'read', summary: 'file', parent: t2 })
  row1.setRect({ height: 30 })
  row2.setRect({ height: 30 })
  const a2 = seat(flow, 'assistant-step', 'a2', 60)
  addBodyText(a2, '最终正文')
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 5秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  flow.querySelector('.dshcf-processed').dispatchEvent('click')   // 一级展开
  await env.tick()
  const chip = flow.querySelector('.dshcf-chip')
  chip.dispatchEvent('click')                                      // 二级展开
  await env.tick()
  // 基线清零后收起再展开，观察展开方向的归属
  chip.dispatchEvent('click')                                      // 二级收起
  await env.tick()
  for (const x of [host, t2, row1, row2]) if (x._animations) x._animations.length = 0
  chip.dispatchEvent('click')                                      // 二级再展开（手势）
  env.flushRaf()
  assert(t2._animations.length === 1, '容器 seat 带 1 个 reveal', `got ${t2._animations.length}`)
  assert((row2._animations?.length ?? 0) === 0, '容器内部行骑容器淡入（0 自身动画）', `got ${row2._animations?.length ?? 0}`)
  assert(row1._animations.length === 1, '宿主自身行独立 reveal（4px）', `got ${row1._animations?.length ?? 0}`)
  assert(host._animations.length === 0, '宿主已可见不叠加', `got ${host._animations.length}`)
  await env.tick()
  assert(row2.style.display !== 'none' && row2.getBoundingClientRect().height > 0, '容器行最终可见')
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 R：合并 think 行渐隐释放——二级收起时 merged 行/正文渐隐后移除，
// 非瞬删（v12 修复）；反向取消路径下元素保留
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 R: 合并行渐隐释放 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('想一下', user)
  const thinkSeat = seat(flow, 'assistant-step', 'a1', 80)
  const md = el('div', { class: 'assistant-markdown-root' }, thinkSeat)
  const body = el('div', { class: 'assistant-markdown-body' }, md)
  makeThinkRow({ summary: '第一段思考', parent: body })
  makeThinkRow({ summary: '第二段思考', parent: body })
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 3秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  flow.querySelector('.dshcf-processed').dispatchEvent('click')   // 一级展开
  await env.tick()
  const chip = thinkSeat.querySelector('.dshcf-chip')
  chip.dispatchEvent('click')                                      // 二级展开 → 合并行出现
  await env.tick()
  const merged = thinkSeat.querySelector('.dshcf-merged-think')
  assert(merged !== null, '合并行存在')
  merged.dispatchEvent('click')                                    // 展开合并正文
  await env.tick()
  const mergedBody = thinkSeat.querySelector('.dshcf-merged-body')
  assert(mergedBody !== null, '合并正文存在')
  chip.dispatchEvent('click')                                      // 二级收起（手势）
  env.flushRaf()
  // 渐隐释放：仍在 DOM、带 OUT 动画，而非瞬删
  assert(merged.isConnected, '合并行未瞬删（渐隐中）')
  assert(mergedBody.isConnected, '合并正文未瞬删（渐隐中）')
  const mAnim = merged._animations[merged._animations.length - 1]
  assert(mAnim.keyframes[1].opacity === '0', '合并行关键帧淡出')
  await env.tick()
  assert(!merged.isConnected, '渐隐结束后移除合并行')
  assert(!mergedBody.isConnected, '渐隐结束后移除合并正文')
  cleanup()
}
// ---------------------------------------------------------------------------
// 场景 S：MutationObserver 订阅契约——fake-dom observe() 只记录不重放，
// 但插件「订阅了什么」必须可断言（attributeFilter 写错属性名时其余测试
// 仍会全绿；此场景守住 filter/subtree/characterData 契约）。
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 S: observer 订阅契约 ===')
  globalThis.__dshcf_observer_options = []   // 隔离此前场景累积的记录
  const { env, document, cleanup } = boot()
  await env.tick(); await env.tick()
  const entries = globalThis.__dshcf_observer_options
  assert(entries.length >= 1, 'controller 注册了 observer')
  // dsh-input-collapse 在 fold 之外独立注册了一个 body observer（属性过滤只
  // 关注 data-chat-flow-kind / data-chat-anchor-key）。这里按「目标为 body 且
  // filter 含 data-selected/data-state」锁定 fold 的 observer，而非盲取最后一条。
  const foldEntry = entries.find(e => (
    e.target === document.body
    && Array.isArray(e.options.attributeFilter)
    && e.options.attributeFilter.includes('data-selected')
    && e.options.attributeFilter.includes('data-state')
  ))
  assert(foldEntry !== undefined, '找到 fold 的 body observer')
  const o = foldEntry.options
  assert(Array.isArray(o.attributeFilter) && o.attributeFilter.includes('data-selected') && o.attributeFilter.includes('data-state'), 'attributeFilter 含 data-selected/data-state', JSON.stringify(o.attributeFilter))
  assert(o.childList === true && o.subtree === true, 'childList+subtree 开启')
  assert(o.characterData === true, 'characterData 开启（流式文本驱动）')
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 T：merged-body 收起镜像高度卷下——开合对称（全项目唯一几何动画对）。
// 覆盖：正常卷下 settle 后移除、收起中途反点展开的同步仲裁、无 WAAPI 降级瞬删。
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 T: merged-body 收起镜像卷下 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('想一下', user)
  const thinkSeat = seat(flow, 'assistant-step', 'a1', 80)
  const md = el('div', { class: 'assistant-markdown-root' }, thinkSeat)
  const body = el('div', { class: 'assistant-markdown-body' }, md)
  makeThinkRow({ summary: '第一段思考', parent: body })
  makeThinkRow({ summary: '第二段思考', parent: body })
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 3秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  flow.querySelector('.dshcf-processed').dispatchEvent('click')
  await env.tick()
  const chip = thinkSeat.querySelector('.dshcf-chip')
  chip.dispatchEvent('click')
  await env.tick()
  const mergedBtn = thinkSeat.querySelector('.dshcf-merged-think')
  assert(mergedBtn !== null, '合并行出现')
  const origGBCR = Object.getPrototypeOf(mergedBtn).getBoundingClientRect
  Object.getPrototypeOf(mergedBtn).getBoundingClientRect = function () {
    const r = origGBCR.call(this)
    if (this.classList?.contains('dshcf-merged-body')) return { ...r, height: 42 }
    return r
  }
  try {
    mergedBtn.dispatchEvent('click')   // 展开：创建 + 高度卷开
    const mergedBody = mergedBtn.nextElementSibling
    assert(mergedBody !== null && mergedBody.classList.contains('dshcf-merged-body'), '内容块已创建')
    await env.tick()                   // 卷开 settle，清内联锁
    const countAtOpen = mergedBody._animations.length
    mergedBtn.dispatchEvent('click')   // 收起：高度卷下
    assert(mergedBody._animations.length === countAtOpen + 1, '收起新增 1 个动画', `got ${mergedBody._animations.length} want ${countAtOpen + 1}`)
    const closeAnim = mergedBody._animations[mergedBody._animations.length - 1]
    assert(closeAnim.keyframes[0].height === '42px' && closeAnim.keyframes[1].height === '0px', '关键帧高度 当前→0', JSON.stringify(closeAnim.keyframes))
    assert(closeAnim.keyframes[1].marginBottom === '0px', '关键帧 margin 收到 0')
    assert(mergedBody.isConnected, '卷下途中 body 仍在 DOM')
    // 收起中途反点展开：同步仲裁取消在途卷下，恢复完整布局
    mergedBtn.dispatchEvent('click')
    assert(mergedBody.isConnected, '反向展开后 body 保留在 DOM')
    assert(mergedBody.style.height === '' && mergedBody.style.overflow === '', '仲裁清锁高内联', `h=${mergedBody.style.height} ov=${mergedBody.style.overflow}`)
    // 再次收起 → 新动画 → settle 后移除
    mergedBtn.dispatchEvent('click')
    assert(mergedBody._animations.length === countAtOpen + 2, '再次收起再增 1 个动画')
    await env.tick()
    assert(!mergedBody.isConnected, '卷下 settle 后 body 移除')
  } finally {
    Object.getPrototypeOf(mergedBtn).getBoundingClientRect = origGBCR
  }
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 T2：无 WAAPI 环境下 merged-body 收起降级为同步移除。
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 T2: 收起无 WAAPI 降级 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('想一下', user)
  const thinkSeat = seat(flow, 'assistant-step', 'a1', 80)
  const md = el('div', { class: 'assistant-markdown-root' }, thinkSeat)
  const body = el('div', { class: 'assistant-markdown-body' }, md)
  makeThinkRow({ summary: '第一段', parent: body })
  makeThinkRow({ summary: '第二段', parent: body })
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 3秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  flow.querySelector('.dshcf-processed').dispatchEvent('click')
  await env.tick()
  const chip = thinkSeat.querySelector('.dshcf-chip')
  chip.dispatchEvent('click')
  await env.tick()
  const mergedBtn = thinkSeat.querySelector('.dshcf-merged-think')
  const proto = Object.getPrototypeOf(mergedBtn)
  const origGBCR = proto.getBoundingClientRect
  const origAnimate = proto.animate
  proto.getBoundingClientRect = function () {
    const r = origGBCR.call(this)
    if (this.classList?.contains('dshcf-merged-body')) return { ...r, height: 30 }
    return r
  }
  try {
    delete proto.animate              // 场景 E 同款：Element 级删除生效
    mergedBtn.dispatchEvent('click')  // 无 WAAPI：直接显示，零动画
    const mergedBody = mergedBtn.nextElementSibling
    assert(mergedBody !== null && (mergedBody._animations?.length ?? 0) === 0, '无 WAAPI 展开零动画')
    mergedBtn.dispatchEvent('click')  // 收起：降级同步移除
    assert(!mergedBody.isConnected, '无 WAAPI 收起同步移除')
  } finally {
    proto.getBoundingClientRect = origGBCR
    // 恢复 animate：delete 作用于共享的 FakeElement.prototype，不恢复会
    // 污染后续所有场景（canAnimate 恒 false → 全部走瞬隐路径）。
    proto.animate = origAnimate
  }
  cleanup()
}

// ---------------------------------------------------------------------------
// 场景 T3：合并行展开竞态——思考行已被 React 重渲染摘走（mutation 排队、
// pass 未执行）时点击合并行，展开失败必须保持收起态：不置 aria-expanded、
// 不创建悬空内容块（修复前会留下「展开但无内容」的状态，只能再点一次恢复）。
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 T3: 展开竞态思考行消失保持收起 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('想一下', user)
  const thinkSeat = seat(flow, 'assistant-step', 'a1', 80)
  const md = el('div', { class: 'assistant-markdown-root' }, thinkSeat)
  const body = el('div', { class: 'assistant-markdown-body' }, md)
  const r1 = makeThinkRow({ summary: '第一段思考', parent: body })
  const r2 = makeThinkRow({ summary: '第二段思考', parent: body })
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 3秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  flow.querySelector('.dshcf-processed').dispatchEvent('click')
  await env.tick()
  const chip = thinkSeat.querySelector('.dshcf-chip')
  chip.dispatchEvent('click')
  await env.tick()
  const mergedBtn = thinkSeat.querySelector('.dshcf-merged-think')
  assert(mergedBtn !== null, '合并行出现')
  // React 重渲染摘走思考行（尚未 tick，pass 未跑）→ 用户此刻点击合并行
  r1.remove(); r2.remove()
  mergedBtn.dispatchEvent('click')
  assert(mergedBtn.getAttribute('aria-expanded') === 'false', '展开失败不置位 aria-expanded', `aria=${mergedBtn.getAttribute('aria-expanded')}`)
  assert(mergedBtn.nextElementSibling === null, '不创建悬空内容块')
  // 下一 pass 收敛：无思考行的块释放合并行，无残留
  await env.tick()
  assert(!mergedBtn.isConnected, 'pass 收敛后移除合并行')
  assert(thinkSeat.querySelectorAll('.dshcf-merged-think').length === 0, '无残留合并行')
  cleanup()
}
// ---------------------------------------------------------------------------
// 场景 T4：合并行释放渐隐期间点击——忽略点击（孤儿 body 泄漏 + 内容重复），
// 渐隐完整走完，不留痕迹；再次展开后点击合并行只产生一个内容块。
// 修复前：click handler 取消 body 渐隐 → 行 settle 移除 → 孤儿 body →
// 再展开并点合并行 → 孤儿 + 新建 = 同一思考内容显示两份。
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 T4: 释放渐隐期间点击合并行 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('想一下', user)
  const thinkSeat = seat(flow, 'assistant-step', 'a1', 80)
  const md = el('div', { class: 'assistant-markdown-root' }, thinkSeat)
  const body = el('div', { class: 'assistant-markdown-body' }, md)
  makeThinkRow({ summary: '第一段思考', parent: body })
  makeThinkRow({ summary: '第二段思考', parent: body })
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 3秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  flow.querySelector('.dshcf-processed').dispatchEvent('click')
  await env.tick()
  const chip = thinkSeat.querySelector('.dshcf-chip')
  chip.dispatchEvent('click')
  await env.tick()
  const mergedBtn = thinkSeat.querySelector('.dshcf-merged-think')
  assert(mergedBtn !== null, '合并行出现')
  mergedBtn.dispatchEvent('click')   // 展开 body
  await env.tick()
  assert(thinkSeat.querySelectorAll('.dshcf-merged-body').length === 1, '展开态恰好 1 个内容块')
  // 手势收起（渐隐启动）后、settle 前点击正在消失的合并行
  chip.dispatchEvent('click')
  env.notifyMutations(); env.flushRaf()
  mergedBtn.dispatchEvent('click')   // race：渐隐窗口内点击
  await new Promise(r => setTimeout(r, 20))   // fade settle → row 移除
  env.flushRaf()
  assert(thinkSeat.querySelectorAll('.dshcf-merged-body').length === 0, '渐隐完整走完：无孤儿 body')
  assert(thinkSeat.querySelectorAll('.dshcf-merged-think').length === 0, '合并行已移除')
  // 再次展开块并点击合并行：内容块唯一
  chip.dispatchEvent('click')
  await env.tick()
  const merged2 = thinkSeat.querySelector('.dshcf-merged-think')
  assert(merged2 !== null, '再次展开后合并行重建')
  merged2.dispatchEvent('click')
  await env.tick()
  assert(thinkSeat.querySelectorAll('.dshcf-merged-body').length === 1, '重建后内容块唯一（无重复）')
  cleanup()
}
// ---------------------------------------------------------------------------
// 场景 M-1：二级收起间距钉住——手势收起时 chip 内联 marginBottom 钉 16px，
// 最后一行 fade settle 后同帧归零。（无 CSS transition 的替代实现，
// plan chip-margin-unification 步骤 3。）
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 M-1: 二级收起间距钉住 ===')
  const { env, document, flow, register, cleanup } = boot()
  const { t1 } = buildTurn(flow)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  flow.querySelector('.dshcf-processed').dispatchEvent('click')  // 一级展开
  await env.tick()
  const chip = t1.querySelector('.dshcf-chip')
  assert(chip !== null, 'chip 存在')
  assert(chip.style.marginBottom === '', '展开态无内联 margin（CSS 接管）')
  chip.dispatchEvent('click')  // 二级展开
  await env.tick()
  assert(chip.style.marginBottom === '', '二级展开后无内联 margin')
  chip.dispatchEvent('click')  // 二级收起（手势，fade 启动）
  env.notifyMutations(); env.flushRaf()
  assert(chip.style.marginBottom === '16px', '收起 fade 期间间距钉住 16px', chip.style.marginBottom)
  // 收起动画在途时再次协调（流式/DOM mutation）仍须保持钉住。
  env.notifyMutations(); env.flushRaf()
  assert(chip.style.marginBottom === '16px', '中间 pass 仍保持间距钉住', chip.style.marginBottom)
  // fade settle 后归零
  await new Promise(r => setTimeout(r, 15))
  env.flushRaf()
  assert(chip.style.marginBottom === '', '最后一行 fade settle 后归零', chip.style.marginBottom)
  cleanup()
}
// ---------------------------------------------------------------------------
// 场景 M-2：收起中途反点展开——内联 margin 立即清除（反向仲裁）。
// 展开分支无条件 unpin，不依赖 settle 兜底（anim.cancel 不触发 settle）。
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 M-2: 反点展开清内联 ===')
  const { env, document, flow, register, cleanup } = boot()
  const { t1 } = buildTurn(flow)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  flow.querySelector('.dshcf-processed').dispatchEvent('click')  // 一级展开
  await env.tick()
  const chip = t1.querySelector('.dshcf-chip')
  chip.dispatchEvent('click')  // 二级展开
  await env.tick()
  chip.dispatchEvent('click')  // 二级收起（fade 启动，钉住）
  env.notifyMutations(); env.flushRaf()
  assert(chip.style.marginBottom === '16px', '收起钉住 16px', chip.style.marginBottom)
  // 反点展开（fade 未 settle）
  chip.dispatchEvent('click')
  env.notifyMutations(); env.flushRaf()
  assert(chip.style.marginBottom === '', '反向展开清内联 margin（aria=true 接管）', chip.style.marginBottom)
  // 行恢复可见
  const row = t1.querySelector('[data-tool]')
  assert(row.style.display === '', '行恢复显示')
  cleanup()
}
// ---------------------------------------------------------------------------
// 场景 M-3：合并思考块收起间距钉住（AI 评审 P0——merged 行 fade 不走
// block.rows，必须纳入钉住体系，否则思考块收起时 v13 间距瞬跳回归）。
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 M-3: 合并思考块收起间距钉住 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('想一下', user)
  const thinkSeat = seat(flow, 'assistant-step', 'a1', 80)
  const md = el('div', { class: 'assistant-markdown-root' }, thinkSeat)
  const body = el('div', { class: 'assistant-markdown-body' }, md)
  makeThinkRow({ summary: '第一段思考', parent: body })
  makeThinkRow({ summary: '第二段思考', parent: body })
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 3秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  flow.querySelector('.dshcf-processed').dispatchEvent('click')  // 一级展开
  await env.tick()
  const chip = thinkSeat.querySelector('.dshcf-chip')
  chip.dispatchEvent('click')  // 二级展开（merged 行出现）
  await env.tick()
  const mergedBtn = thinkSeat.querySelector('.dshcf-merged-think')
  assert(mergedBtn !== null, '合并行出现')
  mergedBtn.dispatchEvent('click')  // 展开 body
  await env.tick()
  assert(chip.style.marginBottom === '', '展开态无内联 margin')
  // 手势收起（merged 行渐隐，不走 block.rows）
  chip.dispatchEvent('click')
  env.notifyMutations(); env.flushRaf()
  assert(chip.style.marginBottom === '16px', '收起 merge 思考块时间距钉住 16px', chip.style.marginBottom)
  // fade settle 后归零
  await new Promise(r => setTimeout(r, 15))
  env.flushRaf()
  assert(chip.style.marginBottom === '', 'merged 行 fade settle 后归零', chip.style.marginBottom)
  cleanup()
}
// ---------------------------------------------------------------------------
// 场景 M-4：flow-chip（context 等 before-mounted）收起不钉住——间距由
// 宿主 row-gap 16px 提供，钉住 16px 会叠加成 32px（真机：收起上下文
// 注入时二级与三级间距瞬间扩大）。
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 M-4: flow-chip 收起不钉住 ===')
  const { env, document, flow, register, cleanup } = boot()
  const user = seat(flow, 'user', 'u1', 40)
  textNode('问个问题', user)
  const context = seat(flow, 'context', 'c1', 30)
  const contextRow = el('div', { 'data-disclosure-row': '' }, context)
  el('span', { class: 'title', text: '上下文注入' }, contextRow)
  el('span', { class: 'summary', text: 'AGENTS.md' }, contextRow)
  const a1 = seat(flow, 'assistant-step', 'a1', 60)
  addBodyText(a1, '中间正文')
  const t1 = seat(flow, 'tool-call', 't1', 30)
  makeToolRow({ callId: 'call:1', tool: 'pwsh', summary: 'cmd', parent: t1 })
  const a2 = seat(flow, 'assistant-step', 'a2', 60)
  addBodyText(a2, '最终正文')
  const tail = seat(flow, 'turn-tail', 'tt1', 24)
  textNode('用时 3秒', tail)
  document.body.appendChild(flow)
  register()
  await env.tick(); await env.tick()
  flow.querySelector('.dshcf-processed').dispatchEvent('click')  // 一级展开
  await env.tick()
  const contextChip = [...flow.querySelectorAll('.dshcf-chip')].find(c => c.textContent.includes('上下文注入'))
  assert(contextChip !== undefined, 'context chip 存在')
  assert(contextChip.classList.contains('dshcf-flow-chip'), 'context chip 是 flow-chip')
  contextChip.dispatchEvent('click')  // 二级展开
  await env.tick()
  assert(contextChip.style.marginBottom === '', 'flow-chip 展开态无内联 margin')
  contextChip.dispatchEvent('click')  // 二级收起
  env.notifyMutations(); env.flushRaf()
  assert(contextChip.style.marginBottom === '', 'flow-chip 收起不钉住（row-gap 承担间距）', contextChip.style.marginBottom)
  await new Promise(r => setTimeout(r, 15))
  env.flushRaf()
  assert(contextChip.style.marginBottom === '', 'flow-chip settle 后无残留', contextChip.style.marginBottom)
  cleanup()
}

console.log(`\n[DONE] failures=${failures}`)
process.exit(failures === 0 ? 0 : 1)
