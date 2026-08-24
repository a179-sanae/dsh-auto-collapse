/**
 * input.test.mjs — dsh-input-collapse（InputCollapseController）行为测试。
 *
 * 直接实例化 src/input.ts 的控制器（不经 bundle，隔离 fold），用 fake DOM 驱动
 * 「超长用户输入默认折叠」的行为契约。
 *
 * 覆盖：
 *  1. 超长用户输入（正文超过 maxLines 行 / 字符阈值）→ 正文被裁剪
 *     （max-height / overflow:hidden），并插入「展开全文」按钮。
 *  2. 点击按钮 → 展开全文（还原 max-height）按钮变「收起」；再点 → 重新折叠。
 *  3. 短输入 → 不裁剪、不插按钮。
 *  4. stop() → 还原正文内联样式并移除按钮。
 *  5. 布局溢出路径（scrollHeight > maxLines×行高）同样判定为超行。
 *
 * 用法：node test/input.test.mjs
 */
import { installDomGlobals, el, textNode } from './fake-dom.mjs'
import { InputCollapseController } from '../src/input.ts'

let failures = 0
function assert(cond, label, extra = '') {
  const ok = Boolean(cond)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && extra ? `  (${extra})` : ''}`)
  if (!ok) failures++
}

function setup() {
  const env = installDomGlobals()
  const { document } = env
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
  return { env, document, flow, register, clear: () => env.clearTimers() }
}

/**
 * 构建一条用户消息：seat → userRow → userStack → bubble → .text（正文）。
 * 与官方结构对应，正文即消息里最长的文本节点（其父为 `.text` 容器）。
 */
function makeUserMessage(flow, key, text, { scrollHeight = NaN } = {}) {
  const seat = el('div', { 'data-chat-anchor-key': key, 'data-chat-flow-key': key, 'data-chat-flow-kind': 'user', class: 'flowItem' }, flow)
  const row = el('div', { 'data-time-hover-root': '' }, seat)
  const stack = el('div', {}, row)
  const bubble = el('div', {}, stack)
  const textEl = el('div', { class: 'text' }, bubble)
  textNode(text, textEl)
  if (Number.isFinite(scrollHeight)) textEl.scrollHeight = scrollHeight
  return { seat, textEl }
}

async function runTicks(env, rounds) {
  for (let i = 0; i < rounds; i++) await env.tick()
}

// ---------------------------------------------------------------------------
// 场景 1：超长用户输入 → 折叠 + 「展开全文」
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 1: 超长输入默认折叠并插入展开按钮 ===')
  const { env, document, flow, register, clear } = setup()
  const { seat, textEl } = makeUserMessage(flow, 'u-long', '这是一段特别长的用户输入文本，需要被默认折叠起来。'.repeat(4))
  document.body.appendChild(flow)
  register()
  const ctrl = new InputCollapseController({ maxLines: 3, autoCollapse: true, minChars: 5 })
  ctrl.start()
  await runTicks(env, 3)

  assert(textEl.style.maxHeight !== '' && textEl.style.maxHeight !== null, '超长正文被裁剪（max-height 已设置）', textEl.style.maxHeight)
  assert(textEl.style.overflow === 'hidden', '超长正文 overflow: hidden')
  const toggle = seat.querySelector('.dshi-utoggle')
  assert(toggle !== null, '插入了切换按钮')
  assert(toggle !== null && toggle.textContent === '展开', '按钮文案为「展开」', toggle?.textContent)
  ctrl.stop()
  clear()
}

// ---------------------------------------------------------------------------
// 场景 2：点击按钮展开 / 收起
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 2: 点击按钮展开再收起 ===')
  const { env, document, flow, register, clear } = setup()
  const { seat, textEl } = makeUserMessage(flow, 'u-toggle', '这是一段特别长的用户输入文本，需要被默认折叠起来。'.repeat(4))
  document.body.appendChild(flow)
  register()
  const ctrl = new InputCollapseController({ maxLines: 3, autoCollapse: true, minChars: 5 })
  ctrl.start()
  await runTicks(env, 3)
  let toggle = seat.querySelector('.dshi-utoggle')
  assert(toggle !== null, '初始有按钮')
  toggle.dispatchEvent('click')   // 展开
  await runTicks(env, 2)
  assert(textEl.style.maxHeight === '' || textEl.style.maxHeight === null, '展开后 max-height 被还原', textEl.style.maxHeight)
  toggle = seat.querySelector('.dshi-utoggle')
  assert(toggle !== null && toggle.textContent === '收起', '展开后按钮文案为「收起」', toggle?.textContent)
  toggle.dispatchEvent('click')   // 收起
  await runTicks(env, 2)
  assert(textEl.style.maxHeight !== '' && textEl.style.maxHeight !== null, '再点后重新折叠（max-height 恢复）', textEl.style.maxHeight)
  assert(textEl.style.overflow === 'hidden', '再点后 overflow 恢复 hidden')
  ctrl.stop()
  clear()
}

// ---------------------------------------------------------------------------
// 场景 3：短输入不折叠、不插按钮
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 3: 短输入保持默认（不裁剪不插按钮） ===')
  const { env, document, flow, register, clear } = setup()
  const { seat, textEl } = makeUserMessage(flow, 'u-short', '你好')
  document.body.appendChild(flow)
  register()
  const ctrl = new InputCollapseController({ maxLines: 3, autoCollapse: true, minChars: 5 })
  ctrl.start()
  await runTicks(env, 3)

  assert(textEl.style.maxHeight === '' || textEl.style.maxHeight === null, '短输入未被裁剪', textEl.style.maxHeight)
  assert(seat.querySelector('.dshi-utoggle') === null, '短输入未插入按钮')
  ctrl.stop()
  clear()
}

// ---------------------------------------------------------------------------
// 场景 4：stop() 还原内联样式并移除按钮
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 4: stop() 还原（max-height/overflow + 按钮） ===')
  const { env, document, flow, register, clear } = setup()
  const { seat, textEl } = makeUserMessage(flow, 'u-restore', '这是一段特别长的用户输入文本，需要被默认折叠起来。'.repeat(4))
  document.body.appendChild(flow)
  register()
  const ctrl = new InputCollapseController({ maxLines: 3, autoCollapse: true, minChars: 5 })
  ctrl.start()
  await runTicks(env, 3)
  assert(textEl.style.maxHeight !== '', '折叠态已设置')
  ctrl.stop()
  assert(textEl.style.maxHeight === '' || textEl.style.maxHeight === null, 'stop() 后 max-height 还原', textEl.style.maxHeight)
  assert(textEl.style.overflow === '' || textEl.style.overflow === null, 'stop() 后 overflow 还原', textEl.style.overflow)
  assert(seat.querySelector('.dshi-utoggle') === null, 'stop() 后按钮移除')
  clear()
}

// ---------------------------------------------------------------------------
// 场景 5：布局溢出路径（scrollHeight > maxLines×行高）也判定为超行
// ---------------------------------------------------------------------------
{
  console.log('\n=== 场景 5: 布局溢出判定为超行（即使字符数低于阈值） ===')
  const { env, document, flow, register, clear } = setup()
  const { seat, textEl } = makeUserMessage(flow, 'u-overflow', '溢出内容', { scrollHeight: 200 })
  document.body.appendChild(flow)
  register()
  // minChars 很高（字符路径不命中），maxLines=3、lineHeight=24 → 3*24=72 < 200 → 超行。
  const ctrl = new InputCollapseController({ maxLines: 3, autoCollapse: true, minChars: 99999 })
  ctrl.start()
  await runTicks(env, 3)

  assert(textEl.style.maxHeight !== '' && textEl.style.maxHeight !== null, '溢出内容被裁剪', textEl.style.maxHeight)
  assert(seat.querySelector('.dshi-utoggle') !== null, '溢出内容插入按钮')
  ctrl.stop()
  clear()
}

console.log(`\n[DONE] failures=${failures}`)
process.exit(failures === 0 ? 0 : 1)
