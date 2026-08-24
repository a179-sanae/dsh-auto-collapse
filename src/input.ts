/**
 * InputCollapseController —— dsh-input-collapse 的核心（内嵌于 dsh-auto-collapse 工程）。
 *
 * 职责：前端显示优化——当用户**自己发送的输入文本**（`data-chat-flow-kind="user"`
 * / `"steering"` 消息气泡）特别长、超过一定行数时，默认把它**折叠**起来：
 *
 *   - DSH 官方对超长用户输入不做任何折叠，会一屏铺开（`MessageText` 原样渲染）。
 *   - 本模块在消息正文超过 `maxLines` 行时，给正文容器加 `max-height`（=
 *     maxLines × 行高）并 `overflow: hidden`，只露出前几行，并在正文下方插入一个
 *     「展开 / 收起」切换按钮；点击展开/收起，正文宽度内不撑高、不占整屏。
 *   - 短输入保持官方默认（不折叠、不加按钮）。
 *   - 可逆：卸载（HMR stop）时还原正文内联样式并移除按钮与样式。
 *
 * 与 FoldController 的关系：fold 折叠模型输出（工具块/推理块/上下文注入），
 * 本模块折叠的是**用户自己的输入消息**。两者作用对象不同（fold 处理
 * assistant/tool/context；本模块只处理 user / steering），互不冲突。
 *
 * 零核心改动、零运行时依赖，纯 DOM（MutationObserver + rAF 合并）。识别依据是
 * DSH Web 客户端渲染时写死的稳定 data 属性（data-chat-flow /
 * data-chat-flow-kind / data-chat-anchor-key），正文容器通过「最长文本节点的
 * 父元素」定位（CSS Modules 类名是哈希，不能用类名选择器）。
 */

/** 注入到 `<style>` 的 id：与 fold.ts 的 `dshcf-style` 分开。 */
const INPUT_STYLE_ID = 'dsh-input-style'

/** 默认「折叠」阈值：正文超过该行数即折叠。 */
const DEFAULT_MAX_LINES = 12

/** 无法用布局测量行数时的字符兜底阈值（约折合 maxLines 行）。 */
const DEFAULT_MIN_CHARS = 800

/** 读不到 computedStyle.lineHeight 时的兜底行高（px，DSH 用户气泡 16/24）。 */
const DEFAULT_LINE_HEIGHT = 24

/** 控制器配置（当前为模块默认值；后续可接设置卡）。 */
export interface InputCollapseConfig {
  /** 正文超过该行数即折叠。 */
  maxLines: number
  /** 是否启用折叠。 */
  autoCollapse: boolean
  /** 显式行高（px）；不提供则读 computedStyle，读不到时回退 24。 */
  lineHeight?: number
  /** 无布局测量时的字符兜底阈值。 */
  minChars: number
}

/** 被改写过的正文容器内联样式记录（卸载/关闭时还原）。 */
interface TextStyleRecord {
  maxHeight: string | null
  overflow: string | null
}

export class InputCollapseController {
  private observer: MutationObserver | null = null
  private raf = 0
  private timer = 0
  private disposed = false

  private flow: HTMLElement | null = null

  /** anchor key → 展开态（true = 已展开显示全文）。 */
  private expanded = new Map<string, boolean>()
  /** anchor key → 当前正文容器（用于按钮/内联样式对照）。 */
  private textEls = new Map<string, HTMLElement>()
  /** anchor key → 切换按钮。 */
  private toggles = new Map<string, HTMLButtonElement>()
  /** 被改写过的正文容器内联样式，卸载时还原。 */
  private textStyles = new WeakMap<HTMLElement, TextStyleRecord>()

  private readonly config: InputCollapseConfig

  constructor(config: InputCollapseConfig = {
    maxLines: DEFAULT_MAX_LINES,
    autoCollapse: true,
    minChars: DEFAULT_MIN_CHARS,
  }) {
    this.config = config
  }

  /** 配置变更后立即重跑一轮。 */
  refresh(): void {
    this.schedule()
  }

  start(): void {
    if (this.disposed) return
    injectInputStyle()
    try {
      this.observer = new MutationObserver(records => {
        if (this.shouldSchedule(records)) this.schedule()
      })
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-chat-flow-kind', 'data-chat-anchor-key'],
        characterData: true,
      })
      this.schedule()
    } catch (error) {
      this.reportError(error)
      throw error
    }
  }

  stop(): void {
    this.disposed = true
    if (this.raf !== 0) cancelAnimationFrame(this.raf)
    if (this.timer !== 0) clearTimeout(this.timer)
    this.observer?.disconnect()
    this.resetFlow()
    removeInputStyle()
  }

  private shouldSchedule(records: MutationRecord[]): boolean {
    if (records.length === 0 || this.flow === null || !this.flow.isConnected) return true
    return records.some(record => (
      nodeWithin(record.target, this.flow as HTMLElement)
      || nodeWithin(this.flow as HTMLElement, record.target)
    ))
  }

  private schedule(): void {
    if (this.disposed || this.raf !== 0) return
    this.raf = requestAnimationFrame(() => {
      this.raf = 0
      if (this.timer !== 0) {
        clearTimeout(this.timer)
        this.timer = 0
      }
      this.runPass()
    })
    // 后台 tab 的 rAF 会被挂起：setTimeout 兜底保证 pass 一定执行。
    if (this.timer !== 0) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = 0
      if (this.raf !== 0) {
        cancelAnimationFrame(this.raf)
        this.raf = 0
        this.runPass()
      }
    }, 60)
  }

  private runPass(): void {
    if (this.disposed) return
    try {
      this.pass()
    } catch (error) {
      this.reportError(error)
    }
  }

  private reportError(error: unknown): void {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    const style = document.getElementById(INPUT_STYLE_ID)
    style?.setAttribute('data-dsh-input-error', message.slice(0, 500))
    console.error('[dsh-input-collapse] pass failed', error)
  }

  /** 一轮重放：定位 flow → 对每条 user / steering 消息判定是否超行并应用。 */
  private pass(): void {
    if (this.disposed) return

    const nextFlow = findFlow()
    if (nextFlow !== this.flow) this.switchFlow(nextFlow)
    const flow = this.flow
    if (flow === null) return

    const liveKeys = new Set<string>()
    for (const seat of flow.children) {
      if (!(seat instanceof HTMLElement)) continue
      const kind = seat.getAttribute('data-chat-flow-kind')
      if (kind !== 'user' && kind !== 'steering') continue
      const key = seat.getAttribute('data-chat-anchor-key')
        ?? seat.getAttribute('data-chat-flow-key')
        ?? ''
      if (key === '') continue
      liveKeys.add(key)
      this.handleSeat(seat, key)
    }

    // 清理离开当前 flow 的记录，避免会话切换后串味。
    for (const key of [...this.expanded.keys()]) {
      if (liveKeys.has(key)) continue
      this.cleanupKey(key)
    }
  }

  /** 处理一条 user / steering 消息：定位正文 → 判定 → 折叠/展开/还原。 */
  private handleSeat(seat: HTMLElement, key: string): void {
    const textEl = messageTextElement(seat)
    // 无正文（纯图片/未知块）或定位失败：还原并返回。
    if (textEl === null) {
      this.restoreFor(key)
      return
    }

    const isLong = this.isLong(textEl)
    if (!isLong) {
      this.restoreFor(key)
      return
    }

    // 记忆当前正文容器。
    this.textEls.set(key, textEl)
    if (!this.expanded.has(key)) this.expanded.set(key, false)

    const open = this.expanded.get(key) ?? false
    this.applyClamp(textEl, open)
    this.ensureToggle(key, textEl, open)
  }

  /** 是否「超行」：正文自然高度大于 maxLines×行高（布局可用时），否则用字符数兜底。 */
  private isLong(el: HTMLElement): boolean {
    const lineHeight = this.lineHeightOf(el)
    const scrollHeight = el.scrollHeight
    if (typeof scrollHeight === 'number' && Number.isFinite(scrollHeight) && scrollHeight > 0) {
      return scrollHeight > lineHeight * this.config.maxLines + 1
    }
    return (el.textContent?.length ?? 0) >= this.config.minChars
  }

  private lineHeightOf(el: HTMLElement): number {
    if (this.config.lineHeight !== undefined) return this.config.lineHeight
    if (typeof getComputedStyle === 'function') {
      const parsed = parseFloat(getComputedStyle(el).lineHeight)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
    return DEFAULT_LINE_HEIGHT
  }

  /** 对正文容器应用折叠（open=false 时裁剪，open=true 时还原全文）。 */
  private applyClamp(el: HTMLElement, open: boolean): void {
    if (open) {
      this.restoreTextStyle(el)
      return
    }
    const record = this.textStyles.get(el)
    if (record === undefined) {
      this.textStyles.set(el, {
        maxHeight: el.style.maxHeight || null,
        overflow: el.style.overflow || null,
      })
    }
    const maxHeight = `${this.lineHeightOf(el) * this.config.maxLines}px`
    if (el.style.maxHeight !== maxHeight) el.style.maxHeight = maxHeight
    if (el.style.overflow !== 'hidden') el.style.overflow = 'hidden'
  }

  /** 还原单个正文容器的内联样式到记录值。 */
  private restoreTextStyle(el: HTMLElement): void {
    const record = this.textStyles.get(el)
    if (record === undefined) return
    if (record.maxHeight === null) el.style.maxHeight = ''
    else el.style.maxHeight = record.maxHeight
    if (record.overflow === null) el.style.overflow = ''
    else el.style.overflow = record.overflow
    this.textStyles.delete(el)
  }

  /** 插入/更新「展开 / 收起」按钮（紧跟正文之后）。 */
  private ensureToggle(key: string, textEl: HTMLElement, open: boolean): void {
    const existing = this.toggles.get(key)
    if (existing !== undefined && existing.isConnected && existing.previousElementSibling === textEl) {
      const label = open ? '收起' : '展开'
      if (existing.textContent !== label) existing.textContent = label
      return
    }
    existing?.remove()
    const fresh = document.createElement('button')
    fresh.type = 'button'
    fresh.className = 'dshi-utoggle'
    fresh.addEventListener('click', () => {
      const next = !(this.expanded.get(key) ?? false)
      this.expanded.set(key, next)
      const current = this.textEls.get(key)
      if (current !== undefined) this.applyClamp(current, next)
      const active = this.toggles.get(key)
      if (active !== undefined) active.textContent = next ? '收起' : '展开'
      this.schedule()
    })
    textEl.after(fresh)
    this.toggles.set(key, fresh)
    fresh.textContent = open ? '收起' : '展开'
  }

  /** 还原某 key 的全部改写（短消息 / 无正文 / 会话切换清理）。 */
  private restoreFor(key: string): void {
    const textEl = this.textEls.get(key)
    if (textEl !== undefined) this.restoreTextStyle(textEl)
    this.textEls.delete(key)
    const toggle = this.toggles.get(key)
    toggle?.remove()
    this.toggles.delete(key)
    this.expanded.delete(key)
  }

  private cleanupKey(key: string): void {
    this.restoreFor(key)
  }

  /** flow 替换 = 会话切换：还原全部正文与按钮，再重建。 */
  private switchFlow(next: HTMLElement | null): void {
    if (next === this.flow) return
    this.resetFlow()
    this.flow = next
  }

  /** 还原所有被改写的正文并移除按钮/样式记录。 */
  private resetFlow(): void {
    for (const textEl of [...this.textEls.values()]) {
      this.restoreTextStyle(textEl)
    }
    for (const toggle of this.toggles.values()) toggle.remove()
    this.textEls.clear()
    this.toggles.clear()
    this.expanded.clear()
  }
}

/** 注入按钮样式（仅诊断用错误态标记留在 style 节点的 data 属性上）。 */
const INPUT_CSS = `
.dshi-utoggle {
  appearance: none;
  background: none;
  border: none;
  margin: 4px 0 0;
  padding: 0;
  color: var(--dsw-alias-label-tertiary);
  font: 400 13px/20px system-ui, -apple-system, "Segoe UI", sans-serif;
  text-align: left;
  cursor: pointer;
  user-select: none;
}
.dshi-utoggle:hover {
  color: var(--dsw-alias-label-primary);
}
.dshi-utoggle:focus-visible {
  outline: 2px solid var(--dsw-alias-state-focus-ring, rgba(77, 107, 254, 0.8));
  outline-offset: 2px;
  border-radius: 4px;
}
`

function injectInputStyle(): void {
  if (typeof document === 'undefined' || document.getElementById(INPUT_STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = INPUT_STYLE_ID
  style.textContent = INPUT_CSS
  document.head.appendChild(style)
}

function removeInputStyle(): void {
  document.getElementById(INPUT_STYLE_ID)?.remove()
}

/** 找到当前可见的会话流容器（与 fold.ts 同款判定）。 */
function findFlow(): HTMLElement | null {
  const flows = document.querySelectorAll<HTMLElement>('[data-chat-flow]')
  for (const flow of flows) {
    if (flow.offsetParent !== null || flow.getBoundingClientRect().width > 0) return flow
  }
  return flows[0] ?? null
}

/** parentNode 链判断，兼容 Element 与 Text mutation target。 */
function nodeWithin(node: Node, ancestor: Node): boolean {
  for (let current: Node | null = node; current !== null; current = current.parentNode) {
    if (current === ancestor) return true
  }
  return false
}

/**
 * 定位用户消息的正文容器：消息里最长的文本节点的父元素，即官方
 * MessageText 渲染的 `.text` div（CSS Modules 类名是哈希，不能用类名选择器）。
 * 排除插件自身的折叠按钮，避免误抓自己的文本；chip 标签/时间戳等文本较短，
 * 不会成为最长文本节点。
 */
function messageTextElement(seat: HTMLElement): HTMLElement | null {
  let longest: Text | null = null
  let longestLength = 0
  const walker = document.createTreeWalker(seat, NodeFilter.SHOW_TEXT)
  let node: Text | null
  while ((node = walker.nextNode() as Text | null) !== null) {
    const parent = node.parentElement
    if (parent === null || parent.closest('.dshi-utoggle') !== null) continue
    const text = node.data
    if (text.trim() === '') continue
    if (text.length > longestLength) {
      longestLength = text.length
      longest = node
    }
  }
  if (longest === null) return null
  const parent = longest.parentElement
  if (parent === null || !(parent instanceof HTMLElement)) return null
  if (parent.hasAttribute('data-ref-chip')) return parent.parentElement
  return parent
}
