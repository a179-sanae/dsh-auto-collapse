/**
 * issue14-followup.test.mjs — issue #14 补充修复（PR #16 之后的增量）。
 *
 * 1. 分块快照复用：characterData/attributes 批次（无 childList）不重建
 *    findBlocks 快照，chip 摘要仍实时更新；快照复用契约（结构未变不重扫）
 *    与 childList 批次立即重建并存。
 * 2. markDirty 精确失效：flow 直挂文本 / flow 外混批记录不再把
 *    bodyTextCache 全量清空（旧逻辑放大成 O(全会话) TreeWalker 重扫）。
 * 3. 贴底钉回：pass 内内容增长使贴底视口脱离底部时，同一帧钉回 scrollTop
 *    （消除「插件改高 → 下一帧宿主吸底回写」的跨帧抽搐窗口）；远离底部
 *    时不干预。
 *
 * 用法：node test/issue14-followup.test.mjs
 */
import { installDomGlobals, el, textNode, makeToolRow, makeThinkRow } from './fake-dom.mjs'
import { FoldController } from '../src/fold.ts'

let failures = 0
function check(name, cond, detail = '') {
  const ok = !!cond
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

function setup() {
  const env = installDomGlobals()
  const { document } = env
  const flow = el('div', { 'data-chat-flow': '' })
  flow.offsetParent = {}
  flow.setRect({ width: 800, height: 600 })
  function registerTree() {
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
  return { env, document, flow, registerTree }
}

/** 未收尾回合（无 turn-tail）：user → 工具宿主 → 正文消息。
 * 默认 running 工具行（段不 closed → 无一级折叠行，二级 chip 可见）；
 * toolState='ok' 供已收尾回合复用。 */
function makeOpenTurn(flow, id, toolState = 'running') {
  const au = el('div', { 'data-chat-anchor-key': `${id}-user`, 'data-chat-flow-kind': 'user' }, flow)
  au.setRect({ height: 40 })
  textNode(`问题 ${id}`, au)
  const at = el('div', { 'data-chat-anchor-key': `${id}-tool`, 'data-chat-flow-kind': 'tool-call' }, flow)
  at.setRect({ height: 30 })
  makeToolRow({ callId: `call:${id}`, tool: 'read', state: toolState, summary: `读取配置`, parent: at })
  const af = el('div', { 'data-chat-anchor-key': `${id}-final`, 'data-chat-flow-kind': 'assistant-step' }, flow)
  af.setRect({ height: 60 })
  const md = el('div', { class: 'markdown' }, af)
  const mdText = textNode(`回答 ${id}`, md)
  return { userSeat: au, toolHost: at, finalStep: af, toolText: at.querySelector('.summary').childNodes[0], mdText }
}

/** 已收尾回合：同上（工具行 ok 态，回合可完成）+ turn-tail（用时 3秒）
 * → 一级折叠 + 「已处理」行。 */
function makeClosedTurn(flow, id) {
  const parts = makeOpenTurn(flow, id, 'ok')
  const tail = el('div', { 'data-chat-anchor-key': `${id}-tail`, 'data-chat-flow-kind': 'turn-tail' }, flow)
  tail.setRect({ height: 24 })
  textNode('用时 3秒', tail)
  return { ...parts, tail }
}

const chips = (flow) => flow.querySelectorAll('.dshcf-chip')
const processedRows = (flow) => flow.querySelectorAll('.dshcf-processed')

// ---------------------------------------------------------------------------
// 场景 1：characterData 批次复用分块快照，chip 摘要实时更新；
//         复用契约（childList 缺席不重扫）与 childList 重建并存
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 1: 分块快照复用 ===')
  const { env, document, flow, registerTree } = setup()
  const { toolHost, toolText, mdText } = makeOpenTurn(flow, 'a')
  document.body.appendChild(flow)
  registerTree()
  const ctrl = new FoldController()
  ctrl.start()
  await env.tick(); await env.tick()
  check('[1] chip 已生成且摘要实时', chips(flow).length === 1 && chips(flow)[0].querySelector('.dshcf-chip-summary').textContent === '读取配置')

  // 流式文本更新（characterData）：无 childList → 复用快照，摘要仍跟手。
  toolText.data = '读取生产配置'
  env.notifyMutations([{ type: 'characterData', target: toolText }])
  env.flushRaf()
  check('[1] 复用路径下摘要仍实时更新', chips(flow)[0].querySelector('.dshcf-chip-summary').textContent === '读取生产配置')

  // 复用契约：结构变化若无 childList 记录（契约外场景），快照不重建——
  // 证明复用真实生效；随后 childList 记录一到立即重建清理。
  // chip 插在宿主内部，随宿主一起脱离 flow（ensureChip 检测断连会原地
  // 重建，仍挂在 detached 宿主上）——用账本条目数区分清理是否发生。
  toolHost.remove()
  env.notifyMutations([{ type: 'characterData', target: mdText }])
  env.flushRaf()
  check('[1] 无 childList 批次不重建快照（chip 保留）', ctrl.chips.size === 1)

  env.notifyMutations([{ type: 'childList', target: flow, removedNodes: [toolHost], addedNodes: [] }])
  env.flushRaf()
  check('[1] childList 批次立即重建（stale chip 清理）', ctrl.chips.size === 0)

  ctrl.stop()
  env.clearTimers()
}

// ---------------------------------------------------------------------------
// 场景 2：markDirty 精确失效——flow 直挂文本记录不清空 bodyTextCache
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 2: 正文缓存定向失效 ===')
  const { env, document, flow, registerTree } = setup()
  makeClosedTurn(flow, 'b')
  document.body.appendChild(flow)
  registerTree()
  const ctrl = new FoldController()
  ctrl.start()
  await env.tick(); await env.tick()
  check('[2] 前置：折叠行已生成', processedRows(flow).length === 1)
  const cacheBefore = ctrl.bodyTextCache

  // flow 直挂文本（不属于任何消息）：旧逻辑走「归属失败 → 全量失效」，
  // 把整会话的正文缓存清空；精确失效后仅跳过。
  const loose = textNode(' flow 直挂杂音 ', null)
  flow.appendChild(loose)
  env.notifyMutations([{ type: 'characterData', target: loose }])
  env.flushRaf()
  check('[2] flow 直挂文本不清空正文缓存', ctrl.bodyTextCache === cacheBefore)

  // 回归：消息内的文本突变仍精确失效到所属消息（功能不变，粒度不变）。
  const userText = flow.querySelector('[data-chat-flow-kind="user"]').childNodes[0]
  const userCacheBefore = ctrl.bodyTextCache
  userText.data = '问题 b（改）'
  env.notifyMutations([{ type: 'characterData', target: userText }])
  env.flushRaf()
  check('[2] 消息内突变仍走定向失效（不清空）', ctrl.bodyTextCache === userCacheBefore)

  ctrl.stop()
  env.clearTimers()
}

// ---------------------------------------------------------------------------
// 场景 3：贴底钉回——pass 内容增长（「已处理」行插入）使贴底视口脱离底部
//         时同一帧钉回；远离底部时不干预
// ---------------------------------------------------------------------------
/** 滚动容器桩：scrollHeight = _base + 40×「已处理」行数（模拟插件在 pass
 * 内插入行导致的内容增长）；scrollTop/clientHeight 为普通属性。 */
function makeScroller(flow, base = 10000, tracker = null) {
  const scroller = el('div', { class: 'dshcf-test-scroller' })
  scroller.style.overflowY = 'auto'
  scroller._base = base
  scroller.clientHeight = 1000
  if (tracker !== null) {
    tracker.value = 0
    Object.defineProperty(scroller, 'scrollTop', {
      configurable: true,
      get: () => tracker.value,
      set: value => {
        tracker.value = value
        tracker.writes++
      },
    })
  }
  Object.defineProperty(scroller, 'scrollHeight', {
    get() {
      return this._base + flow.querySelectorAll('.dshcf-processed').length * 40
    },
  })
  scroller.appendChild(flow)
  return scroller
}

// ---------------------------------------------------------------------------
// 场景 5：同一 flow 重新挂载到新滚动容器后，贴底钉回必须作用于新容器
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 5: flow 重新挂载后的滚动容器缓存 ===')
  const { env, document, flow, registerTree } = setup()
  const oldTracker = { value: 0, writes: 0 }
  const newTracker = { value: 0, writes: 0 }
  const oldScroller = makeScroller(flow, 10000, oldTracker)
  makeClosedTurn(flow, 'e1')
  document.body.appendChild(oldScroller)
  registerTree()
  oldScroller.scrollTop = 8990
  const ctrl = new FoldController()
  ctrl.start()
  env.flushRaf()
  await env.tick()
  oldTracker.writes = 0

  // 保留同一 flow 节点，只替换其外层滚动容器；旧容器仍连接在 body 上。
  const newScroller = makeScroller(flow, 20000, newTracker)
  flow.remove()
  newScroller.appendChild(flow)
  document.body.appendChild(newScroller)
  oldScroller.scrollTop = 9016
  newScroller.scrollTop = 19016
  oldTracker.writes = 0
  newTracker.writes = 0

  // 新增一个已收尾回合，令两套滚动高度都增长 40px，触发贴底钉回。
  const nextTurn = makeClosedTurn(flow, 'e2')
  env.notifyMutations([{
    type: 'childList',
    target: flow,
    addedNodes: [nextTurn.userSeat, nextTurn.toolHost, nextTurn.finalStep, nextTurn.tail],
    removedNodes: [],
  }])
  env.flushRaf()
  await env.tick()

  check('[5] 旧滚动容器不再接收 scrollTop 写入', oldTracker.writes === 0, String(oldTracker.writes))
  check('[5] 新滚动容器接收贴底钉回', newTracker.writes > 0, String(newTracker.writes))
  check('[5] 新容器钉回最新底部', newScroller.scrollTop === 19080, String(newScroller.scrollTop))

  ctrl.stop()
  env.clearTimers()
}

{
  console.log('\n=== 场景 3: 贴底钉回 ===')
  const { env, document, flow, registerTree } = setup()
  const scroller = makeScroller(flow)
  makeClosedTurn(flow, 'c')
  document.body.appendChild(scroller)
  registerTree()
  scroller.scrollTop = 8990 // dist = 10000 - 8990 - 1000 = 10 ≤ 24：贴底意图
  const ctrl = new FoldController()
  ctrl.start()
  env.flushRaf()
  await env.tick()
  check('[3] 前置：折叠行已生成', processedRows(flow).length === 1)
  // 「已处理」行插入后 scrollHeight = 10040，视口距底拉大到 50：同帧钉回。
  check('[3] 贴底视口同帧钉回新底部', scroller.scrollTop === 9040, String(scroller.scrollTop))
  ctrl.stop()
  env.clearTimers()
}

{
  console.log('\n=== 场景 4: 远离底部不干预 ===')
  const { env, document, flow, registerTree } = setup()
  const scroller = makeScroller(flow)
  makeClosedTurn(flow, 'd')
  document.body.appendChild(scroller)
  registerTree()
  scroller.scrollTop = 7000 // dist = 2000 > 24：用户正在浏览
  const ctrl = new FoldController()
  ctrl.start()
  env.flushRaf()
  await env.tick()
  check('[4] 远离底部时不写 scrollTop', scroller.scrollTop === 7000, String(scroller.scrollTop))
  check('[4] 折叠行为不受影响', processedRows(flow).length === 1)
  ctrl.stop()
  env.clearTimers()
}

console.log(`\n[DONE] failures=${failures}`)
process.exit(failures === 0 ? 0 : 1)
