/**
 * fake-dom.mjs — 最小但够用的 DOM 桩，用于在 Node 里运行真实插件 bundle
 * （lib/client.js 的 IIFE）并对会话流 fixture 做状态断言。
 *
 * 覆盖插件用到的 API：createElement / createElementNS / createTreeWalker /
 * querySelectorAll（支持的 selector 见 parseSelector）/ closest / matches /
 * classList / dataset / style / append/prepend/before/remove / isConnected /
 * MutationObserver（仅记录回调）/ requestAnimationFrame（微任务）+ setTimeout。
 *
 * 只做 DOM 状态机验证，不做真实布局；fixture 高度用于估算 flex column
 * (gap:16px) 下的可见间隙，辅助判断“空白”。
 */

// ---------------------------------------------------------------------------
// selector 解析（支持 .class / #id / [attr] / [attr="v"] / :not(...) / 后代空格）
// ---------------------------------------------------------------------------
function tokenizeSelector(sel) {
  const tokens = []
  let i = 0
  while (i < sel.length) {
    while (i < sel.length && /\s/.test(sel[i])) i++
    if (i >= sel.length) break
    const start = i
    let depth = 0
    while (i < sel.length) {
      const c = sel[i]
      if (c === '(') depth++
      else if (c === ')') depth--
      else if (depth === 0 && /\s/.test(c)) break
      i++
    }
    tokens.push(sel.slice(start, i))
  }
  return tokens
}

function matchesSimple(el, simple) {
  // .class
  if (simple.startsWith('.')) return el.classList.contains(simple.slice(1))
  // #id
  if (simple.startsWith('#')) return el.attributes.get('id') === simple.slice(1)
  // :not(...)
  if (simple.startsWith(':not(') && simple.endsWith(')')) {
    const inner = simple.slice(5, -1)
    return !matchesSimple(el, inner)
  }
  // [attr="v"] / [attr*="v"] / [attr]
  if (simple.startsWith('[') && simple.endsWith(']')) {
    const inner = simple.slice(1, -1)
    const m = inner.match(/^([\w-]+)(\*?)(?:="([^"]*)")?$/)
    if (m === null) throw new Error(`unsupported attr selector: ${simple}`)
    const present = el.attributes.has(m[1])
    if (m[3] === undefined) return m[2] !== '*' && present
    if (!present) return false
    const actual = el.attributes.get(m[1])
    return m[2] === '*' ? actual.includes(m[3]) : actual === m[3]
  }
  // 标签名
  return el.tagName !== null && el.tagName.toLowerCase() === simple.toLowerCase()
}

/** 一个 token（无空格）可能是多个简单选择器的连接：.a[attr="v"]:not(...)tag */
function matchConjunction(el, token) {
  let rest = token
  while (rest.length > 0) {
    if (rest.startsWith('.')) {
      const m = rest.match(/^\.([\w-]+)/)
      if (m === null) throw new Error(`unsupported class selector: ${rest}`)
      if (!el.classList.contains(m[1])) return false
      rest = rest.slice(m[0].length)
    } else if (rest.startsWith('#')) {
      const m = rest.match(/^#([\w-]+)/)
      if (m === null) throw new Error(`unsupported id selector: ${rest}`)
      if (el.attributes.get('id') !== m[1]) return false
      rest = rest.slice(m[0].length)
    } else if (rest.startsWith('[')) {
      const m = rest.match(/^\[([\w-]+)(\*?)(?:="([^"]*)")?\]/)
      if (m === null) throw new Error(`unsupported attr selector: ${rest}`)
      const present = el.attributes.has(m[1])
      if (m[3] === undefined) {
        if (m[2] === '*' || !present) return false
      } else if (!present) {
        return false
      } else {
        const actual = el.attributes.get(m[1])
        if (m[2] === '*' ? !actual.includes(m[3]) : actual !== m[3]) return false
      }
      rest = rest.slice(m[0].length)
    } else if (rest.startsWith(':not(')) {
      let depth = 0
      let i = 0
      for (; i < rest.length; i++) {
        if (rest[i] === '(') depth++
        else if (rest[i] === ')') {
          depth--
          if (depth === 0) { i++; break }
        }
      }
      const inner = rest.slice(5, i - 1)
      if (matchConjunction(el, inner)) return false
      rest = rest.slice(i)
    } else {
      const m = rest.match(/^[\w-]+/)
      if (m === null) throw new Error(`unsupported selector part: ${rest}`)
      if (el.tagName.toLowerCase() !== m[0].toLowerCase()) return false
      rest = rest.slice(m[0].length)
    }
  }
  return true
}

function splitSelectorList(sel) {
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i]
    if (c === '(') depth++
    else if (c === ')') depth--
    else if (c === ',' && depth === 0) {
      parts.push(sel.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(sel.slice(start).trim())
  return parts.filter(Boolean)
}

function matchesSelector(el, sel) {
  return splitSelectorList(sel).some(alt => {
    const tokens = tokenizeSelector(alt)
    if (tokens.length === 1) return matchConjunction(el, tokens[0])
    let cursor = el
    for (let t = tokens.length - 1; t >= 0; t--) {
      let hit = null
      for (let node = cursor; node !== null; node = node.parentNode) {
        if (node.nodeType === 1 && matchConjunction(node, tokens[t])) {
          hit = node
          break
        }
      }
      if (hit === null) return false
      cursor = hit.parentNode
    }
    return true
  })
}

// ---------------------------------------------------------------------------
// 节点基类
// ---------------------------------------------------------------------------
class FakeNode {
  constructor() {
    this.nodeType = 0
    this.parentNode = null
    this.childNodes = []
    this._listeners = {}
  }
  get children() {
    return this.childNodes.filter(n => n.nodeType === 1)
  }
  get parentElement() {
    return this.parentNode !== null && this.parentNode.nodeType === 1 ? this.parentNode : null
  }
  get lastElementChild() {
    return this.children[this.children.length - 1] ?? null
  }
  get firstElementChild() {
    return this.children[0] ?? null
  }
  get nextElementSibling() {
    if (this.parentNode === null) return null
    const kids = this.parentNode.children
    const i = kids.indexOf(this)
    return i >= 0 && i + 1 < kids.length ? kids[i + 1] : null
  }
  get previousElementSibling() {
    if (this.parentNode === null) return null
    const kids = this.parentNode.children
    const i = kids.indexOf(this)
    return i > 0 ? kids[i - 1] : null
  }
  get isConnected() {
    let p = this.parentNode
    while (p !== null) {
      if (p.nodeType === 9 || p === document) return true
      p = p.parentNode
    }
    return this === document
  }
  appendChild(child) {
    child.parentNode = this
    this.childNodes.push(child)
    return child
  }
  append(...nodes) {
    for (const n of nodes) this.appendChild(n)
  }
  prepend(...nodes) {
    for (const n of [...nodes].reverse()) this.insertBefore(n, this.childNodes[0] ?? null)
  }
  insertBefore(child, ref) {
    // 真实 DOM 语义：已挂载节点先移除旧位置再插入（同一节点只在一处）。
    if (child.parentNode !== null) {
      const oldIdx = child.parentNode.childNodes.indexOf(child)
      if (oldIdx >= 0) child.parentNode.childNodes.splice(oldIdx, 1)
    }
    child.parentNode = this
    const idx = ref === null || ref === undefined ? -1 : this.childNodes.indexOf(ref)
    if (idx < 0) this.childNodes.push(child)
    else this.childNodes.splice(idx, 0, child)
    return child
  }
  before(node) {
    if (this.parentNode === null) return
    this.parentNode.insertBefore(node, this)
  }
  after(node) {
    if (this.parentNode === null) return
    const kids = this.parentNode.childNodes
    const idx = kids.indexOf(this)
    if (idx < 0) return
    this.parentNode.insertBefore(node, kids[idx + 1] ?? null)
  }
  remove() {
    if (this.parentNode === null) return
    const idx = this.parentNode.childNodes.indexOf(this)
    if (idx >= 0) this.parentNode.childNodes.splice(idx, 1)
    this.parentNode = null
  }
  addEventListener(type, fn) {
    ;(this._listeners[type] ??= []).push(fn)
  }
  dispatchEvent(type) {
    for (const fn of this._listeners[type] ?? []) fn({ type, target: this })
  }
  /** 先序遍历位掩码子集：PRECEDING=2 / FOLLOWING=4 / CONTAINS=8 / CONTAINED_BY=16。
   * 与真实 Node.compareDocumentPosition 语义一致（祖先链优先于顺序）。 */
  compareDocumentPosition(other) {
    const order = []
    const walk = (node) => {
      order.push(node)
      for (const c of node.childNodes) walk(c)
    }
    walk(document)
    const i = order.indexOf(this)
    const j = order.indexOf(other)
    if (i < 0 || j < 0) return 0
    if (i === j) return 0
    let p = other.parentNode
    while (p !== null) {
      if (p === this) return 8 // this 包含 other
      p = p.parentNode
    }
    p = this.parentNode
    while (p !== null) {
      if (p === other) return 16 // other 包含 this
      p = p.parentNode
    }
    return i < j ? 4 : 2
  }
}

class FakeText extends FakeNode {
  constructor(data) {
    super()
    this.nodeType = 3
    this.data = data
  }
  cloneNode() {
    return new FakeText(this.data)
  }
}

class FakeElement extends FakeNode {
  constructor(tagName) {
    super()
    this.nodeType = 1
    this.tagName = tagName.toUpperCase()
    this.attributes = new Map()
    this._classList = new Set()
    this.style = new Proxy({}, {
      get: (t, k) => {
        // CSSStyleDeclaration 方法桩（issue #11 测试需要）：自定义属性读写与
        // 删除，供插件的所有权哨兵（--dshcf-display-owned）走真实代码路径。
        if (k === 'getPropertyValue') return (p) => (p in t ? t[p] : '')
        if (k === 'setProperty') return (p, v) => { t[p] = String(v) }
        if (k === 'removeProperty') return (p) => { const old = p in t ? t[p] : ''; delete t[p]; return old }
        return k in t ? t[k] : ''
      },
      set: (t, k, v) => {
        // cssText 整体赋值 = 替换全部内联样式：清空后按 `prop:value` 极简解析
        // （仅覆盖测试用到的 display 这类无前缀简单声明），模拟外部扩展用
        // setAttribute('style')/cssText 改写时抹掉插件自定义属性哨兵的行为。
        if (k === 'cssText') {
          for (const key of Object.keys(t)) delete t[key]
          for (const decl of String(v).split(';')) {
            const i = decl.indexOf(':')
            if (i > 0) t[decl.slice(0, i).trim()] = decl.slice(i + 1).trim()
          }
          return true
        }
        t[k] = String(v)
        return true
      },
    })
    this.dataset = new Proxy({}, {
      get: (t, k) => (k in t ? t[k] : undefined),
      set: (t, k, v) => {
        t[k] = String(v)
        return true
      },
    })
    this.offsetParent = null
    this._rect = { width: 0, height: 0 }
    // 滚动几何桩（issue #14 测试用）：默认 0 值让 findScrollContainer 的
    // scrollHeight > clientHeight 判定为否，存量测试不触发滚动稳定化路径。
    this.scrollTop = 0
    this.clientHeight = 0
    this.scrollHeight = 0
  }
  get classList() {
    const set = this._classList
    return {
      add: (...cs) => cs.forEach(c => set.add(c)),
      remove: (...cs) => cs.forEach(c => set.delete(c)),
      toggle: (c, force) => {
        if (force === undefined) {
          if (set.has(c)) { set.delete(c); return false }
          set.add(c)
          return true
        }
        if (force) set.add(c)
        else set.delete(c)
        return force
      },
      contains: c => set.has(c),
    }
  }
  getAttribute(name) {
    if (name === 'class') return [...this._classList].join(' ')
    return this.attributes.get(name) ?? null
  }
  get className() {
    return [...this._classList].join(' ')
  }
  set className(v) {
    this._classList = new Set(String(v).split(/\s+/).filter(Boolean))
  }
  /** id 属性赋值同步到 attributes（插件代码直接 style.id = …）。 */
  set id(v) {
    this.setAttribute('id', String(v))
  }
  setAttribute(name, value) {
    if (name === 'class') {
      this._classList = new Set(String(value).split(/\s+/).filter(Boolean))
      return
    }
    this.attributes.set(name, String(value))
  }
  hasAttribute(name) {
    if (name === 'class') return this._classList.size > 0
    return this.attributes.has(name)
  }
  removeAttribute(name) {
    this.attributes.delete(name)
  }
  matches(sel) {
    return matchesSelector(this, sel)
  }
  closest(sel) {
    let node = this
    while (node !== null) {
      if (node.nodeType === 1 && matchesSelector(node, sel)) return node
      node = node.parentNode
    }
    return null
  }
  querySelectorAll(sel) {
    const out = []
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === 1) {
          if (matchesSelector(child, sel)) out.push(child)
          walk(child)
        }
      }
    }
    walk(this)
    return out
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] ?? null
  }
  get textContent() {
    let out = ''
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === 3) out += child.data
        else walk(child)
      }
    }
    walk(this)
    return out
  }
  set textContent(v) {
    this.childNodes = [new FakeText(String(v))]
    this.childNodes[0].parentNode = this
  }
  getBoundingClientRect() {
    return { ...this._rect }
  }
  setRect(rect) {
    Object.assign(this._rect, rect)
  }
  /** 最小 cloneNode（真实语义：副本无父节点；deep 复制子树）。
   * 图标克隆分支（findNativeCommandSvg/WriteSvg → cloneNode）此前在测试
   * 里不可达——桩缺该方法时克隆路径直接抛错，只能测到兜底分支。 */
  cloneNode(deep = false) {
    const copy = new FakeElement(this.tagName)
    for (const [k, v] of this.attributes) copy.attributes.set(k, v)
    copy._classList = new Set(this._classList)
    copy._rect = { ...this._rect }
    if (deep) {
      for (const child of this.childNodes) {
        copy.appendChild(child.cloneNode(true))
      }
    }
    return copy
  }
  /** 最小 WAAPI 桩（Element 级 API，不放在 FakeNode）：记录 keyframes/options
   * 供断言；动画实例挂在 el._animations 上供测试观察。 */
  animate(keyframes, options) {
    const anim = new FakeAnimation(this)
    anim.keyframes = keyframes
    anim.options = options ?? {}
    ;(this._animations ??= []).push(anim)
    return anim
  }
}

// ---------------------------------------------------------------------------
// document 桩
// ---------------------------------------------------------------------------
class FakeDocument extends FakeElement {
  constructor() {
    super('#document')
    this.nodeType = 9
    this.head = new FakeElement('head')
    this.head.parentNode = this
    this.body = new FakeElement('body')
    this.body.parentNode = this
    this._all = [this.head, this.body]
  }
  createElement(tag) {
    const el = new FakeElement(tag)
    this._all.push(el)
    return el
  }
  createElementNS(_ns, tag) {
    return this.createElement(tag)
  }
  createTextNode(data) {
    return new FakeText(data)
  }
  createTreeWalker(root, whatToShow) {
    const textNodes = []
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === 3) {
          if ((whatToShow & 4) !== 0) textNodes.push(child)
        } else walk(child)
      }
    }
    walk(root)
    let i = -1
    return {
      nextNode() {
        i++
        return textNodes[i] ?? null
      },
    }
  }
  getElementById(id) {
    return this._all.find(el => el.nodeType === 1 && el.isConnected && el.attributes.get('id') === id) ?? null
  }
  querySelectorAll(sel) {
    return this._all.filter(el => el.nodeType === 1 && el.isConnected && matchesSelector(el, sel))
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] ?? null
  }
}

// ---------------------------------------------------------------------------
// WAAPI 桩
// ---------------------------------------------------------------------------
/** 最小动画桩：setTimeout(0) 自动结算 onfinish——tick() 的 5ms await 窗口足以
 * 排干，既有「click → tick → 断言 display」用例零改动。cancel 同步置 _done
 * （兼容既有断言）但把 oncancel 派发/reject 移出 _settle 守卫异步触发——否则
 * 派发永不发生，生产代码的 oncancel 身份守卫路径零覆盖（评审实锤项）。
 * finished 惰性创建，无人访问就不产生未处理的 rejection。 */
class FakeAnimation {
  constructor(el) {
    this.el = el
    this.onfinish = null
    this.oncancel = null
    this._done = false
    this._finished = null
    this._cancelDispatched = false
    this._timer = setTimeout(() => this._settle(), 0)
  }

  _settle() {
    if (this._done) return
    this._done = true
    this._resolveFinished?.()
    if (typeof this.onfinish === 'function') this.onfinish()
  }

  cancel() {
    if (this._done) return
    this._done = true
    clearTimeout(this._timer)
    setTimeout(() => {
      this._cancelDispatched = true
      this._rejectFinished?.(new Error('Animation cancelled'))
      if (typeof this.oncancel === 'function') this.oncancel()
    }, 0)
  }

  get finished() {
    this._finished ??= new Promise((resolve, reject) => {
      this._resolveFinished = resolve
      this._rejectFinished = reject
    })
    return this._finished
  }
}

// ---------------------------------------------------------------------------
// 全局桩
// ---------------------------------------------------------------------------
export function installDomGlobals() {
  const document = new FakeDocument()
  const rafQueue = []
  const timers = new Set()

  const g = {
    document,
    window: {},
    matchMedia(query) {
      return { matches: false, media: query }
    },
    NodeFilter: { SHOW_TEXT: 4 },
    /** 最小 computed-style 桩：display 取内联（与旧 isDisplayed 内联语义等价），
     * rowGap 固定 16px 对齐 layoutHeights 的 flex-column(gap=16) 模型，
     * marginBottom 取内联——供 fold.ts 的 gap 补偿读取（plan 前提 2/3）。
     * overflowY 取内联（默认 visible）——供 findScrollContainer 判定滚动容器。 */
    getComputedStyle(el) {
      const style = el && el.style ? el.style : {}
      return {
        display: style.display || 'block',
        rowGap: '16px',
        marginBottom: style.marginBottom || '0px',
        overflowY: style.overflowY || 'visible',
      }
    },
    MutationObserver: class {
      constructor(cb) {
        this.cb = cb
        globalThis.__dshcf_observers ??= []
        globalThis.__dshcf_observers.push(this)
      }
      observe(target, options) {
        // 记录订阅契约：真实 MutationObserver 的 attributeFilter/subtree/
        // characterData 语义无法在桩里重放，但「插件订阅了什么」可以且
        // 必须可断言（filter 写错属性名时所有测试仍会绿——这是覆盖缺口）。
        this._target = target
        this._options = options
        ;(globalThis.__dshcf_observer_options ??= []).push({ target, options })
      }
      disconnect() {}
    },
    requestAnimationFrame(cb) {
      rafQueue.push(cb)
      return rafQueue.length
    },
    cancelAnimationFrame(id) {
      rafQueue[id - 1] = undefined
    },
  }
  const realSetTimeout = globalThis.setTimeout
  const realClearTimeout = globalThis.clearTimeout
  g.setTimeout = (fn, ms) => {
    const id = realSetTimeout(fn, ms)
    timers.add(id)
    return id
  }
  g.clearTimeout = (id) => {
    realClearTimeout(id)
    timers.delete(id)
  }
  for (const [k, v] of Object.entries(g)) globalThis[k] = v
  globalThis.Element = FakeElement
  globalThis.HTMLElement = FakeElement
  globalThis.Text = FakeText
  globalThis.Node = FakeNode

  return {
    document,
    /** 跑完所有排队的 rAF 回调（同步）。 */
    flushRaf() {
      while (rafQueue.length > 0) rafQueue.splice(0).forEach(cb => cb?.())
    },
    notifyMutations(records = []) {
      for (const obs of globalThis.__dshcf_observers ?? []) obs.cb(records, obs)
    },
    /** 模拟一轮：任何 DOM 变更后 rAF 合并回调 + 兜底定时器。 */
    async tick() {
      this.notifyMutations()
      this.flushRaf()
      await new Promise(r => setTimeout(r, 5))
      this.flushRaf()
    },
    clearTimers() {
      for (const id of timers) clearTimeout(id)
      timers.clear()
    },
  }
}

// ---------------------------------------------------------------------------
// fixture 构建助手
// ---------------------------------------------------------------------------
export function el(tag, attrs = {}, parent = null) {
  const e = new FakeElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.setAttribute('class', v)
    else if (k === 'text') e.textContent = v
    else e.setAttribute(k, v)
  }
  if (parent !== null) parent.appendChild(e)
  return e
}

export function textNode(data, parent = null) {
  const t = new FakeText(data)
  if (parent !== null) parent.appendChild(t)
  return t
}

/**
 * 构建一个工具行（工具卡 DisclosureRow）：
 * [data-chat-call-id] root → [data-tool][data-state] → [data-disclosure-row]
 * → leading/title/sep/summary + body（keepContentWhenOpen 结构）
 */
export function makeToolRow({ callId, tool, state = 'ok', summary = '', bodyText = null, open = false, parent }) {
  const row = el('div', { 'data-chat-anchor-key': `call:${callId}`, 'data-chat-call-id': callId }, parent)
  const root = el('div', { 'data-tool': tool, 'data-state': state, 'data-open': open ? 'true' : 'false' }, row)
  const drow = el('div', { 'data-disclosure-row': '' }, root)
  el('span', { class: 'leading' }, drow)
  el('span', { class: 'title', text: tool }, drow)
  el('span', { class: 'sep' }, drow)
  el('span', { class: 'summary', text: summary }, drow)
  if (bodyText !== null) {
    const body = el('pre', { class: 'body' }, drow)
    textNode(bodyText, body)
  }
  return row
}

/**
 * 构建一个 think 推理行：[data-variant="think"][data-state] →
 * [data-disclosure-row] → title/summary([data-follow-end]) + thinkBody
 */
export function makeThinkRow({ state = 'ok', summary = '', bodyText = null, parent, followEnd = false }) {
  const row = el('div', { 'data-variant': 'think', 'data-state': state, 'data-open': 'false' }, parent)
  const drow = el('div', { 'data-disclosure-row': '' }, row)
  el('span', { class: 'leading' }, drow)
  el('span', { class: 'title', text: 'Think' }, drow)
  const s = el('span', { class: 'summary', text: summary }, drow)
  if (followEnd) s.setAttribute('data-follow-end', '')
  if (bodyText !== null) {
    const body = el('div', { class: 'thinkBody' }, drow)
    textNode(bodyText, body)
  }
  return row
}

/** 计算 fixture 在 flex column(gap=16px) 下的每项可见高度与累计间隙。 */
export function layoutHeights(flow) {
  const gap = 16
  const out = []
  let prevVisible = false
  let extraGap = 0
  for (const child of flow.children) {
    if (child.style.display === 'none') continue
    const h = child._rect.height ?? 0
    if (prevVisible) extraGap += gap
    out.push({ kind: child.getAttribute('data-chat-flow-kind') ?? '?', cls: child.getAttribute('class') ?? '', h, display: child.style.display })
    prevVisible = true
  }
  return { items: out, extraGap }
}
