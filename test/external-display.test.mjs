/**
 * external-display.test.mjs — issue #11 回归测试。
 *
 * Bug A：restoreElement 盲写陈旧 originalDisplay 覆盖外部隐藏。
 *   - 值比对路径：外部属性级改写（display ≠ 插件写入值）→ 恢复跳过；
 *   - 哨兵路径：外部整体改写 style（cssText 抹掉所有权哨兵，同值接管）→ 恢复跳过；
 *   - 回归：无外部介入时恢复行为与原先完全一致。
 *
 * Bug B：外部 style 写入不触发 observer → 低频对账循环兜底收敛：
 *   - 外部隐藏整轮工作行（含 finalStep）后，不经 notifyMutations/tick，
 *     仅推进真实时间让对账链唤醒 schedule，摘要行被清理、宿主不被复活。
 *
 * 直接实例化 src/fold.ts 的 FoldController（auditIntervalMs 可调），
 * 用 fake-dom 桩驱动；样式桩已扩展 getPropertyValue/setProperty/removeProperty
 * 与 cssText 整体赋值语义。
 *
 * 用法：node test/external-display.test.mjs
 */
import { installDomGlobals, el, textNode, makeToolRow, makeThinkRow } from './fake-dom.mjs'
import { FoldController } from '../src/fold.ts'

let failures = 0
function check(name, cond, detail = '') {
  const ok = !!cond
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

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

/** 构建一个可折叠回合：tool-call 宿主（内含工具卡片行）+ 最终正文消息。 */
/** 构建一个可折叠回合（结构对齐 adversarial-session 的会话 A fixture）：
 * user 提问 → tool-call 宿主（内含工具卡片行）→ assistant-step（think 行 + 正文）
 * → turn-tail。finalStep 恒可见是摘要行存续的前提，也是 Bug B 复现的关键。 */
function makeTurn(flow, id) {
  const au = el('div', { 'data-chat-anchor-key': `${id}-user`, 'data-chat-flow-kind': 'user' }, flow)
  au.setRect({ height: 40 })
  textNode(`问题 ${id}`, au)
  const at = el('div', { 'data-chat-anchor-key': `${id}-tool`, 'data-chat-flow-kind': 'tool-call' }, flow)
  at.setRect({ height: 30 })
  makeToolRow({ callId: `call:${id}`, tool: 'read', summary: `读${id}`, parent: at })
  const af = el('div', { 'data-chat-anchor-key': `${id}-final`, 'data-chat-flow-kind': 'assistant-step' }, flow)
  af.setRect({ height: 60 })
  const root = el('div', { class: 'assistant-markdown-root' }, af)
  const body = el('div', { class: 'assistant-markdown-body' }, root)
  makeThinkRow({ state: 'ok', summary: '思考完成', parent: body })
  const md = el('div', { class: 'markdown' }, body)
  textNode(`最终回答 ${id}`, md)
  const tail = el('div', { 'data-chat-anchor-key': `${id}-tail`, 'data-chat-flow-kind': 'turn-tail' }, flow)
  tail.setRect({ height: 24 })
  textNode('用时 3秒', tail)
  return { userSeat: au, toolHost: at, finalStep: af }
}

const processedRows = (flow) => flow.querySelectorAll('.dshcf-processed')

// ---------------------------------------------------------------------------
// 场景 1（Bug A · 值比对）：外部属性级改写后，恢复不得覆盖外部值
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 1: 外部改值（flex）后插件恢复跳过 ===')
  const { env, document, flow, registerTree } = setup()
  const { toolHost } = makeTurn(flow, 'a')
  document.body.appendChild(flow)
  registerTree()
  const ctrl = new FoldController(undefined, { auditIntervalMs: 10 })
  ctrl.start()
  await env.tick(); await env.tick()
  check('[1] 折叠生效：宿主隐藏', toolHost.style.display === 'none', String(toolHost.style.display))
  check('[1] 所有权哨兵已盖', toolHost.style.getPropertyValue('--dshcf-display-owned') !== '')

  // 外部属性级接管：哨兵仍在，但值 ≠ 插件写入的 'none'
  toolHost.style.display = 'flex'
  ctrl.stop()
  check('[1] 恢复跳过：保留外部 flex，不写回陈旧原值', toolHost.style.display === 'flex', String(toolHost.style.display))
  check('[1] 账本交还：哨兵清除', toolHost.style.getPropertyValue('--dshcf-display-owned') === '')
}

// ---------------------------------------------------------------------------
// 场景 2（Bug A · 哨兵路径）：cssText 同值接管（none 覆盖 none）仍被识别
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 2: 外部整体改写 style（同值 none 接管）后恢复跳过 ===')
  const { env, document, flow, registerTree } = setup()
  const { toolHost } = makeTurn(flow, 'b')
  document.body.appendChild(flow)
  registerTree()
  const ctrl = new FoldController(undefined, { auditIntervalMs: 10 })
  ctrl.start()
  await env.tick(); await env.tick()
  check('[2] 折叠生效：宿主隐藏', toolHost.style.display === 'none')

  // 同值接管：值与插件写入一致，仅哨兵缺失可鉴别——值守卫单独无法覆盖的形态
  toolHost.style.cssText = 'display:none'
  check('[2] 前置：哨兵已被整体改写抹掉', toolHost.style.getPropertyValue('--dshcf-display-owned') === '')
  ctrl.stop()
  // 陈旧快照的原值是 ''——盲写会把回退隐藏的轮次复活；守卫后保持外部 none。
  check('[2] 恢复跳过：保持外部 none，未复活', toolHost.style.display === 'none', String(toolHost.style.display))
}

// ---------------------------------------------------------------------------
// 场景 3（回归）：无外部介入时，折叠→还原与原先完全一致
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 3: 无外部介入时恢复行为不变 ===')
  const { env, document, flow, registerTree } = setup()
  const { toolHost } = makeTurn(flow, 'c')
  document.body.appendChild(flow)
  registerTree()
  const ctrl = new FoldController(undefined, { auditIntervalMs: 10 })
  ctrl.start()
  await env.tick(); await env.tick()
  check('[3] 折叠生效', toolHost.style.display === 'none')
  ctrl.stop()
  check('[3] 还原为精确原值（空串）', toolHost.style.display === '', JSON.stringify(toolHost.style.display))
  check('[3] 哨兵随恢复清除', toolHost.style.getPropertyValue('--dshcf-display-owned') === '')
}

// ---------------------------------------------------------------------------
// 场景 4（Bug B）：外部隐藏整轮后，对账循环在不依赖 mutation 的前提下收敛
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 4: 对账循环唤醒 pass 清理「已处理」残留行 ===')
  const { env, document, flow, registerTree } = setup()
  const { userSeat, toolHost, finalStep } = makeTurn(flow, 'd')
  document.body.appendChild(flow)
  registerTree()
  const ctrl = new FoldController(undefined, { auditIntervalMs: 15 })
  ctrl.start()
  await env.tick(); await env.tick()
  check('[4] 折叠行已生成', processedRows(flow).length === 1, `实际 ${processedRows(flow).length}`)

  // 外部（如 rewind 类插件）隐藏该轮全部行：用户消息 + 工具宿主 + 最终正文。
  // 不经 notifyMutations/env.tick —— 真实浏览器中 style 写入不产生 record。
  userSeat.style.display = 'none'
  toolHost.style.cssText = 'display:none'
  finalStep.style.display = 'none'
  // 仅推进真实时间让对账链自醒，再只 flush rAF（不注入任何 mutation），
  // 证明本轮 pass 由对账循环唤醒而非 observer。
  await sleep(60)
  env.flushRaf()
  await sleep(10)
  env.flushRaf()

  check('[4] 摘要行已收敛清理', processedRows(flow).length === 0, `实际 ${processedRows(flow).length}`)
  check('[4] 被接管的宿主未被复活', toolHost.style.display === 'none', String(toolHost.style.display))
  ctrl.stop()
  env.clearTimers()
}

// ---------------------------------------------------------------------------
// 场景 5（A×B 复合）：接管 + 全轮隐藏同时发生，收敛后两者均成立
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 5: 外部接管 × 全轮隐藏复合收敛 ===')
  const { env, document, flow, registerTree } = setup()
  const { userSeat, toolHost, finalStep } = makeTurn(flow, 'e')
  document.body.appendChild(flow)
  registerTree()
  const ctrl = new FoldController(undefined, { auditIntervalMs: 15 })
  ctrl.start()
  await env.tick(); await env.tick()
  check('[5] 初始折叠行存在', processedRows(flow).length === 1)

  // 展开该轮（合法手势）→ 宿主恢复可见；随后外部整体改写接管并再次隐藏。
  const row = processedRows(flow)[0]
  row.dispatchEvent('click')
  await env.tick(); await env.tick()
  check('[5] 手势展开后宿主恢复可见', toolHost.style.display === '', String(toolHost.style.display))

  // 外部接管：cssText 写入抹掉哨兵（此时账本已清，属普通外部操作），
  // 再把整轮藏掉 —— 之后一切收敛只能靠对账循环。
  userSeat.style.display = 'none'
  toolHost.style.cssText = 'display:none'
  finalStep.style.cssText = 'display:none'
  await sleep(60)
  env.flushRaf()
  await sleep(10)
  env.flushRaf()

  check('[5] 无摘要行复活（segment 无可见工作）', processedRows(flow).length === 0, `实际 ${processedRows(flow).length}`)
  check('[5] 外部隐藏状态稳定', toolHost.style.display === 'none' && finalStep.style.display === 'none')
  ctrl.stop()
  env.clearTimers()
}

// ---------------------------------------------------------------------------
// 场景 6（Issue #14）：稳定页面的 audit 不应每秒重跑完整 pass；外部漂移仍需唤醒
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 6: 稳定 audit 轻量对账，漂移时才触发 pass ===')
  const { env, document, flow, registerTree } = setup()
  const { toolHost } = makeTurn(flow, 'f')
  document.body.appendChild(flow)
  registerTree()
  const ctrl = new FoldController(undefined, { auditIntervalMs: 10 })
  const pass = ctrl.pass.bind(ctrl)
  let passCount = 0
  // 仅用于回归断言：统计 audit 是否错误地启动完整 pass。
  ctrl.pass = () => {
    passCount++
    return pass()
  }
  ctrl.start()
  await env.tick()
  passCount = 0

  // 页面没有任何变化时，多个 audit 周期都不应触发完整 pass。
  await sleep(45)
  env.flushRaf()
  check('[6] 稳定 audit 不重跑完整 pass', passCount === 0, `实际 ${passCount}`)

  // pass 自己插入 chip 产生的 childList 不应再次排队完整 pass。
  const observer = globalThis.__dshcf_observers.at(-1)
  const pluginNode = flow.querySelector('.dshcf-processed')
  const beforePluginMutation = passCount
  observer.cb([{ type: 'childList', target: flow, addedNodes: [pluginNode], removedNodes: [] }], observer)
  env.flushRaf()
  check('[6] 插件自有 childList 不触发额外 pass', passCount === beforePluginMutation, `实际 ${passCount}`)

  // 外部 display 改写不产生 observer record，但下一轮 audit 必须发现漂移并收敛。
  toolHost.style.display = 'flex'
  await sleep(20)
  env.flushRaf()
  check('[6] 外部 display 漂移仍触发 pass', passCount > 0, `实际 ${passCount}`)
  check('[6] 漂移后折叠状态重新收敛', toolHost.style.display === 'none', String(toolHost.style.display))

  ctrl.stop()
  env.clearTimers()
}

console.log(`\n[DONE] failures=${failures}`)
process.exit(failures === 0 ? 0 : 1)
