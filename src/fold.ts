/**
 * FoldController —— dsh-auto-collapse 的核心。
 *
 * 把会话流（[data-chat-flow]）里的“非正文 display”折叠成内联的一行，
 * 折叠行实时显示**当前正在进行的工作**（与 Codex 对齐）：
 *
 *   - 块里有运行中的工具调用 → 标题 = "Running" + 工具名（Bash/Read/
 *     Search…，读 data-tool），摘要 = 正在执行的命令/路径/查询（读工具
 *     卡片的 summary 行）；标题与摘要带平滑呼吸动画（Pulse）。
 *   - 块里正在思考（think running）→ 标题 = "Thinking"，摘要 = 思考的
 *     最新一行（读 [data-follow-end]，官方 ReasoningRow 的实时摘要锚点）。
 *   - 全部完成 → 标题 = 工具名列表（Bash · Read · Search），摘要 = (N)，
 *     leading 回到静态色块；出错 → 红色，中断 → 琥珀。
 *
 * 另外把官方 ChatView 尾部的运行状态行文字 "Deep diving..." 替换为
 * 可配置的状态提示词（默认 "Deep sleeping..."；流光特效在 CSS 上，
 * 替换文本节点不影响）。React 重渲染会恢复原文，pass() 每轮自愈改回。
 * 设置为空时不替换，等价于恢复官方 "Deep diving..."。
 *
 * 点击一行展开，再点收起；折叠态下若有行被选中（详情联动）自动展开。
 *
 * 折叠规则（沿用 dsh-web-archive 验证过的算法）：每个回合合成一块——
 * 某条消息的 Think 推理组与其后紧跟的工具组合并成一块（只有 think 或
 * 只有工具组时各自成块），在块宿主**原位**插入 chip；带正文文本的消息
 * 断开合并。结构保持 文本a - [折叠块] - 文本b - 文本c。
 *
 * 与 React 的关系：chip 插入 React 管理的 flow 子树内，但只做前置插入与
 * style.display 切换（React 的 vdom diff 不会感知也不会清除 CSSOM 上的
 * 手动样式）；MutationObserver 每轮把结构变化合并到一次
 * requestAnimationFrame 里重放（自愈：React 重渲染、切换会话、流式新
 * 卡片都会自动跟上）。
 *
 * 零核心改动：不修改任何 slot 注册，不依赖任何 client 服务。
 */

const STYLE_ID = 'dshcf-style'

/** 默认状态提示词，与设置在设置页里展示的默认值保持一致。 */
const DEFAULT_STATUS_TEXT = 'Deep sleeping...'

/** 显示动画参数（issue #2 区间 150–250ms）。 */
const ANIM_DURATION_MS = 180
const ANIM_EASING = 'ease-out'

/** 工具名（data-tool 属性）→ 展示名，与官方 tool-call-model 的标题对齐。 */
const TOOL_LABELS: Record<string, string> = {
  bash: 'Bash',
  pwsh: 'Pwsh',
  read: 'Read',
  web_fetch: 'Read',
  web_search: 'Search',
  grep: 'Search',
  glob: 'Search',
  write: 'Write',
  edit: 'Edit',
  run_code: 'Code',
  cordis_package_inspect: 'Inspect',
  cordis_runtime_inspect: 'Inspect',
  cordis_run: 'Run',
  cordis_stop: 'Stop',
  cordis_undefine: 'Remove',
}

const CHIP_CSS = `
.dshcf-chip {
  box-sizing: border-box;
  display: flex;
  align-self: flex-start;
  align-items: center;
  gap: 6px;
  width: fit-content;
  max-width: 100%;
  min-height: 24px;
  /* chip 插在块宿主（flowItem）内，享受不到行的 row-gap 16px；
     展开态补 margin-bottom 对齐行间节奏；收起态行已隐藏，若仍补
     margin 会与块间 gap 叠加成 32px，所以收起态为 0。 */
  margin-bottom: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: 400 14px/24px system-ui, -apple-system, "Segoe UI", sans-serif;
  text-align: left;
  cursor: pointer;
  user-select: none;
  /* 展开态补的 margin-bottom 16px 由 aria-expanded/has-body 翻转驱动；
     二级收起时若瞬变归零，chip 与首个三级行之间会突然缩短（实测宿主
     高度 64→48 瞬跳）。加过渡与 ANIM_DURATION_MS 对齐，收/展双向平滑。
     实践中该翻转只由用户点击（含 data-selected 强制展开）触发，
     流式协调器不改变它，无需额外门控。 */
  transition: margin-bottom 180ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .dshcf-chip { transition: none; }
}
.dshcf-chip[aria-expanded="true"],
.dshcf-chip.dshcf-has-body {
  margin-bottom: 16px;
}
/* context 等 before-mounted chip 是 flow 的直接子项，已经享受宿主
   row-gap: 16px；展开时不能再叠加自身 margin，否则二级到三级会变 32px。 */
.dshcf-chip.dshcf-flow-chip {
  margin-bottom: 0;
}
.dshcf-chip:hover {
  background: transparent;
}

/* leading：固定 14x14（思考块 = 原生 think 图标；工具块 = 原生 command
   图标 IconApiOutline14，克隆自真实 GenericCommandCard leading，找不到时
   退回终端小方块），行高 24px 与原生行对齐；运行中跳动。svg 尺寸由各自
   width/height 属性决定（command 14x14、think 14x14、终端 12x10 兜底），
   不在此处强制。 */
.dshcf-chip .dshcf-leading {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}
.dshcf-chip .dshcf-leading svg {
  display: block;
  color: var(--dsw-alias-label-tertiary);
}
.dshcf-chip.running .dshcf-leading svg {
  /* 运行色保留；图标跳动动画已按用户要求移除。 */
  color: var(--dsw-static-deepseek-500, #4d6bfe);
}

/* 运行指示三个点：已按用户要求移除（不再创建/显示）。 */

/* 出错红 / 中断琥珀（静止态）。 */
.dshcf-chip.error:not(.running) .dshcf-leading svg {
  color: var(--dsw-alias-state-error-primary, #e5484d);
}
.dshcf-chip.stopped:not(.running) .dshcf-leading svg {
  color: var(--dsw-alias-state-warning-primary, #f5a524);
}

.dshcf-chip .dshcf-chip-title {
  flex: none;
  font-weight: 400;
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshcf-chip .dshcf-chip-sep {
  flex: none;
  width: 2px;
  height: 2px;
  border-radius: 1px;
  background: var(--dsw-alias-label-caption, rgba(127, 127, 127, 0.5));
}
/* 摘要不撑满（flex 0 1），让 chevron 紧跟在文本右方而非行尾。 */
.dshcf-chip .dshcf-chip-summary {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* running 摘要：跟随滚动显示最新内容（text-overflow: clip，原生同款）。 */
.dshcf-chip.running .dshcf-chip-summary {
  text-overflow: clip;
}
/* 折叠行文字：复用 DSH 原生 label token（工具行同源），区别于正文纯白。 */
.dshcf-chip .dshcf-chip-title {
  color: var(--dsw-alias-label-primary);
}
.dshcf-chip .dshcf-chip-summary {
  color: var(--dsw-alias-label-tertiary);
}
/* 工具行摘要（命令/路径）等宽字体 + 代码衬底（素材 Codex 同款）。
   行高与 chip 一致（24px），流式更新时摘要单行 ellipsis 不换行不撑高。 */
.dshcf-chip[data-kind="tool"] .dshcf-chip-summary {
  font-family: ui-monospace, SFMono-Regular, Consolas, "Courier New", monospace;
  font-size: 12px;
  line-height: 24px;
  background: rgba(127, 127, 127, 0.14);
  border-radius: 4px;
  padding: 0 6px;
}
.dshcf-chip[data-kind="tool"] .dshcf-chip-summary:empty {
  background: none;
  padding: 0;
}

/* 运行中文字使用平滑呼吸动画（Pulse），适配浅色/深色主题，避免 background-clip 裁切问题。 */
.dshcf-chip.running .dshcf-chip-title,
.dshcf-chip.running .dshcf-chip-summary {
  color: var(--dsw-alias-label-tertiary, #8b8f99);
  -webkit-text-fill-color: currentColor;
  animation: dshcf-pulse 1.6s ease-in-out infinite;
}
.dshcf-chip.running[data-kind="tool"] .dshcf-chip-summary {
  background: transparent;
}
@keyframes dshcf-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* "已处理"行：最终输出出现后工作过程整体隐藏，只留这一行 + 时长。
   字体与二级 chip 对齐（14px/24px），左右无内边距（与正文左缘对齐）。 */
.dshcf-processed {
  display: inline-flex;
  align-self: flex-start;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  border: none;
  background: none;
  font: 400 14px/24px system-ui, -apple-system, "Segoe UI", sans-serif;
  /* 对齐 DSH 原生工具行摘要的次级层级（label-tertiary）。 */
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  user-select: none;
  border-radius: 4px;
  transition: color 0.15s ease;
}
.dshcf-processed:hover {
  color: var(--dsw-alias-label-primary);
  background: transparent;
}
.dshcf-processed:focus-visible {
  outline: 2px solid var(--dsw-alias-state-focus-ring, rgba(77, 107, 254, 0.8));
  outline-offset: 2px;
}
/* 折叠箭头：使用 DSH 原生 IconChevronDownOutline14 的 14x14 path。 */
.dshcf-processed .dshcf-processed-chevron {
  display: inline-flex;
  flex: none;
  width: 14px;
  height: 14px;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.55;
  transform: rotate(-90deg);
  transition: transform 0.12s ease, opacity 0.1s ease;
}
.dshcf-processed:hover .dshcf-processed-chevron {
  opacity: 0.9;
}
.dshcf-processed[aria-expanded="true"] .dshcf-processed-chevron {
  transform: rotate(0deg);
}

/* 三级合并思考行：展开二级后连续思考合并为一行（标题 = 第一行思考内容）。
   样式与 chip 同族（16px 图标盒、14px/24px、原生 label token 色）。 */
.dshcf-merged-think {
  box-sizing: border-box;
  display: flex;
  align-self: flex-start;
  align-items: center;
  gap: 6px;
  width: fit-content;
  max-width: 100%;
  min-height: 24px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: 400 14px/24px system-ui, -apple-system, "Segoe UI", sans-serif;
  text-align: left;
  cursor: pointer;
  user-select: none;
}
.dshcf-merged-think .dshcf-leading {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}
.dshcf-merged-think .dshcf-leading svg {
  display: block;
  color: var(--dsw-alias-label-tertiary);
}
.dshcf-merged-think .dshcf-merged-title {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 85%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
  font-weight: 400;
}
.dshcf-merged-think .dshcf-chevron {
  flex: none;
  width: 14px;
  height: 14px;
  color: var(--dsw-alias-label-secondary);
  opacity: 0.55;
  transform: rotate(-90deg);
  transition: transform 0.12s ease, opacity 0.1s ease;
}
.dshcf-merged-think:hover .dshcf-chevron,
.dshcf-merged-think:focus-visible .dshcf-chevron {
  opacity: 0.9;
}
.dshcf-merged-think[aria-expanded="true"] .dshcf-chevron {
  transform: rotate(0deg);
}
/* 合并思考内容块：四个思考合并为一个整体（对齐图标右侧缩进）。 */
.dshcf-merged-body {
  margin: 0 0 16px;
  padding-left: 22px;
  color: var(--dsw-alias-label-secondary);
  font: 400 13px/22px system-ui, -apple-system, "Segoe UI", sans-serif;
  white-space: pre-wrap;
  word-break: break-word;
}

/* chevron：默认隐藏，hover/focus 浮现，展开时旋转 90°（Codex 同款）。 */
.dshcf-chip .dshcf-chevron {
  flex: none;
  width: 14px;
  height: 14px;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.5;
  transform: rotate(-90deg);
  transition: opacity 0.1s ease, transform 0.12s ease;
}
.dshcf-chip:hover .dshcf-chevron,
.dshcf-chip:focus-visible .dshcf-chevron,
.dshcf-chip[aria-expanded="true"] .dshcf-chevron {
  opacity: 0.9;
}
.dshcf-chip[aria-expanded="true"] .dshcf-chevron {
  transform: rotate(0deg);
}
.dshcf-chip:focus-visible {
  outline: 2px solid var(--dsw-alias-state-focus-ring, rgba(77, 107, 254, 0.8));
  outline-offset: 2px;
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .dshcf-chip.running .dshcf-leading svg { animation: none; }
  .dshcf-chip.running .dshcf-chip-title,
  .dshcf-chip.running .dshcf-chip-summary {
    animation: none;
    opacity: 1;
  }
}
`

/** 一个“折叠块”：think 消息（+ 其后紧跟的工具组）合成的一块。 */
interface Block {
  /** 跨 React 元素替换保持稳定的块标识。 */
  key: string
  /** chip 插入处：think 消息元素（无 think 时是工具组元素）。 */
  host: HTMLElement
  /** 需要折叠/展开的行（推理块行 + 顶层工具卡片行）。 */
  rows: HTMLElement[]
  /** 需要随块折叠/展开的容器（工具组元素，避免折叠后残留空白）。 */
  containers: HTMLElement[]
  /** context/兜底 command 需要把 chip 放在宿主前，避免隐藏宿主时连 chip 一起隐藏。 */
  mount: 'inside' | 'before'
  category: 'work' | 'context'
}

interface SegmentSnapshot {
  key: string
  boundary: HTMLElement | null
  startMarker: HTMLElement | null
  blocks: Block[]
  /** 回合内中间正文消息（assistant-step + 正文，非最终输出）。 */
  middleSteps: Set<HTMLElement>
  finalStep: HTMLElement | null
  firstWork: HTMLElement | null
  closed: boolean
  running: boolean
  hasWork: boolean
}

interface SegmentState {
  key: string
  row: HTMLButtonElement | null
  expanded: boolean
  snapshot: SegmentSnapshot
  duration?: number
}

interface ChipRecord {
  host: HTMLElement
  chip: HTMLButtonElement
}

/** 一行的实时摘要信息。 */
interface RowInfo {
  kind: 'tool' | 'think'
  label: string
  summary: string
  state: string
}

/** 一条在途显示动画的记录。target 是动画的目标方向（非当前视觉状态）。 */
interface PendingAnim {
  anim: Animation
  target: 'hidden' | 'visible'
  /** fade=纯透明度/位移；height=几何锁动画（在途取消时需同步清锁高内联）。 */
  kind: 'fade' | 'height'
}

export class FoldController {
  private observer: MutationObserver | null = null
  private raf = 0
  private timer = 0
  private disposed = false
  private lastPassError = ''

  private flow: HTMLElement | null = null
  /** 稳定 block key → 当前 React 渲染中的 chip/host。 */
  private chips = new Map<string, ChipRecord>()
  private currentBlocks = new Map<string, Block>()
  private blockExpanded = new Map<string, boolean>()
  /** host → 三级合并思考行（展开二级后连续思考合并显示为一个三级行）。 */
  private mergedThinks = new Map<HTMLElement, HTMLButtonElement>()
  /** 合并思考行的展开状态（true = 显示合并内容块）。 */
  private mergedExpanded = new WeakSet<HTMLElement>()
  /** 合并内容缓存（首次从原生行读取后保存，pass 重建内容块时不再重新展开原生行）。 */
  private mergedBodyTexts = new WeakMap<HTMLElement, string>()
  /** 合并行标题缓存（原生行展开态提取不到摘要时保持首次标题，不丢成“思考”）。 */
  private mergedTitles = new WeakMap<HTMLElement, string>()
  /** 稳定 segment key → 一级折叠行与展开状态。 */
  private segmentStates = new Map<string, SegmentState>()
  /** segment 首次观察到 running 的时间，用于没有官方时长的实时回合。 */
  private runningSince = new Map<string, number>()
  /** 插件改写 display 前的精确原值；受控集合用于分类漂移和 stop() 恢复。 */
  private originalDisplay = new WeakMap<HTMLElement, string>()
  private controlledDisplay = new Set<HTMLElement>()
  /** 被改写为状态提示词的原生状态文本，卸载时按节点恢复。 */
  private turnStatusTexts = new Map<Text, string>()
  /** 当前状态提示词读取器；返回空串时插件不替换状态行。 */
  private statusTextProvider: () => string | undefined
  /** 正文判定缓存（消息元素 → 有无正文）：流式期间只有被 mutation 命中的
   * 消息失效重算，历史消息跨 pass 复用，避免每帧全量 TreeWalker。 */
  private bodyTextCache = new WeakMap<HTMLElement, boolean>()
  /** 自上次 pass 以来子树发生变化的 flow 顶层消息；pass 开头统一失效。 */
  private dirtyMessages = new Set<HTMLElement>()
  /** 在途显示动画（元素 → 记录）：冲突仲裁、记账对齐与生命周期清理的依据。
   * 用 Map 不用 WeakMap——switchFlow/stop 需要遍历全量 cancel。 */
  private pendingAnims = new Map<HTMLElement, PendingAnim>()
  /** 手势点击记入的一次性可动画 key；pass 消费后清除（触发门控）。 */
  private animatableKeys = new Set<string>()

  constructor(statusTextProvider?: () => string | undefined) {
    this.statusTextProvider = statusTextProvider ?? (() => DEFAULT_STATUS_TEXT)
  }

  /** 设置变更后重跑一轮，让状态提示词立即生效。 */
  refresh(): void {
    this.schedule()
  }

  start(): void {
    if (this.disposed) return
    injectStyle()
    try {
      this.observer = new MutationObserver(records => {
        if (this.shouldSchedule(records)) {
          // 先定向失效正文缓存再调度：flow 外的噪音 mutation 不走这里。
          this.markDirty(records)
          this.schedule()
        }
      })
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-selected', 'data-state'],
        // 流式文本更新（React 改 text node 的 data）属于 characterData
        // mutation：不观察则二级摘要/滚动跟随只能靠偶发结构变化驱动，
        // 变成“隔几秒跳一次”。所有文本写入都有守卫（值不变不写），
        // 不会自激。
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
    this.switchFlow(null)
    removeStyle()
  }

  /** body 级 observer 只负责发现 flow 替换；已有 flow 外的文本变化不再触发全量扫描。 */
  private shouldSchedule(records: MutationRecord[]): boolean {
    // 左栏切换会话时 React 会先把旧 flow 整体 detach，再在同一父容器挂入
    // 新 flow。MutationObserver 回调触发时 record.target 已不再是旧 flow 的
    // 祖先，因此仅靠祖先链过滤会漏掉这次替换，直到刷新才重新初始化。
    if (records.length === 0 || this.flow === null || !this.flow.isConnected) return true
    return records.some(record => (
      nodeWithin(record.target, this.flow as HTMLElement)
      || nodeWithin(this.flow as HTMLElement, record.target)
    ))
  }

  /** 记录本批 mutation 命中的 flow 顶层消息，供正文判定缓存定向失效。
   * 从 record.target 沿 parentNode 走到 flow 的直接子级即所属消息；
   * 归属不到单一顶层消息（flow 直挂层结构变化、flow 外节点、文本直接
   * 子节点）时全量失效——保守正确且罕见。 */
  private markDirty(records: MutationRecord[]): void {
    const flow = this.flow
    if (flow === null || !flow.isConnected) return
    if (records.length === 0) {
      // 空批次 = 宿主/测试桩只通知“一轮调度、DOM 可能已变”而无细粒度
      // 记录（真实浏览器 observer 不会以空记录回调）：保守全量失效。
      this.bodyTextCache = new WeakMap()
      this.dirtyMessages.clear()
      return
    }
    for (const record of records) {
      let current: Node | null = record.target
      while (current !== null && current.parentNode !== flow) current = current.parentNode
      if (!(current instanceof HTMLElement)) {
        this.bodyTextCache = new WeakMap()
        this.dirtyMessages.clear()
        return
      }
      this.dirtyMessages.add(current)
    }
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
    // 后台 tab 的 rAF 会被浏览器挂起（冻结后 this.raf 永非 0，后续
    // schedule 全部被吞，插件假死）：setTimeout 兜底，保证 pass 一定执行。
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

  /** 异步 observer 异常不能静默杀死协调器；保留非可视诊断并允许后续 mutation 重试。 */
  private runPass(): void {
    try {
      this.pass()
      this.lastPassError = ''
      const style = document.getElementById(STYLE_ID)
      style?.setAttribute('data-dshcf-state', 'active')
      style?.removeAttribute('data-dshcf-error')
    } catch (error) {
      this.reportError(error)
    } finally {
      // 手势门控一次性消费放 finally：pass() 早退或中途抛错都不把 key
      // 泄漏到下一轮，避免协调器驱动的转换被误动画（评审 nit）。
      this.animatableKeys.clear()
    }
  }

  private reportError(error: unknown): void {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    const style = document.getElementById(STYLE_ID)
    style?.setAttribute('data-dshcf-state', 'error')
    style?.setAttribute('data-dshcf-error', message.slice(0, 500))
    if (message === this.lastPassError) return
    this.lastPassError = message
    console.error('[dsh-auto-collapse] fold pass failed', error)
  }

  /** 一轮重放：重算堆积 → 应用折叠/展开 → 摆放并更新 chip → 替换状态行。 */
  private pass(): void {
    if (this.disposed) return

    const nextFlow = findFlow()
    if (nextFlow !== this.flow) this.switchFlow(nextFlow)
    const flow = this.flow
    if (flow === null) return

    // 正文缓存定向失效：只重算本 pass 前被 mutation 命中的消息。
    for (const el of this.dirtyMessages) this.bodyTextCache.delete(el)
    this.dirtyMessages.clear()
    const blocks = findBlocks(flow, (el) => this.hasBodyCached(el))
    this.currentBlocks = new Map(blocks.map(block => [block.key, block]))
    const segments = buildSegments(flow, blocks, (el) => this.hasBodyCached(el))
    const liveSegmentKeys = new Set(segments.map(segment => segment.key))

    for (const segment of segments) {
      if (segment.running && !this.runningSince.has(segment.key)) {
        this.runningSince.set(segment.key, Date.now())
      }
    }

    const completedKeys = new Set<string>()
    for (const snapshot of segments) {
      if (!snapshot.closed || snapshot.running || !snapshot.hasWork) continue
      completedKeys.add(snapshot.key)
      let state = this.segmentStates.get(snapshot.key)
      if (state === undefined) {
        state = { key: snapshot.key, row: null, expanded: false, snapshot }
        this.segmentStates.set(snapshot.key, state)
      } else {
        state.snapshot = snapshot
      }
      const started = this.runningSince.get(snapshot.key)
      const parsed = snapshot.boundary === null ? undefined : parseTurnDuration(snapshot.boundary)
      // 宿主已经给出官方时长时始终采用它，避免实时完成与刷新恢复显示不同；
      // 无官方时长的旧/特殊节点才回退到本地观察到的 running 区间。
      if (parsed !== undefined) state.duration = parsed
      else if (started !== undefined) state.duration = Date.now() - started
      if (state.row === null || !state.row.isConnected) state.row = this.createProcessedRow(state)
      this.syncProcessedRow(state)
    }

    for (const [key, state] of [...this.segmentStates]) {
      if (completedKeys.has(key)) continue
      state.row?.remove()
      this.segmentStates.delete(key)
    }

    const segmentByBlock = new Map<string, SegmentSnapshot>()
    for (const segment of segments) {
      for (const block of segment.blocks) segmentByBlock.set(block.key, segment)
    }

    const desiredHidden = new Set<HTMLElement>()
    const seenBlocks = new Set<string>()
    for (const block of blocks) {
      seenBlocks.add(block.key)
      this.reconcileBlock(block, segmentByBlock.get(block.key) ?? null, desiredHidden)
    }

    for (const segment of segments) {
      const state = this.segmentStates.get(segment.key)
      const collapse = state !== undefined && !state.expanded
      // 触发门控：仅手势点击的 segment 走动画路径（收起方向 Phase 1 仍瞬变）。
      const animate = this.animatableKeys.has(segment.key)
      for (const middle of segment.middleSteps) {
        if (collapse) this.hideElement(middle, desiredHidden, animate)
        else this.restoreElement(middle, animate)
      }
      // final 永远显示；它内部的 think 行仍由对应 block 控制。
      if (segment.finalStep !== null) this.restoreElement(segment.finalStep)
    }

    for (const segment of segments) {
      if (segment.hasWork && hasVisibleSegmentWork(segment)) continue
      const state = this.segmentStates.get(segment.key)
      if (state !== undefined && state.row !== null) {
        state.row.remove()
        state.row = null
      }
      for (const block of segment.blocks) this.suppressBlock(block, desiredHidden)
      for (const middle of segment.middleSteps) this.retainDisplayControl(middle, desiredHidden)
      if (segment.finalStep !== null) this.retainDisplayControl(segment.finalStep, desiredHidden)
    }

    this.cleanupStaleChips(seenBlocks)
    this.restoreUnusedDisplays(desiredHidden)
    for (const state of this.segmentStates.values()) this.placeProcessedRow(flow, state)

    for (const key of [...this.runningSince.keys()]) {
      if (!liveSegmentKeys.has(key)) this.runningSince.delete(key)
    }
    for (const [node] of [...this.turnStatusTexts]) {
      if (!node.isConnected) this.turnStatusTexts.delete(node)
    }
    // 在途动画清扫：元素已断连的条目直接移除（动画随节点脱离文档自动取消）。
    for (const [el] of [...this.pendingAnims]) {
      if (!el.isConnected) this.pendingAnims.delete(el)
    }
    const statusText = this.statusTextProvider()
    if (statusText === undefined || statusText === '') {
      restoreTurnStatus(this.turnStatusTexts)
    } else {
      replaceTurnStatus(flow, this.turnStatusTexts, statusText)
    }
  }

  /** flow 元素变化即视为会话切换：完整恢复旧 flow，再从新 DOM 重建。 */
  private switchFlow(next: HTMLElement | null): void {
    if (next === this.flow) return
    // 在途动画全部取消：动画元素均已按「开始即收编」记账，
    // 随后的 restoreAllDisplays 能完整还原。异步 oncancel 靠身份守卫自保。
    // 收起动画额外同步清锁高内联，避免还原后残留 height/overflow 裁剪。
    for (const [el, record] of this.pendingAnims) {
      record.anim.cancel()
      if (record.kind === 'height') this.clearCollapseLock(el)
    }
    this.pendingAnims.clear()
    this.animatableKeys.clear()
    for (const record of this.chips.values()) record.chip.remove()
    this.chips.clear()
    for (const host of [...this.mergedThinks.keys()]) this.removeMergedThink(host)
    for (const state of this.segmentStates.values()) state.row?.remove()
    this.segmentStates.clear()
    this.currentBlocks.clear()
    this.blockExpanded.clear()
    this.runningSince.clear()
    this.bodyTextCache = new WeakMap()
    this.dirtyMessages.clear()
    this.restoreAllDisplays()
    restoreTurnStatus(this.turnStatusTexts)
    this.flow = next
  }

  private createProcessedRow(state: SegmentState): HTMLButtonElement {
    const row = createProcessedRowElement(state.duration)
    row.addEventListener('click', () => {
      state.expanded = !state.expanded
      // 触发门控：本 segment 本轮的显示转换走动画路径（一次性，pass 消费）。
      this.animatableKeys.add(state.key)
      if (state.expanded) {
        // 只重置本回合的二级块，不影响其他已展开回合。
        for (const block of state.snapshot.blocks) {
          this.blockExpanded.set(block.key, false)
          this.removeMergedThink(block.host)
        }
      }
      this.syncProcessedRow(state)
      this.schedule()
    })
    return row
  }

  private syncProcessedRow(state: SegmentState): void {
    const row = state.row
    if (row === null) return
    const text = row.firstElementChild
    const label = state.duration === undefined ? '已处理' : `已处理 ${formatDuration(state.duration)}`
    if (text !== null && text.textContent !== label) text.textContent = label
    const expanded = String(state.expanded)
    if (row.getAttribute('aria-expanded') !== expanded) row.setAttribute('aria-expanded', expanded)
    row.title = state.expanded ? '收起工作过程' : '展开工作过程'
  }

  private placeProcessedRow(flow: HTMLElement, state: SegmentState): void {
    const row = state.row
    if (row === null) return
    if (!state.snapshot.hasWork || !hasVisibleSegmentWork(state.snapshot)) {
      row.remove()
      state.row = null
      return
    }
    let target = state.snapshot.firstWork ?? state.snapshot.finalStep ?? state.snapshot.boundary
    if (target === null || target.parentElement !== flow) return
    while (target.previousElementSibling?.classList.contains('dshcf-flow-chip') === true) {
      target = target.previousElementSibling as HTMLElement
    }
    if (row.parentElement !== flow || row.nextElementSibling !== target) target.before(row)
  }

  private reconcileBlock(
    block: Block,
    segment: SegmentSnapshot | null,
    desiredHidden: Set<HTMLElement>,
  ): void {
    const state = segment === null ? undefined : this.segmentStates.get(segment.key)
    // 触发门控：chip 本身被点击，或其所属 segment 的一级行被点击时，
    // 该块的展开方向走动画路径（分层规则：host 恒瞬时，只动画内部行）。
    const animate = this.animatableKeys.has(block.key)
      || (segment !== null && this.animatableKeys.has(segment.key))
    const levelCollapsed = state !== undefined && !state.expanded

    if (levelCollapsed) {
      // 一级收起（v12）：宿主先行启动渐隐，后代经冻结规则随整体消失——
      // 杜绝「chip/行/合并行先瞬隐 → 宿主高度骤缩」的起步跳变。
      const keepHost = segment?.finalStep === block.host && this.hasBodyCached(block.host)
      let hostFade = false
      if (keepHost) this.restoreElement(block.host)
      else hostFade = this.hideElement(block.host, desiredHidden, animate)
      for (const container of block.containers) this.hideElement(container, desiredHidden, animate)
      for (const row of block.rows) this.hideElement(row, desiredHidden, animate)
      // chip：flow 级是独立 seat、keepHost 时宿主仍可见——两者都需自行收起；
      // inside 级随宿主（宿主渐隐时一起消失，瞬变时才手动隐藏）。
      const existing = this.chips.get(block.key)?.chip
      if (existing !== undefined && existing.style.display !== 'none') {
        if (block.mount === 'before' || keepHost) {
          if (animate && this.canAnimate(existing)) this.startFadeCollapse(existing)
          else existing.style.display = 'none'
        } else if (!hostFade) {
          existing.style.display = 'none'
        }
      }
      this.releaseMergedThink(block.host, animate)
      return
    }

    const chip = this.ensureChip(block)
    // 宿主恢复接入手势门控：一级展开时「隐藏的块宿主」（如中间的
    // think+正文消息）整体淡入——它先于 middleSteps 循环执行，若瞬时恢复
    // 会删掉账本导致随后的动画路径 early-return（用户实测：第一次正文输出
    // 无动画）。二级 chip 点击时宿主必然可见，hostWasHidden=false 不受影响。
    const hostWasHidden = block.host.style.display === 'none'
    const hostAnimate = hostWasHidden && animate
    this.restoreElement(block.host, hostAnimate)
    // chip 出现走视觉 reveal；mount='inside' 时 chip 在动画宿主内部，
    // 随宿主一起淡入即可（跳过独立动画防双重淡入）；'before' 的流级 chip
    // 在宿主外部，仍需自身 reveal。
    const chipWasHidden = chip.style.display === 'none'
    if (chip.style.display !== '') chip.style.display = ''
    if (chipWasHidden && animate && !(hostAnimate && block.mount === 'inside')) this.revealVisual(chip)
    let expanded = this.blockExpanded.get(block.key) ?? false
    if (!expanded && block.rows.some(row => row.hasAttribute('data-selected'))) {
      expanded = true
      this.blockExpanded.set(block.key, true)
    }
    // 容器先行（v12）：容器 seat 先起 reveal，其内部行走 restoreElement 的
    // 祖先在途守卫自动瞬现、骑容器的淡入——消除「容器行双重动画复合位移
    // （4px+4px≈8px）与宿主首行（4px）上升幅度不一致」。
    for (const container of block.containers) {
      if (expanded) this.restoreElement(container, animate)
      else this.hideElement(container, desiredHidden, animate)
    }
    for (const row of block.rows) {
      if (expanded) this.restoreElement(row, animate)
      // 二级收起：宿主自身行渐隐；容器已先行渐隐的，行走冻结规则随容器消失。
      else this.hideElement(row, desiredHidden, animate)
    }
    if (expanded && block.rows.length > 1 && block.rows.every(row => isThinkRow(row))) {
      this.syncMergedThink(block.host, block.rows, desiredHidden, animate)
    } else {
      this.releaseMergedThink(block.host, animate)
    }
    chip.classList.toggle('dshcf-has-body', block.mount === 'inside' && this.hasBodyCached(block.host))
    updateChip(chip, block.rows, expanded)
  }

  private ensureChip(block: Block): HTMLButtonElement {
    let record = this.chips.get(block.key)
    const validParent = record !== undefined && (
      block.mount === 'inside'
        ? record.chip.parentElement === block.host
        : record.chip.parentElement === block.host.parentElement
    )
    if (record === undefined || record.host !== block.host || !record.chip.isConnected || !validParent) {
      if (record !== undefined) {
        record.chip.remove()
        this.removeMergedThink(record.host)
      }
      const chip = document.createElement('button')
      chip.type = 'button'
      chip.className = block.mount === 'before' ? 'dshcf-chip dshcf-flow-chip' : 'dshcf-chip'
      chip.setAttribute('aria-expanded', 'false')
      chip.setAttribute('data-dshcf-block-key', block.key)
      const leading = document.createElement('span')
      leading.className = 'dshcf-leading'
      leading.appendChild(createTerminalIcon())
      chip.appendChild(leading)
      chip.appendChild(createSpan('dshcf-chip-title'))
      chip.appendChild(createSpan('dshcf-chip-sep'))
      chip.appendChild(createSpan('dshcf-chip-summary'))
      chip.appendChild(createChevronIcon('dshcf-chevron'))
      // 新建即隐藏：由 reconcileBlock 的展开分支统一翻转显示，
      // 使「首次出现」与「收起后再现」走同一条 wasHidden → reveal 路径。
      chip.style.display = 'none'
      chip.addEventListener('click', () => {
        this.blockExpanded.set(block.key, !(this.blockExpanded.get(block.key) ?? false))
        // 触发门控：本块本轮的显示转换走动画路径（一次性，pass 消费）。
        this.animatableKeys.add(block.key)
        this.schedule()
      })
      record = { host: block.host, chip }
      this.chips.set(block.key, record)
    }

    const chip = record.chip
    // 兜底图标自升级：chip 创建瞬间页面可能没有可克隆的原生命令行
    // （如刚进入历史会话），之后任意一次 pass 发现原生图标即就地替换。
    const fallbackIcon = chip.querySelector('[data-dshcf-fallback-icon]')
    if (fallbackIcon !== null) {
      const native = findNativeCommandSvg()
      if (native !== null) {
        cachedNativeCommandSvg ??= native
        const replacement = native.cloneNode(true) as SVGSVGElement
        // 保留 kind 标记，避免下一轮 syncLeadingIcon 判定 kind 变化再换一次。
        const kindAttr = fallbackIcon.getAttribute('data-dshcf-icon')
        if (kindAttr !== null) replacement.setAttribute('data-dshcf-icon', kindAttr)
        fallbackIcon.replaceWith(replacement)
      }
    }
    if (block.mount === 'inside') {
      if (chip.parentElement !== block.host || block.host.firstElementChild !== chip) block.host.prepend(chip)
      chip.classList.remove('dshcf-flow-chip')
    } else {
      if (chip.parentElement !== block.host.parentElement || chip.nextElementSibling !== block.host) block.host.before(chip)
      chip.classList.add('dshcf-flow-chip')
    }
    return chip
  }

  private suppressBlock(block: Block, desiredHidden: Set<HTMLElement>): void {
    const existing = this.chips.get(block.key)?.chip
    if (existing !== undefined && existing.style.display !== 'none') existing.style.display = 'none'
    this.removeMergedThink(block.host)
    this.retainDisplayControl(block.host, desiredHidden)
    for (const row of block.rows) this.retainDisplayControl(row, desiredHidden)
    for (const container of block.containers) this.retainDisplayControl(container, desiredHidden)
  }

  private retainDisplayControl(el: HTMLElement, desiredHidden: Set<HTMLElement>): void {
    if (this.controlledDisplay.has(el)) desiredHidden.add(el)
  }

  private cleanupStaleChips(seen: ReadonlySet<string>): void {
    for (const [key, record] of [...this.chips]) {
      if (seen.has(key)) continue
      record.chip.remove()
      this.removeMergedThink(record.host)
      this.chips.delete(key)
      this.blockExpanded.delete(key)
    }
  }

  /** 连续思考合并行：插在第一个思考行前，标题用第一行思考内容；
   * 点击切换显示/隐藏全部原始思考行。 */
  private syncMergedThink(
    host: HTMLElement,
    rows: readonly HTMLElement[],
    desiredHidden: Set<HTMLElement>,
    animate = false,
  ): void {
    let row = this.mergedThinks.get(host)
    if (row === undefined || !row.isConnected) {
      row = document.createElement('button')
      row.type = 'button'
      row.className = 'dshcf-merged-think'
      row.setAttribute('aria-expanded', 'false')
      const leading = document.createElement('span')
      leading.className = 'dshcf-leading'
      leading.appendChild(createThinkIcon())
      const title = document.createElement('span')
      title.className = 'dshcf-merged-title'
      const chevron = createChevronIcon('dshcf-chevron')
      row.append(leading, title, chevron)
      // 新建即隐藏：首次出现与再现统一走 wasHidden → reveal 路径（见下）。
      row.style.display = 'none'
      const btn = row
      btn.addEventListener('click', () => {
        const next = !this.mergedExpanded.has(host)
        if (next) this.mergedExpanded.add(host)
        else this.mergedExpanded.delete(host)
        btn.setAttribute('aria-expanded', String(next))
        if (next) this.expandMergedBody(host, btn)
        else this.collapseMergedBody(host)
      })
      rows[0].before(row)
      this.mergedThinks.set(host, row)
      row = btn
    }
    const titleEl = row.querySelector<HTMLElement>('.dshcf-merged-title')
    if (titleEl !== null) {
      // 标题 = “Think · 第一句”（模仿原生 Think 行：title + 分隔 + summary）。
      // 提取不到（原生行展开态 follow-end 结构变化）时用缓存，保持不丢。
      let title = this.mergedTitles.get(host)
      if (title === undefined) {
        const first = truncateSummary(stripMarkdown(thinkSummary(rows[0])), 36)
        if (first !== '' && first !== '思考') {
          title = `Think · ${first}`
          this.mergedTitles.set(host, title)
        } else {
          title = '思考'
        }
      }
      if (titleEl.textContent !== title) titleEl.textContent = title
    }
    // 原生思考行始终隐藏：四级行不存在，内容由合并内容块承载。
    const expanded = this.mergedExpanded.has(host)
    if (row.getAttribute('aria-expanded') !== String(expanded)) row.setAttribute('aria-expanded', String(expanded))
    // 合并行出现走视觉 reveal（同 chip：插件全资元素，不入账本）；
    // 原生思考行随后的 hideElement 会取消它们自己在本次 pass 的 reveal——
    // 视觉上由合并行的 reveal 替代，不闪现。
    const rowWasHidden = row.style.display === 'none'
    if (row.style.display !== '') row.style.display = ''
    if (rowWasHidden && animate) this.revealVisual(row)
    for (const r of rows) this.hideElement(r, desiredHidden)
    // 展开态且内容块缺失（React 重渲染清掉 / 跨折叠周期重建）→ 用缓存重建；
    // 手势路径下静默新建的 body 也接高度动画，否则「详细内容」瞬现
    // （mergedExpanded 持久化时，点击思考过程会因 created=false 跳过 reveal）。
    if (expanded) {
      const result = this.ensureMergedBody(host, row, false)
      if (result !== null && result.created && animate) this.revealMergedBody(result.body)
    }
  }

  /** 展开合并行：直接读各思考行文本合成内容块（不依赖原生行展开：
   * 程序化 click 不触发 React 展开，且后台 tab 的 rAF 不执行）。 */
  private expandMergedBody(host: HTMLElement, btn: HTMLButtonElement): void {
    const cached = this.mergedBodyTexts.get(host)
    if (cached !== undefined) {
      const result = this.ensureMergedBody(host, btn, true)
      if (result?.created === true) this.revealMergedBody(result.body)
      return
    }
    const parts = this.currentThinkRows(host)
      .map(r => r.textContent.replace(/^Think\s*/, '').trim())
      .filter(Boolean)
    if (parts.length === 0) return
    this.mergedBodyTexts.set(host, parts.join('\n\n'))
    const result = this.ensureMergedBody(host, btn, true)
    if (result?.created === true) this.revealMergedBody(result.body)
  }

  /** 创建/更新合并内容块（缓存优先，不重新展开原生行）。
   * 返回内容块与其是否为本次新建（新建才走展开动画）。 */
  private ensureMergedBody(
    host: HTMLElement,
    btn: HTMLButtonElement,
    force: boolean,
  ): { body: HTMLElement; created: boolean } | null {
    const cached = this.mergedBodyTexts.get(host)
    if (cached === undefined) return null
    let body = btn.nextElementSibling
    let created = false
    if (body === null || !body.classList.contains('dshcf-merged-body')) {
      const next = document.createElement('div')
      next.className = 'dshcf-merged-body'
      btn.after(next)
      body = next
      created = true
    }
    if (force || body.textContent !== cached) body.textContent = cached
    return { body: body as HTMLElement, created }
  }

  /** merged-body 展开高度动画（机制样板：插件全资 DOM）。
   * 关键帧含 marginBottom 0→16px——其 CSS 有常量 margin-bottom:16px，
   * 高度从 0 起步时这 16px 会先占位产生小跳变。fill:'forwards' 托住终态，
   * onfinish 清内联后 cancel 释放，无闪烁窗口。收起保持同步 remove()。 */
  /** 清理合并 think 行（v12）：状态 map 立即清除；DOM 在手势动画路径下
   * 渐隐后移除（settle 回调），其余路径瞬删。渐隐中途被反向取消时元素
   * 保留，由后续 pass 的 syncMergedThink 重建/复用。 */
  private releaseMergedThink(host: HTMLElement, animate = false): void {
    const row = this.mergedThinks.get(host)
    this.mergedExpanded.delete(host)
    this.mergedBodyTexts.delete(host)
    if (row === undefined) return
    this.mergedThinks.delete(host)
    const body = row.nextElementSibling
    const targets: HTMLElement[] = body !== null && body.classList.contains('dshcf-merged-body') ? [row, body as HTMLElement] : [row]
    if (animate && this.canAnimate(row)) {
      for (const t of targets) this.startFadeCollapse(t, () => t.remove())
    } else {
      for (const t of targets) t.remove()
    }
  }

  private revealMergedBody(body: HTMLElement): void {
    if (!this.canAnimate(body)) return
    // 防御：同元素旧动画条目先同步取消（当前 created 每 body 一生一次、不可达，
    // 但若未来二次 reveal，旧 fill:'forwards' 会永久占位且守卫空转——v9 评审 P3）。
    this.cancelPendingSync(body)
    const targetHeight = body.getBoundingClientRect().height
    if (!(targetHeight > 0)) return
    body.style.height = '0px'
    body.style.overflow = 'hidden'
    body.style.marginBottom = '0px'
    const anim = body.animate(
      [
        { height: '0px', marginBottom: '0px' },
        { height: `${targetHeight}px`, marginBottom: '16px' },
      ],
      { duration: ANIM_DURATION_MS, easing: ANIM_EASING, fill: 'forwards' },
    )
    const record: PendingAnim = { anim, target: 'visible', kind: 'height' }
    this.pendingAnims.set(body, record)
    anim.onfinish = () => {
      if (this.pendingAnims.get(body) !== record) return
      this.pendingAnims.delete(body)
      body.style.height = ''
      body.style.overflow = ''
      body.style.marginBottom = ''
      anim.cancel()
      this.schedule()
    }
    anim.oncancel = () => {
      if (this.pendingAnims.get(body) !== record) return
      this.pendingAnims.delete(body)
    }
  }

  /** 收起合并行：移除内容块（原生行保持隐藏）。 */
  private collapseMergedBody(host: HTMLElement): void {
    const btn = this.mergedThinks.get(host)
    if (btn !== undefined) {
      const body = btn.nextElementSibling
      if (body !== null && body.classList.contains('dshcf-merged-body')) body.remove()
    }
  }

  /** 当前宿主内的思考行（现取，React 重渲染后引用仍然有效）。 */
  private currentThinkRows(host: HTMLElement): HTMLElement[] {
    return [...host.querySelectorAll<HTMLElement>('[data-variant="think"]:not([data-tool])')].filter(
      r => r.closest('[data-chat-call-id]') === null && r.closest('[data-subcalls]') === null,
    )
  }

  /** 移除合并思考行（二级收起 / 一级收起时），恢复行由 applyRows 控制。
   * 合并内容块（btn 的兄弟节点）一并移除，避免宿主展开后残留文本。 */
  private removeMergedThink(host: HTMLElement): void {
    const row = this.mergedThinks.get(host)
    if (row !== undefined) {
      const body = row.nextElementSibling
      if (body !== null && body.classList.contains('dshcf-merged-body')) body.remove()
      row.remove()
      this.mergedThinks.delete(host)
    }
    this.mergedExpanded.delete(host)
    this.mergedBodyTexts.delete(host)
  }

  /** 正文判定（带缓存）：同一消息子树未变时直接复用上次结果。失效由
   * markDirty（mutation 定向）与 switchFlow（整体重置）驱动；缓存的是
   * 纯文本/媒体存在性判定，与 display 状态无关，插件自身的显隐切换
   * 不会产生脏数据。 */
  private hasBodyCached(el: HTMLElement): boolean {
    const cached = this.bodyTextCache.get(el)
    if (cached !== undefined) return cached
    const value = hasBodyContent(el)
    this.bodyTextCache.set(el, value)
    return value
  }

  /** 返回 true 表示启动了渐隐动画（调用方可据此决定内部元素的处置）。 */
  private hideElement(el: HTMLElement, desired: Set<HTMLElement>, animate = false): boolean {
    // 意图登记先行：无论后续走哪条路径（含同向仲裁早退），本 pass 都期望
    // 该元素隐藏——否则 restoreUnusedDisplays 会把在途收起动画误判为「不再
    // 需要」而反向取消（在途动画 × 后续 pass 的经典竞争）。
    desired.add(el)
    // 冲突仲裁：在途动画同向（目标隐藏）视为已满足；反向取消后写终态。
    const pending = this.pendingAnims.get(el)
    if (pending !== undefined) {
      if (pending.target === 'hidden') return false
      this.cancelPendingSync(el)
    }
    if (!this.originalDisplay.has(el) && !isDisplayed(el)) return false
    // 冻结规则（v12）：祖先 seat 在途动画时后代保持原状——随祖先整体淡出/
    // 淡入呈现。否则「内部瞬隐 → 宿主高度骤缩」会在渐隐起步产生跳变；
    // 意图已登记，不会被 restoreUnusedDisplays 反向恢复，结算后由后续 pass 处理。
    if (this.hasAnimatingAncestor(el)) return false
    if (!this.originalDisplay.has(el)) this.originalDisplay.set(el, el.style.display)
    this.controlledDisplay.add(el)
    if (el.style.display === 'none') return false
    // 手势收起 = 渐隐（镜像 reveal 的 fade），淡完 onfinish 瞬切隐藏。
    // 不锁高、不做 gap 补偿——真机验证高度卷帘方案存在起步瞬切/中途 gap 跳/
    // 末尾 margin 回弹三段跳变，用户裁决弃用（v11）。
    if (animate && this.canAnimate(el)) {
      this.startFadeCollapse(el)
      return true
    }
    el.style.display = 'none'
    return false
  }

  private restoreElement(el: HTMLElement, animate = false): void {
    // 冲突仲裁：在途动画同向（目标可见）视为已满足，账本留给 onfinish 对齐；
    // 反向取消后写终态。同步 delete 并清收起锁高内联，异步 oncancel 靠身份守卫自保。
    const pending = this.pendingAnims.get(el)
    if (pending !== undefined) {
      if (pending.target === 'visible') return
      this.cancelPendingSync(el)
    }
    if (!this.originalDisplay.has(el)) return
    const original = this.originalDisplay.get(el) as string
    // 祖先 seat 在途动画时跳过后代申请（防双重淡入/淡出与高度锁竞争）：
    // 后代随祖先的 overflow 裁剪与整体过渡呈现，自身走瞬变终态。
    if (!animate || !this.canAnimate(el) || this.hasAnimatingAncestor(el)) {
      if (el.style.display !== original) el.style.display = original
      this.originalDisplay.delete(el)
      this.controlledDisplay.delete(el)
      return
    }
    // 动画路径（展开）：占位即刻出现，内容淡入 + 微位移。账本双条目保持到
    // onfinish 对齐（终态可见 = 双删除，镜像 restoreElement 契约）。
    if (el.style.display !== original) el.style.display = original
    this.startReveal(el)
  }

  /** 是否可动画：WAAPI 特性检测 + reduced-motion 门控（均做 typeof 防桩缺失）。 */
  private canAnimate(el: HTMLElement): boolean {
    if (typeof el.animate !== 'function') return false
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    return true
  }

  /** 展开方向淡入（opacity + 4px 微位移）：无高度分量、零布局读取。
   * onfinish 按终态可见对齐账本（双删除）并 schedule() 幂等重同步；
   * oncancel 只做身份守卫删除——取消方的终态写入自己负责。 */
  private startReveal(el: HTMLElement): void {
    const anim = el.animate(
      [
        { opacity: '0', transform: 'translateY(4px)' },
        { opacity: '1', transform: 'translateY(0)' },
      ],
      { duration: ANIM_DURATION_MS, easing: ANIM_EASING },
    )
    const record: PendingAnim = { anim, target: 'visible', kind: 'fade' }
    this.pendingAnims.set(el, record)
    anim.onfinish = () => {
      if (this.pendingAnims.get(el) !== record) return
      this.pendingAnims.delete(el)
      this.originalDisplay.delete(el)
      this.controlledDisplay.delete(el)
      this.schedule()
    }
    anim.oncancel = () => {
      if (this.pendingAnims.get(el) !== record) return
      this.pendingAnims.delete(el)
    }
  }

  /** 同步取消在途动画并清账：收起动画需同时清锁高内联（height/overflow/
   * marginBottom），否则取消方写完终态后元素仍被锁高裁剪一帧以上。 */
  private cancelPendingSync(el: HTMLElement): void {
    const pending = this.pendingAnims.get(el)
    if (pending === undefined) return
    pending.anim.cancel()
    this.pendingAnims.delete(el)
    if (pending.kind === 'height') this.clearCollapseLock(el)
  }

  private clearCollapseLock(el: HTMLElement): void {
    el.style.height = ''
    el.style.overflow = ''
    el.style.marginBottom = ''
    el.style.boxSizing = ''
  }

  /** 祖先 seat 在途动画检测：沿 parentNode 走到 flow，任一祖先在 pendingAnims
   * 即视为在途。分层规则——同一视觉变化只动画一层。 */
  private hasAnimatingAncestor(el: HTMLElement): boolean {
    const flow = this.flow
    if (flow === null) return false
    let node = el.parentElement
    while (node !== null && node !== flow) {
      if (this.pendingAnims.has(node as HTMLElement)) return true
      node = node.parentElement
    }
    return false
  }

  /** 收起方向渐隐动画（v11 定稿）：镜像 reveal 的 opacity + 4px 微位移，
   * 淡完 onfinish 写 display:none 并保持双条目（镜像 hideElement 终态契约）。
   * fill:'forwards' 占位到终态写入后释放；无几何锁、无 gap 补偿。 */
  private startFadeCollapse(el: HTMLElement, settle?: () => void): void {
    const anim = el.animate(
      [
        { opacity: '1', transform: 'translateY(0)' },
        { opacity: '0', transform: 'translateY(4px)' },
      ],
      { duration: ANIM_DURATION_MS, easing: ANIM_EASING, fill: 'forwards' },
    )
    const record: PendingAnim = { anim, target: 'hidden', kind: 'fade' }
    this.pendingAnims.set(el, record)
    anim.onfinish = () => {
      if (this.pendingAnims.get(el) !== record) return
      this.pendingAnims.delete(el)
      if (el.style.display !== 'none') el.style.display = 'none'
      // settle：渐隐自然结束后的延迟清理（如 DOM 移除）；反向取消不执行。
      settle?.()
      anim.cancel()
      this.schedule()
    }
    anim.oncancel = () => {
      if (this.pendingAnims.get(el) !== record) return
      this.pendingAnims.delete(el)
    }
  }

  /** 轻量视觉 reveal（opacity + 4px 微位移）：用于插件全资元素的即时显示
   * 路径——chip（一级展开时出现）与 merged-think 行（二级展开时出现）。
   * 这些元素的 display 完全由插件直写、无 React 协调竞争，因此不入
   * pendingAnims 账本、无仲裁；收起同为直写 display:none，无 fill 的在途
   * 动画残留在隐藏元素上自然失效。门控沿用 animate 布尔（手势路径才调）。 */
  private revealVisual(el: HTMLElement): void {
    if (!this.canAnimate(el)) return
    el.animate(
      [
        { opacity: '0', transform: 'translateY(4px)' },
        { opacity: '1', transform: 'translateY(0)' },
      ],
      { duration: ANIM_DURATION_MS, easing: ANIM_EASING },
    )
  }

  private restoreUnusedDisplays(desired: ReadonlySet<HTMLElement>): void {
    for (const el of [...this.controlledDisplay]) {
      if (!desired.has(el)) this.restoreElement(el)
    }
  }

  private restoreAllDisplays(): void {
    for (const el of [...this.controlledDisplay]) this.restoreElement(el)
    this.controlledDisplay.clear()
    this.originalDisplay = new WeakMap<HTMLElement, string>()
  }
}

function createSpan(cls: string): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = cls
  return span
}

/** 终端小方块图标（无原生 command leading 可克隆时的兜底；素材 Codex
 * 对齐：方框 + >_ 提示符）。 */
/** 兜底终端小方块：仅在页面上找不到可克隆的原生命令图标时使用。
 * 带 data-dshcf-fallback-icon 标记——ensureChip 会在原生图标可用后自动升级替换。 */
function createTerminalIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 12 10')
  svg.setAttribute('width', '12')
  svg.setAttribute('height', '10')
  svg.setAttribute('data-dshcf-fallback-icon', '')
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.setAttribute('x', '0.5')
  rect.setAttribute('y', '0.5')
  rect.setAttribute('width', '11')
  rect.setAttribute('height', '9')
  rect.setAttribute('rx', '1.5')
  rect.setAttribute('fill', 'none')
  rect.setAttribute('stroke', 'currentColor')
  const prompt = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  prompt.setAttribute('x', '2')
  prompt.setAttribute('y', '7.5')
  prompt.setAttribute('font-size', '7')
  prompt.setAttribute('fill', 'currentColor')
  prompt.textContent = '>_'
  svg.append(rect, prompt)
  return svg
}

const NATIVE_CHEVRON_DOWN_PATH = 'M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z'

function createChevronIcon(className: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '14')
  svg.setAttribute('height', '14')
  svg.setAttribute('class', className)
  svg.setAttribute('viewBox', '0 0 14 14')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', NATIVE_CHEVRON_DOWN_PATH)
  path.setAttribute('fill', 'currentColor')
  svg.appendChild(path)
  return svg
}

/** DSH 原生 ReasoningRow 的思考图标（IconThinkOutline14）path 数据，14x14
 * 兜底用（与 dsh-client-ui-primitives 的导出逐字一致）。 */
const THINK_ICON_PATHS: ReadonlyArray<{ d: string; evenodd?: boolean }> = [
  {
    d: 'M7.06431 5.93342C7.68763 5.93342 8.19307 6.43904 8.19322 7.06233C8.19322 7.68573 7.68772 8.19123 7.06431 8.19123C6.44099 8.19113 5.9354 7.68567 5.9354 7.06233C5.93555 6.43911 6.44108 5.93353 7.06431 5.93342Z',
  },
  {
    evenodd: true,
    d: 'M8.6815 0.963693C10.1169 0.447019 11.6266 0.374829 12.5633 1.31135C13.5 2.24805 13.4277 3.75776 12.911 5.19319C12.7126 5.74431 12.4386 6.31796 12.0965 6.89729C12.4969 7.54638 12.8141 8.19018 13.036 8.80647C13.5527 10.2419 13.6251 11.7516 12.6883 12.6883C11.7516 13.625 10.242 13.5527 8.8065 13.036C8.19022 12.8141 7.54641 12.4969 6.89732 12.0965C6.31797 12.4386 5.74435 12.7125 5.19322 12.911C3.75777 13.4276 2.2481 13.5 1.31138 12.5633C0.374859 11.6266 0.447049 10.1168 0.963724 8.68147C1.17185 8.10338 1.46321 7.50063 1.82896 6.8924C1.52182 6.35711 1.27235 5.82825 1.08872 5.31819C0.572068 3.88278 0.499714 2.37306 1.43638 1.43635C2.37308 0.499655 3.8828 0.572044 5.31822 1.08869C5.82828 1.27232 6.35715 1.5218 6.89243 1.82893C7.50066 1.46318 8.10341 1.17181 8.6815 0.963693ZM11.3573 8.01154C10.9083 8.62253 10.3901 9.22873 9.80943 9.8094C9.22877 10.3901 8.62255 10.9083 8.01158 11.3572C8.4257 11.5841 8.8287 11.7688 9.21275 11.9071C10.5456 12.3868 11.4246 12.2547 11.8397 11.8397C12.2548 11.4246 12.3869 10.5456 11.9071 9.21272C11.7688 8.82866 11.5841 8.42568 11.3573 8.01154ZM2.56529 8.02912C2.37344 8.39322 2.21495 8.74796 2.09263 9.08772C1.61291 10.4204 1.74512 11.2995 2.16001 11.7147C2.57505 12.1297 3.45415 12.2618 4.78697 11.7821C5.11057 11.6656 5.44786 11.5164 5.7938 11.3367C5.249 10.9223 4.70922 10.4533 4.19029 9.9344C3.57578 9.31987 3.03169 8.67633 2.56529 8.02912ZM6.90708 3.2469C6.24065 3.70479 5.5646 4.26321 4.91392 4.91389C4.26325 5.56456 3.70482 6.24063 3.24693 6.90705C3.72674 7.63325 4.32777 8.37459 5.03892 9.08576C5.64943 9.69627 6.28183 10.2265 6.90806 10.6678C7.59368 10.2025 8.2908 9.63076 8.96079 8.96076C9.6308 8.29075 10.2025 7.59366 10.6678 6.90803C10.2265 6.2818 9.69631 5.6494 9.08579 5.03889C8.37462 4.32773 7.63328 3.72672 6.90708 3.2469ZM11.7147 2.15998C11.2996 1.74509 10.4204 1.61288 9.08775 2.0926C8.74835 2.21479 8.39382 2.37271 8.03013 2.56428C8.67728 3.03065 9.31995 3.5758 9.93443 4.19026C10.4534 4.7092 10.9223 5.24896 11.3368 5.79377C11.5164 5.44785 11.6656 5.11052 11.7821 4.78694C12.2618 3.45416 12.1297 2.57502 11.7147 2.15998ZM4.91197 2.2176C3.57922 1.73788 2.70004 1.86995 2.28501 2.28498C1.87001 2.70003 1.73791 3.5792 2.21763 4.91194C2.31709 5.18822 2.44112 5.47427 2.58677 5.7674C3.01931 5.1887 3.51474 4.6158 4.06529 4.06526C4.61584 3.5147 5.18872 3.01928 5.76743 2.58674C5.47431 2.4411 5.18824 2.31706 4.91197 2.2176Z',
  },
]

/** 从原生 [data-variant="think"] [data-disclosure-row] 找真实 think SVG。
 * IconThinkOutline14 有 2 个 path，chevron 只有 1 个 —— 原生行打开时
 * leading 里只剩 chevron，按 path 数量判断可避免克隆到 chevron。 */
function findNativeThinkSvg(): SVGSVGElement | null {
  for (const drow of document.querySelectorAll<HTMLElement>('[data-variant="think"] [data-disclosure-row]')) {
    for (const svg of drow.querySelectorAll<SVGSVGElement>('svg')) {
      if (svg.querySelectorAll('path').length >= 2) return svg
    }
  }
  return null
}

/** 思考块 leading 图标：优先克隆原生 think SVG（与原生 ReasoningRow 完全
 * 一致），无可用克隆（原生行打开、或暂无非正文 think 行）时用
 * IconThinkOutline14 的 14x14 兜底。 */
function createThinkIcon(): SVGSVGElement {
  const native = findNativeThinkSvg()
  if (native !== null) return native.cloneNode(true) as SVGSVGElement
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 14 14')
  svg.setAttribute('width', '14')
  svg.setAttribute('height', '14')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  for (const p of THINK_ICON_PATHS) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    if (p.evenodd === true) {
      path.setAttribute('fill-rule', 'evenodd')
      path.setAttribute('clip-rule', 'evenodd')
    }
    path.setAttribute('d', p.d)
    path.setAttribute('fill', 'currentColor')
    svg.appendChild(path)
  }
  return svg
}

/** 从原生 [data-chat-call-id] [data-disclosure-row] 找真实 command leading
 * SVG：IconApiOutline14（>_ 形，14x14、3 个 path：方框 + > + _，与
 * dsh-client-ui-primitives 导出逐字一致）——bash ToolRow 与 GenericCommandCard
 * 的默认命令图标都是它；read 等 ToolRow 的工具专属图标（放大镜等）path
 * 数不同天然排除；chevron / StateDot（单 path）自动排除。找不到（页面尚无
 * 命令卡、或全部卡片 leading 被状态图标替换）返回 null，调用方回退。 */
function findNativeCommandSvg(): SVGSVGElement | null {
  const selector = '[data-chat-call-id] [data-disclosure-row], [data-chat-flow-kind="command"] [data-disclosure-row], [data-chat-flow-kind="manual-compaction"] [data-disclosure-row]'
  for (const drow of document.querySelectorAll<HTMLElement>(selector)) {
    for (const svg of drow.querySelectorAll<SVGSVGElement>('svg')) {
      if (svg.querySelectorAll('path').length === 3 && isIcon14(svg)) return svg
    }
  }
  return null
}

/** svg 是否为 14x14（width/height 属性或 viewBox 0 0 14 14）。 */
function isIcon14(svg: SVGSVGElement): boolean {
  if (svg.getAttribute('width') === '14' && svg.getAttribute('height') === '14') return true
  const vb = (svg.getAttribute('viewBox') ?? '').trim().split(/\s+/)
  return vb.length === 4 && Number(vb[2]) === 14 && Number(vb[3]) === 14
}

/** 首次成功克隆的原生命令图标模板：之后所有 chip 复用其克隆，不再依赖
 * 页面当下是否还有工具卡可扫（修复偶现兜底方块随 chip 永久存留的问题）。 */
let cachedNativeCommandSvg: SVGSVGElement | null = null

/** 工具块 leading 图标：优先克隆原生 command leading SVG（与原生
 * GenericCommandCard 的 IconApiOutline14 完全一致），找不到（页面尚无工具
 * 卡、或卡片 leading 暂被状态图标替换）时保留终端小方块兜底；兜底图标
 * 由 ensureChip 在原生图标可用后自动升级。 */
function createCommandIcon(): SVGSVGElement {
  if (cachedNativeCommandSvg !== null) return cachedNativeCommandSvg.cloneNode(true) as SVGSVGElement
  const native = findNativeCommandSvg()
  if (native !== null) {
    cachedNativeCommandSvg = native
    return native.cloneNode(true) as SVGSVGElement
  }
  return createTerminalIcon()
}

/** 原生上下文注入行的 leading 图标 path（16 坐标系、3 path：圆角框 + 上下
 * 两条横线，取样自真实 [data-chat-flow-kind="context"] 行；16 坐标系渲染
 * 14x14，与 IconApiOutline14 的 14 坐标系区分）。 */
const CONTEXT_ICON_PATHS: ReadonlyArray<{ d: string }> = [
  {
    d: 'M11.2426 4.80473V6.10551H4.75819V4.80473H11.2426Z',
  },
  {
    d: 'M9.40858 7.84478V9.14557H4.75819V7.84478H9.40858Z',
  },
  {
    d: 'M9.23438 0.546389C10.1941 0.546389 10.9683 0.544914 11.5859 0.611819C12.2161 0.680096 12.7634 0.825745 13.2393 1.17139C13.5172 1.3733 13.7619 1.61812 13.9639 1.896C14.3096 2.37183 14.4551 2.91922 14.5234 3.54932C14.5903 4.16686 14.5889 4.94133 14.5889 5.90088V10.0981C14.5889 11.0576 14.5903 11.8321 14.5234 12.4497C14.4552 13.0798 14.3094 13.6272 13.9639 14.103C13.7619 14.381 13.5172 14.6257 13.2393 14.8276C12.7633 15.1734 12.2163 15.3189 11.5859 15.3872C10.9683 15.4541 10.1942 15.4536 9.23438 15.4536H6.76563C5.80591 15.4536 5.03168 15.4541 4.41407 15.3872C3.78385 15.3189 3.23665 15.1734 2.76074 14.8276C2.48291 14.6257 2.23802 14.3809 2.03614 14.103C1.69066 13.6272 1.54483 13.0798 1.47657 12.4497C1.40973 11.8321 1.41114 11.0576 1.41114 10.0981V5.90088C1.41113 4.94132 1.40966 4.16686 1.47657 3.54932C1.54488 2.91921 1.69042 2.37184 2.03614 1.896C2.2381 1.61807 2.4828 1.37333 2.76074 1.17139C3.23665 0.825682 3.78386 0.680109 4.41407 0.611819C5.03168 0.544905 5.80591 0.546389 6.76563 0.546389H9.23438ZM6.76563 1.896C5.77586 1.896 5.0876 1.89738 4.55957 1.95459C4.0443 2.01043 3.76214 2.11349 3.55469 2.26416C3.39135 2.38284 3.24761 2.52662 3.12891 2.68994C2.97821 2.89736 2.8752 3.17967 2.81934 3.69483C2.76214 4.22279 2.76075 4.91131 2.76074 5.90088V10.0981C2.76074 11.0876 2.76221 11.7762 2.81934 12.3042C2.87516 12.8194 2.97829 13.1026 3.12891 13.3101C3.24754 13.4733 3.39147 13.6172 3.55469 13.7358C3.76213 13.8865 4.04438 13.9896 4.55957 14.0454C5.0876 14.1026 5.77586 14.103 6.76563 14.103H9.23438C10.2242 14.103 10.9124 14.1026 11.4404 14.0454C11.9556 13.9896 12.2379 13.8865 12.4453 13.7358C12.6086 13.6172 12.7525 13.4733 12.8711 13.3101C13.0217 13.1026 13.1248 12.8195 13.1807 12.3042C13.2378 11.7762 13.2393 11.0876 13.2393 10.0981V5.90088C13.2393 4.91131 13.2379 4.22279 13.1807 3.69483C13.1248 3.17969 13.0218 2.89736 12.8711 2.68994C12.7524 2.52667 12.6086 2.38281 12.4453 2.26416C12.2379 2.11355 11.9556 2.01041 11.4404 1.95459C10.9124 1.8974 10.2241 1.896 9.23438 1.896H6.76563Z',
  },
]

/** 从原生 [data-chat-flow-kind="context"] [data-disclosure-row] 找真实 context
 * leading SVG（上下文注入图标，16 坐标系、3 path）；chevron（单 path）排除。 */
function findNativeContextSvg(): SVGSVGElement | null {
  for (const ctx of document.querySelectorAll<HTMLElement>('[data-chat-flow-kind="context"]')) {
    const drow = ctx.querySelector('[data-disclosure-row]')
    if (drow === null) continue
    for (const svg of drow.querySelectorAll<SVGSVGElement>('svg')) {
      if (svg.querySelectorAll('path').length >= 2) return svg
    }
  }
  return null
}

/** context 块 leading 图标：优先克隆原生 context leading SVG（与原生
 * 上下文注入行完全一致），找不到时用 16 坐标系硬编码 path 兜底。 */
function createContextIcon(): SVGSVGElement {
  const native = findNativeContextSvg()
  if (native !== null) return native.cloneNode(true) as SVGSVGElement
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('width', '14')
  svg.setAttribute('height', '14')
  svg.setAttribute('fill', 'none')
  for (const p of CONTEXT_ICON_PATHS) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', p.d)
    path.setAttribute('fill', 'currentColor')
    svg.appendChild(path)
  }
  return svg
}

/** 按块类型切换 chip leading 图标（工具块 = 原生 command 图标，无原生
 * 可克隆时终端小方块兜底；思考块 = 原生 think 图标；上下文块 = 原生
 * context 图标）。kind 不变时不动
 * DOM——updateChip 只在 kind 变化时才调用本函数，不会每帧替换。 */
function syncLeadingIcon(chip: HTMLButtonElement, kind: 'tool' | 'think' | 'context'): void {
  const leading = chip.querySelector<HTMLElement>('.dshcf-leading')
  if (leading === null) return
  const existing = leading.querySelector('svg')
  if (existing !== null && existing.getAttribute('data-dshcf-icon') === kind) return
  for (const child of [...leading.childNodes]) child.remove()
  const svg = kind === 'think' ? createThinkIcon() : kind === 'context' ? createContextIcon() : createCommandIcon()
  svg.setAttribute('data-dshcf-icon', kind)
  leading.appendChild(svg)
}

/** 找到当前可见的会话流容器。 */
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

/** 排除插件自己插入的一级行/flow 级 chip，得到宿主的真实顶层消息顺序。 */
function flowItems(flow: HTMLElement): HTMLElement[] {
  return [...flow.children].filter((el): el is HTMLElement => (
    el instanceof HTMLElement
    && !el.classList.contains('dshcf-processed')
    && !el.classList.contains('dshcf-flow-chip')
  ))
}

function isDisplayed(el: HTMLElement): boolean {
  if (typeof getComputedStyle === 'function') return getComputedStyle(el).display !== 'none'
  return el.style.display !== 'none'
}


function stableElementKey(el: HTMLElement, fallbackIndex: number): string {
  const kind = el.getAttribute('data-chat-flow-kind') ?? 'node'
  const key = el.getAttribute('data-chat-flow-key')
    ?? el.getAttribute('data-chat-anchor-key')
    ?? `${kind}:${fallbackIndex}`
  return `${kind}:${key}`
}

function hasLeadingTurnWork(items: readonly HTMLElement[]): boolean {
  return items.some(el => {
    const kind = el.getAttribute('data-chat-flow-kind')
    return kind === 'assistant-step'
      || kind === 'assistant'
      || kind === 'tool-call'
      || kind === 'command'
      || kind === 'manual-compaction'
  })
}

/**
 * 每轮按当前 DOM 顺序重建 segment。user/steering 同时是上一段边界和下一段
 * 起点，turn-tail 结束当前段。首个 user 前只有 context 时，context 归入该
 * user；首个 steering 前已有 assistant/tool 时，则把那批历史中段收尾。
 */
function buildSegments(flow: HTMLElement, blocks: readonly Block[], hasBody: (el: HTMLElement) => boolean): SegmentSnapshot[] {
  const items = flowItems(flow)
  const itemIndex = new Map(items.map((el, index) => [el, index]))
  const snapshots: SegmentSnapshot[] = []
  let contentStart = 0
  let startMarker: HTMLElement | null = null

  const append = (end: number, boundary: HTMLElement | null, closed: boolean): void => {
    if (end < contentStart) return
    const range = items.slice(contentStart, end)
    const inRange = new Set(range)
    const segmentBlocks = blocks.filter(block => inRange.has(block.host))
    const bodySteps = range.filter(el => {
      const kind = el.getAttribute('data-chat-flow-kind')
      return (kind === 'assistant-step' || kind === 'assistant') && hasBody(el)
    })
    const finalStep = bodySteps.length > 0 ? bodySteps[bodySteps.length - 1] : null
    const middleSteps = new Set(bodySteps.slice(0, -1))
    const workHosts = new Set<HTMLElement>([
      ...segmentBlocks.map(block => block.host),
      ...middleSteps,
    ])
    const firstWork = range.find(el => workHosts.has(el)) ?? finalStep
    const identity = startMarker
      ?? range.find(el => hasLeadingTurnWork([el]))
      ?? boundary
    const identityIndex = identity === null ? contentStart : (itemIndex.get(identity) ?? contentStart)
    const prefix = startMarker === null ? 'leading' : 'segment'
    const key = `${prefix}:${identity === null ? `open:${contentStart}` : stableElementKey(identity, identityIndex)}`
    snapshots.push({
      key,
      boundary,
      startMarker,
      blocks: segmentBlocks,
      middleSteps,
      finalStep,
      firstWork,
      closed,
      running: segmentBlocks.some(block => block.rows.some(row => rowState(row) === 'running')),
      hasWork: segmentBlocks.length > 0 || middleSteps.size > 0,
    })
  }

  for (let index = 0; index < items.length; index++) {
    const el = items[index]
    const kind = el.getAttribute('data-chat-flow-kind')
    if (kind === 'user' || kind === 'steering') {
      if (startMarker !== null) {
        append(index, el, true)
        contentStart = index + 1
      } else {
        const leading = items.slice(contentStart, index)
        if (hasLeadingTurnWork(leading)) {
          append(index, el, true)
          contentStart = index + 1
        }
        // 仅有顶部 context 时保留 contentStart，让它归入这个 user 的段。
      }
      startMarker = el
      continue
    }
    if (kind === 'turn-tail') {
      append(index, el, true)
      contentStart = index + 1
      startMarker = null
    }
  }
  if (contentStart < items.length) append(items.length, null, false)
  return snapshots
}

function hasVisibleSegmentWork(segment: SegmentSnapshot): boolean {
  const workHosts = new Set<HTMLElement>([
    ...segment.blocks.map(block => block.host),
    ...segment.middleSteps,
  ])
  if (segment.startMarker !== null) workHosts.add(segment.startMarker)
  if (segment.finalStep !== null) workHosts.add(segment.finalStep)
  return [...workHosts].some(isDisplayed)
}

/**
 * 收集流容器里的“折叠块”。规则：
 * - 堆积 = 工具组（工具卡片行）或纯 think 消息（推理块行、无正文文本）；
 * - **连续堆积合并成一块**；
 * - **带正文文本的消息（即使含 think 行）会断开合并**：它的 think 行先并入
 *   前面的块（无块则自成一块），然后正文文本作为分界；
 * - 纯文本消息直接断开；装饰元素（StreamingTail/TurnStatus/hints）不断开。
 * 结果：文本A - [折叠块] - 文本B - [折叠块] - 文本C。
 */
function findBlocks(flow: HTMLElement, hasBody: (el: HTMLElement) => boolean): Block[] {
  const blocks: Block[] = []
  const children = flowItems(flow)
  let run: Block | null = null
  // 上一个消息“正文后的遗留思考行”（Think1-正文-Think2 的 Think2）：
  // 不单独成 chip（一个消息一个 chip，避免 anchor 方案在 React 重渲染
  // 下累积 chip），而是并入下一个堆积块；到流末尾仍未消费时并入宿主
  // 消息的块，保证完成态不残留可见的思考行。
  let carry: HTMLElement[] = []
  let carryHost: HTMLElement | null = null

  const makeBlock = (host: HTMLElement, category: Block['category']): Block => {
    const block: Block = {
      key: '',
      host,
      rows: [],
      containers: [],
      mount: 'inside',
      category,
    }
    blocks.push(block)
    return block
  }

  const flushCarry = (): void => {
    if (carry.length === 0 || carryHost === null) return
    let own = blocks.find(block => block.host === carryHost && block.category === 'work')
    if (own === undefined) own = makeBlock(carryHost, 'work')
    own.rows.push(...carry)
    carry = []
    carryHost = null
  }

  for (const el of children) {
    const kind = el.getAttribute('data-chat-flow-kind')
    if (kind === 'user' || kind === 'steering' || kind === 'turn-tail') {
      flushCarry()
      run = null
      continue
    }
    const thinkRows = thinkRowsIn(el)
    const workRows = [...callRowsIn(el), ...commandRowsIn(el)]
    const isToolPile = workRows.length > 0
    // 上下文注入节点（permission preset / user-approval 等）：独立成二级块
    //（chip "上下文注入"），相邻 context 合并一块；不再随一级收尾整条折叠。
    const isContext = kind === 'context'
    // 正文检测：排除 think 行 / 工具卡 / 插件 chip 内部的文本，其余非空文本
    // 都算正文输出（推理摘要渲染在 [data-variant="think"] 内，不算正文）。
    // 工具组跳过 walker（工具卡必然有文本，不参与正文判定）。
    const msgHasBody = !isToolPile ? hasBody(el) : false

    if (isContext) {
      flushCarry()
      if (run === null || run.category !== 'context') run = makeBlock(el, 'context')
      run.rows.push(el)
      run.mount = 'before'
      continue
    }

    if (isToolPile || (thinkRows.length > 0 && !msgHasBody)) {
      // 堆积（工具组 / context 注入 / 纯 think 消息）→ 并入当前块。
      if (run === null || run.category !== 'work') run = makeBlock(el, 'work')
      if (carry.length > 0) {
        run.rows.push(...carry)
        carry = []
        carryHost = null
      }
      run.rows.push(...thinkRows, ...workRows)
      // 非宿主的堆积元素（相邻工具组、合并进来的纯 think 消息）随块折叠/
      // 展开 —— 否则完成态这些空 seat 仍占位，造成 "已处理" 行与最终正文
      // 之间的空白；块宿主（chip 插在它内部）不能隐藏。
      if (el !== run.host && !workRows.includes(el)) {
        run.containers.push(el)
      }
      if (workRows.includes(el)) run.mount = 'before'
    } else if ((el.hasAttribute('data-chat-anchor-key') && (thinkRows.length > 0 || msgHasBody)) || (msgHasBody && kind !== null)) {
      flushCarry()
      // 正文消息：think 先并入前面的块（无块则自成一块），然后断开合并。
      // 正文 = 带 data-chat-anchor-key 且（有 think 或文本）的 seat；空
      // 占位 seat（流式早期无内容的 assistant-step）不打断工具组合并。
      // hasText 兜底无 key 但带 kind 的输出。
      // 装饰元素（TurnStatus / PendingSteering / older 按钮等：无 key 无
      // kind，如 role="status" 的 "Deep diving..." 状态行）即使有文本也
      // 不当作正文——否则运行中的状态行会断开相邻工具组合并。
      if (thinkRows.length > 0) {
        // 块内按正文切分（luna 分段思考 Think1-正文-Think2）：第一段并入
        // 当前块；正文后的段落作为遗留行（carry），由下一个堆积块吸收，
        // 避免“文本上下的思考折叠到一起”且不引入第二个 chip。
        const segments = splitThinkByBody(el, thinkRows)
        if (run === null || run.category !== 'work') run = makeBlock(el, 'work')
        run.rows.push(...segments[0])
        carry = segments.slice(1).flat()
        carryHost = el
      }
      run = null
    } else if (kind !== null && kind !== 'assistant-step' && kind !== 'assistant') {
      // 有语义 kind 的空占位/纯文本节点也不能让块跨过消息边界。
      flushCarry()
      run = null
    }
    // 其他装饰元素（无 anchor、无行）不打断合并。
  }
  // 流末尾残留的遗留思考行（Think2 后无堆积块）：并入宿主消息的块（宿主
  // 有 think 时必是块宿主），宿主 think 已并入前块时并入最后一块——否则
  // 这些行在回合完成态保持可见，破坏“只留模型说的话”。
  flushCarry()

  const indexByHost = new Map(children.map((el, index) => [el, index]))
  const counts = new Map<string, number>()
  for (const block of blocks) {
    block.mount = block.rows.includes(block.host) ? 'before' : block.mount
    const base = `${stableElementKey(block.host, indexByHost.get(block.host) ?? 0)}:${block.category}`
    const ordinal = counts.get(base) ?? 0
    counts.set(base, ordinal + 1)
    block.key = `${base}:block:${ordinal}`
  }
  return blocks
}

/** 块内切分：think 行按“think 容器外的正文文本”分段。同一消息里
 * Think1-正文-Think2 时返回 [Think1] [Think2]；无正文间隔的相邻思考
 * 保持在同一段（合并）。 */
function splitThinkByBody(el: HTMLElement, rows: HTMLElement[]): HTMLElement[][] {
  const segments: HTMLElement[][] = []
  let current: HTMLElement[] = []
  for (let i = 0; i < rows.length; i++) {
    current.push(rows[i])
    if (i + 1 < rows.length && hasBodyBetween(el, rows[i], rows[i + 1])) {
      segments.push(current)
      current = []
    }
  }
  if (current.length > 0) segments.push(current)
  return segments.length > 0 ? segments : [rows]
}

/** a 行之后、b 行之前（DOM 顺序）是否存在 think 容器外的正文文本。 */
function hasBodyBetween(el: HTMLElement, a: HTMLElement, b: HTMLElement): boolean {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node: Text | null
  while ((node = walker.nextNode() as Text | null) !== null) {
    if (node.data.trim() === '') continue
    const parent = node.parentElement
    if (parent !== null && parent.closest('[data-variant="think"], [data-chat-call-id], .dshcf-chip, .dshcf-merged-think, .dshcf-merged-body') !== null) continue
    const posA = a.compareDocumentPosition(node)
    const posB = b.compareDocumentPosition(node)
    if ((posA & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 && (posB & Node.DOCUMENT_POSITION_PRECEDING) !== 0) {
      return true
    }
  }
  return false
}

/** 消息是否含正文文本：正文由 MarkdownText 渲染，但 CSS Modules 构建产物
 * 的类名是短哈希（如 uqINua_body），无法用类名字面量识别。改为文本节点
 * walker：折叠行（think 推理块 / 工具卡片）与插件自己的 chip、三级合并
 * 思考行/内容块之外的任何非空文本都算正文——正文渲染的段落
 * （p/pre/li 等）必然携带这些文本。 */
function hasBodyText(el: HTMLElement): boolean {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node: Text | null
  while ((node = walker.nextNode() as Text | null) !== null) {
    if (node.data.trim() === '') continue
    const parent = node.parentElement
    if (parent !== null && parent.closest('[data-variant="think"], [data-chat-call-id], .dshcf-chip, .dshcf-merged-think, .dshcf-merged-body') !== null) continue
    return true
  }
  return false
}

/** 正文也可能是纯图片/媒体，没有文本节点（ImageGallery 加载完成即如此）。 */
function hasBodyContent(el: HTMLElement): boolean {
  // 命令卡 / 手动压缩卡是工作流程展示，不是正文消息：其原生内容区文本
  // 不参与"正文"判定——否则 chip 被误判 has-body，折叠态 margin 悬空，
  // 与 flow row-gap 叠加成 32px 视觉间隔（正常 16px）。
  const kind = el.getAttribute('data-chat-flow-kind')
  if (kind === 'command' || kind === 'manual-compaction') return false
  if (hasBodyText(el)) return true
  const excluded = '[data-variant="think"], [data-chat-call-id], [data-variant="others"][data-state], .dshcf-chip, .dshcf-merged-think, .dshcf-merged-body'
  for (const media of el.querySelectorAll<HTMLElement>('img, video, audio, canvas')) {
    if (media.closest(excluded) === null) return true
  }
  return false
}

/** 元素内的推理块行：[data-variant="think"] 且无 data-tool。 */
function thinkRowsIn(el: HTMLElement): HTMLElement[] {
  const rows: HTMLElement[] = []
  for (const row of el.querySelectorAll<HTMLElement>('[data-variant="think"]:not([data-tool])')) {
    if (row.closest('[data-chat-call-id]') !== null) continue
    if (row.closest('[data-subcalls]') !== null) continue
    rows.push(row)
  }
  return rows
}

/** 元素内的顶层工具卡片行（排除 run_code 子派发行与嵌套行）。 */
function callRowsIn(el: HTMLElement): HTMLElement[] {
  const rows: HTMLElement[] = []
  for (const row of el.querySelectorAll<HTMLElement>('[data-chat-call-id]')) {
    if (row.closest('[data-subcalls]') !== null) continue
    if (row.closest('[data-chat-call-id]') !== row) continue
    rows.push(row)
  }
  return rows
}

/** command/manual-compaction 使用 GenericCommandCard，没有 data-chat-call-id。 */
function commandRowsIn(el: HTMLElement): HTMLElement[] {
  const kind = el.getAttribute('data-chat-flow-kind')
  if (kind !== 'command' && kind !== 'manual-compaction') return []
  const rows: HTMLElement[] = []
  for (const row of el.querySelectorAll<HTMLElement>('[data-variant="others"][data-state]')) {
    const parent = row.parentElement?.closest('[data-variant="others"][data-state]')
    if (parent !== null && parent !== undefined && parent !== row) continue
    rows.push(row)
  }
  // 极早期 skeleton 尚未挂 GenericCommandCard 时，整条 seat 仍作为可折叠行。
  return rows.length > 0 ? rows : [el]
}

/** 一行 → 实时摘要信息（工具名/思考摘要/状态）。工具行的 data-tool 与
 * data-state 在内层 [data-tool] root 上（外层 callRow 只有 class /
 * data-chat-anchor-key / data-chat-call-id），需向下查一层。 */
function deriveRowInfo(row: HTMLElement): RowInfo {
  const isThink = row.matches('[data-variant="think"]') && !row.hasAttribute('data-tool')
  if (isThink) {
    return { kind: 'think', label: 'Think', summary: thinkSummary(row), state: row.getAttribute('data-state') ?? 'ok' }
  }
  // 上下文注入节点（二级块行 = 元素自身）：固定标题 + DisclosureRow 摘要。
  if (row.getAttribute('data-chat-flow-kind') === 'context') {
    return { kind: 'tool', label: '上下文注入', summary: toolSummary(row), state: 'ok' }
  }
  const commandSeat = row.closest<HTMLElement>('[data-chat-flow-kind="command"], [data-chat-flow-kind="manual-compaction"]')
  if (commandSeat !== null) {
    const commandKind = commandSeat.getAttribute('data-chat-flow-kind')
    return {
      kind: 'tool',
      label: commandKind === 'manual-compaction' ? 'Compact' : 'Command',
      summary: toolSummary(row),
      state: row.getAttribute('data-state') ?? 'ok',
    }
  }
  const root = row.querySelector<HTMLElement>('[data-tool]') ?? row
  const tool = root.getAttribute('data-tool') ?? ''
  const state = root.getAttribute('data-state') ?? 'ok'
  const label = TOOL_LABELS[tool] ?? tool
  return { kind: 'tool', label: label !== '' ? label : 'Tool', summary: toolSummary(row), state }
}

/** Think 行摘要：优先官方 ReasoningRow 的实时摘要锚点 [data-follow-end]
 * （仅 running 时存在，内容为最新一行；完成态属性消失，走 summaryFallback）。 */
function thinkSummary(row: HTMLElement): string {
  const follow = row.querySelector<HTMLElement>('[data-follow-end]')
  if (follow !== null) {
    const text = (follow.textContent ?? '').trim()
    if (text !== '') return text
  }
  return summaryFallback(row)
}

/** 工具行摘要：DisclosureRow 的前两个直接子元素是 leading/title，之后
 * collapsedContent 从 separator 开始；summarySuffix 可能跟在 summary 后，
 * 因此取 title 之后第一个非空直接子元素，不能取 lastElementChild。 */
function toolSummary(row: HTMLElement): string {
  const drow = row.querySelector<HTMLElement>('[data-disclosure-row]')
  if (drow !== null) {
    const children = [...drow.children].filter((el): el is HTMLElement => el instanceof HTMLElement)
    for (const child of children.slice(2)) {
      const text = (child.textContent ?? '').trim()
      if (text !== '') return text
    }
  }
  return summaryFallback(row)
}

/** 兜底：文本 walker 取最长非空文本（跳过已展开的 body 子树，避免拿到
 * 输出内容；状态词/装饰都短于真正摘要，最长策略天然免疫）。 */
function summaryFallback(row: HTMLElement): string {
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT)
  let best = ''
  let node: Text | null
  while ((node = walker.nextNode() as Text | null) !== null) {
    if (node.parentElement?.closest('[data-open="true"]') !== null) continue
    const text = node.data.trim()
    if (text === '') continue
    if (text.length > best.length) best = text
  }
  return best
}

interface BlockInfo {
  /** 第一个运行中的工具行（按 DOM 顺序）。 */
  runningTool: RowInfo | null
  /** 第一个运行中的思考行。 */
  runningThink: RowInfo | null
  /** 全部工具展示名（去重、保序）。 */
  tools: string[]
  count: number
  hasError: boolean
  hasStopped: boolean
  /** 块是否全由上下文注入构成（完成态标题用 "上下文注入"）。 */
  allContext: boolean
}

function deriveBlockInfo(rows: readonly HTMLElement[]): BlockInfo {
  const infos = rows.map(deriveRowInfo)
  const runningTool = infos.find(i => i.kind === 'tool' && i.state === 'running') ?? null
  const runningThink = infos.find(i => i.kind === 'think' && i.state === 'running') ?? null
  const tools = [...new Set(infos.filter(i => i.kind === 'tool').map(i => i.label))]
  return {
    runningTool,
    runningThink,
    tools,
    count: rows.length,
    hasError: infos.some(i => i.state === 'error'),
    hasStopped: infos.some(i => i.state === 'stopped'),
    allContext: infos.length > 0 && infos.every(i => i.label === '上下文注入'),
  }
}

/** 刷新 chip 内容：实时反映当前正在进行的工作。只在内容真正变化时才写
 * DOM —— 流式思考时摘要逐帧变化，无变化写入会触发 MutationObserver
 * childList 自激（pass → 写 → mutation → pass 循环）并造成文本跳动。 */
function updateChip(
  chip: HTMLButtonElement,
  rows: readonly HTMLElement[],
  expanded: boolean,
): void {
  const info = deriveBlockInfo(rows)
  const title = chip.querySelector<HTMLElement>('.dshcf-chip-title')
  const summary = chip.querySelector<HTMLElement>('.dshcf-chip-summary')
  const sep = chip.querySelector<HTMLElement>('.dshcf-chip-sep')
  if (title === null || summary === null) return

  const running = info.runningTool ?? info.runningThink
  // 展开态（出现三级原生行）后右侧摘要消失：三级行自带流式思考/命令
  // 展示，二级不再重复展示摘要；收起态显示摘要。
  const collapsed = !expanded
  let titleText: string
  let summaryText: string

  if (info.runningTool !== null) {
    // 正在调用工具："正在运行" + 命令/参数。
    titleText = '正在运行'
    summaryText = collapsed ? info.runningTool.summary : ''
  } else if (info.runningThink !== null) {
    // 正在思考：显示思考的最新一行。
    titleText = '正在思考'
    summaryText = collapsed ? info.runningThink.summary : ''
  } else if (info.tools.length > 0) {
    // 已完成的写入/编辑与普通命令分开表达；纯 context 保持自己的标题。
    titleText = info.allContext
      ? '上下文注入'
      : info.tools.some(tool => tool === 'Edit' || tool === 'Write')
        ? '编辑了文件'
        : '运行了命令'
    summaryText = ''
  } else {
    // 纯 think 块完成：固定 "已思考"。
    titleText = '已思考'
    summaryText = ''
  }

  // 收起/展开状态由 chevron 方向表达，标题不附加"收起"字样。
  const kind: 'tool' | 'think' | 'context' = running !== null
    ? running.kind
    : info.allContext
      ? 'context'
      : info.tools.length > 0 ? 'tool' : 'think'

  if (title.textContent !== titleText) title.textContent = titleText
  if (summary.textContent !== summaryText) summary.textContent = summaryText
  if (sep !== null) {
    const sepDisplay = summaryText === '' ? 'none' : ''
    if (sep.style.display !== sepDisplay) sep.style.display = sepDisplay
  }
  // running 时摘要跟随最新内容：视口贴住右端（原生 ReasoningRow 的
  // scrollLeft 跟随），流式更新时新内容向左流动。只在 running 或刚离开
  // running（上一轮还是 running）时读写滚动量：静止 chip 完全不碰 layout
  // 属性，避免每个 pass 强制回流。
  if (running !== null) {
    summary.scrollLeft = summary.scrollWidth - summary.clientWidth
  } else if (chip.classList.contains('running') && summary.scrollLeft !== 0) {
    summary.scrollLeft = 0
  }
  const expandedAttr = String(expanded)
  if (chip.getAttribute('aria-expanded') !== expandedAttr) {
    chip.setAttribute('aria-expanded', expandedAttr)
  }
  if (chip.dataset.kind !== kind) {
    chip.dataset.kind = kind
    syncLeadingIcon(chip, kind)
  }
  const tip = expanded ? '收起这些卡片' : '展开这些卡片'
  if (chip.title !== tip) chip.title = tip
  setClass(chip, 'running', running !== null)
  setClass(chip, 'error', !running && info.hasError)
  setClass(chip, 'stopped', !running && info.hasStopped && !info.hasError)
}

/** 仅当目标状态与当前不同时才写 class（避免每帧重复 classList 操作）。 */
function setClass(el: HTMLElement, cls: string, on: boolean): void {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on)
}

/** 摘要截断：去首尾空白、压缩换行，超长截断加省略号。 */
function truncateSummary(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max) + '…' : t
}

/** 去掉 markdown 强调/标题标记（think 摘要常为 **粗体** 或 # 标题）。 */
function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, '').replace(/^#{1,3}\s+/, '').trim()
}

/** 行是否为原生思考行。 */
function isThinkRow(row: HTMLElement): boolean {
  return row.matches('[data-variant="think"]') && !row.hasAttribute('data-tool')
}

/** 从回合尾时间戳消息解析官方耗时（"用时 33秒" / "用时 2分05秒"），
 * 历史会话加载时没有本地 running 起点，用它补上 "已处理 {时长}"。 */
function parseTurnDuration(boundary: HTMLElement): number | undefined {
  const text = boundary.textContent ?? ''
  // 旧格式：turn-tail 带 "用时 33秒" / "用时 2分05秒"。
  const m = text.match(/用时\s*(\d+)分(\d+)秒|用时\s*(\d+)秒/)
  if (m !== null) {
    // 用时 X分Y秒 / 用时 X秒（m[1]/m[2] 与 m[3] 互斥，无其他可达分支）。
    if (m[1] !== undefined && m[2] !== undefined) return Number(m[1]) * 60000 + Number(m[2]) * 1000
    if (m[3] !== undefined) return Number(m[3]) * 1000
    return undefined
  }
  // 新格式：turn-tail 只有结束时间（"8月14日 22:11 · 66 tok/s"），
  // 回合开始时间在用户消息的 timeStart（"8月14日 21:56"）——取差值。
  const end = parseTimeText(text)
  const start = findTurnStart(boundary)
  if (end !== undefined && start !== undefined && end > start) return end - start
  return undefined
}

/** 解析 DSH 时间文本（"8月14日 21:56" / "2026年8月14日 22:11"）。 */
function parseTimeText(text: string): number | undefined {
  const m = text.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/)
  if (m === null) return undefined
  const year = m[1] !== undefined ? Number(m[1]) : new Date().getFullYear()
  const t = new Date(year, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])).getTime()
  return Number.isNaN(t) ? undefined : t
}

/** boundary 之前（含）最近的回合开始时间（timeStart 类元素）。 */
function findTurnStart(boundary: HTMLElement): number | undefined {
  const flow = boundary.parentElement
  if (flow === null) return undefined
  let best: HTMLElement | null = null
  for (const s of flow.querySelectorAll<HTMLElement>('[class*="timeStart"]')) {
    // timeStart 在用户消息内部（flow 深层），用 DOM 位置判断在 boundary 前
    // （CONTAINED_BY = boundary 是用户消息时 timeStart 在它内部）。
    const pos = s.compareDocumentPosition(boundary)
    if ((pos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 || (pos & Node.DOCUMENT_POSITION_CONTAINED_BY) !== 0 || s === boundary) best = s
    else break
  }
  if (best === null) return undefined
  return parseTimeText(best.textContent ?? '')
}

/** 行的运行状态：工具行的 data-state 在内层 [data-tool] root 上（外层
 * callRow 只有 class/anchor/call-id），think 行在自身。 */
function rowState(row: HTMLElement): string {
  if (row.matches('[data-variant="think"]') && !row.hasAttribute('data-tool')) {
    return row.getAttribute('data-state') ?? 'ok'
  }
  const root = row.querySelector<HTMLElement>('[data-tool]') ?? row
  return root.getAttribute('data-state') ?? 'ok'
}

/** 创建 "已处理 {时长}" 行元素（右侧小箭头，点击行为由控制器绑定）。 */
function createProcessedRowElement(duration?: number): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'dshcf-processed'
  btn.setAttribute('aria-expanded', 'false')
  const text = document.createElement('span')
  text.textContent = duration !== undefined ? `已处理 ${formatDuration(duration)}` : '已处理'
  const chevron = createChevronIcon('dshcf-processed-chevron')
  btn.append(text, chevron)
  btn.title = '展开工作过程'
  return btn
}

/** 毫秒 → 中文紧凑时长（素材 Codex 对齐：14秒 / 2分05秒 / 15分）。
 * 整分钟（秒为 0）省略秒位：15分00秒 → 15分；整小时 → X小时。 */
function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}秒`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) {
    // 小时级：X小时 / X小时Y分（秒省略，分钟粒度足够）。
    return m > 0 ? `${h}小时${m}分` : `${h}小时`
  }
  // 分钟级：整分省略秒位（15分00秒 → 15分）。
  if (r === 0) return `${m}分`
  return `${m}分${String(r).padStart(2, '0')}秒`
}

function injectStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CHIP_CSS
  document.head.appendChild(style)
}

/** 官方 ChatView 尾部的运行状态行：`<div role="status">Deep diving...`。
 * 把其中的文本节点 "Deep diving..." 替换为自定义状态提示词，流光
 * 特效在 CSS 上（dsh-turn-status-shimmer），不受影响。React 重渲染会
 * 恢复原文，pass() 每轮自愈。
 * @param statusText - 完整替换文案；调用方已排除空值。
 */
function replaceTurnStatus(flow: HTMLElement, originals: Map<Text, string>, statusText: string): void {
  const statuses = flow.matches('[role="status"]')
    ? [flow, ...flow.querySelectorAll<HTMLElement>('[role="status"]')]
    : [...flow.querySelectorAll<HTMLElement>('[role="status"]')]
  for (const status of statuses) {
    for (const node of status.childNodes) {
      if (node instanceof Text && node.data.includes('Deep diving')) {
        if (!originals.has(node)) originals.set(node, node.data)
        // 同时吃掉原生三段点号，避免用户填入 "Deep sleeping..." 时
        // 与原文尾部 "..." 叠成双省略号。
        const next = node.data.replace(/Deep diving[.…]*/, statusText)
        // 写入守卫：值不变不赋值。否则每轮 pass 的赋值会产生
        // characterData mutation，在 characterData 观察下自激循环。
        if (node.data !== next) node.data = next
      }
    }
  }
}

/** 只恢复仍保留插件改写文案的节点，避免覆盖宿主之后的状态更新。 */
function restoreTurnStatus(originals: Map<Text, string>): void {
  for (const [node, original] of originals) {
    // 只要仍是插件写入后的文本（与原值不同）就还原；自定义文案也不要求含 "Deep"。
    if (node.isConnected && node.data !== original) node.data = original
  }
  originals.clear()
}

function removeStyle(): void {
  document.getElementById(STYLE_ID)?.remove()
}
