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
 *   - 全部完成 → 标题 = 类型总结（编辑了文件 / 运行了命令 / 已思考 /
 *     上下文注入），摘要清空；出错 → 红色，中断 → 琥珀。
 *
 * 另外把官方 ChatView 尾部的运行状态行文字（新版 "深度求索中..." / 旧版
 * "Deep diving..."，见 TURN_STATUS_COPY_RE）替换为可配置的状态提示词
 * （默认 "Deep sleeping..."；流光特效在 CSS 上，替换文本节点不影响，
 * 宿主追加的用时后缀原样保留）。React 重渲染会恢复原文，pass() 每轮自愈改回。
 * 设置为空时不替换，等价于恢复官方原文。
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

/** 官方运行状态行进行中文案（新旧两版）：0.1.x 为英文 "Deep diving..."；
 * 当前版本为中文 "深度求索中..."。宿主会把用时后缀（如 "33秒"）拼进同一
 * 文本节点，替换时只吃文案前缀、后缀原样保留。 */
const TURN_STATUS_COPY_RE = /Deep diving[.…]*|深度求索中\s*[.…]*/

/** 显示动画参数（issue #2 区间 150–250ms）。 */
const ANIM_DURATION_MS = 180
const ANIM_EASING = 'ease-out'

/** display 所有权哨兵（内联自定义属性）：插件接管元素显示时盖上，恢复时清除。
 * 外部对 style 的属性级改写（el.style.display = …）不会动它，由 written 值比对
 * 兜底；整体改写（cssText / setAttribute('style')）会抹掉它，由哨兵缺失检测
 * 兜底——两层合起来覆盖外部介入的两种形态（issue #11 Bug A）。 */
const DISPLAY_OWNED_PROP = '--dshcf-display-owned'
/** 外部显示变更对账周期（issue #11 Bug B）：style 不进 attributeFilter
 * （插件自身大量直写 style 会自激），改为低频自重排兜底，保证任何外部
 * 隐藏/恢复最迟一个周期被 pass 收敛。可通过 options.auditIntervalMs 调整。 */
const AUDIT_TICK_MS = 1000

/** 视口贴底判定阈值（issue #14）：上游 ChatView 的 FOLLOW_THRESHOLD = 24
 * （报告者逆向），折叠写入前后以此判定「用户贴底」并在同一帧钉回底部，
 * 消除「插件改高 → 下一帧宿主 ResizeObserver 吸底回写」的跨帧抽搐。 */
const STICK_BOTTOM_THRESHOLD_PX = 24

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

/** 原生回合摘要行（DSH 0.1.2+ TurnProcessNodeView）：
 *  flow 顶层 data-chat-flow-kind="turn-process" 的消息，内部按钮
 *  button[data-turn-process] 携带计数值与 data-open/aria-expanded 开合态。
 *  插件永不隐藏它：一级行向它让位，overlay 跟随它的开合。
 */
const TURN_PROCESS_KIND = 'turn-process'
/** 原生折叠成员标记：宿主收起时打在成员行上（CSS 级隐藏，非内联）。 */
const NATIVE_HIDDEN_ATTR = 'data-turn-process-hidden'
/** 原生摘要按钮的展开标记：React 以 data-open 有无表达开合。 */
const NATIVE_OPEN_ATTR = 'data-open'

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
  /* 展开态补的 margin-bottom 16px 由 aria-expanded/has-body 翻转驱动，
     一帧瞬开（与三级行 display 翻转同 pass 同帧，无下推）；收起方向
     由 JS 侧钉住间距（收起 fade 期间内联 16px，最后一条在途渐隐 settle
     后归零，见 reconcileBlock / hasPendingCollapse）。不设 CSS transition
     ——v13 的过渡与 chip 元素生命周期随机交互，产生展开方向双重人格
     （复用元素缓动下推三级行 vs 新建元素瞬开），同类型块不一致。 */
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
  /** 收起终态结算（pin 归零/移除）。存在账本上，供迟到 onfinish 与僵尸收割共用。 */
  settle?: () => void
}

export class FoldController {
  private observer: MutationObserver | null = null
  /** 防止同一个控制器重复注册 observer、定时器和可见性监听。 */
  private started = false
  /** body 尚未创建时等待 DOMContentLoaded，再补一次启动。 */
  private waitingForBody = false
  private readonly onDomContentLoaded = (): void => {
    this.waitingForBody = false
    this.start()
  }
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
  /** 曾完成过的 segment key：段恢复运行时据此重开本地计时，防止重新结算
   * 的本地时长吞掉完成间隙。 */
  private completedOnce = new Set<string>()
  /** 插件改写 display 前的精确原值；受控集合用于分类漂移和 stop() 恢复。 */
  private originalDisplay = new WeakMap<HTMLElement, string>()
  private controlledDisplay = new Set<HTMLElement>()
  /** 元素 → 插件最后确保的 display 值：恢复前与当前内联值比对，漂移即视为
   * 外部介入（镜像 turnStatusTexts 的 original/written 双快照守卫，issue #11）。 */
  private writtenDisplay = new WeakMap<HTMLElement, string>()
  /** 被改写为状态提示词的原生状态文本：original = 宿主原文（卸载还原用），
   * written = 插件最后一次写入的值（仅当节点仍等于它时才还原，避免覆盖
   * 宿主在插件写入之后的状态更新）。 */
  private turnStatusTexts = new Map<Text, { original: string; written: string }>()
  /** 当前状态提示词读取器；返回空串时插件不替换状态行。 */
  private statusTextProvider: () => string | undefined
  /** 正文判定缓存（消息元素 → 有无正文）：流式期间只有被 mutation 命中的
   * 消息失效重算，历史消息跨 pass 复用，避免每帧全量 TreeWalker。 */
  private bodyTextCache = new WeakMap<HTMLElement, boolean>()
  /** 自上次 pass 以来子树发生变化的 flow 顶层消息；pass 开头统一失效。 */
  private dirtyMessages = new Set<HTMLElement>()
  /** 在途显示动画（元素 → 记录）：冲突仲裁、记账对齐与生命周期清理的依据。
  /** 在途显示动画（元素 → 记录）：冲突仲裁、记账对齐与生命周期清理的依据。
   * 用 Map 不用 WeakMap——switchFlow/stop 需要遍历全量 cancel。 */
  private pendingAnims = new Map<HTMLElement, PendingAnim>()
  /** 手势点击的一次性可动画 block key；segment 级点击另保留中间正文的门控。 */
  private animatableKeys = new Set<string>()
  /** segment 点击时只让点击前已存在的 block 播放 reveal；流式中新出现的
   * 临时分裂块直接显示，避免分类收敛时留下半透明 stale chip。 */
  private animatableSegmentBlocks = new Map<string, ReadonlySet<string>>()
  /** 外部变更对账定时器句柄（自重排 setTimeout 链，见 armAuditLoop）。 */
  private auditTimer: number = 0
  /** 上一轮 pass 记录的关键元素内联 display，用于 audit 轻量检测漂移。
   * audit 只读这份快照，不在页面稳定时重新执行完整 pass。 */
  private auditDisplays = new Map<HTMLElement, string>()
  /** 自上次 pass 以来 flow 子树发生过结构变化（childList）或正文判定翻转：
   * 为 true 时 pass 重建分块快照，否则复用 currentBlocks——characterData/
   * attributes 批次（流式文本、data-state 翻转）不改变块结构，跳过全量
   * querySelectorAll 重扫（issue #14：长会话下每轮重扫造成主线程卡顿）。 */
  private structureDirty = true
  /** 本轮 pass 的原生 turn 摘要快照（turn id → 开合态）：每轮重建，不跨轮复用；
   * data-open 翻转不改变块结构也能驱动重算，见 buildNativeTurnMap。 */
  private nativeTurns = new Map<string, NativeTurnState>()
  /** 被折叠掏空后藏起的中间包装层（真机 44px vs 28px 真因：think 行全隐后
   * 其父容器变零高度空壳，仍作为 flex item 参与父级 gap，凭空多出 16px）。
   * 内容恢复（展开/流式追加/块转世）时同函数恢复显示；switchFlow 清空。 */
  private emptiedWrappers = new Set<HTMLElement>()
  /** 本轮 pass 内有过 display 实写（hide/restore 瞬时路径）。空洞发现的触发
   * 条件之一：纯 display 收放不产生 childList，不触发 structureDirty。
   * settle 触发的后续 pass 则由 settleFired 覆盖。读后即清（见发现调用点）。 */
  private displayTouched = false
  /** 有 fade 自然结算过（chipSettle 跑过）。结算本身不写 display，但它意味着
   * 某行刚变隐藏——空洞可能刚形成。 */
  private settleFired = false
  /** 滚动稳定化（issue #14）：flow 最近的滚动容器缓存（按 flow 身份失效）。 */
  private scrollContainer: HTMLElement | null = null
  private scrollContainerFlow: HTMLElement | null = null
  /** 回到前台立即补一轮对账；后台 tab 由 document.hidden 门控跳过。 */
  private readonly onVisibilityChange = (): void => {
    if (typeof document === 'undefined' || document.hidden !== true) this.schedule()
  }

  constructor(statusTextProvider?: () => string | undefined, options?: { auditIntervalMs?: number }) {
    this.statusTextProvider = statusTextProvider ?? (() => DEFAULT_STATUS_TEXT)
    this.auditIntervalMs = options?.auditIntervalMs ?? AUDIT_TICK_MS
  }
  private readonly auditIntervalMs: number

  /** 设置变更后重跑一轮，让状态提示词立即生效。 */
  refresh(): void {
    this.schedule()
  }

  start(): void {
    if (this.disposed || this.started || this.waitingForBody) return
    if (typeof document === 'undefined') return
    if (document.body === null) {
      // 插件可能在 document.body 创建前被加载；不要让 observe(null) 抛错，
      // 等 DOMContentLoaded 后由同一个控制器继续启动。
      if (typeof document.addEventListener !== 'function') return
      this.waitingForBody = true
      document.addEventListener('DOMContentLoaded', this.onDomContentLoaded, { once: true })
      return
    }
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
        // 原生 TurnProcess 开合只改 attribute（成员 data-turn-process-hidden、
        // 摘要按钮 data-open），必须进过滤器才能即时调度；插件自身从不写
        // 这两个属性，不会自激。
        attributeFilter: ['data-selected', 'data-state', 'data-turn-process-hidden', 'data-open'],
        // 流式文本更新（React 改 text node 的 data）属于 characterData
        // mutation：不观察则二级摘要/滚动跟随只能靠偶发结构变化驱动，
        // 变成“隔几秒跳一次”。所有文本写入都有守卫（值不变不写），
        // 不会自激。
        characterData: true,
      })
      this.started = true
      this.armAuditLoop()
      this.schedule()
    } catch (error) {
      this.observer?.disconnect()
      this.observer = null
      this.started = false
      this.reportError(error)
      throw error
    }
  }

  /** 外部显示变更对账循环（issue #11 Bug B）：外部对宿主行的 style 写入不产生
   * observer record（style 不在 attributeFilter 内，监听会因插件自身直写 style
   * 自激），改用低频轻量对账兜底——发现漂移后才由 pass 收敛；
   * 后台 tab 由 document.hidden 门控跳过，回前台由 visibilitychange 立即补一轮。
   * 用自重排 setTimeout 链而非 setInterval：与 schedule 的兜底定时器同源，
   * 测试桩 clearTimers 后链条自然熄灭。 */
  private armAuditLoop(): void {
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', this.onVisibilityChange)
    }
    this.rearmAudit()
  }

  private rearmAudit(): void {
    if (this.disposed || this.auditTimer !== 0) return
    this.auditTimer = setTimeout(() => {
      this.auditTimer = 0
      if (this.disposed) return
      if (typeof document !== 'undefined' && document.hidden === true) {
        this.rearmAudit()
        return
      }
      this.audit()
      this.rearmAudit()
    }, this.auditIntervalMs)
  }

  /** 低成本显示状态对账：只有发现外部漂移时才启动完整 pass。
   *
   * 外部 style.display 写入不会产生当前 observer 的 attribute 记录，
   * 因此仍保留 audit；但稳定页面不应每秒重扫整个 flow。快照只覆盖
   * flow 顶层行、插件控制中的宿主行和插件自有展示行，避免引入布局读取。 */
  private audit(): void {
    if (this.disposed) return
    const flow = this.flow
    if (flow === null || !flow.isConnected) {
      // body observer 会负责发现新 flow；旧 flow 脱离时补一轮 pass 以切换引用。
      if (flow !== null) this.schedule()
      return
    }
    const current = this.collectAuditDisplays(flow)
    if (current.size !== this.auditDisplays.size) {
      this.schedule()
      return
    }
    for (const [el, display] of current) {
      if (this.auditDisplays.get(el) !== display) {
        this.schedule()
        return
      }
      if (this.controlledDisplay.has(el) && this.displayForeign(el)) {
        this.schedule()
        return
      }
    }
    // 掏空包装层复核：style 不进 observer attributeFilter，原生侧在视野外
    // 恢复内容时 observer 看不见；这里直接恢复并遗忘，不排队等 pass。
    for (const el of [...this.emptiedWrappers]) {
      if (!el.isConnected) { this.emptiedWrappers.delete(el); continue }
      if (!this.isHollow(el)) {
        this.restoreElement(el)
        if (el.style.display === 'none') el.style.display = ''
        this.emptiedWrappers.delete(el)
      }
    }
  }

  stop(): void {
    this.disposed = true
    this.started = false
    this.waitingForBody = false
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('DOMContentLoaded', this.onDomContentLoaded)
    }
    if (this.raf !== 0) cancelAnimationFrame(this.raf)
    if (this.timer !== 0) clearTimeout(this.timer)
    if (this.auditTimer !== 0) { clearTimeout(this.auditTimer); this.auditTimer = 0 }
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange)
    }
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
    return records.some(record => this.isRelevantMutation(record))
  }

  /** 判断 mutation 是否会影响宿主 flow；插件自有节点的回写直接忽略，
   * 避免“pass 插入 chip → observer 再开一轮 pass”的自激循环。 */
  private isRelevantMutation(record: MutationRecord): boolean {
    const flow = this.flow
    if (flow === null || !flow.isConnected) return true
    if (!nodeWithin(record.target, flow) && !nodeWithin(flow, record.target)) return false

    // 状态文案由插件自己维护；其 characterData 回写无需再次扫描 flow。
    if (record.type === 'characterData' && record.target instanceof Text && this.turnStatusTexts.has(record.target)) {
      return false
    }

    const changed = [
      ...Array.from(record.addedNodes ?? []),
      ...Array.from(record.removedNodes ?? []),
    ]
    // childList 的 target 可能是宿主行，但只要实际增删的节点全部属于
    // 插件自有展示元素，就不会改变宿主语义状态，可安全忽略。
    if (changed.length > 0 && changed.every(isPluginOwnedNode)) return false
    if (changed.length === 0 && isPluginOwnedNode(record.target)) return false
    return true
  }

  /** 记录本批 mutation 命中的 flow 顶层消息，供正文判定缓存定向失效。
   * 从 record.target 沿 parentNode 走到 flow 的直接子级即所属消息。
   * 失效粒度（issue #14）：只有 childList 使分块快照失效；flow 直挂层的
   * 插件节点/文本节点与 flow 外的混批记录不影响任何消息的正文判定，跳过
   * 而非全量失效——旧逻辑把它们全部放大成 O(全会话) 的 TreeWalker 重扫，
   * 长会话流式期间每帧如此。空批次仍保守全量失效（测试桩的调度通知）。 */
  private markDirty(records: MutationRecord[]): void {
    const flow = this.flow
    if (flow === null || !flow.isConnected) return
    if (records.length === 0) {
      // 空批次 = 宿主/测试桩只通知“一轮调度、DOM 可能已变”而无细粒度
      // 记录（真实浏览器 observer 不会以空记录回调）：保守全量失效。
      this.bodyTextCache = new WeakMap()
      this.dirtyMessages.clear()
      this.structureDirty = true
      return
    }
    for (const record of records.filter(record => this.isRelevantMutation(record))) {
      if (record.type === 'childList') this.structureDirty = true
      if (record.target === flow) {
        // flow 直挂层 childList：逐个新增节点归属到消息（插件自己的
        // processed row / flow-chip 也走这里，hasBody 判定为否并缓存，
        // 代价一次小 TreeWalker）；被移除的节点与其余消息的缓存互不影响。
        for (const node of record.addedNodes ?? []) {
          if (node instanceof HTMLElement) this.dirtyMessages.add(node)
        }
        continue
      }
      const owner = flowChildOwner(record.target, flow)
      if (owner !== null) this.dirtyMessages.add(owner)
      // owner === null：record 不在 flow 子树内（shouldSchedule 的批次级
      // 过滤放行的混批记录）或 flow 直挂文本——不命中任何消息缓存，跳过。
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
      this.animatableSegmentBlocks.clear()
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

    // 正文缓存定向失效 + 正文翻转检测：只重算本 pass 前被 mutation 命中的
    // 消息；某消息的有无正文判定发生翻转时，分块边界随之改变，需重建快照
    // （纯文本流式消息从“纯 think/堆积”变“正文”就靠这里驱动重建）。
    let bodyFlipped = false
    for (const el of this.dirtyMessages) {
      const prev = this.bodyTextCache.get(el)
      this.bodyTextCache.delete(el)
      if (prev !== undefined && this.hasBodyCached(el) !== prev) bodyFlipped = true
    }
    this.dirtyMessages.clear()
    // 分块快照复用（issue #14）：结构未变（无 childList、无正文翻转）时
    // 跳过 findBlocks 的全量 querySelectorAll 重扫——流式文本与 data-state
    // 翻转批次直接沿用上一轮快照，行状态由 reconcile/updateChip 的实时
    // DOM 读取保证新鲜。
    const rebuildBlocks = this.structureDirty || bodyFlipped || this.currentBlocks.size === 0
    this.structureDirty = false
    const blocks = rebuildBlocks
      ? findBlocks(flow, (el) => this.hasBodyCached(el))
      : [...this.currentBlocks.values()]
    this.currentBlocks = new Map(blocks.map(block => [block.key, block]))
    const segments = buildSegments(flow, blocks, (el) => this.hasBodyCached(el))
    const liveSegmentKeys = new Set(segments.map(segment => segment.key))
    // 原生 turn 摘要快照每轮重建：data-open 翻转不改变块结构，必须实时读取，
    // 不能并入 structureDirty 门控的快照复用。
    this.nativeTurns = buildNativeTurnMap(flow)

    // 滚动锚定（issue #14）：几何写入前记录贴底意图，见 captureScrollAnchor。
    const scrollAnchor = this.captureScrollAnchor(flow)

    for (const segment of segments) {
      if (!segment.running) continue
      // 曾完成又恢复运行的回合（罕见）：丢弃旧起点重开计时，避免重新结算
      // 的本地时长吞掉完成间隙（段完成态时长已冻结，不在此覆盖）。
      if (this.completedOnce.has(segment.key)) {
        this.completedOnce.delete(segment.key)
        this.runningSince.delete(segment.key)
      }
      if (!this.runningSince.has(segment.key)) {
        this.runningSince.set(segment.key, Date.now())
      }
    }

    const completedKeys = new Set<string>()
    for (const snapshot of segments) {
      if (!snapshot.closed || snapshot.running || !snapshot.hasWork) continue
      completedKeys.add(snapshot.key)
      this.completedOnce.add(snapshot.key)
      // 原生让位：该 segment 拥有原生回合摘要行时不建一级行（免双摘要）；
      // 残留旧行先移除。时长显示按用户决策舍弃（选项 1）。
      if (segmentHasNativeTurn(snapshot, this.nativeTurns)) {
        const prev = this.segmentStates.get(snapshot.key)
        prev?.row?.remove()
        if (prev !== undefined) this.segmentStates.delete(snapshot.key)
        continue
      }
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
      // 无官方时长的节点（典型：中途停止，tail 没有「用时」）回退到本地观察
      // 的 running 区间——但只在首次结算时取值冻结：本分支每轮 pass 都会执行，
      // 若持续用 Date.now() 重算，停止后的「已处理 X秒」会一直走表（用户实测）。
      // 冻结后官方时长一旦出现（如 tail 补发）仍可覆盖。
      if (parsed !== undefined) state.duration = parsed
      else if (state.duration === undefined && started !== undefined) state.duration = Date.now() - started
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
    // 空洞包装层兜底发现：按行 walk 依赖分块覆盖，嵌套在正文体等容器内的行
    // 可能不在任何 block.rows 里（如 body 内 think）导致漏网。这里按宿主直扫。
    // 扫描范围除 block.host 外还包括 finalStep/middleSteps：think 行被并入
    // 前一个块的消息（正文消息不是块宿主）里，空壳包装层同样制造 flex-gap
    // 幻影（正文与上方内容之间多 16px）。
    // 触发条件：结构变化，或本轮有过 display 实写，或有 fade 结算过——纯
    // display 收放与 settle 都不产生 childList，走不到 structureDirty。读后即清。
    if (rebuildBlocks || this.displayTouched || this.settleFired) {
      const hosts = new Set<HTMLElement>()
      for (const block of this.currentBlocks.values()) {
        if (block.host.isConnected) hosts.add(block.host)
      }
      for (const segment of segments) {
        if (segment.finalStep?.isConnected) hosts.add(segment.finalStep)
        for (const middle of segment.middleSteps) {
          if (middle.isConnected) hosts.add(middle)
        }
      }
      this.discoverHollowWrappers(hosts, desiredHidden)
    }
    this.displayTouched = false
    this.settleFired = false

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
    // 僵尸收割：收起 fade 已播完但 finish 事件丢失（后台 tab/事件丢失），记录
    // 仍在导致每轮仲裁跳过、元素以 opacity:0 占位（真机：透明占位 40px 与展开
    // 跳动）。同步执行终态结算；身份守卫在方法内，无误伤。放 restore 之前，
    // 免得复活逻辑反向取消这些本该结束的动画。
    for (const [el, record] of [...this.pendingAnims]) {
      if (
        record.target === 'hidden'
        && record.kind === 'fade'
        && this.pendingAnims.get(el) === record
        && this.isAnimOverdue(record.anim)
      ) {
        this.finishFadeCollapse(el, record)
      }
    }
    this.restoreUnusedDisplays(desiredHidden)
    for (const state of this.segmentStates.values()) this.placeProcessedRow(flow, state)
    // 几何写入收尾：贴底视口同帧钉回（issue #14），在宿主 ResizeObserver
    // 的下一帧吸底回写之前消除跨帧抽搐窗口。
    this.stabilizeScrollAfterFold(scrollAnchor)

    for (const key of [...this.runningSince.keys()]) {
      if (!liveSegmentKeys.has(key)) this.runningSince.delete(key)
    }
    for (const key of [...this.completedOnce]) {
      if (!liveSegmentKeys.has(key)) this.completedOnce.delete(key)
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
    this.captureAuditDisplays(flow)
  }

  /** flow 最近的滚动容器（issue #14 滚动稳定化的测量基准）：沿父链找第一个
   * overflow-y 为 auto/scroll 且实际可滚动的祖先。结果按 flow 身份缓存；
   * 找不到时不缓存（内容增长后祖先可能变为可滚动），每 pass 重探的代价
   * 只是几次 clean-layout 的 computed style / scrollHeight 读取。 */
  private findScrollContainer(flow: HTMLElement): HTMLElement | null {
    if (
      this.scrollContainerFlow === flow
      && this.scrollContainer !== null
      && this.scrollContainer.isConnected
      // flow 可能在同一节点生命周期内被 React 重新挂到新的滚动容器；
      // 仅检查 isConnected 会继续向旧容器写入 scrollTop。
      && nodeWithin(flow, this.scrollContainer)
    ) {
      return this.scrollContainer
    }
    let node: HTMLElement | null = flow.parentElement
    while (node !== null) {
      if (typeof getComputedStyle === 'function') {
        const oy = getComputedStyle(node).overflowY
        if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) break
      }
      node = node.parentElement
    }
    if (node === null) return null
    this.scrollContainer = node
    this.scrollContainerFlow = flow
    return node
  }

  /** 几何写入前捕捉贴底意图（issue #14）：视口距底 ≤ 上游 FOLLOW_THRESHOLD
   * 时返回锚点，stabilizeScrollAfterFold 在写入后同帧钉回底部。远离底部
   * （用户正在滚动浏览）时不干预——视口上方的高度变化由浏览器 scroll
   * anchoring 补偿，视口下方的折叠不可见，插件再写 scrollTop 只会加入
   * 上游吸底回写的拉锯。 */
  private captureScrollAnchor(flow: HTMLElement): { el: HTMLElement } | null {
    const scroller = this.findScrollContainer(flow)
    if (scroller === null) return null
    const dist = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    // dist 为负（橡皮筋回弹中）同样视为贴底意图。
    return dist <= STICK_BOTTOM_THRESHOLD_PX ? { el: scroller } : null
  }

  /** 几何写入后把贴底视口钉回底部：折叠让 scrollHeight 缩小时若不在此帧
   * 补写 scrollTop，宿主 ChatView 要到下一帧 ResizeObserver 才吸底回写，
   * 中间的空档让触控板惯性滚动乘虚而入，反复折叠时表现为上下抽搐（用户
   * 实测：长会话滚到底部附近无法稳定定位）。同一帧内钉回后，宿主的吸底
   * 回写成为幂等 no-op，不再是第二个 scrollTop 写入方。 */
  private stabilizeScrollAfterFold(anchor: { el: HTMLElement } | null): void {
    if (anchor === null) return
    const el = anchor.el
    if (!el.isConnected) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    if (dist > STICK_BOTTOM_THRESHOLD_PX) el.scrollTop = el.scrollHeight - el.clientHeight
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
    this.animatableSegmentBlocks.clear()
    for (const record of this.chips.values()) record.chip.remove()
    this.chips.clear()
    for (const host of [...this.mergedThinks.keys()]) this.removeMergedThink(host)
    for (const state of this.segmentStates.values()) state.row?.remove()
    this.segmentStates.clear()
    this.currentBlocks.clear()
    this.blockExpanded.clear()
    this.runningSince.clear()
    this.completedOnce.clear()
    this.bodyTextCache = new WeakMap()
    this.dirtyMessages.clear()
    this.auditDisplays.clear()
    this.nativeTurns.clear()
    this.emptiedWrappers.clear()
    this.structureDirty = true
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
      this.animatableSegmentBlocks.set(state.key, new Set(state.snapshot.blocks.map(block => block.key)))
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
    // 防御：快照目标必为 flow 直接子级（均来自 flowItems），理论不可达；
    // 万一出现则移除未摆放的行并置空，让下一 pass 走正常重建路径，避免
    // 每轮残留未连接行并重复绑定 click。
    if (target === null || target.parentElement !== flow) {
      row.remove()
      state.row = null
      return
    }
    while (target.previousElementSibling?.classList.contains('dshcf-flow-chip') === true) {
      target = target.previousElementSibling as HTMLElement
    }
    if (row.parentElement !== flow || row.nextElementSibling !== target) target.before(row)
  }

  /** 原生收起时隐藏本块插件自有 overlay（chip/合并行+内容块）：只做
   * display 直写，不清钉住之外的账本、不删展开态，供原生再展开后复用。
   * 在途 WAAPI 动画不追踪取消——收尾回调只做幂等终态对齐，无残留。 */
  private hideOverlayForNativeCollapse(block: Block): void {
    const existing = this.chips.get(block.key)?.chip
    if (existing !== undefined && existing.style.display !== 'none') {
      existing.style.marginBottom = ''
      existing.style.display = 'none'
    }
    const row = this.mergedThinks.get(block.host)
    if (row !== undefined && row.style.display !== 'none') {
      row.style.display = 'none'
      const body = row.nextElementSibling
      if (
        body instanceof HTMLElement
        && body.classList.contains('dshcf-merged-body')
        && body.style.display !== 'none'
      ) {
        body.style.display = 'none'
      }
    }
  }

  private reconcileBlock(
    block: Block,
    segment: SegmentSnapshot | null,
    desiredHidden: Set<HTMLElement>,
  ): void {
    // 原生折叠跟随：所在 turn 被原生收起时隐藏插件自有 overlay（chip/合并行），
    // 保留账本与展开态；成员行由宿主 CSS 隐藏，插件不写它们，避免打架。
    // 原生再展开时 attribute 变化会调度 pass，按原样恢复。
    if (blockNativelyCollapsed(block, this.nativeTurns)) {
      this.hideOverlayForNativeCollapse(block)
      return
    }
    const state = segment === null ? undefined : this.segmentStates.get(segment.key)
    // 触发门控：chip 本身被点击，或其所属 segment 的一级行被点击时，
    // 该块的展开方向走动画路径（分层规则：host 恒瞬时，只动画内部行）。
    const segmentAnimatableBlocks = segment === null ? undefined : this.animatableSegmentBlocks.get(segment.key)
    const animate = this.animatableKeys.has(block.key)
      || (segment !== null
        && this.animatableKeys.has(segment.key)
        && (segmentAnimatableBlocks === undefined || segmentAnimatableBlocks.has(block.key)))
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
        // 清收起钉住残留（二级收起 fade 中途被一级收起打断时内联 16px 仍在），
        // 避免一级再展开后 chip 带残留 margin 与 row-gap 叠成 32px。
        existing.style.marginBottom = ''
        if (block.mount === 'before' || keepHost) {
          if (animate && this.canAnimate(existing)) this.startFadeCollapse(existing)
          else existing.style.display = 'none'
        } else if (!hostFade) {
          existing.style.display = 'none'
        }
      }
      // 掏空包装层在一级收起态也要对账：块行渐隐落定后，正文消息里被并入
      // 前块的 think 行留下 0 高空壳（flex-gap 幻影），不在此登记 desired
      // 会被 restoreUnusedDisplays 逐轮复活（收起态“已处理”行下方多 16px）。
      this.syncEmptiedWrappers(block, desiredHidden)
      return
    }

    let expanded = this.blockExpanded.get(block.key) ?? false
    if (!expanded && block.rows.some(row => row.hasAttribute('data-selected'))) {
      expanded = true
      this.blockExpanded.set(block.key, true)
    }
    const chip = this.ensureChip(block)
    // 宿主恢复接入手势门控：一级展开时「隐藏的块宿主」（如中间的
    // think+正文消息）整体淡入——它先于 middleSteps 循环执行，若瞬时恢复
    // 会删掉账本导致随后的动画路径 early-return（用户实测：第一次正文输出
    // 无动画）。二级 chip 点击时宿主必然可见，hostWasHidden=false 不受影响。
    // 但 context/command 这类 before-mounted 块可能把宿主自身作为 row；二级
    // 仍收起时宿主就是目标隐藏行，不能先 reveal 再由 rows 循环 fade，否则
    // 会闪出一条原生「上下文注入 · source」再消失。
    const hostIsCollapsedRow = !expanded && block.rows.includes(block.host)
    const hostWasHidden = block.host.style.display === 'none'
    const hostAnimate = !hostIsCollapsedRow && hostWasHidden && animate
    if (!hostIsCollapsedRow) this.restoreElement(block.host, hostAnimate)
    // chip 出现走视觉 reveal；mount='inside' 时 chip 在动画宿主内部，
    // 随宿主一起淡入即可（跳过独立动画防双重淡入）；'before' 的流级 chip
    // 在宿主外部，仍需自身 reveal。
    // chip 是 flow 级独立节点，一级收起的渐隐不经过 restoreElement；
    // 再次展开前必须主动取消仍在途的 target:hidden 动画，否则其 onfinish
    // 会在本次展开后重新写 display:none。
    const pendingChip = this.pendingAnims.get(chip)
    if (pendingChip?.target === 'hidden') this.cancelPendingSync(chip)
    const chipWasHidden = chip.style.display === 'none'
    if (chip.style.display !== '') chip.style.display = ''
    if (chipWasHidden && animate && !(hostAnimate && block.mount === 'inside')) this.revealVisual(chip)
    // 展开方向清除收起钉住（含反向仲裁：anim.cancel 不触发 settle）。
    // 收起方向只有在无在途动画时解除；同向重放期间保留 16px。
    if (expanded || !this.hasPendingCollapse(block)) this.unpinChipMargin(chip)
    // 容器先行（v12）：容器 seat 先起 reveal，其内部行走 restoreElement 的
    // 祖先在途守卫自动瞬现、骑容器的淡入——消除「容器行双重动画复合位移
    // （4px+4px≈8px）与宿主首行（4px）上升幅度不一致」。
    // 收起方向间距钉住（plan chip-margin-unification 步骤 3）：手势收起时
    // 行/容器/merged 行渐隐期间 chip 与首行的 16px 间距必须保持（v13 的
    // CSS transition 已删除），最后一条在途渐隐 settle 后同帧归零。
    // 判定用 pendingAnims 账本无状态探测（AI 评审：计数器/最后注册者在
    // cancel 路径会卡死；账本在 oncancel/onfinish 都即时清空，天然解锁）。
    const chipSettle = () => {
      this.settleFired = true
      if (!this.hasPendingCollapse(block)) this.unpinChipMargin(chip)
    }
    for (const container of block.containers) {
      if (expanded) this.restoreElement(container, animate)
      else {
        const started = this.hideElement(container, desiredHidden, animate, chipSettle)
        if (started) this.pinChipMargin(chip)
      }
    }
    for (const row of block.rows) {
      if (expanded) this.restoreElement(row, animate)
      else {
        // 二级收起：宿主自身行渐隐；容器已先行渐隐的，行走冻结规则随容器消失。
        const started = this.hideElement(row, desiredHidden, animate, chipSettle)
        if (started) this.pinChipMargin(chip)
      }
    }
    if (expanded && block.rows.length > 1 && block.rows.every(row => isThinkRow(row))) {
      this.syncMergedThink(block.host, block.rows, desiredHidden, animate)
    } else {
      // merged 行渐隐同样纳入钉住体系（AI 评审 P0：其 fade 不走 block.rows，
      // 否则思考块收起时钉住失效，v13 间距瞬跳回归）。
      if (this.releaseMergedThink(block.host, animate, chipSettle)) this.pinChipMargin(chip)
    }
    // 掏空包装层对账：行显隐落定后收尾（内部读实时 display，须在行循环之后）。
    this.syncEmptiedWrappers(block, desiredHidden)
    chip.classList.toggle('dshcf-has-body', block.mount === 'inside' && this.hasBodyCached(block.host))
    updateChip(chip, block.rows, expanded)
  }

  /**
   * 掏空包装层对账（真机 44px vs 28px 真因修复）。
   *
   * 折叠把某容器的子行全部 display:none 后，该容器变零高度空壳，但仍是
   * 父级 flex 的 item 并参与 gap（如正文体 flex-column gap:16px），凭空多出
   * 一份间距。隐藏这类空壳可让 gap 塌缩；子内容恢复可见（展开/流式追加/
   * 块转世）时恢复显示。
   *
   * 安全边界：
   * - 只看 block.host 内部、不含 host 本人（宿主显隐归 segment 逻辑）；
   * - 跳过结构 seat（data-chat-flow-kind / data-chat-anchor-key）与插件
   *   自身 overlay（dshcf- 前缀类）；
   * - 只隐藏内容空洞（无可见子内容）：零高度无文本的空壳 display:none 与
   *   保持显示像素一致，只塌缩父级 gap；任何一方恢复内容即恢复显示。
   */
  /**
   * 空洞包装层兜底发现：按宿主直扫 div（仅结构变化轮次调用）。
   * 只做隐藏侧：空洞即藏并记入 tracked；恢复侧由 syncEmptiedWrappers 的
   * tracked 复核与 audit 承担。与按行 walk 共用同一安全边界（结构 seat /
   * 插件 overlay / 宿主本人不碰）。
   */
  private discoverHollowWrappers(hosts: Set<HTMLElement>, desiredHidden: Set<HTMLElement>): void {
    for (const host of hosts) {
      if (!host.isConnected) continue
      let divs: HTMLElement[]
      try {
        divs = [...host.querySelectorAll('div')]
      } catch {
        continue
      }
      for (const el of divs) {
        if (el === host || !(el instanceof HTMLElement)) continue
        const cls = el.className
        if (typeof cls === 'string' && cls.split(' ').some(c => c.startsWith('dshcf-'))) continue
        if (el.hasAttribute('data-chat-flow-kind') || el.hasAttribute('data-chat-anchor-key')) continue
        if (this.isHollow(el)) {
          // 无条件调 hide：已隐藏时它只重登记本轮意图（desired.add 先行）即早退，
          // 不重写 display；若跳过，已藏元素会被 restoreUnusedDisplays 复活→振荡。
          this.hideElement(el, desiredHidden, false)
          this.emptiedWrappers.add(el)
        }
      }
    }
  }

  private syncEmptiedWrappers(block: Block, desiredHidden: Set<HTMLElement>): void {
    const flow = this.flow
    if (flow === null) return
    // 行可能跨消息（块合并）：“掏空包装层”按每行所属的 flow 直接子级（消息）
    // 界定，而不是 block.host——正文消息的 think 行被并入前一个块时，其空壳
    // 包装层在最终正文/中间正文消息内部，不在任何 block.host 子树下；消息体
    // 是 flex + gap 容器，可见空壳仍参与 gap，凭空多出 16px 幻影间距。
    const scopeOf = (el: HTMLElement | null): HTMLElement | null => {
      let cur: HTMLElement | null = el?.parentElement ?? null
      while (cur instanceof HTMLElement && cur.parentElement !== flow) {
        cur = cur.parentElement
      }
      return cur instanceof HTMLElement && cur.parentElement === flow ? cur : null
    }
    const candidates: HTMLElement[] = []
    const seen = new Set<HTMLElement>()
    const scopes = new Set<HTMLElement>()
    const collect = (el: HTMLElement | null) => {
      const scope = scopeOf(el)
      if (scope === null) return
      scopes.add(scope)
      let node = el?.parentElement ?? null
      while (node instanceof HTMLElement && node !== scope) {
        if (!seen.has(node)) { seen.add(node); candidates.push(node) }
        node = node.parentElement
      }
    }
    for (const row of block.rows) collect(row)
    for (const container of block.containers) collect(container)
    // 上轮藏过、本轮行里没覆盖到的（如行被解散）也要复核：断连则遗忘；仍
    // 在本块涉及的消息内则纳入判定（恢复/保持）；属于其他消息的条目留给
    // 拥有该消息的块或 audit 复核，不在此越权处理。
    for (const el of [...this.emptiedWrappers]) {
      if (!el.isConnected) {
        this.emptiedWrappers.delete(el)
        continue
      }
      const scope = scopeOf(el)
      if (scope === null || !scopes.has(scope)) continue
      if (!seen.has(el)) { seen.add(el); candidates.push(el) }
    }
    for (const el of candidates) {
      if (!el.isConnected) {
        this.emptiedWrappers.delete(el)
        continue
      }
      const cls = el.className
      if (typeof cls === 'string' && cls.split(' ').some(c => c.startsWith('dshcf-'))) continue
      if (el.hasAttribute('data-chat-flow-kind') || el.hasAttribute('data-chat-anchor-key')) continue
      if (this.isHollow(el)) {
        // 无条件调 hide（同 discover）：已隐藏时只重登记本轮意图即早退，
        // 否则 restoreUnusedDisplays 会把已藏的空壳逐轮复活→间距振荡/跳动。
        this.hideElement(el, desiredHidden, false)
        this.emptiedWrappers.add(el)
      } else if (this.emptiedWrappers.delete(el)) {
        // 曾被我们藏起、如今又有可见内容：恢复（账本即 display 写入的依据）。
        this.restoreElement(el)
      }
    }
  }

  /** 内容空洞判定：无可见子内容（文本/元素任一可见即非空洞）。隐藏者是谁
   * 不重要——零高度无文本节点 display:none 与保持显示像素一致（只塌缩父级
   * gap，正是要修的幻影）；任何一方恢复内容，下轮 pass/audit 即恢复显示。
   * isDisplayed 走 getComputedStyle（桩内退化为内联，语义一致）。 */
  private isHollow(el: HTMLElement): boolean {
    for (const child of [...el.childNodes]) {
      if (child.nodeType === 3) {
        if ((child.textContent ?? '').trim() !== '') return false
        continue
      }
      if (!(child instanceof HTMLElement)) continue
      if (isDisplayed(child)) return false
    }
    return true
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
      leading.appendChild(createCommandIcon())
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
    if (existing !== undefined && existing.style.display !== 'none') {
      // 隐藏前清收起钉住残留（AI 评审 P1：二级收起 fade 中途被 suppress
      // 打断时内联 16px 仍在，恢复显示后会与 row-gap 叠成 32px）。
      existing.style.marginBottom = ''
      existing.style.display = 'none'
    }
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
        // 释放渐隐中（releaseMergedThink 已把 host 摘出 mergedThinks）的
        // 行忽略点击：展开会取消 body 渐隐留下孤儿 body，settle 移除行后
        // 再展开会新建第二个内容块，同一思考内容显示两份（评审实证）。
        if (this.mergedThinks.get(host) !== btn) return
        const next = !this.mergedExpanded.has(host)
        if (next) {
          // 展开成功（内容可读）才置状态：思考行被 React 重渲染摘走的极窄
          // 竞态下 expandMergedBody 会早退，此时保持收起态，不把按钮留在
          // 「aria-expanded=true 但无内容块」的悬空态。
          if (this.expandMergedBody(host, btn)) {
            this.mergedExpanded.add(host)
            btn.setAttribute('aria-expanded', 'true')
          }
        } else {
          this.mergedExpanded.delete(host)
          btn.setAttribute('aria-expanded', 'false')
          this.collapseMergedBody(host)
        }
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
   * 程序化 click 不触发 React 展开，且后台 tab 的 rAF 不执行）。
   * 返回是否成功——思考行已不可读（parts 为空）时返回 false，调用方
   * 据此保持收起态，避免展开状态与内容块脱节。 */
  private expandMergedBody(host: HTMLElement, btn: HTMLButtonElement): boolean {
    const cached = this.mergedBodyTexts.get(host)
    if (cached === undefined) {
      const parts = this.currentThinkRows(host)
        .map(r => r.textContent.replace(/^Think\s*/, '').trim())
        .filter(Boolean)
      if (parts.length === 0) return false
      this.mergedBodyTexts.set(host, parts.join('\n\n'))
    }
    const result = this.ensureMergedBody(host, btn, true)
    if (result === null) return false
    if (result.created) {
      this.revealMergedBody(result.body)
    } else {
      // 在途收起（高度卷下）反向仲裁：同步取消并清锁，恢复完整布局。
      this.cancelPendingSync(result.body)
    }
    return true
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

  /** 清理合并 think 行（v12）：状态 map 立即清除；DOM 在手势动画路径下
   * 渐隐后移除（settle 回调），其余路径瞬删。渐隐中途被反向取消时元素
   * 保留，由后续 pass 的 syncMergedThink 重建/复用。
   * settle 透传给每个渐隐目标的移除回调之后（chip 间距钉住的结算探测点，
   * AI 评审 P0：merged 行渐隐不走 block.rows，必须纳入同一钉住体系）。 */
  private releaseMergedThink(host: HTMLElement, animate = false, settle?: () => void): boolean {
    const row = this.mergedThinks.get(host)
    this.mergedExpanded.delete(host)
    this.mergedBodyTexts.delete(host)
    if (row === undefined) return false
    this.mergedThinks.delete(host)
    const body = row.nextElementSibling
    const targets: HTMLElement[] = body !== null && body.classList.contains('dshcf-merged-body') ? [row, body as HTMLElement] : [row]
    if (animate && this.canAnimate(row)) {
      for (const t of targets) this.startFadeCollapse(t, () => { t.remove(); settle?.() })
      return true
    } else {
      for (const t of targets) t.remove()
      return false
    }
  }

  /** merged-body 展开高度动画（机制样板：插件全资 DOM）。
   * 关键帧含 marginBottom 0→16px——其 CSS 有常量 margin-bottom:16px，
   * 高度从 0 起步时这 16px 会先占位产生小跳变。fill:'forwards' 托住终态，
   * onfinish 清内联后 cancel 释放，无闪烁窗口。收起由 collapseMergedBody
   * 做镜像高度卷下（同款账本与身份守卫），开合对称。 */
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

  /** 收起合并行：内容块高度卷下后移除——镜像 revealMergedBody 的唯一几何动画，
   * 开合对称。插件全资静态文本 DOM、无 React 协调竞争，可安全做几何收起
   * （与 seat 级拒绝盲卷的场景不同：那里是 React 混杂多卡片）。
   * reduced-motion / 无 WAAPI / 零高度降级为同步 remove()。 */
  private collapseMergedBody(host: HTMLElement): void {
    const btn = this.mergedThinks.get(host)
    if (btn === undefined) return
    const body = btn.nextElementSibling
    if (body === null || !body.classList.contains('dshcf-merged-body')) return
    const el = body as HTMLElement
    if (!this.canAnimate(el)) {
      el.remove()
      return
    }
    // 在途展开动画先同步取消（clearCollapseLock 清锁高内联），落到自然布局再测当前高度。
    this.cancelPendingSync(el)
    const current = el.getBoundingClientRect().height
    if (!(current > 0)) {
      el.remove()
      return
    }
    el.style.height = `${current}px`
    el.style.overflow = 'hidden'
    const anim = el.animate(
      [
        { height: `${current}px`, marginBottom: '16px' },
        { height: '0px', marginBottom: '0px' },
      ],
      { duration: ANIM_DURATION_MS, easing: ANIM_EASING, fill: 'forwards' },
    )
    const record: PendingAnim = { anim, target: 'hidden', kind: 'height' }
    this.pendingAnims.set(el, record)
    anim.onfinish = () => {
      if (this.pendingAnims.get(el) !== record) return
      this.pendingAnims.delete(el)
      el.remove()
      anim.cancel()
      this.schedule()
    }
    anim.oncancel = () => {
      // 反向取消（收起中途再点展开）：清锁恢复自然布局，body 留在 DOM 由展开路径接管。
      if (this.pendingAnims.get(el) !== record) return
      this.pendingAnims.delete(el)
      this.clearCollapseLock(el)
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

  /** 本块是否有在途收起渐隐（rows/containers/merged 行/body 任一）。
   * 基于 pendingAnims 账本无状态判定：onfinish/oncancel 都会即时清账，
   * 取消路径天然解锁（计数器/最后注册者会卡死）。merged 行渐隐时已被
   * releaseMergedThink 摘出 mergedThinks，按 DOM 类名现查。 */
  private hasPendingCollapse(block: Block): boolean {
    const check = (el: HTMLElement | null | undefined): boolean =>
      el !== null && el !== undefined && this.pendingAnims.get(el)?.target === 'hidden'
    if (block.containers.some(check)) return true
    if (block.rows.some(check)) return true
    const mergedRow = block.host.querySelector<HTMLElement>('.dshcf-merged-think')
    if (check(mergedRow)) return true
    const mergedBody = mergedRow?.nextElementSibling
    if (mergedBody instanceof HTMLElement && check(mergedBody)) return true
    return false
  }

  /** 钉住 chip 与首行的 16px 间距（收起 fade 期间；内联优先于 aria=false 的 0）。
   * flow-chip（context 等 before-mounted）豁免：其间距由宿主 row-gap 16px
   * 提供、自身 CSS 恒 0，钉住 16px 会叠加成 32px（真机实测：收起上下文
   * 注入时二级与三级间距瞬间扩大）。
   */
  private pinChipMargin(chip: HTMLButtonElement): void {
    if (chip.classList.contains('dshcf-flow-chip')) return
    if (chip.style.marginBottom !== '16px') chip.style.marginBottom = '16px'
  }

  /** 解除钉住（aria=true 的 16px 或 aria=false 的 0 由 CSS 接管）。 */
  private unpinChipMargin(chip: HTMLButtonElement): void {
    if (chip.style.marginBottom !== '') chip.style.marginBottom = ''
  }

  /** 外部介入检测（issue #11 Bug A）：当前内联值 ≠ 插件最后确保值，或所有权
   * 哨兵被 style 整体改写抹除。返回 true 时调用方放弃本次写回并交还账本——
   * 属性级改写由值比对捕获，整体改写（cssText / setAttribute('style')）由
   * 哨兵缺失捕获，两层合起来覆盖外部介入的两种形态。 */
  private displayForeign(el: HTMLElement): boolean {
    const written = this.writtenDisplay.get(el)
    if (written === undefined) return false
    return el.style.getPropertyValue(DISPLAY_OWNED_PROP) === '' || el.style.display !== written
  }

  /** 清空单个元素的显示账本（三账本 + 所有权哨兵）。 */
  private releaseDisplayLedger(el: HTMLElement): void {
    this.originalDisplay.delete(el)
    this.writtenDisplay.delete(el)
    this.controlledDisplay.delete(el)
    el.style.removeProperty(DISPLAY_OWNED_PROP)
  }

  /** 返回 true 表示启动了渐隐动画（调用方可据此决定内部元素的处置）。
   * settle 在渐隐自然结束时调用（onfinish 链；反向取消不触发）。 */
  private hideElement(el: HTMLElement, desired: Set<HTMLElement>, animate = false, settle?: () => void): boolean {
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
    // 账本登记（含外部接管重同步，issue #11）：首次接管记录精确原值；若账本
    // 仍在但元素已被外部整体改写（哨兵被抹）或改值，说明插件控制间隙发生了
    // 接管——以外部当前值为新「原值」基准重新登记（后写者语义：还原时归还
    // 外部写入前的状态），避免恢复路径用过期快照覆盖外部事实。
    if (!this.originalDisplay.has(el) || this.displayForeign(el)) {
      this.originalDisplay.set(el, el.style.display)
      this.writtenDisplay.set(el, el.style.display)
      el.style.setProperty(DISPLAY_OWNED_PROP, '1')
    }
    this.controlledDisplay.add(el)
    if (el.style.display === 'none') return false
    // 手势收起 = 渐隐（镜像 reveal 的 fade），淡完 onfinish 瞬切隐藏。
    // 不锁高、不做 gap 补偿——真机验证高度卷帘方案存在起步瞬切/中途 gap 跳/
    // 末尾 margin 回弹三段跳变，用户裁决弃用（v11）。
    if (animate && this.canAnimate(el)) {
      this.startFadeCollapse(el, settle)
      return true
    }
    el.style.display = 'none'
    this.writtenDisplay.set(el, 'none')
    this.displayTouched = true
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
    // 外部介入守卫（issue #11 Bug A，镜像 turnStatusTexts 的 written 比对）：
    // 当前内联值不再是插件最后确保的值，或所有权哨兵被 style 整体改写抹掉，
    // 说明第三方已接管该元素的显示——尊重现状，放弃恢复并交还账本，等后续
    // pass 按外部事实重分类。用户手势展开同受此守卫：被外部隐藏的轮次不因
    // 点击历史折叠行而复活。
    if (this.displayForeign(el)) {
      this.releaseDisplayLedger(el)
      return
    }
    const original = this.originalDisplay.get(el) as string
    // 祖先 seat 在途动画时跳过后代申请（防双重淡入/淡出与高度锁竞争）：
    // 后代随祖先的 overflow 裁剪与整体过渡呈现，自身走瞬变终态。
    if (!animate || !this.canAnimate(el) || this.hasAnimatingAncestor(el)) {
      if (el.style.display !== original) {
        el.style.display = original
        this.displayTouched = true
      }
      this.releaseDisplayLedger(el)
      return
    }
    // 动画路径（展开）：占位即刻出现，内容淡入 + 微位移。账本双条目保持到
    // onfinish 对齐（终态可见 = 双删除，镜像 restoreElement 契约）。
    if (el.style.display !== original) {
      el.style.display = original
      this.displayTouched = true
    }
    this.writtenDisplay.set(el, original)
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
      this.releaseDisplayLedger(el)
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
    const record: PendingAnim = { anim, target: 'hidden', kind: 'fade', settle }
    this.pendingAnims.set(el, record)
    anim.onfinish = () => this.finishFadeCollapse(el, record)
    anim.oncancel = () => {
      if (this.pendingAnims.get(el) !== record) return
      this.pendingAnims.delete(el)
    }
  }

  /**
   * 收起 fade 终态结算（onfinish 与僵尸收割共用）。仅被同元素新动画
   * supersede 时早退；被 sweep 删账（元素已断连）或收割时仍执行 settle——
   * 回调经 controller 可达，动画必然触发 onfinish，早退会把 chip 内联 16px
   * 钉住永久残留。重挂载同节点不可能（React 只建新节点），重启动的新动画
   * 由第一条守卫覆盖，无误伤。
   */
  private finishFadeCollapse(el: HTMLElement, record: PendingAnim): void {
    const cur = this.pendingAnims.get(el)
    if (cur !== undefined && cur !== record) return
    this.pendingAnims.delete(el)
    // 渐隐期间被外部接管（哨兵被抹/值被改）：不写终态、不执行 settle，
    // 账本交还外部，由后续 pass 按新事实重分类（issue #11 Bug A）。
    if (this.displayForeign(el)) {
      this.releaseDisplayLedger(el)
      this.schedule()
      record.anim.cancel()
      return
    }
    if (el.style.display !== 'none') el.style.display = 'none'
    this.writtenDisplay.set(el, 'none')
    // settle：终态的延迟清理（如 DOM 移除/pin 归零）；反向取消不执行
    // （cancelPendingSync 同步删账，异步 oncancel 够不到这里）。
    record.settle?.()
    record.anim.cancel()
    this.schedule()
  }

  /** 动画是否已播完（终态未结算）：finish 事件丢失时的兜底判定。WAAPI 桩
   * 无 playState/effect 时一律 false，走正常事件路径，测试行为不变。 */
  private isAnimOverdue(anim: Animation): boolean {
    const a = anim as unknown as {
      playState?: unknown
      currentTime?: unknown
      effect?: { getComputedTiming?: () => { endTime?: unknown } } | null
    }
    if (a.playState === 'finished') return true
    if (typeof a.currentTime === 'number') {
      const end = a.effect?.getComputedTiming?.().endTime
      if (typeof end === 'number' && a.currentTime >= end) return true
    }
    return false
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
      if (desired.has(el)) continue
      // 断连但有在途收起 fade：跳过恢复——反向取消会谋杀 fade（settle
      // 丢失 → chip 内联 16px 钉住永久残留，真机 44px vs 28px）。账本直接
      // 交还，在途动画留给 sweep 删账 + 迟到 onfinish 结算（见
      // startFadeCollapse）。无在途动画时沿用原语义（恢复原始 display，
      // 复挂不残留隐藏，见 fold-reconcile 稳定 key 换节点）。
      if (!el.isConnected && this.pendingAnims.get(el)?.target === 'hidden') {
        this.releaseDisplayLedger(el)
        continue
      }
      this.restoreElement(el)
    }
  }

  /** 收集 audit 需要观察的 display 集合；只读取内联样式，不触发布局计算。 */
  private collectAuditDisplays(flow: HTMLElement): Map<HTMLElement, string> {
    const nodes = new Set<HTMLElement>(flowItems(flow))
    for (const el of this.controlledDisplay) {
      if (el.isConnected && nodeWithin(el, flow)) nodes.add(el)
    }
    for (const { chip } of this.chips.values()) {
      if (chip.isConnected && nodeWithin(chip, flow)) nodes.add(chip)
    }
    for (const row of this.mergedThinks.values()) {
      if (row.isConnected && nodeWithin(row, flow)) nodes.add(row)
    }
    const displays = new Map<HTMLElement, string>()
    for (const el of nodes) displays.set(el, el.style.display)
    return displays
  }

  /** 在完整 pass 完成后保存 display 基线，供下一次轻量 audit 比对。 */
  private captureAuditDisplays(flow: HTMLElement): void {
    this.auditDisplays = this.collectAuditDisplays(flow)
  }

  private restoreAllDisplays(): void {
    for (const el of [...this.controlledDisplay]) this.restoreElement(el)
    this.controlledDisplay.clear()
    this.originalDisplay = new WeakMap<HTMLElement, string>()
    this.writtenDisplay = new WeakMap<HTMLElement, string>()
  }
}

function createSpan(cls: string): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = cls
  return span
}

/** 原生 command 工具行 leading 图标（IconApiOutline14，>_ 形）path 数据：
 * 14 坐标系、3 path（圆角框 + > + _，带 transform），逐字复制自
 * dsh-client-ui-primitives 的 IconApiOutline14 导出。
 * 硬编码而非运行时克隆：不依赖页面当下是否有可克隆的命令卡（此前
 * 兜底手搓终端方块与原生有细微差异，极少数会话下所有卡片 leading 被
 * 状态图标替换时克隆失败会露出该手搓图标）。 */
const COMMAND_ICON_PATHS: ReadonlyArray<{ d: string; transform: string }> = [
  {
    transform: 'translate(0.6689 1.073)',
    d: 'M11.4818 5.57813C11.4818 4.45301 11.4807 3.66237 11.4075 3.05908C11.3359 2.46953 11.2024 2.13852 10.9939 1.89441C10.9247 1.81341 10.8493 1.73801 10.7683 1.66882C10.5242 1.46033 10.1932 1.32686 9.60364 1.25525C9.00034 1.18198 8.20974 1.18091 7.0846 1.18091L5.57813 1.18091C4.45301 1.18091 3.66238 1.18198 3.05908 1.25525C2.46953 1.32686 2.13852 1.46033 1.89441 1.66882C1.81341 1.73801 1.73801 1.81341 1.66882 1.89441C1.46033 2.13852 1.32686 2.46953 1.25525 3.05908C1.18198 3.66238 1.18091 4.45301 1.18091 5.57813L1.18091 6.2771C1.18091 7.40218 1.18197 8.19288 1.25525 8.79614C1.32687 9.38553 1.46036 9.71674 1.66882 9.96082C1.73797 10.0417 1.81347 10.1173 1.89441 10.1864C2.13851 10.3948 2.13965 10.5275 3.05908 10.5991C3.66238 10.6724 4.45298 10.6735 5.57813 10.6735L7.0846 10.6735C8.20977 10.6735 9.00033 10.6724 9.60364 10.5991C10.1931 10.5275 10.5242 10.3948 10.7683 10.1864C10.8493 10.1173 10.9247 10.0417 10.9939 9.96082C11.2024 9.71674 11.3358 9.38553 11.4075 8.79614C11.4808 8.19288 11.4818 7.40218 11.4818 6.2771L11.4818 5.57813ZM12.6627 6.2771C12.6627 7.37222 12.6637 8.247 12.5798 8.93799C12.4942 9.64284 12.3133 10.2359 11.8928 10.7282C11.7834 10.8562 11.6637 10.9751 11.5356 11.0845C11.0434 11.5049 10.4511 11.6867 9.74634 11.7723C9.05525 11.8563 8.17999 11.8552 7.0846 11.8552L5.57813 11.8552C4.48273 11.8552 3.60747 11.8563 2.91638 11.7723C2.21157 11.6867 1.61933 11.5049 1.12708 11.0845C0.99901 10.9751 0.879281 10.8562 0.769898 10.7282C0.349454 10.2359 0.168506 9.64284 0.0828864 8.93799C-0.00101964 8.247 4.88512e-07 7.37222 6.47206e-07 6.2771L6.47206e-07 5.57813C6.47206e-07 4.48273 -0.00106163 3.60747 0.0828864 2.91638C0.168502 2.21168 0.349594 1.61928 0.769898 1.12708C0.879302 0.998981 0.998981 0.879302 1.12708 0.769898C1.61928 0.349594 2.21168 0.168502 2.91638 0.0828864C3.60747 -0.00106163 4.48273 6.47206e-07 5.57813 6.47206e-07L7.0846 6.47206e-07C8.17999 6.47206e-07 9.05525 -0.00106163 9.74634 0.0828864C10.451 0.168505 11.0434 0.349587 11.5356 0.769898C11.6637 0.879302 11.7834 0.998981 11.8928 1.12708C12.3131 1.61928 12.4942 2.21169 12.5798 2.91638C12.6638 3.60747 12.6627 4.48273 12.6627 5.57813L12.6627 6.2771Z',
  },
  {
    transform: 'translate(0.6689 1.073)',
    d: 'M6.02607 5.50955L6.44306 5.9274L3.84284 8.52762L3.425 8.11063L3.00715 7.69278L4.77253 5.9274L3.00715 4.16202L3.84284 3.32633L6.02607 5.50955Z',
  },
  {
    transform: 'translate(0.6689 1.073)',
    d: 'M9.23789 7.35397L9.23789 8.53488L6.96238 8.53488L6.96238 7.35397L9.23789 7.35397Z',
  },
]

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

/** 从原生命令卡找真实 command leading SVG：IconApiOutline14（>_ 形，
 * 14x14、3 个 path：方框 + > + _）——bash ToolRow 与 GenericCommandCard 的
 * 默认命令图标都是它；read/write 等工具专属图标（16 坐标系）与 chevron /
 * StateDot（单 path）天然排除。找不到返回 null，调用方用 COMMAND_ICON_PATHS
 * 硬编码原生 path 兜底（与克隆视觉完全一致）。 */
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
 * 页面当下是否还有工具卡可扫。 */
let cachedNativeCommandSvg: SVGSVGElement | null = null

/** 工具块 leading 图标：优先克隆页面上的原生 command leading SVG（跟随
 * DSH 未来图标更新），克隆不可得（页面暂无命令卡 / 卡片 leading 被状态
 * 图标替换）时用 COMMAND_ICON_PATHS 硬编码原生 path 兜底——与克隆视觉
 * 完全一致，不再出现手搓终端方块。 */
function createCommandIcon(): SVGSVGElement {
  if (cachedNativeCommandSvg !== null) return cachedNativeCommandSvg.cloneNode(true) as SVGSVGElement
  const native = findNativeCommandSvg()
  if (native !== null) {
    cachedNativeCommandSvg = native
    return native.cloneNode(true) as SVGSVGElement
  }
  return createCommandIconFallback()
}

/** COMMAND_ICON_PATHS 硬编码构建（与原生 IconApiOutline14 逐字一致）。 */
function createCommandIconFallback(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 14 14')
  svg.setAttribute('width', '14')
  svg.setAttribute('height', '14')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  for (const p of COMMAND_ICON_PATHS) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('transform', p.transform)
    path.setAttribute('d', p.d)
    path.setAttribute('fill', 'currentColor')
    svg.appendChild(path)
  }
  return svg
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

/** 原生 write/edit 工具行的 leading 图标（IconEditOutline16）：16 坐标系、
 * 单 path（铅笔 + 下划线），取样自 dsh-client-ui-tool 的 write/edit 工具行
 * 图标映射，与 dsh-client-ui-primitives 导出逐字一致。16 坐标系渲染
 * 14x14（与 IconApiOutline14 的 14 坐标系区分）。 */
const WRITE_ICON_PATH = 'M9.94076 1.34942C10.7047 0.90231 11.6503 0.902415 12.4143 1.34942C12.7061 1.52015 12.9688 1.79118 13.3104 2.13284C13.6521 2.47448 13.9231 2.73721 14.0939 3.02894C14.5408 3.79294 14.5409 4.73856 14.0939 5.50251C13.9231 5.79415 13.652 6.05704 13.3104 6.39861L6.65932 13.0497C6.28068 13.4284 6.00695 13.7108 5.66543 13.9097C5.32391 14.1085 4.94315 14.2074 4.42705 14.3498L3.24394 14.6761C2.77527 14.8054 2.34538 14.9262 2.00131 14.9684C1.65196 15.0112 1.17964 15.0013 0.810764 14.6325C0.441921 14.2637 0.432107 13.7913 0.47486 13.442C0.517035 13.0979 0.6379 12.668 0.767181 12.1993L1.09352 11.0162C1.23588 10.5001 1.33481 10.1193 1.5336 9.77784C1.7325 9.43632 2.0149 9.1626 2.39355 8.78395L9.04466 2.13284C9.38625 1.79126 9.64911 1.52016 9.94076 1.34942ZM15.5427 14.8398H7.55223L8.96707 13.425H15.5427V14.8398ZM3.39382 9.78422C2.965 10.213 2.84244 10.3436 2.75709 10.49C2.67183 10.6366 2.61862 10.8079 2.45733 11.3925L2.13099 12.5756C2.00183 13.0439 1.92194 13.3419 1.88863 13.5536C2.10041 13.5204 2.39872 13.4416 2.86764 13.3123L4.05075 12.9859C4.63544 12.8246 4.80669 12.7715 4.95323 12.6862C5.09968 12.6008 5.23022 12.4783 5.65905 12.0494L10.721 6.98644L8.45577 4.72121L3.39382 9.78422ZM11.7 2.57079C11.3774 2.38198 10.9777 2.38198 10.6551 2.57079C10.5602 2.62647 10.4487 2.72931 10.0449 3.13311L9.45604 3.72094L11.7213 5.98617L12.3102 5.39833C12.7139 4.99457 12.8168 4.88307 12.8725 4.78818C13.0613 4.46561 13.0612 4.06585 12.8725 3.74326C12.8169 3.64827 12.7146 3.53752 12.3102 3.13311C11.9057 2.72863 11.795 2.6264 11.7 2.57079Z'

/** 从原生 write/edit 工具行找真实 leading SVG：IconEditOutline16（16 坐标系、
 * 1 path），与 chevron / StateDot（14 坐标系单 path）及 Browse/Search/Code
 *（16 坐标系多 path）区分。找不到返回 null，调用方用 WRITE_ICON_PATH 兜底。 */
function findNativeWriteSvg(): SVGSVGElement | null {
  const selector = '[data-tool="write"] [data-disclosure-row], [data-tool="edit"] [data-disclosure-row]'
  for (const drow of document.querySelectorAll<HTMLElement>(selector)) {
    for (const svg of drow.querySelectorAll<SVGSVGElement>('svg')) {
      if (svg.querySelectorAll('path').length === 1 && isIcon16(svg)) return svg
    }
  }
  return null
}

/** svg 是否为 16 坐标系（viewBox 0 0 16 16）。 */
function isIcon16(svg: SVGSVGElement): boolean {
  const vb = (svg.getAttribute('viewBox') ?? '').trim().split(/\s+/)
  return vb.length === 4 && Number(vb[2]) === 16 && Number(vb[3]) === 16
}

/** 编辑了文件块 leading 图标：优先克隆原生 write/edit 工具行 leading SVG，
 * 克隆不可得时用 WRITE_ICON_PATH 硬编码原生 path 兜底（视觉完全一致）。 */
function createWriteIcon(): SVGSVGElement {
  const native = findNativeWriteSvg()
  if (native !== null) return native.cloneNode(true) as SVGSVGElement
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('width', '14')
  svg.setAttribute('height', '14')
  svg.setAttribute('fill', 'none')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', WRITE_ICON_PATH)
  path.setAttribute('fill', 'currentColor')
  svg.appendChild(path)
  return svg
}

/** 按块类型切换 chip leading 图标（工具块 = 原生 command 图标；思考块 = 原生
 * write 图标）。kind 不变时不动
 * DOM——updateChip 只在 kind 变化时才调用本函数，不会每帧替换。 */
function syncLeadingIcon(chip: HTMLButtonElement, kind: 'tool' | 'think' | 'context' | 'write'): void {
  const leading = chip.querySelector<HTMLElement>('.dshcf-leading')
  if (leading === null) return
  const existing = leading.querySelector('svg')
  if (existing !== null && existing.getAttribute('data-dshcf-icon') === kind) return
  for (const child of [...leading.childNodes]) child.remove()
  const svg = kind === 'think' ? createThinkIcon() : kind === 'context' ? createContextIcon() : kind === 'write' ? createWriteIcon() : createCommandIcon()
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

/** 判断节点是否属于插件自有展示树（chip、合并行、已处理行）。 */
function isPluginOwnedNode(node: Node): boolean {
  // SVG 图标不是 HTMLElement；按 nodeType 判断可同时覆盖 HTML/SVG 展示节点。
  const element = node.nodeType === 1 ? node as Element : node.parentElement
  return element !== null && element !== undefined
    && element.closest('.dshcf-chip, .dshcf-processed, .dshcf-merged-think, .dshcf-merged-body') !== null
}

/** mutation target 沿 parentNode 走到 flow 的直接子级（所属消息）。
 * 走不到（flow 外节点）或归属处是 flow 直挂文本节点时返回 null——
 * 两者都不命中任何消息的正文判定缓存。 */
function flowChildOwner(node: Node, flow: HTMLElement): HTMLElement | null {
  let current: Node | null = node
  while (current !== null && current.parentNode !== flow) current = current.parentNode
  return current instanceof HTMLElement ? current : null
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

/** 原生回合摘要状态（每 pass 重建，不跨轮复用）。 */
interface NativeTurnState {
  /** 该 turn 是否被原生折叠（摘要按钮 data-open 缺失即收起）。 */
  collapsed: boolean
}

/** 扫描 flow 顶层原生 turn-process 行：turn id → 开合态。
 *  无按钮（foldable=false 的空壳）视为不存在，不触发让位——否则双方
 *  摘要都不显示。data-chat-turn 缺失的行跳过。
 */
function buildNativeTurnMap(flow: HTMLElement): Map<string, NativeTurnState> {
  const states = new Map<string, NativeTurnState>()
  for (const el of flow.children) {
    if (!(el instanceof HTMLElement)) continue
    if (el.getAttribute('data-chat-flow-kind') !== TURN_PROCESS_KIND) continue
    const turn = el.getAttribute('data-chat-turn')
    if (turn === null || turn === '') continue
    const button = el.querySelector('button[data-turn-process]')
    if (button === null) continue
    // React 以 `"data-open": open || void 0` 渲染：属性缺失即收起态。
    // aria-expanded 双保险：两者一致时才判定，避免中间态误读。
    const openAttr = button.getAttribute(NATIVE_OPEN_ATTR) !== null
    const expandedAttr = button.getAttribute('aria-expanded')
    const open = expandedAttr === null ? openAttr : expandedAttr === 'true'
    states.set(turn, { collapsed: !open })
  }
  return states
}

/** 元素所属的原生 turn id（flow 顶层包装的 data-chat-turn）。 */
function elementTurn(el: HTMLElement): string | null {
  const turn = el.getAttribute('data-chat-turn')
  return turn === null || turn === '' ? null : turn
}

/** segment 是否拥有原生回合摘要行：任一 block 宿主的 turn 在快照里。
 *  有则一级行让位（不渲染“已处理”），overlay 跟随原生开合。
 */
function segmentHasNativeTurn(segment: SegmentSnapshot, nativeTurns: Map<string, NativeTurnState>): boolean {
  if (nativeTurns.size === 0) return false
  for (const block of segment.blocks) {
    const turn = elementTurn(block.host)
    if (turn !== null && nativeTurns.has(turn)) return true
  }
  return false
}

/** block 所在 turn 是否被原生折叠：是则隐藏插件自有 overlay（chip/合并行），
 *  但保留账本与展开态——原生再展开时按原样恢复，不与宿主打架。 */
function blockNativelyCollapsed(block: Block, nativeTurns: Map<string, NativeTurnState>): boolean {
  if (nativeTurns.size === 0) return false
  const turn = elementTurn(block.host)
  return turn !== null && nativeTurns.get(turn)?.collapsed === true
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
    // 原生回合摘要行（DSH 0.1.2+）：透明跳过——不当正文、不切断合并、
    // 不建块。宿主自己负责它的显隐，插件永不触碰。
    if (kind === TURN_PROCESS_KIND) continue
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
 * 保持在同一段（合并）。
 * 正文文本节点一次 walker 预收集（DOM 顺序），行间判断用顺序扫描：
 * 首达「在 a 之后」的正文节点若不在 b 之前，后续节点只会更靠后，
 * 可直接判定无正文——避免每对相邻行各扫一次全树。 */
function splitThinkByBody(el: HTMLElement, rows: HTMLElement[]): HTMLElement[][] {
  const texts: Text[] = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node: Text | null
  while ((node = walker.nextNode() as Text | null) !== null) {
    if (node.data.trim() === '') continue
    const parent = node.parentElement
    if (parent !== null && parent.closest('[data-variant="think"], [data-chat-call-id], .dshcf-chip, .dshcf-merged-think, .dshcf-merged-body') !== null) continue
    texts.push(node)
  }
  const hasBetween = (a: HTMLElement, b: HTMLElement): boolean => {
    for (const t of texts) {
      const posA = a.compareDocumentPosition(t)
      if ((posA & Node.DOCUMENT_POSITION_FOLLOWING) === 0) continue
      // 首达在 a 之后的正文节点：在 b 之前 → 区间内有正文；否则后续
      // 节点只会更靠后，区间内不可能再有正文。
      const posB = b.compareDocumentPosition(t)
      return (posB & Node.DOCUMENT_POSITION_PRECEDING) !== 0
    }
    return false
  }
  const segments: HTMLElement[][] = []
  let current: HTMLElement[] = []
  for (let i = 0; i < rows.length; i++) {
    current.push(rows[i])
    if (i + 1 < rows.length && hasBetween(rows[i], rows[i + 1])) {
      segments.push(current)
      current = []
    }
  }
  if (current.length > 0) segments.push(current)
  return segments.length > 0 ? segments : [rows]
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
  // 完成态的「编辑了文件」用原生 write 图标（与标题同条件：块内含
  // Edit/Write 工具）；运行中保持工具块通用 command 图标。
  let kind: 'tool' | 'think' | 'context' | 'write' = running !== null
    ? running.kind
    : info.allContext
      ? 'context'
      : info.tools.length > 0 ? 'tool' : 'think'
  if (running === null && info.tools.some(tool => tool === 'Edit' || tool === 'Write')) kind = 'write'
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
 * 历史会话加载时没有本地 running 起点，用它补上 "已处理 {时长}"。
 * 结果按 boundary 记忆化、以文本为失效令牌：completedKeys 循环每轮 pass
 * 都会走到这里，长会话下不做记忆化就是每秒多次 querySelectorAll +
 * compareDocumentPosition 全扫（issue #14 卡顿源之一）。 */
const turnDurationCache = new WeakMap<HTMLElement, { text: string; duration: number | undefined }>()
function parseTurnDuration(boundary: HTMLElement): number | undefined {
  const text = boundary.textContent ?? ''
  const cached = turnDurationCache.get(boundary)
  if (cached !== undefined && cached.text === text) return cached.duration
  const duration = parseTurnDurationText(boundary, text)
  turnDurationCache.set(boundary, { text, duration })
  return duration
}

function parseTurnDurationText(boundary: HTMLElement, text: string): number | undefined {
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

/** 官方 ChatView 尾部的运行状态行（`<div role="status">`，旧版文案
 * "Deep diving..."、当前版本 "深度求索中..."）。把其中的文本节点替换为
 * 自定义状态提示词，流光特效在 CSS 上（dsh-turn-status-shimmer），
 * 不受影响；宿主追加的用时后缀（"33秒"）原样保留。React 重渲染会
 * 恢复原文，pass() 每轮自愈。
 * @param statusText - 完整替换文案；调用方已排除空值。
 */
function replaceTurnStatus(flow: HTMLElement, originals: Map<Text, { original: string; written: string }>, statusText: string): void {
  const statuses = flow.matches('[role="status"]')
    ? [flow, ...flow.querySelectorAll<HTMLElement>('[role="status"]')]
    : [...flow.querySelectorAll<HTMLElement>('[role="status"]')]
  for (const status of statuses) {
    for (const node of status.childNodes) {
      if (node instanceof Text && TURN_STATUS_COPY_RE.test(node.data)) {
        let record = originals.get(node)
        if (record === undefined) {
          record = { original: node.data, written: '' }
          originals.set(node, record)
        }
        // 宿主在插件写入后更新过该节点（当前文本 ≠ 上次写入值，且仍含
        // 进行中文案）时，以宿主最新文本为新还原基线——否则 stop() 会把
        // 节点还原成更旧的首见原文，覆盖宿主更新（评审实证：宿主把状态
        // 行改成 'Deep diving fast...' 后会被还原成首见的 'Deep diving...'；
        // 新版每秒追加用时后缀，同样走这条基线更新）。
        if (node.data !== record.written) record.original = node.data
        // 只替换进行中文案前缀（含原生点号），避免用户填入 "Deep sleeping..."
        // 时与原文尾部 "..." 叠成双省略号；用时后缀保留。
        const next = node.data.replace(TURN_STATUS_COPY_RE, statusText)
        // 写入守卫：值不变不赋值。否则每轮 pass 的赋值会产生
        // characterData mutation，在 characterData 观察下自激循环。
        if (node.data !== next) {
          node.data = next
          record.written = next
        }
      }
    }
  }
}

/** 只恢复仍保留插件改写文案的节点，避免覆盖宿主之后的状态更新。 */
function restoreTurnStatus(originals: Map<Text, { original: string; written: string }>): void {
  for (const [node, record] of originals) {
    // 仅当节点文本仍是插件写入后的值（written）才还原为宿主原文：
    // 若 React 已把状态行替换成新文案（≠ written），说明宿主有更新的
    // 状态要展示，插件不得覆盖。
    if (node.isConnected && node.data === record.written && node.data !== record.original) node.data = record.original
  }
  originals.clear()
}

function removeStyle(): void {
  document.getElementById(STYLE_ID)?.remove()
}
